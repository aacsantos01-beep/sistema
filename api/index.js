module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simulação de Login para Teste
  if (req.url.includes('/api/auth/login') && req.method === 'POST') {
    const { username, password } = req.body || {};
    
    if (username === 'admin' && password === 'admin123') {
      return res.status(200).json({ 
        token: 'mock-token-ok',
        user: { username: 'admin', role: 'admin' }
      });
    } else {
      return res.status(401).json({ message: 'Usuário ou senha incorretos' });
    }
  }

  // Rota de Teste
  if (req.url.includes('/api/test')) {
    return res.status(200).json({ status: 'success', message: 'API JS is working' });
  }

  return res.status(200).json({ message: 'API Mock Root', url: req.url });
};
