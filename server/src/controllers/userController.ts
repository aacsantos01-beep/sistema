import { Request, Response } from 'express';
import { db } from '../db/database';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for user profile photos
const uploadDir = path.join(process.cwd(), 'uploads/users');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ storage });

export const getAllUsers = (req: Request, res: Response) => {
    try {
        const users = db.prepare('SELECT id, username, role, image_url FROM users ORDER BY username ASC').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const createUser = (req: Request, res: Response) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = db.prepare(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)'
        ).run(username, hashedPassword, role || 'vendedor');
        
        res.status(201).json({ id: result.lastInsertRowid, username, role: role || 'vendedor' });
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: 'Error creating user' });
    }
};

export const updateUser = (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, role, password } = req.body;
    
    try {
        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            db.prepare('UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?')
              .run(username, role, hashedPassword, id);
        } else {
            db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?')
              .run(username, role, id);
        }
        res.json({ id, username, role });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};

export const updateProfile = (req: any, res: Response) => {
    const userId = req.user.id;
    const image_url = req.file ? `/uploads/users/${req.file.filename}` : null;

    if (!image_url) {
        return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    }

    try {
        // Delete old image if exists
        const oldUser: any = db.prepare('SELECT image_url FROM users WHERE id = ?').get(userId);
        if (oldUser && oldUser.image_url) {
            const oldPath = path.join(process.cwd(), oldUser.image_url.substring(1));
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        db.prepare('UPDATE users SET image_url = ? WHERE id = ?').run(image_url, userId);
        res.json({ message: 'Perfil atualizado com sucesso', image_url });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
};

export const deleteUser = (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user: any = db.prepare('SELECT image_url FROM users WHERE id = ?').get(id);
        if (user && user.image_url) {
            const oldPath = path.join(process.cwd(), user.image_url.substring(1));
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};
