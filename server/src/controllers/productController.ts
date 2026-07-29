import { Request, Response } from 'express';
import { db } from '../db/database';
import multer from 'multer';
import { uploadFile, deleteFile, generateFilename } from '../services/storageService';

// Files are received in memory and streamed to Supabase Storage — no local disk writes,
// which is required for serverless (Vercel) where the filesystem is ephemeral/read-only.
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    }
});

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
    const file = req.file as Express.Multer.File | undefined;

    try {
        let image_url: string | null = null;
        if (file) {
            const filename = generateFilename('', file.originalname);
            image_url = await uploadFile('products', filename, file.buffer, file.mimetype);
        }

        const result = await db.query(
            'INSERT INTO products (sku, name, category, supplier, price, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [sku, name, category, supplier, price, stock, image_url]
        );
        res.status(201).json({ id: result.rows[0].id, sku, name, category, supplier, price, stock, image_url });
    } catch (error: any) {
        if (error.code === '23505') { // Postgres unique constraint violation
            return res.status(400).json({ message: 'SKU already exists' });
        }
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error creating product' });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { sku, name, category, supplier, price, stock } = req.body;
    const file = req.file as Express.Multer.File | undefined;

    try {
        const existingResult = await db.query('SELECT image_url FROM products WHERE id = $1', [id]);
        const existing = existingResult.rows[0];
        if (!existing) return res.status(404).json({ message: 'Product not found' });

        let image_url: string | null = existing.image_url;
        if (file) {
            const filename = generateFilename('', file.originalname);
            image_url = await uploadFile('products', filename, file.buffer, file.mimetype);
            if (existing.image_url) {
                deleteFile(existing.image_url).catch(() => {});
            }
        }

        const result = await db.query(
            'UPDATE products SET sku = $1, name = $2, category = $3, supplier = $4, price = $5, stock = $6, image_url = $7 WHERE id = $8',
            [sku, name, category, supplier, price, stock, image_url, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ id, sku, name, category, supplier, price, stock, image_url });
    } catch (error: any) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Error updating product' });
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
        console.error('Error adjusting stock:', error);
        res.status(500).json({ message: 'Error adjusting stock' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT image_url FROM products WHERE id = $1', [id]);
        const product = result.rows[0];

        const deleteResult = await db.query('DELETE FROM products WHERE id = $1', [id]);
        if (deleteResult.rowCount === 0) return res.status(404).json({ message: 'Product not found' });

        if (product && product.image_url) {
            deleteFile(product.image_url).catch(() => {});
        }

        res.json({ message: 'Product deleted' });
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};
