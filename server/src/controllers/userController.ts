import { Request, Response } from 'express';
import { db } from '../db/database';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for user profile photos
const uploadDir = path.join(process.cwd(), 'uploads/users');
if (!process.env.VERCEL && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req: Request, file: Express.Multer.File, cb: any) => {
        cb(null, uploadDir);
    },
    filename: (req: Request, file: Express.Multer.File, cb: any) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req: Request, file: Express.Multer.File, cb: any) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas'));
        }
    }
});

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
    const file = req.file as Express.Multer.File | undefined;
    const image_url = file ? `/uploads/users/${file.filename}` : null;
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = await db.query(
            'INSERT INTO users (username, password, role, image_url) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, hashedPassword, role || 'vendedor', image_url]
        );

        res.status(201).json({ id: result.rows[0].id, username, role: role || 'vendedor', image_url });
    } catch (error: any) {
        // If insertion fails after file was uploaded, remove the orphan file
        if (file) {
            const filePath = path.join(uploadDir, file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: 'Error creating user' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { username, role, password } = req.body;
    const file = req.file as Express.Multer.File | undefined;
    let image_url: string | null | undefined = undefined;

    try {
        // Fetch the existing user so we can manage the old photo if it gets replaced
        const existingResult = await db.query('SELECT image_url FROM users WHERE id = $1', [id]);
        const existingUser = existingResult.rows[0];
        if (!existingUser) return res.status(404).json({ message: 'User not found' });

        if (file) {
            image_url = `/uploads/users/${file.filename}`;
            // Remove the old photo from disk if present
            if (existingUser.image_url) {
                const oldPath = path.join(process.cwd(), existingUser.image_url.substring(1));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            if (image_url !== undefined) {
                await db.query(
                    'UPDATE users SET username = $1, role = $2, password = $3, image_url = $4 WHERE id = $5',
                    [username, role, hashedPassword, image_url, id]
                );
            } else {
                await db.query(
                    'UPDATE users SET username = $1, role = $2, password = $3 WHERE id = $4',
                    [username, role, hashedPassword, id]
                );
            }
        } else {
            if (image_url !== undefined) {
                await db.query(
                    'UPDATE users SET username = $1, role = $2, image_url = $3 WHERE id = $4',
                    [username, role, image_url, id]
                );
            } else {
                await db.query(
                    'UPDATE users SET username = $1, role = $2 WHERE id = $3',
                    [username, role, id]
                );
            }
        }

        res.json({ id, username, role, image_url: image_url !== undefined ? image_url : existingUser.image_url });
    } catch (error: any) {
        // If the update fails after a new file was uploaded, remove the orphan file
        if (file) {
            const filePath = path.join(uploadDir, file.filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        res.status(500).json({ message: 'Error updating user' });
    }
};

export const updateProfile = async (req: any, res: Response) => {
    const userId = req.user.id;
    const file = req.file as Express.Multer.File;
    const image_url = file ? `/uploads/users/${file.filename}` : null;

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

