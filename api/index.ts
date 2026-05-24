import { VercelRequest, VercelResponse } from '@vercel/node';

export default (req: VercelRequest, res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';

  // Mock de Login
  if (url.includes('/api/auth/login') && req.method === 'POST') {
    return res.status(200).json({ 
      token: 'mock-token-ok',
      user: { username: 'admin', role: 'admin' }
    });
  }

  // Mock de Dashboard Stats
  if (url.includes('/api/dashboard/stats')) {
    return res.status(200).json({
      totalRevenue: 1500.50,
      totalProducts: 42,
      lowStockCount: 5,
      totalPendingPayables: 3,
      totalPaidPayables: 10,
      monthlyRevenue: 5000.00,
      monthlyExpenses: 2000.00,
      recentSales: [
        { id: 1, created_at: new Date().toISOString(), seller_name: 'Vendedor Teste', total_amount: 150.00 }
      ]
    });
  }

  // Mock de Produtos
  if (url.includes('/api/products')) {
    return res.status(200).json([
      { id: 1, sku: 'PROD001', name: 'Produto Exemplo Vercel', category: 'Teste', price: 99.90, stock: 10 }
    ]);
  }

  // Mock de Vendedores
  if (url.includes('/api/sellers')) {
    return res.status(200).json([
      { id: 1, name: 'Vendedor Administrador', active: 1 }
    ]);
  }

  // Mock de Configurações
  if (url.includes('/api/settings')) {
    return res.status(200).json({
      company_name: 'IR Assistência (Demo)',
      company_logo: null
    });
  }

  return res.status(200).json({ message: 'API Mock Mode Active', url });
};
