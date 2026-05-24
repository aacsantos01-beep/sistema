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
const getAllUsers = (req, res) => {
    try {
        const users = database_1.db.prepare('SELECT id, username, role, image_url FROM users ORDER BY username ASC').all();
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};
exports.getAllUsers = getAllUsers;
const createUser = (req, res) => {
    const { username, password, role } = req.body;
    try {
        const hashedPassword = bcryptjs_1.default.hashSync(password, 10);
        const result = database_1.db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hashedPassword, role || 'vendedor');
        res.status(201).json({ id: result.lastInsertRowid, username, role: role || 'vendedor' });
    }
    catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ message: 'Username already exists' });
        }
        res.status(500).json({ message: 'Error creating user' });
    }
};
exports.createUser = createUser;
const updateUser = (req, res) => {
    const { id } = req.params;
    const { username, role, password } = req.body;
    try {
        if (password) {
            const hashedPassword = bcryptjs_1.default.hashSync(password, 10);
            database_1.db.prepare('UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?')
                .run(username, role, hashedPassword, id);
        }
        else {
            database_1.db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?')
                .run(username, role, id);
        }
        res.json({ id, username, role });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};
exports.updateUser = updateUser;
const updateProfile = (req, res) => {
    const userId = req.user.id;
    const image_url = req.file ? `/uploads/users/${req.file.filename}` : null;
    if (!image_url) {
        return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    }
    try {
        // Delete old image if exists
        const oldUser = database_1.db.prepare('SELECT image_url FROM users WHERE id = ?').get(userId);
        if (oldUser && oldUser.image_url) {
            const oldPath = path_1.default.join(process.cwd(), oldUser.image_url.substring(1));
            if (fs_1.default.existsSync(oldPath)) {
                fs_1.default.unlinkSync(oldPath);
            }
        }
        database_1.db.prepare('UPDATE users SET image_url = ? WHERE id = ?').run(image_url, userId);
        res.json({ message: 'Perfil atualizado com sucesso', image_url });
    }
    catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar perfil' });
    }
};
exports.updateProfile = updateProfile;
const deleteUser = (req, res) => {
    const { id } = req.params;
    try {
        const user = database_1.db.prepare('SELECT image_url FROM users WHERE id = ?').get(id);
        if (user && user.image_url) {
            const oldPath = path_1.default.join(process.cwd(), user.image_url.substring(1));
            if (fs_1.default.existsSync(oldPath)) {
                fs_1.default.unlinkSync(oldPath);
            }
        }
        database_1.db.prepare('DELETE FROM users WHERE id = ?').run(id);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};
exports.deleteUser = deleteUser;
