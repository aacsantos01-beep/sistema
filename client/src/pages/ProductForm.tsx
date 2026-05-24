import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { API_URL } from '../config';
import './Products.css';

const ProductForm: React.FC = () => {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    supplier: '',
    price: 0,
    stock: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      const fetchProduct = async () => {
        try {
          const response = await fetch(`${API_URL}/products/${id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const data = await response.json();
          setFormData({
            sku: data.sku,
            name: data.name,
            category: data.category || '',
            supplier: data.supplier || '',
            price: data.price,
            stock: data.stock
          });
        } catch (error) {
          console.error('Error fetching product:', error);
        }
      };
      fetchProduct();
    } else {
      // Auto-generate SKU for new products
      const generatedSku = `IR-${Date.now().toString().slice(-8)}`;
      setFormData(prev => ({ ...prev, sku: generatedSku }));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = isEdit 
        ? `${API_URL}/products/${id}` 
        : `${API_URL}/products`;
      
      const token = localStorage.getItem('token');

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const resData = await response.json();
        throw new Error(resData.message || 'Error saving product');
      }

      navigate('/products');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? Number(value) : value
    }));
  };

  return (
    <Layout title={isEdit ? 'Editar Produto' : 'Novo Produto'}>
      <div className="card product-form">
        <form onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          
          <div className="form-grid">
            <div className="form-group">
              <label>SKU (Automático)</label>
              <input 
                type="text" 
                name="sku" 
                value={formData.sku} 
                onChange={handleChange} 
                required 
                readOnly
                style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
              />
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <input 
                type="text" 
                name="category" 
                value={formData.category} 
                onChange={handleChange} 
                placeholder="Ex: Peças Industriais"
              />
            </div>
            <div className="form-group">
              <label>Fornecedor</label>
              <input 
                type="text" 
                name="supplier" 
                value={formData.supplier} 
                onChange={handleChange} 
                placeholder="Ex: Fornecedor Ltda"
              />
            </div>
            <div className="form-group-full">
              <label>Nome do Produto / Peça</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                placeholder="Ex: Rolamento de Esfera"
              />
            </div>
            <div className="form-group">
              <label>Preço (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                name="price" 
                value={formData.price} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Estoque Inicial</label>
              <input 
                type="number" 
                name="stock" 
                value={formData.stock} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>
          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate('/products')}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default ProductForm;
