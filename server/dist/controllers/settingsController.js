"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCompanyName = exports.updateLogo = exports.getSettings = exports.upload = void 0;
const database_1 = require("../db/database");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
// Configure multer for system/logo
const uploadDir = path_1.default.join(process.cwd(), 'uploads/system');
if (!process.env.VERCEL && !fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
exports.upload = (0, multer_1.default)({ storage });
const getSettings = async (req, res) => {
    try {
        const result = await database_1.db.query('SELECT * FROM settings');
        const settingsMap = result.rows.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        res.json(settingsMap);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
};
exports.getSettings = getSettings;
const updateLogo = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const logoUrl = `/uploads/system/${file.filename}`;
        // Check if logo setting exists
        const result = await database_1.db.query('SELECT * FROM settings WHERE key = $1', ['company_logo']);
        const existing = result.rows[0];
        if (existing) {
            // Delete old logo file if exists
            const oldPath = path_1.default.join(process.cwd(), existing.value);
            if (fs_1.default.existsSync(oldPath)) {
                try {
                    fs_1.default.unlinkSync(oldPath);
                }
                catch (e) {
                    console.error('Error deleting old logo:', e);
                }
            }
            await database_1.db.query('UPDATE settings SET value = $1 WHERE key = $2', [logoUrl, 'company_logo']);
        }
        else {
            await database_1.db.query('INSERT INTO settings (key, value) VALUES ($1, $2)', ['company_logo', logoUrl]);
        }
        res.json({ logoUrl, message: 'Logo updated successfully' });
    }
    catch (error) {
        console.error('Error updating logo:', error);
        res.status(500).json({ message: 'Error updating logo' });
    }
};
exports.updateLogo = updateLogo;
const updateCompanyName = async (req, res) => {
    const { name } = req.body;
    try {
        const result = await database_1.db.query('SELECT * FROM settings WHERE key = $1', ['company_name']);
        if (result.rows.length > 0) {
            await database_1.db.query('UPDATE settings SET value = $1 WHERE key = $2', [name, 'company_name']);
        }
        else {
            await database_1.db.query('INSERT INTO settings (key, value) VALUES ($1, $2)', ['company_name', name]);
        }
        res.json({ message: 'Company name updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating company name' });
    }
};
exports.updateCompanyName = updateCompanyName;
