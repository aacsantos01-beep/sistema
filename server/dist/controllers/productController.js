"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.adjustStock = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getAllProducts = exports.upload = void 0;
const database_1 = require("../db/database");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Use process.cwd() to get the root of the server directory
const uploadDir = path_1.default.join(process.cwd(), 'uploads/products');
if (!process.env.VERCEL && !fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
exports.upload = (0, multer_1.default)({ storage });
const getAllProducts = async (req, res) => {
    try {
        const result = await database_1.db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
};
exports.getAllProducts = getAllProducts;
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await database_1.db.query('SELECT * FROM products WHERE id = $1', [id]);
        const product = result.rows[0];
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
};
exports.getProductById = getProductById;
const createProduct = async (req, res) => {
    const { sku, name, category, supplier, price, stock } = req.body;
    const file = req.file;
    const image_url = file ? `/uploads/products/${file.filename}` : null;
    try {
        const result = await database_1.db.query('INSERT INTO products (sku, name, category, supplier, price, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id', [sku, name, category, supplier, price, stock, image_url]);
        res.status(201).json({ id: result.rows[0].id, sku, name, category, supplier, price, stock, image_url });
    }
    catch (error) {
        if (error.code === '23505') { // Postgres unique constraint violation
            return res.status(400).json({ message: 'SKU already exists' });
        }
        res.status(500).json({ message: 'Error creating product: ' + error.message });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { sku, name, category, supplier, price, stock } = req.body;
    let image_url = req.body.image_url;
    const file = req.file;
    if (file) {
        image_url = `/uploads/products/${file.filename}`;
    }
    try {
        const result = await database_1.db.query('UPDATE products SET sku = $1, name = $2, category = $3, supplier = $4, price = $5, stock = $6, image_url = $7 WHERE id = $8', [sku, name, category, supplier, price, stock, image_url, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Product not found' });
        res.json({ id, sku, name, category, supplier, price, stock, image_url });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating product: ' + error.message });
    }
};
exports.updateProduct = updateProduct;
const adjustStock = async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body; // positive for add, negative for remove
    try {
        const result = await database_1.db.query('SELECT stock, name FROM products WHERE id = $1', [id]);
        const product = result.rows[0];
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        if (product.stock + amount < 0) {
            return res.status(400).json({ message: `Estoque insuficiente para o produto ${product.name}. Saldo atual: ${product.stock}` });
        }
        await database_1.db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [amount, id]);
        const updateResult = await database_1.db.query('SELECT * FROM products WHERE id = $1', [id]);
        res.json(updateResult.rows[0]);
    }
    catch (error) {
        res.status(500).json({ message: 'Error adjusting stock: ' + error.message });
    }
};
exports.adjustStock = adjustStock;
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        // Find product to delete image
        const result = await database_1.db.query('SELECT image_url FROM products WHERE id = $1', [id]);
        const product = result.rows[0];
        if (product && product.image_url) {
            // Remove leading slash if present
            const relativePath = product.image_url.startsWith('/') ? product.image_url.substring(1) : product.image_url;
            const filePath = path_1.default.join(process.cwd(), relativePath);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        const deleteResult = await database_1.db.query('DELETE FROM products WHERE id = $1', [id]);
        if (deleteResult.rowCount === 0)
            return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted' });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting product: ' + error.message });
    }
};
exports.deleteProduct = deleteProduct;
