import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Plus, Search, FileText, Trash2, ShoppingCart, CheckCircle, Clock, ShieldCheck, X, Printer } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import './SaleList.css';

const BudgetList: React.FC = () => {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('IR Assistência Técnica');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  
  // New Budget State
  const [customerName, setCustomerName] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [items, setItems] = useState<any[]>([]);
  
  // Service Item State
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [hasWarranty, setHasWarranty] = useState(false);
  const [warrantyTime, setWarrantyTime] = useState('');

  const navigate = useNavigate();

  const fetchBudgets = async () => {
    try {
      const response = await fetch(`${API_URL}/budgets`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Falha ao buscar orçamentos');
      const data = await response.json();
      setBudgets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const [sellRes, setRes] = await Promise.all([
        fetch(`${API_URL}/sellers`, { headers }),
        fetch(`${API_URL}/settings`, { headers })
      ]);
      const sellData = await sellRes.json();
      const setData = await setRes.json();
      setSellers(sellData);
      if (setData.company_name) setCompanyName(setData.company_name);
      if (setData.company_logo) setCompanyLogo(setData.company_logo);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchBudgets();
    fetchData();
  }, []);

  const addServiceItem = () => {
    if (!serviceName || !servicePrice) return;
    const newItem = {
      item_name: serviceName,
      price: parseFloat(servicePrice),
      quantity: 1,
      is_service: 1,
      has_warranty: hasWarranty ? 1 : 0,
      warranty_time: hasWarranty ? warrantyTime : ''
    };
    setItems([...items, newItem]);
    setServiceName('');
    setServicePrice('');
    setHasWarranty(false);
    setWarrantyTime('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/budgets/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchBudgets();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const printBudget = async (budget: any) => {
    try {
      const response = await fetch(`${API_URL}/budgets/${budget.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const fullBudget = await response.json();

      const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900');
      if (!windowPrint) return;

      windowPrint.document.write(`
        <html>
          <head>
            <title>Orçamento ${companyName} #${fullBudget.id}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
              .header { text-align: center; border-bottom: 2px solid #000000; padding-bottom: 20px; margin-bottom: 30px; }
              .header img { max-width: 200px; max-height: 100px; margin-bottom: 10px; object-fit: contain; }
              .header h1 { color: #000000; margin: 0; font-size: 28px; }
              .budget-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .info-group b { color: #666; font-size: 12px; text-transform: uppercase; display: block; }
              .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              .items-table th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 14px; }
              .items-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
              .total-section { text-align: right; font-size: 20px; font-weight: bold; border-top: 2px solid #3b82f6; padding-top: 15px; }
              .warranty-badge { font-size: 11px; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; }
              .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              ${companyLogo ? `<img src="${BASE_URL}${companyLogo}" alt="Logo" />` : ''}
              <h1>${companyName}</h1>
              <p>SOLUÇÕES EM TECNOLOGIA E ASSISTÊNCIA TÉCNICA</p>
            </div>
            <div class="budget-info">
              <div class="info-group">
                <b>Cliente</b>
                <span>${fullBudget.customer_name || 'Consumidor Final'}</span>
              </div>
              <div class="info-group">
                <b>Orçamento No.</b>
                <span>#${fullBudget.id}</span>
              </div>
              <div class="info-group">
                <b>Data</b>
                <span>${new Date(fullBudget.created_at).toLocaleString()}</span>
              </div>
              <div class="info-group">
                <b>Vendedor</b>
                <span>${fullBudget.seller_name}</span>
              </div>
            </div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Descrição do Item/Serviço</th>
                  <th>Qtd</th>
                  <th>Preço Unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${fullBudget.items.map((item: any) => `
                  <tr>
                    <td>
                      <div>${item.item_name}</div>
                      ${item.has_warranty ? `<span class="warranty-badge">Garantia: ${item.warranty_time}</span>` : ''}
                    </td>
                    <td>${item.quantity}</td>
                    <td>R$ ${item.price.toFixed(2)}</td>
                    <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total-section">
              TOTAL DO ORÇAMENTO: R$ ${fullBudget.total_amount.toFixed(2)}
            </div>
            <div class="footer">
              <p>Este orçamento é válido por 7 dias a partir da data de emissão.</p>
              <p>${companyName} - Qualidade e Confiança em cada serviço.</p>
            </div>
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      windowPrint.document.close();
    } catch (error) {
      console.error('Error printing budget:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !selectedSeller) {
        alert('Adicione itens e selecione um vendedor');
        return;
    }

    try {
      const response = await fetch(`${API_URL}/budgets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          customer_name: customerName,
          seller_id: selectedSeller,
          total_amount: calculateTotal(),
          items
        })
      });

      if (response.ok) {
        setShowModal(false);
        setItems([]);
        setCustomerName('');
        fetchBudgets();
      }
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir este orçamento?')) return;
    try {
      await fetch(`${API_URL}/budgets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
    }
  };

  const convertToSale = async (budget: any) => {
    try {
      // Fetch full budget details including items
      const response = await fetch(`${API_URL}/budgets/${budget.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Erro ao buscar itens do orçamento');
      
      const fullBudget = await response.json();
      
      // Store in localStorage for NewSale page to pick up
      localStorage.setItem('pending_budget', JSON.stringify(fullBudget));
      navigate('/sales/new');
    } catch (error) {
      alert('Erro ao converter orçamento: ' + error);
    }
  };

  const filteredBudgets = budgets?.filter(b => 
    b?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b?.id?.toString().includes(searchTerm)
  ) || [];

  return (
    <Layout title="Orçamentos">
      <div className="sales-header">
        <div className="search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-primary add-btn" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Novo Orçamento
        </button>
      </div>

      <div className="card">
        {loading ? <p>Carregando...</p> : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredBudgets.map(budget => (
                <tr key={budget.id}>
                  <td>#{budget.id}</td>
                  <td>{new Date(budget.created_at).toLocaleDateString()}</td>
                  <td>{budget.customer_name || 'N/A'}</td>
                  <td>{budget.seller_name}</td>
                  <td className="total-cell">R$ {budget.total_amount.toFixed(2)}</td>
                  <td>
                    <select 
                      value={budget.status} 
                      onChange={(e) => updateStatus(budget.id, e.target.value)}
                      className={`status-badge ${budget.status}`}
                      style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="pending">Pendente</option>
                      <option value="approved">Aprovado</option>
                      <option value="cancelled">Cancelado</option>
                      <option value="converted">Convertido</option>
                    </select>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit" 
                      title="Imprimir Orçamento"
                      onClick={() => printBudget(budget)}
                    >
                      <Printer size={16} />
                    </button>
                    <button 
                      className="action-btn edit" 
                      title="Converter em Venda"
                      style={{ color: '#10b981', backgroundColor: '#ecfdf5' }}
                      onClick={() => convertToSale(budget)}
                      disabled={budget.status === 'converted'}
                    >
                      <ShoppingCart size={16} />
                    </button>
                    <button 
                      className="action-btn delete" 
                      title="Excluir"
                      onClick={() => handleDelete(budget.id)}
                    >
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
          <div className="modal-content card" style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header-flex">
                <h3>Novo Orçamento</h3>
                <button className="close-btn" onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome do Cliente</label>
                  <input 
                    type="text" 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                    placeholder="Nome para identificação"
                  />
                </div>
                <div className="form-group">
                  <label>Vendedor</label>
                  <select 
                    value={selectedSeller} 
                    onChange={e => setSelectedSeller(e.target.value)}
                    required
                    className="seller-select"
                  >
                    <option value="">Selecione...</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="service-adder card" style={{ padding: '1rem', background: '#f8fafc', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Adicionar Serviço/Mão de Obra</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Descrição do Serviço</label>
                    <input 
                      type="text" 
                      value={serviceName} 
                      onChange={e => setServiceName(e.target.value)}
                      placeholder="Ex: Troca de Tela iPhone 13"
                    />
                  </div>
                  <div className="form-group">
                    <label>Preço (R$)</label>
                    <input 
                      type="number" 
                      value={servicePrice} 
                      onChange={e => setServicePrice(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        checked={hasWarranty} 
                        onChange={e => setHasWarranty(e.target.checked)}
                      />
                      Tem Garantia?
                    </label>
                  </div>
                  {hasWarranty && (
                    <div className="form-group">
                      <label>Tempo de Garantia</label>
                      <input 
                        type="text" 
                        value={warrantyTime} 
                        onChange={e => setWarrantyTime(e.target.value)}
                        placeholder="Ex: 90 dias"
                      />
                    </div>
                  )}
                </div>
                <button type="button" className="btn btn-secondary" onClick={addServiceItem} style={{ marginTop: '0.5rem' }}>
                  Adicionar Item
                </button>
              </div>

              <div className="items-list" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th>Garantia</th>
                      <th>Preço</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.item_name}</td>
                        <td>{item.has_warranty ? item.warranty_time : 'Não'}</td>
                        <td>R$ {item.price.toFixed(2)}</td>
                        <td><button type="button" onClick={() => removeItem(idx)} className="delete-item"><Trash2 size={14}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-footer-flex">
                <div className="total-display">
                  <strong>Total: R$ {calculateTotal().toFixed(2)}</strong>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Salvar Orçamento</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BudgetList;
