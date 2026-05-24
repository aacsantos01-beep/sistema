"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'tatutech_secret_key_2026';
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader);
    if (!authHeader) {
        return res.status(401).json({ message: 'Nenhum token fornecido' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.error('JWT Error:', error.message);
        return res.status(401).json({ message: 'Token inválido' });
    }
};
exports.authenticateToken = authenticateToken;
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).json({ message: 'Acesso negado: Somente administradores.' });
    }
};
exports.isAdmin = isAdmin;
