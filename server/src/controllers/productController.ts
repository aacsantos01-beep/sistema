import { Request, Response } from 'express';
import { db } from '../db/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Use process.cwd() to get the root of the server directory
const uploadDir = path.join(process.cwd(), 'uploads/products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage });

export const getAllProducts = (req: Request, res: Response) => {
    try {
        const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
};

export const getProductById = (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
};

export const createProduct = (req: Request, res: Response) => {
    const { sku, name, category, supplier, price, stock } = req.body;
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;
    
    try {
        const result = db.prepare(
            'INSERT INTO products (sku, name, category, supplier, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(sku, name, category, supplier, price, stock, image_url);
        res.status(201).json({ id: result.lastInsertRowid, sku, name, category, supplier, price, stock, image_url });
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'SKU already exists' });
        }
        res.status(500).json({ message: 'Error creating product: ' + error.message });
    }
};

export const updateProduct = (req: Request, res: Response) => {
    const { id } = req.params;
    const { sku, name, category, supplier, price, stock } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
        image_url = `/uploads/products/${req.file.filename}`;
    }

    try {
        const result = db.prepare(
            'UPDATE products SET sku = ?, name = ?, category = ?, supplier = ?, price = ?, stock = ?, image_url = ? WHERE id = ?'
        ).run(sku, name, category, supplier, price, stock, image_url, id);
        if (result.changes === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ id, sku, name, category, supplier, price, stock, image_url });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating product: ' + error.message });
    }
};

export const adjustStock = (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body; // positive for add, negative for remove
    try {
        const product: any = db.prepare('SELECT stock, name FROM products WHERE id = ?').get(id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (product.stock + amount < 0) {
            return res.status(400).json({ message: `Estoque insuficiente para o produto ${product.name}. Saldo atual: ${product.stock}` });
        }

        db.prepare(
            'UPDATE products SET stock = stock + ? WHERE id = ?'
        ).run(amount, id);
        
        const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        res.json(updatedProduct);
    } catch (error: any) {
        res.status(500).json({ message: 'Error adjusting stock: ' + error.message });
    }
};

export const deleteProduct = (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Find product to delete image
        const product: any = db.prepare('SELECT image_url FROM products WHERE id = ?').get(id);
        if (product && product.image_url) {
            // Remove leading slash if present
            const relativePath = product.image_url.startsWith('/') ? product.image_url.substring(1) : product.image_url;
            const filePath = path.join(process.cwd(), relativePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
        if (result.changes === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted' });
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting product: ' + error.message });
    }
};
