import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Plus, Search, Trash2, Edit2, CheckCircle, Clock, X } from 'lucide-react';
import { API_URL } from '../config';

const PayableList: React.FC = () => {
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPayable, setEditingPayable] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    status: 'pending',
    category: '',
    payment_method: ''
  });

  const fetchPayables = async () => {
    try {
      const response = await fetch(`${API_URL}/payables`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar contas a pagar');
      const data = await response.json();
      setPayables(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching payables:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const handleOpenModal = (payable: any = null) => {
    if (payable) {
      setEditingPayable(payable);
      setFormData({
        description: payable.description,
        amount: payable.amount.toString(),
        due_date: payable.due_date,
        status: payable.status,
        category: payable.category || '',
        payment_method: payable.payment_method || ''
      });
    } else {
      setEditingPayable(null);
      setFormData({
        description: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        category: '',
        payment_method: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPayable 
        ? `${API_URL}/payables/${editingPayable.id}` 
        : `${API_URL}/payables`;
      
      const response = await fetch(url, {
        method: editingPayable ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
        setShowModal(false);
        fetchPayables();
      } else {
        const data = await response.json();
        alert(data.message);
      }
    } catch (error) {
      console.error('Error saving payable:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente excluir esta conta?')) return;
    try {
      await fetch(`${API_URL}/payables/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPayables();
    } catch (error) {
      console.error('Error deleting payable:', error);
    }
  };

  const toggleStatus = async (payable: any) => {
    const newStatus = payable.status === 'paid' ? 'pending' : 'paid';
    try {
      const response = await fetch(`${API_URL}/payables/${payable.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchPayables();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredPayables = payables?.filter(p => 
    p?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p?.category?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Layout title="Contas a Pagar">
      <div className="sales-header">
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Buscar por descrição ou categoria..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary add-btn" onClick={() => handleOpenModal()}>
          <Plus size={20} />
          Nova Conta
        </button>
      </div>

      <div className="card">
        {loading ? <p>Carregando...</p> : (
          <table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayables.map(payable => (
                <tr key={payable.id}>
                  <td>{new Date(payable.due_date).toLocaleDateString()}</td>
                  <td className="name-cell">{payable.description}</td>
                  <td>{payable.category || 'N/A'}</td>
                  <td style={{ fontWeight: 600 }}>R$ {payable.amount.toFixed(2)}</td>
                  <td>
                    <button 
                      onClick={() => toggleStatus(payable)}
                      className={`status-badge ${payable.status}`}
                      style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      {payable.status === 'paid' ? (
                        <><CheckCircle size={14} /> Pago</>
                      ) : (
                        <><Clock size={14} /> Pendente</>
                      )}
                    </button>
                  </td>
                  <td className="actions-cell">
                    <button onClick={() => handleOpenModal(payable)} className="action-btn edit" title="Editar">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(payable.id)} className="action-btn delete" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPayables.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhuma conta registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <div className="modal-header-flex">
              <h3>{editingPayable ? 'Editar Conta' : 'Nova Conta a Pagar'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Descrição</label>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Ex: Aluguel, Internet, Fornecedor X"
                  required 
                />
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Data de Vencimento</label>
                  <input 
                    type="date" 
                    value={formData.due_date} 
                    onChange={e => setFormData({...formData, due_date: e.target.value})} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <input 
                    type="text" 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    placeholder="Ex: Infraestrutura"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="seller-select"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PayableList;
