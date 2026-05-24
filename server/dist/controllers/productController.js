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
if (!fs_1.default.existsSync(uploadDir)) {
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
const getAllProducts = (req, res) => {
    try {
        const products = database_1.db.prepare('SELECT * FROM products ORDER BY id DESC').all();
        res.json(products);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
};
exports.getAllProducts = getAllProducts;
const getProductById = (req, res) => {
    const { id } = req.params;
    try {
        const product = database_1.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
};
exports.getProductById = getProductById;
const createProduct = (req, res) => {
    const { sku, name, category, supplier, price, stock } = req.body;
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;
    try {
        const result = database_1.db.prepare('INSERT INTO products (sku, name, category, supplier, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)').run(sku, name, category, supplier, price, stock, image_url);
        res.status(201).json({ id: result.lastInsertRowid, sku, name, category, supplier, price, stock, image_url });
    }
    catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'SKU already exists' });
        }
        res.status(500).json({ message: 'Error creating product: ' + error.message });
    }
};
exports.createProduct = createProduct;
const updateProduct = (req, res) => {
    const { id } = req.params;
    const { sku, name, category, supplier, price, stock } = req.body;
    let image_url = req.body.image_url;
    if (req.file) {
        image_url = `/uploads/products/${req.file.filename}`;
    }
    try {
        const result = database_1.db.prepare('UPDATE products SET sku = ?, name = ?, category = ?, supplier = ?, price = ?, stock = ?, image_url = ? WHERE id = ?').run(sku, name, category, supplier, price, stock, image_url, id);
        if (result.changes === 0)
            return res.status(404).json({ message: 'Product not found' });
        res.json({ id, sku, name, category, supplier, price, stock, image_url });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating product: ' + error.message });
    }
};
exports.updateProduct = updateProduct;
const adjustStock = (req, res) => {
    const { id } = req.params;
    const { amount } = req.body; // positive for add, negative for remove
    try {
        const product = database_1.db.prepare('SELECT stock, name FROM products WHERE id = ?').get(id);
        if (!product)
            return res.status(404).json({ message: 'Product not found' });
        if (product.stock + amount < 0) {
            return res.status(400).json({ message: `Estoque insuficiente para o produto ${product.name}. Saldo atual: ${product.stock}` });
        }
        database_1.db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(amount, id);
        const updatedProduct = database_1.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        res.json(updatedProduct);
    }
    catch (error) {
        res.status(500).json({ message: 'Error adjusting stock: ' + error.message });
    }
};
exports.adjustStock = adjustStock;
const deleteProduct = (req, res) => {
    const { id } = req.params;
    try {
        // Find product to delete image
        const product = database_1.db.prepare('SELECT image_url FROM products WHERE id = ?').get(id);
        if (product && product.image_url) {
            // Remove leading slash if present
            const relativePath = product.image_url.startsWith('/') ? product.image_url.substring(1) : product.image_url;
            const filePath = path_1.default.join(process.cwd(), relativePath);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        const result = database_1.db.prepare('DELETE FROM products WHERE id = ?').run(id);
        if (result.changes === 0)
            return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted' });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting product: ' + error.message });
    }
};
exports.deleteProduct = deleteProduct;
