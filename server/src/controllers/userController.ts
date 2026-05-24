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

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT id, username, role, image_url FROM users ORDER BY username ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const createUser = async (req: Request, res: Response) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = await db.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id',
            [username, hashedPassword, role || 'vendedor']
        );
        
        res.status(201).json({ id: result.rows[0].id, username, role: role || 'vendedor' });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: 'Error creating user' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, role, password } = req.body;
    
    try {
        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            await db.query('UPDATE users SET username = $1, role = $2, password = $3 WHERE id = $4',
              [username, role, hashedPassword, id]);
        } else {
            await db.query('UPDATE users SET username = $1, role = $2 WHERE id = $3',
              [username, role, id]);
        }
        res.json({ id, username, role });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};

export const updateProfile = async (req: any, res: Response) => {
    const userId = req.user.id;
    const image_url = req.file ? `/uploads/users/${req.file.filename}` : null;

    if (!image_url) {
        return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    }

    try {
        // Delete old image if exists
        const result = await db.query('SELECT image_url FROM users WHERE id = $1', [userId]);
        const oldUser = result.rows[0];
        if (oldUser && oldUser.image_url) {
            const oldPath = path.join(process.cwd(), oldUser.image_url.substring(1));
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        await db.query('UPDATE users SET image_url = $1 WHERE id = $2', [image_url, userId]);
        res.json({ message: 'Perfil atualizado com sucesso', image_url });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT image_url FROM users WHERE id = $1', [id]);
        const user = result.rows[0];
        if (user && user.image_url) {
            const oldPath = path.join(process.cwd(), user.image_url.substring(1));
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};
