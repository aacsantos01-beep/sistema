import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Eye, Search, Calendar, User } from 'lucide-react';
import { API_URL } from '../config';
import './SaleList.css';

const SaleList: React.FC = () => {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSales = async () => {
      try {
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
    fetchSales();
  }, []);

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
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(sale => (
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
                    <button className="action-btn view" title="Ver Detalhes">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhuma venda encontrada.
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

export default SaleList;
