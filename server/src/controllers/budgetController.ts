import { Request, Response } from 'express';
import { db } from '../db/database';
import { logActivity } from '../services/activityLogService';

export const createBudget = async (req: any, res: Response) => {
    const { customer_name, total_amount, seller_id, items } = req.body;
    const user_id = req.user.id;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const budgetResult = await client.query(
            'INSERT INTO budgets (customer_name, total_amount, user_id, seller_id) VALUES ($1, $2, $3, $4) RETURNING id',
            [customer_name, total_amount, user_id, seller_id]
        );
        const budgetId = budgetResult.rows[0].id;

        for (const item of items) {
            const { product_id, item_name, quantity, price, is_service, has_warranty, warranty_time } = item;
            await client.query(
                'INSERT INTO budget_items (budget_id, product_id, item_name, quantity, price, is_service, has_warranty, warranty_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [budgetId, product_id || null, item_name, quantity, price, is_service ? 1 : 0, has_warranty ? 1 : 0, warranty_time]
            );
        }

        await client.query('COMMIT');

        logActivity(user_id, req.user?.username, 'create_budget', 'budget', budgetId, `Criou orçamento para "${customer_name}" no valor de R$ ${Number(total_amount).toFixed(2)}`);

        res.status(201).json({ id: budgetId, message: 'Orçamento criado com sucesso!' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar orçamento:', error);
        res.status(500).json({ message: 'Erro ao criar orçamento' });
    } finally {
        client.release();
    }
};

export const getAllBudgets = async (req: any, res: Response) => {
    try {
        const result = await db.query(`
            SELECT b.*, u.username, sl.name as seller_name
            FROM budgets b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN sellers sl ON b.seller_id = sl.id
            WHERE b.is_deleted = FALSE
            ORDER BY b.id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar orçamentos' });
    }
};

export const getBudgetDetails = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query(`
            SELECT b.*, u.username, sl.name as seller_name
            FROM budgets b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN sellers sl ON b.seller_id = sl.id
            WHERE b.id = $1 AND b.is_deleted = FALSE
        `, [id]);

        const budget = result.rows[0];
        if (!budget) return res.status(404).json({ message: 'Orçamento não encontrado' });

        const itemsResult = await db.query('SELECT * FROM budget_items WHERE budget_id = $1', [id]);
        res.json({ ...budget, items: itemsResult.rows });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhes do orçamento' });
    }
};

export const deleteBudget = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE budgets SET is_deleted = TRUE WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Orçamento não encontrado' });

        logActivity(req.user?.id, req.user?.username, 'delete_budget', 'budget', id);

        res.json({ message: 'Orçamento excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir orçamento' });
    }
};

export const updateBudgetStatus = async (req: any, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await db.query('UPDATE budgets SET status = $1 WHERE id = $2', [status, id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Orçamento não encontrado' });

        logActivity(req.user?.id, req.user?.username, 'update_budget_status', 'budget', id, `Alterou status para "${status}"`);

        res.json({ message: 'Status atualizado com sucesso', status });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar status' });
    }
};
