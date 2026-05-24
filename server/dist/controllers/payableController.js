"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePayable = exports.updatePayableStatus = exports.updatePayable = exports.createPayable = exports.getPayableById = exports.getAllPayables = void 0;
const database_1 = require("../db/database");
const getAllPayables = async (req, res) => {
    try {
        const result = await database_1.db.query('SELECT * FROM payables ORDER BY due_date DESC');
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching payables' });
    }
};
exports.getAllPayables = getAllPayables;
const getPayableById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await database_1.db.query('SELECT * FROM payables WHERE id = $1', [id]);
        const payable = result.rows[0];
        if (!payable)
            return res.status(404).json({ message: 'Payable not found' });
        res.json(payable);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching payable' });
    }
};
exports.getPayableById = getPayableById;
const createPayable = async (req, res) => {
    const { description, amount, due_date, status, category, payment_method } = req.body;
    try {
        const result = await database_1.db.query('INSERT INTO payables (description, amount, due_date, status, category, payment_method) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [description, amount, due_date, status || 'pending', category, payment_method]);
        res.status(201).json({ id: result.rows[0].id, description, amount, due_date, status, category, payment_method });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating payable: ' + error.message });
    }
};
exports.createPayable = createPayable;
const updatePayable = async (req, res) => {
    const { id } = req.params;
    const { description, amount, due_date, status, category, payment_method } = req.body;
    try {
        const result = await database_1.db.query('UPDATE payables SET description = $1, amount = $2, due_date = $3, status = $4, category = $5, payment_method = $6 WHERE id = $7', [description, amount, due_date, status, category, payment_method, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Payable not found' });
        res.json({ id, description, amount, due_date, status, category, payment_method });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating payable: ' + error.message });
    }
};
exports.updatePayable = updatePayable;
const updatePayableStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await database_1.db.query('UPDATE payables SET status = $1 WHERE id = $2', [status, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Payable not found' });
        res.json({ message: 'Status updated' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating payable status: ' + error.message });
    }
};
exports.updatePayableStatus = updatePayableStatus;
const deletePayable = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await database_1.db.query('DELETE FROM payables WHERE id = $1', [id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Payable not found' });
        res.json({ message: 'Payable deleted' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting payable: ' + error.message });
    }
};
exports.deletePayable = deletePayable;
