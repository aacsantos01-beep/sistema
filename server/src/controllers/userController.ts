import { Request, Response } from 'express';
import { db } from '../db/database';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { uploadFile, deleteFile, generateFilename } from '../services/storageService';
import { logActivity } from '../services/activityLogService';

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

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT id, username, role, image_url FROM users ORDER BY username ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const createUser = async (req: any, res: Response) => {
    const { username, password, role } = req.body;
    const file = req.file as Express.Multer.File | undefined;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
        return res.status(400).json({ message: 'Usuário deve ter pelo menos 3 caracteres' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ message: 'Senha deve ter pelo menos 8 caracteres' });
    }

    try {
        let image_url: string | null = null;
        if (file) {
            const filename = generateFilename('profile-', file.originalname);
            image_url = await uploadFile('users', filename, file.buffer, file.mimetype);
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const result = await db.query(
            'INSERT INTO users (username, password, role, image_url) VALUES ($1, $2, $3, $4) RETURNING id',
            [username, hashedPassword, role || 'vendedor', image_url]
        );

        logActivity(req.user?.id, req.user?.username, 'create_user', 'user', result.rows[0].id, `Criou o usuário "${username}" (${role || 'vendedor'})`);

        res.status(201).json({ id: result.rows[0].id, username, role: role || 'vendedor', image_url });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

export const updateUser = async (req: any, res: Response) => {
    const { id } = req.params;
    const { username, role, password } = req.body;
    const file = req.file as Express.Multer.File | undefined;

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
        return res.status(400).json({ message: 'Usuário deve ter pelo menos 3 caracteres' });
    }
    if (password && (typeof password !== 'string' || password.length < 8)) {
        return res.status(400).json({ message: 'Senha deve ter pelo menos 8 caracteres' });
    }

    try {
        const existingResult = await db.query('SELECT image_url, role FROM users WHERE id = $1', [id]);
        const existingUser = existingResult.rows[0];
        if (!existingUser) return res.status(404).json({ message: 'User not found' });

        if (existingUser.role === 'admin' && role !== 'admin') {
            const adminCountResult = await db.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
            if (parseInt(adminCountResult.rows[0].count, 10) <= 1) {
                return res.status(400).json({ message: 'Não é possível rebaixar o último administrador do sistema' });
            }
        }

        let image_url: string | null = existingUser.image_url;
        if (file) {
            const filename = generateFilename('profile-', file.originalname);
            image_url = await uploadFile('users', filename, file.buffer, file.mimetype);
            if (existingUser.image_url) {
                deleteFile(existingUser.image_url).catch(() => {});
            }
        }

        if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            await db.query(
                'UPDATE users SET username = $1, role = $2, password = $3, image_url = $4 WHERE id = $5',
                [username, role, hashedPassword, image_url, id]
            );
        } else {
            await db.query(
                'UPDATE users SET username = $1, role = $2, image_url = $3 WHERE id = $4',
                [username, role, image_url, id]
            );
        }

        logActivity(req.user?.id, req.user?.username, 'update_user', 'user', id, `Atualizou o usuário "${username}" (${role})${password ? ' e trocou a senha' : ''}`);

        res.json({ id, username, role, image_url });
    } catch (error: any) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

export const updateProfile = async (req: any, res: Response) => {
    const userId = req.user.id;
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
        return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    }

    try {
        const result = await db.query('SELECT image_url FROM users WHERE id = $1', [userId]);
        const oldUser = result.rows[0];

        const filename = generateFilename('profile-', file.originalname);
        const image_url = await uploadFile('users', filename, file.buffer, file.mimetype);

        if (oldUser && oldUser.image_url) {
            deleteFile(oldUser.image_url).catch(() => {});
        }

        await db.query('UPDATE users SET image_url = $1 WHERE id = $2', [image_url, userId]);

        logActivity(userId, req.user?.username, 'update_profile_photo', 'user', userId);

        res.json({ message: 'Perfil atualizado com sucesso', image_url });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
};

export const deleteUser = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT image_url, role FROM users WHERE id = $1', [id]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (String(req.user?.id) === String(id)) {
            return res.status(400).json({ message: 'Não é possível excluir seu próprio usuário' });
        }

        if (user.role === 'admin') {
            const adminCountResult = await db.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
            if (parseInt(adminCountResult.rows[0].count, 10) <= 1) {
                return res.status(400).json({ message: 'Não é possível excluir o último administrador do sistema' });
            }
        }

        await db.query('DELETE FROM users WHERE id = $1', [id]);

        if (user && user.image_url) {
            deleteFile(user.image_url).catch(() => {});
        }

        logActivity(req.user?.id, req.user?.username, 'delete_user', 'user', id);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};
