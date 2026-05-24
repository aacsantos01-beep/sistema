"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBudgetStatus = exports.deleteBudget = exports.getBudgetDetails = exports.getAllBudgets = exports.createBudget = void 0;
const database_1 = require("../db/database");
const createBudget = async (req, res) => {
    const { customer_name, total_amount, seller_id, items } = req.body;
    const user_id = req.user.id;
    const client = await database_1.db.connect();
    try {
        await client.query('BEGIN');
        const budgetResult = await client.query('INSERT INTO budgets (customer_name, total_amount, user_id, seller_id) VALUES ($1, $2, $3, $4) RETURNING id', [customer_name, total_amount, user_id, seller_id]);
        const budgetId = budgetResult.rows[0].id;
        for (const item of items) {
            const { product_id, item_name, quantity, price, is_service, has_warranty, warranty_time } = item;
            await client.query('INSERT INTO budget_items (budget_id, product_id, item_name, quantity, price, is_service, has_warranty, warranty_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [budgetId, product_id || null, item_name, quantity, price, is_service ? 1 : 0, has_warranty ? 1 : 0, warranty_time]);
        }
        await client.query('COMMIT');
        res.status(201).json({ id: budgetId, message: 'Orçamento criado com sucesso!' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Erro ao criar orçamento: ' + error.message });
    }
    finally {
        client.release();
    }
};
exports.createBudget = createBudget;
const getAllBudgets = async (req, res) => {
    try {
        const result = await database_1.db.query(`
            SELECT b.*, u.username, sl.name as seller_name
            FROM budgets b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN sellers sl ON b.seller_id = sl.id
            ORDER BY b.id DESC
        `);
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ message: 'Erro ao buscar orçamentos' });
    }
};
exports.getAllBudgets = getAllBudgets;
const getBudgetDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await database_1.db.query(`
            SELECT b.*, u.username, sl.name as seller_name
            FROM budgets b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN sellers sl ON b.seller_id = sl.id
            WHERE b.id = $1
        `, [id]);
        const budget = result.rows[0];
        if (!budget)
            return res.status(404).json({ message: 'Orçamento não encontrado' });
        const itemsResult = await database_1.db.query('SELECT * FROM budget_items WHERE budget_id = $1', [id]);
        res.json({ ...budget, items: itemsResult.rows });
    }
    catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhes do orçamento' });
    }
};
exports.getBudgetDetails = getBudgetDetails;
const deleteBudget = async (req, res) => {
    const { id } = req.params;
    try {
        await database_1.db.query('DELETE FROM budgets WHERE id = $1', [id]);
        res.json({ message: 'Orçamento excluído com sucesso' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erro ao excluir orçamento' });
    }
};
exports.deleteBudget = deleteBudget;
const updateBudgetStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await database_1.db.query('UPDATE budgets SET status = $1 WHERE id = $2', [status, id]);
        if (result.rowCount === 0)
            return res.status(404).json({ message: 'Orçamento não encontrado' });
        res.json({ message: 'Status atualizado com sucesso', status });
    }
    catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar status' });
    }
};
exports.updateBudgetStatus = updateBudgetStatus;
