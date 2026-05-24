import * as express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'REDACTED_ROTATED_JWT_SECRET';

export const login = async (req: express.Request, res: express.Response) => {
    const { username, password } = req.body;

    try {
        if (!db) throw new Error('Database pool not initialized');
        
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const isMatch = bcrypt.compareSync(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, image_url: user.image_url },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                image_url: user.image_url
            }
        });
    } catch (error: any) {
        console.error('Login error details:', error);
        res.status(500).json({ 
            message: 'Erro interno no servidor', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

export const getMe = (req: any, res: express.Response) => {
    res.json({ user: req.user });
};
