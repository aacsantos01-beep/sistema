import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { DollarSign, Package, AlertTriangle, TrendingUp, CreditCard, FileText } from 'lucide-react';
import { API_URL, BASE_URL } from '../config';
import { authenticatedFetch } from '../services/api';
import './Dashboard.css';

interface DashboardStats {
  totalRevenue: number;
  totalProducts: number;
  lowStockCount: number;
  totalPendingPayables: number;
  totalPaidPayables: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  recentSales: any[];
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch(`${API_URL}/dashboard/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const generateMonthlyReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/dashboard/report`);
      const data = await response.json();
      
      const settingsRes = await authenticatedFetch(`${API_URL}/settings`);
      const settings = await settingsRes.json();

      const windowPrint = window.open('', '', 'width=900,height=900');
      if (!windowPrint) return;

      const totalRevenue = data.sales.reduce((sum: number, s: any) => sum + s.total_amount, 0);
      const totalExpenses = data.payables.reduce((sum: number, p: any) => sum + p.amount, 0);
      const netIncome = totalRevenue - totalExpenses;

      windowPrint.document.write(`
        <html>
          <head>
            <title>Relatório Mensal - ${data.month}</title>
            <style>
              body { font-family: sans-serif; padding: 30px; color: #333; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
              .header img { max-width: 150px; max-height: 80px; margin-bottom: 10px; object-fit: contain; }
              .header h1 { margin: 0; font-size: 24px; }
              .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
              .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
              .summary-card h4 { margin: 0 0 10px 0; color: #666; font-size: 14px; text-transform: uppercase; }
              .summary-card p { margin: 0; font-size: 20px; font-weight: bold; }
              .section-title { background: #f4f4f4; padding: 10px; margin: 30px 0 15px 0; font-size: 18px; font-weight: bold; border-left: 5px solid #000; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th { text-align: left; background: #eee; padding: 10px; border-bottom: 2px solid #ddd; font-size: 13px; }
              td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
              .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #999; }
              .positive { color: #10b981; }
              .negative { color: #ef4444; }
            </style>
          </head>
          <body>
            <div class="header">
              ${settings.company_logo ? `<img src="${BASE_URL}${settings.company_logo}" alt="Logo" />` : ''}
              <h1>RELATÓRIO FINANCEIRO MENSAL</h1>
              <p>${settings.company_name || 'IR Assistência Técnica'}</p>
              <p>Referência: ${data.month}</p>
            </div>

            <div class="summary-grid">
              <div class="summary-card">
                <h4>Receita Bruta</h4>
                <p class="positive">R$ ${totalRevenue.toFixed(2)}</p>
              </div>
              <div class="summary-card">
                <h4>Despesas Pagas</h4>
                <p class="negative">R$ ${totalExpenses.toFixed(2)}</p>
              </div>
              <div class="summary-card">
                <h4>Resultado Líquido</h4>
                <p class="${netIncome >= 0 ? 'positive' : 'negative'}">R$ ${netIncome.toFixed(2)}</p>
              </div>
            </div>

            <div class="section-title">ENTRADAS (VENDAS)</div>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>ID</th>
                  <th>Vendedor</th>
                  <th>Pagamento</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${data.sales.map((s: any) => `
                  <tr>
                    <td>${new Date(s.created_at).toLocaleDateString()}</td>
                    <td>#${s.id}</td>
                    <td>${s.seller_name || 'N/A'}</td>
                    <td>${s.payment_method || 'N/A'}</td>
                    <td>R$ ${s.total_amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="section-title">SAÍDAS (CONTAS PAGAS)</div>
            <table>
              <thead>
                <tr>
                  <th>Data Pago</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Pagamento</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${data.payables.map((p: any) => `
                  <tr>
                    <td>${new Date(p.due_date).toLocaleDateString()}</td>
                    <td>${p.description}</td>
                    <td>${p.category || 'N/A'}</td>
                    <td>${p.payment_method || 'N/A'}</td>
                    <td>R$ ${p.amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>Relatório gerado em ${new Date().toLocaleString()}</p>
            </div>
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      windowPrint.document.close();
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) return <Layout title="Dashboard"><p>Carregando...</p></Layout>;

  return (
    <Layout title="Dashboard">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button 
          className="btn btn-primary add-btn" 
          onClick={generateMonthlyReport}
          disabled={generatingReport}
        >
          <FileText size={20} />
          {generatingReport ? 'Gerando...' : 'Gerar Relatório Mensal PDF'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon revenue" style={{ backgroundColor: '#f0fdf4', color: '#166534' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Receita Líquida (Mês)</span>
            <h3 className="stat-value" style={{ color: (stats?.monthlyRevenue || 0) - (stats?.monthlyExpenses || 0) >= 0 ? '#10b981' : '#ef4444' }}>
              R$ {((stats?.monthlyRevenue || 0) - (stats?.monthlyExpenses || 0)).toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Entradas (Mês)</span>
            <h3 className="stat-value">R$ {(stats?.monthlyRevenue || 0).toFixed(2)}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon low-stock">
            <CreditCard size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Saídas (Mês)</span>
            <h3 className="stat-value" style={{ color: '#ef4444' }}>R$ {(stats?.monthlyExpenses || 0).toFixed(2)}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon products">
            <Package size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total de Produtos</span>
            <h3 className="stat-value">{stats?.totalProducts}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="card recent-sales">
          <div className="card-header">
            <h3>Vendas Recentes</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Vendedor</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentSales?.map((sale) => (
                <tr key={sale.id}>
                  <td>#{sale.id}</td>
                  <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                  <td>{sale.seller_name || 'N/A'}</td>
                  <td>R$ {sale.total_amount.toFixed(2)}</td>
                </tr>
              ))}
              {(stats?.recentSales?.length === 0 || !stats?.recentSales) && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                    Nenhuma venda registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
