import { VercelRequest, VercelResponse } from '@vercel/node';

export default (req: VercelRequest, res: VercelResponse) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '';

  if (url.includes('/api/test')) {
    return res.status(200).json({ message: 'API is working directly from Vercel function' });
  }

  if (url.includes('/api/auth/login') && req.method === 'POST') {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
      return res.status(200).json({ 
        token: 'mock-token-for-testing',
        user: { username: 'admin', role: 'admin' }
      });
    } else {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }
  }

  return res.status(200).json({ 
    message: 'API catch-all reached', 
    url, 
    method: req.method 
  });
};
