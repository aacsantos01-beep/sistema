import { Request, Response } from 'express';
import { db } from '../db/database';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Configure multer for system/logo
const uploadDir = path.join(process.cwd(), 'uploads/system');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage });

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

export const updateLogo = async (req: any, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const logoUrl = `/uploads/system/${req.file.filename}`;
        
        // Check if logo setting exists
        const result = await db.query('SELECT * FROM settings WHERE key = $1', ['company_logo']);
        const existing = result.rows[0];
        
        if (existing) {
            // Delete old logo file if exists
            const oldPath = path.join(process.cwd(), existing.value);
            if (fs.existsSync(oldPath)) {
                try {
                    fs.unlinkSync(oldPath);
                } catch (e) {
                    console.error('Error deleting old logo:', e);
                }
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
