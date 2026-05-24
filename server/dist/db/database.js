"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = exports.db = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Force numeric types to be parsed as numbers instead of strings
pg_1.types.setTypeParser(1700, (val) => parseFloat(val)); // NUMERIC/DECIMAL
pg_1.types.setTypeParser(20, (val) => parseInt(val, 10)); // BIGINT
dotenv_1.default.config();
if (!process.env.DATABASE_URL) {
    console.error('CRITICAL ERROR: DATABASE_URL is not defined in environment variables.');
}
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
// No Vercel/Produção, a DATABASE_URL deve ser fornecida
// Localmente, você pode usar uma string de conexão ou variáveis individuais
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    max: 10, // Limit connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});
exports.db = pool;
const initDb = async () => {
    if (global.dbInitialized)
        return;
    console.log('Initializing database connection...');
    let client;
    try {
        client = await pool.connect();
        console.log('Connected to PostgreSQL successfully.');
        await client.query('BEGIN');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                image_url TEXT,
                role TEXT DEFAULT 'admin'
            );

            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                sku TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                supplier TEXT,
                price DECIMAL(10,2) NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sellers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS sales (
                id SERIAL PRIMARY KEY,
                total_amount DECIMAL(10,2) NOT NULL,
                user_id INTEGER,
                seller_id INTEGER,
                payment_method TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (seller_id) REFERENCES sellers(id)
            );

            CREATE TABLE IF NOT EXISTS sale_items (
                id SERIAL PRIMARY KEY,
                sale_id INTEGER NOT NULL,
                product_id INTEGER,
                service_name TEXT,
                quantity INTEGER NOT NULL,
                price_at_sale DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales(id),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS budgets (
                id SERIAL PRIMARY KEY,
                customer_name TEXT,
                total_amount DECIMAL(10,2) NOT NULL,
                user_id INTEGER,
                seller_id INTEGER,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (seller_id) REFERENCES sellers(id)
            );

            CREATE TABLE IF NOT EXISTS budget_items (
                id SERIAL PRIMARY KEY,
                budget_id INTEGER NOT NULL,
                product_id INTEGER,
                item_name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                is_service INTEGER DEFAULT 0,
                has_warranty INTEGER DEFAULT 0,
                warranty_time TEXT,
                FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS payables (
                id SERIAL PRIMARY KEY,
                description TEXT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                due_date DATE NOT NULL,
                status TEXT DEFAULT 'pending',
                category TEXT,
                payment_method TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Create default admin user if not exists
        const adminRes = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
        if (adminRes.rows.length === 0) {
            const hashedPassword = bcryptjs_1.default.hashSync('admin123', 10);
            await client.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', ['admin', hashedPassword, 'admin']);
            console.log('Default admin user created.');
        }
        await client.query('COMMIT');
        global.dbInitialized = true;
        console.log('Database initialization completed.');
    }
    catch (e) {
        if (client)
            await client.query('ROLLBACK');
        console.error('Error initializing database:', e);
        throw e;
    }
    finally {
        if (client)
            client.release();
    }
};
exports.initDb = initDb;
