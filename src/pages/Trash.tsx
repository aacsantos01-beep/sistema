import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { RefreshCcw, Trash2, Calendar, User, CreditCard, FileText, ShoppingCart } from 'lucide-react';
import { API_URL } from '../config';
import './Trash.css';

const Trash: React.FC = () => {
  const [trashItems, setTrashItems] = useState<{ sales: any[], budgets: any[], payables: any[] }>({
    sales: [],
    budgets: [],
    payables: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sales' | 'budgets' | 'payables'>('sales');

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/trash`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar lixeira');
      const data = await response.json();
      setTrashItems(data);
    } catch (error) {
      console.error('Error fetching trash:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (type: string, id: number) => {
    if (!window.confirm('Deseja restaurar este item?')) return;

    try {
      const response = await fetch(`${API_URL}/trash/restore`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ type, id })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao restaurar');
      }

      alert('Item restaurado com sucesso!');
      fetchTrash();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handlePermanentDelete = async (type: string, id: number) => {
    if (!window.confirm('ATENÇÃO: Esta ação é irreversível. Deseja excluir permanentemente?')) return;

    try {
      const response = await fetch(`${API_URL}/trash/delete-permanent`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ type, id })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao excluir');
      }

      alert('Item excluído permanentemente!');
      fetchTrash();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const renderTable = () => {
    const items = trashItems[activeTab];
    if (items.length === 0) return <p className="empty-msg">Nenhum item na lixeira para esta categoria.</p>;

    return (
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Data</th>
            {activeTab !== 'payables' && <th>Vendedor</th>}
            <th>Descrição/Cliente</th>
            <th>Valor</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => (
            <tr key={item.id}>
              <td>#{item.id}</td>
              <td>
                <div className="date-cell">
                  <Calendar size={14} />
                  {new Date(item.created_at || item.due_date).toLocaleDateString()}
                </div>
              </td>
              {activeTab !== 'payables' && (
                <td>
                  <div className="seller-cell">
                    <User size={14} />
                    {item.seller_name || 'N/A'}
                  </div>
                </td>
              )}
              <td>{item.customer_name || item.description || 'N/A'}</td>
              <td className="total-cell">R$ {(parseFloat(item.total_amount) || parseFloat(item.amount) || 0).toFixed(2)}</td>
              <td>
                <div className="actions-cell">
                  <button 
                    className="action-btn restore" 
                    title="Restaurar"
                    onClick={() => handleRestore(activeTab.slice(0, -1), item.id)}
                  >
                    <RefreshCcw size={16} />
                  </button>
                  <button 
                    className="action-btn delete" 
                    title="Excluir Permanentemente"
                    onClick={() => handlePermanentDelete(activeTab.slice(0, -1), item.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <Layout title="Lixeira">
      <div className="trash-tabs">
        <button 
          className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} 
          onClick={() => setActiveTab('sales')}
        >
          <ShoppingCart size={18} /> Vendas
        </button>
        <button 
          className={`tab-btn ${activeTab === 'budgets' ? 'active' : ''}`} 
          onClick={() => setActiveTab('budgets')}
        >
          <FileText size={18} /> Orçamentos
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payables' ? 'active' : ''}`} 
          onClick={() => setActiveTab('payables')}
        >
          <CreditCard size={18} /> Contas a Pagar
        </button>
      </div>

      <div className="card">
        {loading ? <p>Carregando...</p> : renderTable()}
      </div>
    </Layout>
  );
};

export default Trash;
