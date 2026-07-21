import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { UserPlus, Edit2, Trash2, Shield, User, Camera, Upload } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import './SellerList.css'; // Reusing seller list styles for consistency

const UserList: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'vendedor' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resolveImageUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http')) return path;
    return `${BASE_URL}${path}`;
  };

  const handleOpenModal = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ username: user.username, password: '', role: user.role });
      setPhotoPreview(resolveImageUrl(user.image_url));
    } else {
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'vendedor' });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploaderClick = (e: React.MouseEvent) => {
    // Prevent the click from bubbling up and submitting the form
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser
        ? `${API_URL}/users/${editingUser.id}`
        : `${API_URL}/users`;

      const data = new FormData();
      data.append('username', formData.username);
      data.append('role', formData.role);
      if (formData.password) data.append('password', formData.password);
      if (photoFile) data.append('photo', photoFile);

      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: data
      });

      if (response.ok) {
        handleCloseModal();
        fetchUsers();
      } else {
        let resData: any = {};
        try {
          resData = await response.json();
        } catch {
          resData = { message: `Erro ${response.status}: ${response.statusText}` };
        }
        alert(resData.message || `Erro ao salvar (${response.status})`);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Erro de conexão ao salvar usuário.');
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
                <th>Foto</th>
                <th>Usuário</th>
                <th>Cargo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const imgUrl = resolveImageUrl(user.image_url);
                return (
                  <tr key={user.id}>
                    <td className="user-photo-cell">
                      {imgUrl ? (
                        <img src={imgUrl} alt={user.username} className="user-row-photo" />
                      ) : (
                        <div className="user-row-photo user-row-photo--placeholder">
                          <User size={18} />
                        </div>
                      )}
                    </td>
                    <td className="name-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      <button onClick={() => handleOpenModal(user)} className="action-btn edit" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="action-btn delete" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum usuário cadastrado.
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
            <h3>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ alignSelf: 'flex-start' }}>Foto do Usuário</label>
                <div
                  className="user-photo-uploader"
                  onClick={handleUploaderClick}
                  title="Selecionar foto"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Pré-visualização" className="user-photo-preview" />
                  ) : (
                    <div className="user-photo-placeholder">
                      <Camera size={28} />
                      <span>Selecionar foto</span>
                    </div>
                  )}
                  <div className="user-photo-overlay">
                    <Upload size={18} />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  onClick={(e) => e.stopPropagation()}
                  hidden
                />
                <p className="help-text" style={{ margin: 0 }}>PNG ou JPG, recomendado 300x300px</p>
              </div>

              <div className="form-group">
                <label>Nome de Usuário</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Senha {editingUser && '(deixe em branco para não alterar)'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                />
              </div>
              <div className="form-group">
                <label>Cargo</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="seller-select"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancelar</button>
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
