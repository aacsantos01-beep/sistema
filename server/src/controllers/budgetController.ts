import { Request, Response } from 'express';
import { db } from '../db/database';

export const createBudget = (req: any, res: Response) => {
    const { customer_name, total_amount, seller_id, items } = req.body;
    const user_id = req.user.id;

    try {
        const transaction = db.transaction(() => {
            const budgetResult = db.prepare(
                'INSERT INTO budgets (customer_name, total_amount, user_id, seller_id) VALUES (?, ?, ?, ?)'
            ).run(customer_name, total_amount, user_id, seller_id);
            const budgetId = budgetResult.lastInsertRowid;

            for (const item of items) {
                const { product_id, item_name, quantity, price, is_service, has_warranty, warranty_time } = item;
                db.prepare(
                    'INSERT INTO budget_items (budget_id, product_id, item_name, quantity, price, is_service, has_warranty, warranty_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                ).run(budgetId, product_id || null, item_name, quantity, price, is_service ? 1 : 0, has_warranty ? 1 : 0, warranty_time);
            }
            return budgetId;
        });

        const budgetId = transaction();
        res.status(201).json({ id: budgetId, message: 'Orçamento criado com sucesso!' });
    } catch (error: any) {
        res.status(500).json({ message: 'Erro ao criar orçamento: ' + error.message });
    }
};

export const getAllBudgets = (req: any, res: Response) => {
    try {
        const budgets = db.prepare(`
            SELECT b.*, u.username, sl.name as seller_name
            FROM budgets b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN sellers sl ON b.seller_id = sl.id
            ORDER BY b.id DESC
        `).all();
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar orçamentos' });
    }
};

export const getBudgetDetails = (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const budget: any = db.prepare(`
            SELECT b.*, u.username, sl.name as seller_name
            FROM budgets b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN sellers sl ON b.seller_id = sl.id
            WHERE b.id = ?
        `).get(id);

        if (!budget) return res.status(404).json({ message: 'Orçamento não encontrado' });

        const items = db.prepare('SELECT * FROM budget_items WHERE budget_id = ?').all(id);
        res.json({ ...budget, items });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar detalhes do orçamento' });
    }
};

export const deleteBudget = (req: any, res: Response) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
        res.json({ message: 'Orçamento excluído com sucesso' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir orçamento' });
    }
};

export const updateBudgetStatus = (req: any, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = db.prepare('UPDATE budgets SET status = ? WHERE id = ?').run(status, id);
        if (result.changes === 0) return res.status(404).json({ message: 'Orçamento não encontrado' });
        res.json({ message: 'Status atualizado com sucesso', status });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar status' });
    }
};
