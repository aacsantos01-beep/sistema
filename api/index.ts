import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working directly from /api/test' });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        res.json({ 
            token: 'mock-token-for-testing',
            user: { username: 'admin', role: 'admin' }
        });
    } else {
        res.status(401).json({ message: 'Credenciais inválidas' });
    }
});

// Fallback for other API routes
app.all('/api/(.*)', (req, res) => {
    res.json({ message: 'API catch-all reached', path: req.path });
});

export default app;
