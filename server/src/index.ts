import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb, db } from './db/database';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import saleRoutes from './routes/saleRoutes';
import budgetRoutes from './routes/budgetRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import sellerRoutes from './routes/sellerRoutes';
import userRoutes from './routes/userRoutes';
import settingsRoutes from './routes/settingsRoutes';
import payableRoutes from './routes/payableRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Middleware to ensure DB is initialized
let dbInitialized = false;
app.use(async (req, res, next) => {
    if (!dbInitialized && req.path !== '/api/health') {
        try {
            await initDb();
            dbInitialized = true;
        } catch (err) {
            console.error('Database lazy init failed:', err);
        }
    }
    next();
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ status: 'ok', database: 'connected', time: result.rows[0].now });
    } catch (error: any) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payables', payableRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('IR Assistência Técnica API is running');
});

// Start server - ONLY locally
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

export default app;
