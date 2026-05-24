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

export const getSettings = (req: Request, res: Response) => {
    try {
        const settings = db.prepare('SELECT * FROM settings').all();
        const settingsMap = settings.reduce((acc: any, curr: any) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json(settingsMap);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

export const updateLogo = (req: any, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const logoUrl = `/uploads/system/${req.file.filename}`;
        
        // Check if logo setting exists
        const existing: any = db.prepare('SELECT * FROM settings WHERE key = ?').get('company_logo');
        
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
            db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(logoUrl, 'company_logo');
        } else {
            db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('company_logo', logoUrl);
        }

        res.json({ logoUrl, message: 'Logo updated successfully' });
    } catch (error) {
        console.error('Error updating logo:', error);
        res.status(500).json({ message: 'Error updating logo' });
    }
};

export const updateCompanyName = (req: Request, res: Response) => {
    const { name } = req.body;
    try {
        const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get('company_name');
        if (existing) {
            db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(name, 'company_name');
        } else {
            db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('company_name', name);
        }
        res.json({ message: 'Company name updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating company name' });
    }
};
