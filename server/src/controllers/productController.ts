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

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
        const product = result.rows[0];
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching product' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    const { sku, name, category, supplier, price, stock } = req.body;
    const image_url = req.file ? `/uploads/products/${req.file.filename}` : null;
    
    try {
        const result = await db.query(
            'INSERT INTO products (sku, name, category, supplier, price, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [sku, name, category, supplier, price, stock, image_url]
        );
        res.status(201).json({ id: result.rows[0].id, sku, name, category, supplier, price, stock, image_url });
    } catch (error: any) {
        if (error.code === '23505') { // Postgres unique constraint violation
            return res.status(400).json({ message: 'SKU already exists' });
        }
        res.status(500).json({ message: 'Error creating product: ' + error.message });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { sku, name, category, supplier, price, stock } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
        image_url = `/uploads/products/${req.file.filename}`;
    }

    try {
        const result = await db.query(
            'UPDATE products SET sku = $1, name = $2, category = $3, supplier = $4, price = $5, stock = $6, image_url = $7 WHERE id = $8',
            [sku, name, category, supplier, price, stock, image_url, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ id, sku, name, category, supplier, price, stock, image_url });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating product: ' + error.message });
    }
};

export const adjustStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount } = req.body; // positive for add, negative for remove
    try {
        const result = await db.query('SELECT stock, name FROM products WHERE id = $1', [id]);
        const product = result.rows[0];
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (product.stock + amount < 0) {
            return res.status(400).json({ message: `Estoque insuficiente para o produto ${product.name}. Saldo atual: ${product.stock}` });
        }

        await db.query(
            'UPDATE products SET stock = stock + $1 WHERE id = $2',
            [amount, id]
        );
        
        const updateResult = await db.query('SELECT * FROM products WHERE id = $1', [id]);
        res.json(updateResult.rows[0]);
    } catch (error: any) {
        res.status(500).json({ message: 'Error adjusting stock: ' + error.message });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Find product to delete image
        const result = await db.query('SELECT image_url FROM products WHERE id = $1', [id]);
        const product = result.rows[0];
        if (product && product.image_url) {
            // Remove leading slash if present
            const relativePath = product.image_url.startsWith('/') ? product.image_url.substring(1) : product.image_url;
            const filePath = path.join(process.cwd(), relativePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        const deleteResult = await db.query('DELETE FROM products WHERE id = $1', [id]);
        if (deleteResult.rowCount === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted' });
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting product: ' + error.message });
    }
};
