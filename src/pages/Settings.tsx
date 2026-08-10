import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Upload, Save, Building, Image as ImageIcon, CheckCircle, FileText } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import { compressImage } from '../utils/imageCompress';
import './Settings.css';

const FISCAL_FIELDS = [
  'company_cnpj', 'company_ie', 'company_razao_social', 'company_regime_tributario',
  'company_address_logradouro', 'company_address_numero', 'company_address_bairro',
  'company_address_municipio', 'company_address_codigo_municipio', 'company_address_uf',
  'company_address_cep', 'focusnfe_token', 'focusnfe_ambiente',
] as const;

type FiscalData = Record<typeof FISCAL_FIELDS[number], string>;

const emptyFiscalData = (): FiscalData => ({
  ...FISCAL_FIELDS.reduce((acc, key) => ({ ...acc, [key]: '' }), {} as FiscalData),
  focusnfe_ambiente: 'homologacao',
});

const Settings: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [fiscalData, setFiscalData] = useState<FiscalData>(emptyFiscalData());
  const [fiscalLoading, setFiscalLoading] = useState(false);
  const [fiscalSuccess, setFiscalSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.company_name) setCompanyName(data.company_name);
      if (data.company_logo) setLogo(data.company_logo);

      setFiscalData(prev => {
        const next = { ...prev };
        FISCAL_FIELDS.forEach(key => {
          if (data[key]) next[key] = data[key];
        });
        return next;
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleFiscalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiscalData(prev => ({ ...prev, [name]: value }));
  };

  const handleFiscalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFiscalLoading(true);
    setFiscalSuccess(false);
    try {
      const response = await fetch(`${API_URL}/settings/fiscal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(fiscalData)
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao salvar dados fiscais');
      }
      setFiscalSuccess(true);
      setTimeout(() => setFiscalSuccess(false), 3000);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar dados fiscais');
    } finally {
      setFiscalLoading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setLogo(URL.createObjectURL(selected));
      const compressed = await compressImage(selected);
      setFile(compressed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      
      // Update Company Name
      await fetch(`${API_URL}/settings/company-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: companyName })
      });

      // Update Logo if selected
      if (file) {
        const formData = new FormData();
        formData.append('logo', file);
        const logoResponse = await fetch(`${API_URL}/settings/logo`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (!logoResponse.ok) {
          const data = await logoResponse.json().catch(() => ({}));
          throw new Error(data.message || 'Erro ao enviar logo');
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Gerenciamento">
      <div className="settings-container">
        <div className="card settings-card">
          <div className="card-header">
            <h3>Dados da Empresa</h3>
          </div>
          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label><Building size={16} /> Nome da Empresa</label>
              <input 
                type="text" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                placeholder="Ex: IR Assistência Técnica"
              />
            </div>

            <div className="form-group">
              <label><ImageIcon size={16} /> Logo da Empresa</label>
              <div className="logo-upload-container">
                <div className="logo-preview">
                  {logo ? (
                    <img src={logo.startsWith('blob') ? logo : (logo.startsWith('http') ? logo : `${BASE_URL}${logo}`)} alt="Logo preview" />
                  ) : (
                    <div className="no-logo">Sem Logo</div>
                  )}
                </div>
                <div className="upload-controls">
                  <label htmlFor="logo-upload" className="btn btn-secondary upload-btn">
                    <Upload size={18} /> Selecionar Logo
                  </label>
                  <input 
                    id="logo-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange} 
                    hidden 
                  />
                  <p className="help-text">Recomendado: PNG ou JPG, 300x300px</p>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button type="submit" className="btn btn-primary save-btn" disabled={loading}>
                <Save size={18} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              {success && (
                <span className="success-msg">
                  <CheckCircle size={16} /> Configurações salvas!
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="card settings-card">
          <div className="card-header">
            <h3>Dados Fiscais (Emissão de Nota Fiscal)</h3>
            <p className="help-text">
              Necessários para emitir NFC-e via FocusNFe. Você precisa ter uma empresa cadastrada
              e um certificado digital A1 enviado no painel da FocusNFe antes que a emissão funcione.
            </p>
          </div>
          <form onSubmit={handleFiscalSubmit} className="settings-form">
            <div className="fiscal-grid">
              <div className="form-group">
                <label>CNPJ</label>
                <input type="text" name="company_cnpj" value={fiscalData.company_cnpj} onChange={handleFiscalChange} placeholder="00.000.000/0001-00" />
              </div>
              <div className="form-group">
                <label>Inscrição Estadual</label>
                <input type="text" name="company_ie" value={fiscalData.company_ie} onChange={handleFiscalChange} placeholder="Ex: 123456789 ou ISENTO" />
              </div>
              <div className="form-group-full">
                <label>Razão Social</label>
                <input type="text" name="company_razao_social" value={fiscalData.company_razao_social} onChange={handleFiscalChange} placeholder="Nome oficial da empresa" />
              </div>
              <div className="form-group">
                <label>Regime Tributário</label>
                <select name="company_regime_tributario" value={fiscalData.company_regime_tributario} onChange={handleFiscalChange}>
                  <option value="">Selecione...</option>
                  <option value="1">Simples Nacional</option>
                  <option value="2">Simples Nacional - excesso de sublimite</option>
                  <option value="3">Regime Normal</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ambiente FocusNFe</label>
                <select name="focusnfe_ambiente" value={fiscalData.focusnfe_ambiente} onChange={handleFiscalChange}>
                  <option value="homologacao">Homologação (testes)</option>
                  <option value="producao">Produção (notas reais)</option>
                </select>
              </div>
              <div className="form-group-full">
                <label>Token de Acesso FocusNFe</label>
                <input type="password" name="focusnfe_token" value={fiscalData.focusnfe_token} onChange={handleFiscalChange} placeholder="Token gerado no painel da FocusNFe" />
              </div>
              <div className="form-group">
                <label>Logradouro</label>
                <input type="text" name="company_address_logradouro" value={fiscalData.company_address_logradouro} onChange={handleFiscalChange} placeholder="Rua/Av." />
              </div>
              <div className="form-group">
                <label>Número</label>
                <input type="text" name="company_address_numero" value={fiscalData.company_address_numero} onChange={handleFiscalChange} />
              </div>
              <div className="form-group">
                <label>Bairro</label>
                <input type="text" name="company_address_bairro" value={fiscalData.company_address_bairro} onChange={handleFiscalChange} />
              </div>
              <div className="form-group">
                <label>Município</label>
                <input type="text" name="company_address_municipio" value={fiscalData.company_address_municipio} onChange={handleFiscalChange} />
              </div>
              <div className="form-group">
                <label>Código IBGE do Município</label>
                <input type="text" name="company_address_codigo_municipio" value={fiscalData.company_address_codigo_municipio} onChange={handleFiscalChange} placeholder="Ex: 3550308" />
              </div>
              <div className="form-group">
                <label>UF</label>
                <input type="text" name="company_address_uf" value={fiscalData.company_address_uf} onChange={handleFiscalChange} maxLength={2} placeholder="Ex: SP" />
              </div>
              <div className="form-group">
                <label>CEP</label>
                <input type="text" name="company_address_cep" value={fiscalData.company_address_cep} onChange={handleFiscalChange} placeholder="00000-000" />
              </div>
            </div>

            <div className="settings-footer">
              <button type="submit" className="btn btn-primary save-btn" disabled={fiscalLoading}>
                <FileText size={18} /> {fiscalLoading ? 'Salvando...' : 'Salvar Dados Fiscais'}
              </button>
              {fiscalSuccess && (
                <span className="success-msg">
                  <CheckCircle size={16} /> Dados fiscais salvos!
                </span>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
