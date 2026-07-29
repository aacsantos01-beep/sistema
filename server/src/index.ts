import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import trashRoutes from './routes/trashRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the first proxy hop (Vercel) so req.ip / rate limiting see the real client IP
app.set('trust proxy', 1);

// Standard security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
// CSP disabled: this API serves JSON + uploaded images, not HTML pages that need it.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. server-to-server, curl, health checks)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
}));
// Increase body size limits to support image uploads (e.g. user profile photos)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
        console.error('Health check failed:', error);
        res.status(500).json({ status: 'error', database: 'disconnected' });
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
app.use('/api/trash', trashRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('IR Assistência Técnica API is running');
});

// Global error handler — translates multer errors (e.g. file too large)
// into 400 responses with a clear message instead of generic 500s.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: 'Arquivo muito grande. Tamanho máximo: 5MB.' });
        }
        return res.status(400).json({ message: err.message || 'Erro no upload do arquivo' });
    }
    if (err && err.message) {
        return res.status(400).json({ message: err.message });
    }
    return next(err);
});

// Start server - ONLY locally
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

export default app;
