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

export const getSettings = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM settings');
        const settingsMap = result.rows.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json(settingsMap);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

export const updateLogo = async (req: Request, res: Response) => {
    try {
        const file = req.file as Express.Multer.File | undefined;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const filename = generateFilename('logo-', file.originalname);
        const logoUrl = await uploadFile('system', filename, file.buffer, file.mimetype);

        const result = await db.query('SELECT * FROM settings WHERE key = $1', ['company_logo']);
        const existing = result.rows[0];

        if (existing) {
            if (existing.value) {
                deleteFile(existing.value).catch(() => {});
            }
            await db.query('UPDATE settings SET value = $1 WHERE key = $2', [logoUrl, 'company_logo']);
        } else {
            await db.query('INSERT INTO settings (key, value) VALUES ($1, $2)', ['company_logo', logoUrl]);
        }

        res.json({ logoUrl, message: 'Logo updated successfully' });
    } catch (error) {
        console.error('Error updating logo:', error);
        res.status(500).json({ message: 'Error updating logo' });
    }
};

export const updateCompanyName = async (req: Request, res: Response) => {
    const { name } = req.body;
    try {
        const result = await db.query('SELECT * FROM settings WHERE key = $1', ['company_name']);
        if (result.rows.length > 0) {
            await db.query('UPDATE settings SET value = $1 WHERE key = $2', [name, 'company_name']);
        } else {
            await db.query('INSERT INTO settings (key, value) VALUES ($1, $2)', ['company_name', name]);
        }
        res.json({ message: 'Company name updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating company name' });
    }
};
