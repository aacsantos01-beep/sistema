import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'REDACTED_ROTATED_JWT_SECRET';

export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader);

    if (!authHeader) {
        return res.status(401).json({ message: 'Nenhum token fornecido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error: any) {
        console.error('JWT Error:', error.message);
        return res.status(401).json({ message: 'Token inválido' });
    }
};

export const isAdmin = (req: any, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado: Somente administradores.' });
    }
};
