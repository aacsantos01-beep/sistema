import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { UserPlus, Edit2, Trash2, Shield, User } from 'lucide-react';
import { API_URL } from '../config';
import './SellerList.css'; // Reusing seller list styles for consistency

const UserList: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'vendedor' });

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar usuários');
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ username: user.username, password: '', role: user.role });
    } else {
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'vendedor' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser 
        ? `${API_URL}/users/${editingUser.id}` 
        : `${API_URL}/users`;
      
      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowModal(false);
        fetchUsers();
      } else {
          const data = await response.json();
          alert(data.message);
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleDelete = async (id: number) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (id === currentUser.id) {
        alert('Você não pode excluir seu próprio usuário.');
        return;
    }

    if (!window.confirm('Deseja realmente excluir este usuário?')) return;
    try {
      await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        }
      });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <Layout title="Gerenciar Usuários">
      <div className="sellers-header">
        <button className="btn btn-primary add-btn" onClick={() => handleOpenModal()}>
          <UserPlus size={20} />
          Novo Usuário
        </button>
      </div>

      <div className="card">
        {loading ? <p>Carregando...</p> : (
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Cargo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="name-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <User size={16} />
                        {user.username}
                      </div>
                  </td>
                  <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Shield size={14} color={user.role === 'admin' ? '#ef4444' : '#000000'} />
                        {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                      </div>
                  </td>
                  <td className="actions-cell">
                    <button onClick={() => handleOpenModal(user)} className="action-btn edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="action-btn delete">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h3>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome de Usuário</label>
                <input 
                  type="text" 
                  value={formData.username} 
                  onChange={e => setFormData({...formData, username: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Senha {editingUser && '(deixe em branco para não alterar)'}</label>
                <input 
                  type="password" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  required={!editingUser}
                />
              </div>
              <div className="form-group">
                <label>Cargo</label>
                <select 
                    value={formData.role} 
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="seller-select"
                >
                    <option value="vendedor">Vendedor</option>
                    <option value="admin">Administrador</option>
                </select>
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

export default UserList;
