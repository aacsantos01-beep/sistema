import axios from 'axios';
import { db } from '../db/database';

// Integração com a FocusNFe (https://focusnfe.com.br) para emissão de NFC-e (Nota Fiscal
// de Consumidor Eletrônica). A FocusNFe exige que a empresa emitente já esteja cadastrada
// no painel deles (CNPJ + certificado digital A1 enviado por lá) antes que este serviço
// funcione de verdade — aqui só cuidamos da chamada de API e do payload fiscal.
//
// Cobre apenas venda de MERCADORIAS (produtos com estoque). Serviços exigem NFS-e
// (nota fiscal de serviço, regida por cada município) e não são emitidos por aqui.

export type FiscalSettings = Record<string, string | undefined>;

const REQUIRED_FISCAL_KEYS: { key: string; label: string }[] = [
    { key: 'company_cnpj', label: 'CNPJ da empresa' },
    { key: 'company_razao_social', label: 'Razão Social' },
    { key: 'company_regime_tributario', label: 'Regime Tributário' },
    { key: 'company_address_logradouro', label: 'Endereço (logradouro)' },
    { key: 'company_address_numero', label: 'Endereço (número)' },
    { key: 'company_address_bairro', label: 'Endereço (bairro)' },
    { key: 'company_address_municipio', label: 'Endereço (município)' },
    { key: 'company_address_codigo_municipio', label: 'Código IBGE do município' },
    { key: 'company_address_uf', label: 'Endereço (UF)' },
    { key: 'company_address_cep', label: 'Endereço (CEP)' },
    { key: 'focusnfe_token', label: 'Token de acesso da FocusNFe' },
];

// Forma de pagamento (tabela SEFAZ) usada nos valores já existentes de payment_method.
const PAYMENT_METHOD_CODES: Record<string, string> = {
    'PIX': '17',
    'Espécie': '01',
    'Crédito': '03',
    'Débito': '04',
};

const onlyDigits = (value: string) => (value || '').replace(/\D/g, '');

export const getFiscalSettings = async (): Promise<FiscalSettings> => {
    const result = await db.query('SELECT key, value FROM settings');
    return result.rows.reduce((acc: FiscalSettings, row: any) => {
        acc[row.key] = row.value;
        return acc;
    }, {});
};

// Retorna os rótulos (em português) de configuração fiscal ainda não preenchida em Configurações.
export const getMissingFiscalConfig = (settings: FiscalSettings): string[] =>
    REQUIRED_FISCAL_KEYS.filter(({ key }) => !settings[key]).map(({ label }) => label);

const focusBaseUrl = (ambiente?: string) =>
    ambiente === 'producao' ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br';

const focusClient = (settings: FiscalSettings) =>
    axios.create({
        baseURL: focusBaseUrl(settings.focusnfe_ambiente),
        auth: { username: settings.focusnfe_token as string, password: '' },
        timeout: 20000,
    });

const extractFocusError = (error: any): string => {
    const data = error?.response?.data;
    if (data?.mensagem) return data.mensagem;
    if (data?.erros?.length) return data.erros.map((e: any) => e.mensagem || JSON.stringify(e)).join('; ');
    if (typeof data === 'string' && data) return data;
    return error.message || 'Erro desconhecido ao comunicar com a FocusNFe';
};

interface SaleItemForNfe {
    product_id: number | null;
    product_name: string;
    quantity: number;
    price_at_sale: number;
    ncm: string | null;
    cfop: string | null;
    unidade: string | null;
}

export interface SaleForNfe {
    id: number;
    total_amount: number;
    payment_method: string | null;
    customer_name: string | null;
    customer_document: string | null;
}

