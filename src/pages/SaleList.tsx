import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Eye, Search, Calendar, User, Trash2, X, FileText, RefreshCw, ExternalLink } from 'lucide-react';
import { API_URL } from '../config';
import './SaleList.css';

const NFE_STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  nao_emitida: { label: 'Não emitida', badgeClass: 'pending' },
  processando_autorizacao: { label: 'Processando...', badgeClass: 'approved' },
  autorizado: { label: 'Autorizada', badgeClass: 'converted' },
  erro_autorizacao: { label: 'Erro na emissão', badgeClass: 'cancelled' },
  erro: { label: 'Erro na emissão', badgeClass: 'cancelled' },
  cancelado: { label: 'Cancelada', badgeClass: 'cancelled' },
};

const nfeStatusInfo = (status: string | null | undefined) =>
  NFE_STATUS_LABELS[status || 'nao_emitida'] || { label: status || 'Não emitida', badgeClass: 'pending' };

const SaleList: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [nfeActionLoading, setNfeActionLoading] = useState(false);
  const [nfeErrorMsg, setNfeErrorMsg] = useState('');

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/sales`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar vendas');
      const data = await response.json();
      setSales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda? O estoque dos produtos será restaurado.')) return;

    try {
      const response = await fetch(`${API_URL}/sales/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao excluir venda');
      }

      alert('Venda excluída com sucesso!');
      fetchSales(); // Refresh list
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openDetails = async (id: number) => {
    setDetailsLoading(true);
    setNfeErrorMsg('');
    setSelectedSale(null);
    try {
      const response = await fetch(`${API_URL}/sales/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar detalhes da venda');
      const data = await response.json();
      setSelectedSale(data);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshSelectedSaleInList = (updated: any) => {
    setSales(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)));
  };

  const handleEmitNfe = async () => {
    if (!selectedSale) return;
    setNfeActionLoading(true);
    setNfeErrorMsg('');
    try {
      const response = await fetch(`${API_URL}/sales/${selectedSale.id}/nfe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao emitir nota fiscal');

      const updated = { ...selectedSale, nfe_status: data.status };
      setSelectedSale(updated);
      refreshSelectedSaleInList(updated);
    } catch (error: any) {
      setNfeErrorMsg(error.message);
    } finally {
      setNfeActionLoading(false);
    }
  };

  const handleCheckNfeStatus = async () => {
    if (!selectedSale) return;
    setNfeActionLoading(true);
    setNfeErrorMsg('');
    try {
      const response = await fetch(`${API_URL}/sales/${selectedSale.id}/nfe`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao consultar status da nota fiscal');

      const updated = {
        ...selectedSale,
        nfe_status: data.nfe_status,
        nfe_number: data.numero || selectedSale.nfe_number,
        nfe_key: data.chave_nfe || selectedSale.nfe_key,
        nfe_danfe_url: data.caminho_danfe || data.url || selectedSale.nfe_danfe_url,
      };
      setSelectedSale(updated);
      refreshSelectedSaleInList(updated);
      if (data.nfe_status === 'erro_autorizacao' && data.mensagem_sefaz) {
        setNfeErrorMsg(data.mensagem_sefaz);
      }
    } catch (error: any) {
      setNfeErrorMsg(error.message);
    } finally {
      setNfeActionLoading(false);
    }
  };

  const filteredSales = sales?.filter(s =>
    s?.id?.toString().includes(searchTerm) ||
    (s?.username && s?.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s?.seller_name && s?.seller_name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  return (
    <Layout title="Histórico de Vendas">
      <div className="sales-header">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar por ID, vendedor ou usuário..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? <p>Carregando...</p> : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Vendedor</th>
                <th>Usuário</th>
                <th>Total</th>
                <th>Nota Fiscal</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => {
                const nfeInfo = nfeStatusInfo(sale.nfe_status);
                return (
                  <tr key={sale.id}>
                    <td>#{sale.id}</td>
                    <td>
                      <div className="date-cell">
                        <Calendar size={14} />
                        {new Date(sale.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div className="seller-cell">
                        <User size={14} />
                        {sale.seller_name || 'N/A'}
                      </div>
                    </td>
                    <td>{sale.username}</td>
                    <td className="total-cell">R$ {sale.total_amount.toFixed(2)}</td>
                    <td>
                      <span className={`status-badge ${nfeInfo.badgeClass}`}>{nfeInfo.label}</span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="action-btn view" title="Ver Detalhes" onClick={() => openDetails(sale.id)}>
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-btn delete"
                          title="Excluir Venda"
                          onClick={() => handleDelete(sale.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {(detailsLoading || selectedSale) && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="receipt-modal-header">
              <h3>{selectedSale ? `Venda #${selectedSale.id}` : 'Carregando...'}</h3>
              <button className="close-btn" onClick={() => setSelectedSale(null)}>
                <X size={20} />
              </button>
            </div>

            {selectedSale && (
              <div>
                <p><strong>Data:</strong> {new Date(selectedSale.created_at).toLocaleString()}</p>
                <p><strong>Vendedor:</strong> {selectedSale.seller_name || 'N/A'}</p>
                <p><strong>Pagamento:</strong> {selectedSale.payment_method || 'N/A'}</p>
                <p><strong>Total:</strong> R$ {Number(selectedSale.total_amount).toFixed(2)}</p>

                <table style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qtd</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>R$ {(item.price_at_sale * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="card" style={{ background: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <strong>Nota Fiscal</strong>
                    <span className={`status-badge ${nfeStatusInfo(selectedSale.nfe_status).badgeClass}`}>
                      {nfeStatusInfo(selectedSale.nfe_status).label}
                    </span>
                  </div>

                  {selectedSale.nfe_number && <p>Número: {selectedSale.nfe_number}</p>}
                  {selectedSale.nfe_key && <p style={{ wordBreak: 'break-all' }}>Chave: {selectedSale.nfe_key}</p>}
                  {nfeErrorMsg && <p style={{ color: '#991B1B' }}>{nfeErrorMsg}</p>}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {(selectedSale.nfe_status === 'nao_emitida' || selectedSale.nfe_status === 'erro' || selectedSale.nfe_status === 'erro_autorizacao' || !selectedSale.nfe_status) && (
                      <button className="btn btn-primary" disabled={nfeActionLoading} onClick={handleEmitNfe}>
                        <FileText size={16} /> {nfeActionLoading ? 'Emitindo...' : 'Emitir Nota Fiscal'}
                      </button>
                    )}
                    {(selectedSale.nfe_status === 'processando_autorizacao') && (
                      <button className="btn btn-secondary" disabled={nfeActionLoading} onClick={handleCheckNfeStatus}>
                        <RefreshCw size={16} /> {nfeActionLoading ? 'Consultando...' : 'Atualizar Status'}
                      </button>
                    )}
                    {selectedSale.nfe_status === 'autorizado' && selectedSale.nfe_danfe_url && (
                      <a className="btn btn-primary" href={selectedSale.nfe_danfe_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={16} /> Ver DANFE
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedSale(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default SaleList;
