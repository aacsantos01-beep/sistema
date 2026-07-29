import * as express from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET environment variable is not set.');
}

export const authenticateToken = (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Nenhum token fornecido' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error: any) {
        console.error('JWT Error:', error.message);
        return res.status(401).json({ message: 'Token inválido' });
    }
};

export const isAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acesso negado: Somente administradores.' });
    }
};
