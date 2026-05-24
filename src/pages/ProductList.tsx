import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Plus, Edit2, Trash2, Search, MinusCircle, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import './Products.css';

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao buscar produtos');
      const data = await response.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }
      fetchProducts();
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const handleAdjustStock = async (id: number, amount: number) => {
    try {
      const response = await fetch(`${API_URL}/products/${id}/adjust-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao ajustar estoque');
      }
      
      // Update local state for immediate feedback
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, stock: p.stock + amount } : p
      ));
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredProducts = products?.filter(p => 
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Layout title="Produtos">
      <div className="products-header">
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou SKU..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Link to="/products/new" className="btn btn-primary add-btn">
          <Plus size={20} />
          Novo Produto
        </Link>
      </div>

      <div className="card">
        {loading ? <p>Carregando...</p> : (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th>Preço</th>
                <th>Estoque</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td className="sku-cell">{product.sku}</td>
                  <td className="name-cell">{product.name}</td>
                  <td>{product.category}</td>
                  <td>{product.supplier || 'N/A'}</td>
                  <td>R$ {product.price.toFixed(2)}</td>
                  <td>
                    <div className="stock-adjust-cell">
                      <button 
                        className="stock-btn minus" 
                        onClick={() => handleAdjustStock(product.id, -1)}
                        title="Remover 1"
                      >
                        <MinusCircle size={18} />
                      </button>
                      <span className={`stock-count ${product.stock < 10 ? 'low' : ''}`}>
                        {product.stock}
                      </span>
                      <button 
                        className="stock-btn plus" 
                        onClick={() => handleAdjustStock(product.id, 1)}
                        title="Adicionar 1"
                      >
                        <PlusCircle size={18} />
                      </button>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <Link to={`/products/edit/${product.id}`} className="action-btn edit" title="Editar">
                      <Edit2 size={16} />
                    </Link>
                    <button onClick={() => handleDelete(product.id)} className="action-btn delete" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default ProductList;
