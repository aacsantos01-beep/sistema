"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dbPath = path_1.default.resolve(__dirname, '../../data/tatutech.db');
const dbDir = path_1.default.dirname(dbPath);
// Ensure data directory exists
const fs_1 = __importDefault(require("fs"));
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
const db = new better_sqlite3_1.default(dbPath);
exports.db = db;
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
// Initialize tables
const initDb = () => {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            image_url TEXT,
            role TEXT DEFAULT 'admin'
        );

        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sku TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            category TEXT,
            supplier TEXT,
            price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sellers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total_amount REAL NOT NULL,
            user_id INTEGER,
            seller_id INTEGER,
            payment_method TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (seller_id) REFERENCES sellers(id)
        );

        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            product_id INTEGER, -- NULL for services
            service_name TEXT, -- name for service items
            quantity INTEGER NOT NULL,
            price_at_sale REAL NOT NULL,
            FOREIGN KEY (sale_id) REFERENCES sales(id),
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT,
            total_amount REAL NOT NULL,
            user_id INTEGER,
            seller_id INTEGER,
            status TEXT DEFAULT 'pending', -- pending, converted, cancelled
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (seller_id) REFERENCES sellers(id)
        );

        CREATE TABLE IF NOT EXISTS budget_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            budget_id INTEGER NOT NULL,
            product_id INTEGER, -- NULL for services
            item_name TEXT NOT NULL, -- name of product or service
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            is_service INTEGER DEFAULT 0, -- 1 for service, 0 for product
            has_warranty INTEGER DEFAULT 0,
            warranty_time TEXT,
            FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
        );
    `);
    // Migrations for existing databases
    try {
        db.prepare('ALTER TABLE products ADD COLUMN supplier TEXT').run();
        console.log('Migration: Added supplier column to products table.');
    }
    catch (e) {
        // Column might already exist
    }
    try {
        db.prepare('ALTER TABLE users ADD COLUMN image_url TEXT').run();
        console.log('Migration: Added image_url column to users table.');
    }
    catch (e) {
        // Column might already exist
    }
    // Migration for sale_items to support NULL product_id (for services)
    try {
        const tableInfo = db.prepare("PRAGMA table_info(sale_items)").all();
        const productIdCol = tableInfo.find((col) => col.name === 'product_id');
        if (productIdCol && productIdCol.notnull === 1) {
            console.log('Migration: Making product_id nullable in sale_items...');
            db.exec(`
                CREATE TABLE sale_items_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sale_id INTEGER NOT NULL,
                    product_id INTEGER,
                    service_name TEXT,
                    quantity INTEGER NOT NULL,
                    price_at_sale REAL NOT NULL,
                    FOREIGN KEY (sale_id) REFERENCES sales(id),
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
                );
                INSERT INTO sale_items_new (id, sale_id, product_id, quantity, price_at_sale)
                SELECT id, sale_id, product_id, quantity, price_at_sale FROM sale_items;
                DROP TABLE sale_items;
                ALTER TABLE sale_items_new RENAME TO sale_items;
            `);
            console.log('Migration: sale_items table updated successfully.');
        }
    }
    catch (e) {
        console.error('Migration Error (sale_items):', e.message);
    }
    // Create default admin user if not exists
    const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    if (!adminExists) {
        const hashedPassword = bcryptjs_1.default.hashSync('admin123', 10);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hashedPassword, 'admin');
        console.log('Default admin user created.');
    }
};
exports.initDb = initDb;
