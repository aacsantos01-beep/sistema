"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateProfile = exports.updateUser = exports.createUser = exports.getAllUsers = exports.upload = void 0;
const database_1 = require("../db/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Configure multer for user profile photos
const uploadDir = path_1.default.join(process.cwd(), 'uploads/users');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
exports.upload = (0, multer_1.default)({ storage });
const getAllUsers = async (req, res) => {
    try {
        const result = await database_1.db.query('SELECT id, username, role, image_url FROM users ORDER BY username ASC');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};
exports.getAllUsers = getAllUsers;
const createUser = async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = bcryptjs_1.default.hashSync(password, 10);
        const result = await database_1.db.query('INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id', [username, hashedPassword, role || 'vendedor']);
        res.status(201).json({ id: result.rows[0].id, username, role: role || 'vendedor' });
    }
    catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: 'Error creating user' });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, role, password } = req.body;
    try {
        if (password) {
            const hashedPassword = bcryptjs_1.default.hashSync(password, 10);
            await database_1.db.query('UPDATE users SET username = $1, role = $2, password = $3 WHERE id = $4', [username, role, hashedPassword, id]);
        }
        else {
            await database_1.db.query('UPDATE users SET username = $1, role = $2 WHERE id = $3', [username, role, id]);
        }
        res.json({ id, username, role });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};
exports.updateUser = updateUser;
const updateProfile = async (req, res) => {
    const userId = req.user.id;
    const image_url = req.file ? `/uploads/users/${req.file.filename}` : null;
    if (!image_url) {
        return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    }
    try {
        // Delete old image if exists
        const result = await database_1.db.query('SELECT image_url FROM users WHERE id = $1', [userId]);
        const oldUser = result.rows[0];
        if (oldUser && oldUser.image_url) {
            const oldPath = path_1.default.join(process.cwd(), oldUser.image_url.substring(1));
            if (fs_1.default.existsSync(oldPath)) {
                fs_1.default.unlinkSync(oldPath);
            }
        }
        await database_1.db.query('UPDATE users SET image_url = $1 WHERE id = $2', [image_url, userId]);
        res.json({ message: 'Perfil atualizado com sucesso', image_url });
    }
    catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
};
exports.updateProfile = updateProfile;
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await database_1.db.query('SELECT image_url FROM users WHERE id = $1', [id]);
        const user = result.rows[0];
        if (user && user.image_url) {
            const oldPath = path_1.default.join(process.cwd(), user.image_url.substring(1));
            if (fs_1.default.existsSync(oldPath)) {
                fs_1.default.unlinkSync(oldPath);
            }
        }
        await database_1.db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};
exports.deleteUser = deleteUser;
