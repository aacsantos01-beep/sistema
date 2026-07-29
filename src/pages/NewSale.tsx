import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, ShoppingCart, Trash2, CheckCircle, User, ImageIcon, Plus, Minus, CreditCard, ReceiptText, X } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import './NewSale.css';

const NewSale: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [saleDataForReceipt, setSaleDataForReceipt] = useState<any>(null);
  const [companyName, setCompanyName] = useState('IR Assistência Técnica');
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
        
        const [prodRes, sellRes, setRes] = await Promise.all([
          fetch(`${API_URL}/products`, { headers }),
          fetch(`${API_URL}/sellers`, { headers }),
          fetch(`${API_URL}/settings`, { headers })
        ]);

        if (!prodRes.ok || !sellRes.ok) throw new Error('Erro ao carregar dados');

        const prodData = await prodRes.json();
        const sellData = await sellRes.json();
        const setData = await setRes.json();
        
        setProducts(Array.isArray(prodData) ? prodData : []);
        setSellers(Array.isArray(sellData) ? sellData : []);
        if (setData.company_name) setCompanyName(setData.company_name);
        if (setData.company_logo) setCompanyLogo(setData.company_logo);

        // Load budget if exists
        const pendingBudget = localStorage.getItem('pending_budget');
        if (pendingBudget) {
            const budget = JSON.parse(pendingBudget);
            setSelectedSeller(budget.seller_id.toString());
            
            // Map budget items to cart
            const budgetItems = budget.items.map((item: any) => ({
                id: item.product_id || `service-${Date.now()}-${Math.random()}`,
                name: item.item_name,
                price: item.price,
                quantity: item.quantity,
                stock: 999999, // services have unlimited "stock"
                isService: item.is_service === 1,
                service_name: item.is_service === 1 ? item.item_name : null
            }));
            setCart(budgetItems);
            localStorage.removeItem('pending_budget');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setProducts([]);
        setSellers([]);
      }
    };
    fetchData();
  }, []);

  const addToCart = (product: any) => {
    if (!product) return;
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert('Estoque insuficiente!');
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (product.stock <= 0) {
        alert('Produto sem estoque!');
        return;
      }
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        const product = products.find(p => p.id === id);
        
        if (newQty <= 0) return item;
        if (product && newQty > product.stock) {
          alert('Estoque insuficiente!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!selectedSeller) {
      alert('Selecione um vendedor!');
      return;
    }
    if (!paymentMethod) {
      alert('Selecione uma forma de pagamento!');
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          total_amount: total,
          seller_id: Number(selectedSeller),
          payment_method: paymentMethod,
          items: cart.map(item => ({
            productId: typeof item.id === 'number' ? item.id : null,
            service_name: item.isService ? item.name : null,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao processar venda');
      }
      const result = await response.json();

      setSaleDataForReceipt({
        id: result.id,
        items: [...cart],
        total: total,
        paymentMethod: paymentMethod,
        seller: sellers.find(s => s.id === Number(selectedSeller))?.name,
        date: new Date().toLocaleString()
      });

      setSuccess(true);
      setCart([]);
      setSelectedSeller('');
      setPaymentMethod('');
      setShowReceiptModal(true);
      
      setTimeout(() => setSuccess(false), 3000);
      
      const prodRes = await fetch(`${API_URL}/products`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const prodData = await prodRes.json();
      setProducts(prodData);
      
    } catch (error) {
      alert('Erro ao finalizar venda');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    if (!saleDataForReceipt) return;

    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!windowPrint) return;

    windowPrint.document.write(`
      <html>
        <head>
          <title>Recibo ${companyName}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; width: 300px; padding: 20px; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header img { max-width: 150px; max-height: 80px; margin-bottom: 10px; object-fit: contain; }
            .header h2 { margin: 5px 0; font-size: 18px; }
            .info { font-size: 14px; margin-bottom: 15px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .items-table th { text-align: left; border-bottom: 1px solid #000; font-size: 14px; }
            .item-row td { padding: 5px 0; font-size: 14px; }
            .total-section { border-top: 2px solid #000; padding-top: 10px; font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 30px; border-top: 1px dashed #000; padding-top: 15px; }
            .thanks { font-weight: bold; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${companyLogo ? `<img src="${companyLogo.startsWith('http') ? companyLogo : `${BASE_URL}${companyLogo}`}" alt="Logo" />` : ''}
            <h2>${companyName}</h2>
          </div>
          <div class="info">
            <p>Venda: #${saleDataForReceipt.id}</p>
            <p>Data: ${saleDataForReceipt.date}</p>
            <p>Vendedor: ${saleDataForReceipt.seller}</p>
            <p>Pagamento: ${saleDataForReceipt.paymentMethod}</p>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${saleDataForReceipt.items.map((item: any) => `
                <tr class="item-row">
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total-section">
            <div style="display: flex; justify-content: space-between;">
              <span>TOTAL GERAL:</span>
              <span>R$ ${saleDataForReceipt.total.toFixed(2)}</span>
            </div>
          </div>
          <div class="footer">
            <p class="thanks">A equipe ${companyName} agradece!</p>
            <p>Obrigado pela preferência e volte sempre.</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    windowPrint.document.close();
    setShowReceiptModal(false);
  };

  const filteredProducts = products?.filter(p => 
    p?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <Layout title="Nova Venda">
      <div className="pos-container">
        <div className="pos-left">
          <div className="search-box card">
            <Search size={20} />
            <input 
              type="text" 
              placeholder="Pesquisar produtos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="product-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card card" onClick={() => addToCart(product)}>
                <div className="product-card-image">
                  {product.image_url ? (
                    <img src={product.image_url.startsWith('http') ? product.image_url : `${BASE_URL}${product.image_url}`} alt={product.name} />
                  ) : (
                    <div className="pos-image-placeholder">
                      <ImageIcon size={32} />
                    </div>
                  )}
                </div>
                <div className="product-info">
                  <h4>{product.name}</h4>
                  <p className="sku">{product.sku}</p>
                  <p className="price">R$ {product?.price?.toFixed(2)}</p>
                  <p className={`stock ${product.stock < 10 ? 'low' : ''}`}>
                    Estoque: {product.stock}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pos-right">
          <div className="seller-selection card">
            <div className="card-header-small">
              <User size={18} />
              <span>Vendedor</span>
            </div>
            <select 
              value={selectedSeller} 
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="seller-select"
            >
              <option value="">Selecione um vendedor...</option>
              {sellers?.map(seller => (
                <option key={seller.id} value={seller.id}>{seller.name}</option>
              ))}
            </select>
          </div>

          <div className="payment-selection card">
            <div className="card-header-small">
              <CreditCard size={18} />
              <span>Forma de Pagamento</span>
            </div>
            <select 
              value={paymentMethod} 
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="seller-select"
            >
              <option value="">Selecione o pagamento...</option>
              <option value="PIX">PIX</option>
              <option value="Espécie">Espécie (Dinheiro)</option>
              <option value="Crédito">Cartão de Crédito</option>
              <option value="Débito">Cartão de Débito</option>
            </select>
          </div>

          <div className="cart-card card">
            <div className="cart-header">
              <ShoppingCart size={24} />
              <h3>Carrinho</h3>
            </div>
            
            <div className="cart-items">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <p className="item-name">{item.name}</p>
                    <div className="item-qty-controls">
                      <button onClick={() => updateQuantity(item.id, -1)} className="qty-btn">
                        <Minus size={14} />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="qty-btn">
                        <Plus size={14} />
                      </button>
                      <span className="at-price">x R$ {item.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="item-actions">
                    <span className="item-total">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeFromCart(item.id)} className="delete-item">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="empty-cart">Carrinho vazio</p>}
            </div>

            <div className="cart-footer">
              <div className="total-row">
                <span>Total</span>
                <span className="total-amount">R$ {total.toFixed(2)}</span>
              </div>
              <button 
                className="btn btn-primary checkout-btn" 
                disabled={cart.length === 0 || loading}
                onClick={handleCheckout}
              >
                {loading ? 'Processando...' : 'Finalizar Venda'}
              </button>
            </div>
          </div>
          {success && (
            <div className="success-toast">
              <CheckCircle size={20} />
              <span>Venda realizada com sucesso!</span>
            </div>
          )}
        </div>
      </div>

      {showReceiptModal && (
        <div className="modal-overlay">
          <div className="modal-content card receipt-modal">
            <div className="receipt-modal-header">
              <CheckCircle size={48} color="#10b981" />
              <h3>Venda Finalizada!</h3>
              <button className="close-btn" onClick={() => setShowReceiptModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="receipt-summary">
              <p>Total: <strong>R$ {saleDataForReceipt?.total.toFixed(2)}</strong></p>
              <p>Itens: {saleDataForReceipt?.items.length}</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>
                Fechar
              </button>
              <button className="btn btn-primary print-btn" onClick={printReceipt}>
                <ReceiptText size={20} />
                Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default NewSale;
