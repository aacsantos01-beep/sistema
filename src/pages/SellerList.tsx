import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Edit2, Trash2, UserPlus } from 'lucide-react';
import { API_URL } from '../config';
import './SellerList.css';

const SellerList: React.FC = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });

  const fetchSellers = async () => {
    try {
      const response = await fetch(`${API_URL}/sellers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar vendedores');
      const data = await response.json();
      setSellers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      setSellers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleOpenModal = (seller: any = null) => {
    if (seller) {
      setEditingSeller(seller);
      setFormData({ name: seller.name, email: seller.email || '', phone: seller.phone || '' });
    } else {
      setEditingSeller(null);
      setFormData({ name: '', email: '', phone: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingSeller 
        ? `${API_URL}/sellers/${editingSeller.id}` 
        : `${API_URL}/sellers`;
      
      const response = await fetch(url, {
        method: editingSeller ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingSeller ? { ...formData, active: 1 } : formData)
      });

      if (response.ok) {
        setShowModal(false);
        fetchSellers();
      }
    } catch (error) {
      console.error('Error saving seller:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Deseja realmente desativar este vendedor?')) return;
    try {
      await fetch(`${API_URL}/sellers/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });
      fetchSellers();
    } catch (error) {
      console.error('Error deleting seller:', error);
    }
  };

  return (
    <Layout title="Vendedores">
      <div className="sellers-header">
        <button className="btn btn-primary add-btn" onClick={() => handleOpenModal()}>
          <UserPlus size={20} />
          Novo Vendedor
        </button>
      </div>

      <div className="card">
        {loading ? <p>Carregando...</p> : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Data de Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map(seller => (
                <tr key={seller.id}>
                  <td className="name-cell">{seller.name}</td>
                  <td>{seller.email}</td>
                  <td>{seller.phone}</td>
                  <td>{new Date(seller.created_at).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button onClick={() => handleOpenModal(seller)} className="action-btn edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(seller.id)} className="action-btn delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {sellers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum vendedor cadastrado.
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
            <h3>{editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input 
                  type="text" 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                />
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

export default SellerList;