// Lança um erro com mensagem já pronta para exibir ao usuário quando a venda não pode
// ser emitida como NFC-e (config fiscal incompleta, itens de serviço, NCM faltando, etc).
export const validateSaleForNfe = (settings: FiscalSettings, items: SaleItemForNfe[]): void => {
    const missingConfig = getMissingFiscalConfig(settings);
    if (missingConfig.length > 0) {
        throw new Error(`Configure os dados fiscais da empresa antes de emitir notas: ${missingConfig.join(', ')}. Acesse Gerenciamento > Dados Fiscais.`);
    }

    const serviceItems = items.filter(i => !i.product_id);
    if (serviceItems.length > 0) {
        throw new Error('Esta venda contém item(ns) de serviço. A emissão automática cobre apenas NFC-e de mercadorias — serviços exigem NFS-e (nota fiscal de serviço municipal), que ainda não está integrada.');
    }

    const missingNcm = items.filter(i => !i.ncm).map(i => i.product_name);
    if (missingNcm.length > 0) {
        throw new Error(`Defina o NCM do(s) produto(s) antes de emitir a nota: ${missingNcm.join(', ')}. Edite o produto em Produtos.`);
    }
};

export const buildNfcePayload = (settings: FiscalSettings, sale: SaleForNfe, items: SaleItemForNfe[], ref: string) => {
    // CRT: 1 = Simples Nacional, 2 = Simples Nacional (excesso sublimite), 3 = Regime Normal.
    // CSOSN 102 (sem permissão de crédito) cobre o caso mais comum de pequeno comércio no
    // Simples Nacional. Empresas no Regime Normal (CRT 3) têm classificação de ICMS (CST)
    // dependente do produto/estado e DEVEM revisar esse valor com o contador antes de usar em produção.
    const isSimples = settings.company_regime_tributario === '1' || settings.company_regime_tributario === '2';
    const icmsSituacaoTributaria = isSimples ? '102' : '40';

    const paymentCode = PAYMENT_METHOD_CODES[sale.payment_method || ''] || '99';

    return {
        natureza_operacao: 'Venda',
        data_emissao: new Date().toISOString(),
        presenca_comprador: '1', // operação presencial
        modalidade_frete: '9', // sem frete
        cnpj_emitente: onlyDigits(settings.company_cnpj || ''),
        cpf_destinatario: sale.customer_document ? onlyDigits(sale.customer_document) : undefined,
        nome_destinatario: sale.customer_name || undefined,
        items: items.map((item, idx) => ({
            numero_item: idx + 1,
            codigo_produto: item.product_id ? String(item.product_id) : `ITEM-${idx + 1}`,
            descricao: item.product_name,
            codigo_ncm: item.ncm,
            cfop: item.cfop || '5102',
            unidade_comercial: item.unidade || 'UN',
            quantidade_comercial: item.quantity,
            valor_unitario_comercial: item.price_at_sale,
            valor_bruto: Number((item.price_at_sale * item.quantity).toFixed(2)),
            unidade_tributavel: item.unidade || 'UN',
            quantidade_tributavel: item.quantity,
            valor_unitario_tributavel: item.price_at_sale,
            icms_origem: '0',
            icms_situacao_tributaria: icmsSituacaoTributaria,
            pis_situacao_tributaria: '49',
            cofins_situacao_tributaria: '49',
            inclui_no_total: '1',
        })),
        formas_pagamento: [
            { forma_pagamento: paymentCode, valor_pagamento: Number(sale.total_amount) },
        ],
    };
};

// Envia a NFC-e para emissão. A FocusNFe processa de forma assíncrona: a resposta inicial
// normalmente vem com status "processando_autorizacao" e o status final deve ser consultado
// depois com checkNfceStatus (ou recebido via webhook, não configurado aqui).
export const emitNfce = async (sale: SaleForNfe, items: SaleItemForNfe[]) => {
    const settings = await getFiscalSettings();
    validateSaleForNfe(settings, items);

    const ref = `venda${sale.id}-${Date.now()}`;
    const payload = buildNfcePayload(settings, sale, items, ref);

    try {
        const response = await focusClient(settings).post(`/v4/nfce?ref=${ref}`, payload);
        return { ref, ...response.data };
    } catch (error: any) {
        throw new Error(extractFocusError(error));
    }
};

export const checkNfceStatus = async (ref: string) => {
    const settings = await getFiscalSettings();
    const missingConfig = getMissingFiscalConfig(settings);
    if (missingConfig.length > 0) {
        throw new Error(`Configure os dados fiscais da empresa antes de consultar notas: ${missingConfig.join(', ')}.`);
    }
    try {
        const response = await focusClient(settings).get(`/v4/nfce/${ref}`);
        return response.data;
    } catch (error: any) {
        throw new Error(extractFocusError(error));
    }
};
