"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSeller = exports.updateSeller = exports.createSeller = exports.getAllSellers = void 0;
const database_1 = require("../db/database");
const getAllSellers = (req, res) => {
    try {
        const sellers = database_1.db.prepare('SELECT * FROM sellers WHERE active = 1 ORDER BY name ASC').all();
        res.json(sellers);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching sellers' });
    }
};
exports.getAllSellers = getAllSellers;
const createSeller = (req, res) => {
    const { name, email, phone } = req.body;
    try {
        const result = database_1.db.prepare('INSERT INTO sellers (name, email, phone) VALUES (?, ?, ?)').run(name, email, phone);
        res.status(201).json({ id: result.lastInsertRowid, name, email, phone });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating seller' });
    }
};
exports.createSeller = createSeller;
const updateSeller = (req, res) => {
    const { id } = req.params;
    const { name, email, phone, active } = req.body;
    try {
        const result = database_1.db.prepare('UPDATE sellers SET name = ?, email = ?, phone = ?, active = ? WHERE id = ?').run(name, email, phone, active, id);
        if (result.changes === 0)
            return res.status(404).json({ message: 'Seller not found' });
        res.json({ id, name, email, phone, active });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating seller' });
    }
};
exports.updateSeller = updateSeller;
const deleteSeller = (req, res) => {
    const { id } = req.params;
    try {
        // Soft delete
        const result = database_1.db.prepare('UPDATE sellers SET active = 0 WHERE id = ?').run(id);
        if (result.changes === 0)
            return res.status(404).json({ message: 'Seller not found' });
        res.json({ message: 'Seller deactivated' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deactivating seller' });
    }
};
exports.deleteSeller = deleteSeller;
