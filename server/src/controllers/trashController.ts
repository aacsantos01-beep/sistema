import { Response } from 'express';
import { db } from '../db/database';
import { logActivity } from '../services/activityLogService';

export const getTrashItems = async (req: any, res: Response) => {
    try {
        const sales = await db.query(`
            SELECT s.*, u.username, sl.name as seller_name, 'sale' as type
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            WHERE s.is_deleted = TRUE
            ORDER BY s.id DESC
        `);

        const budgets = await db.query(`
            SELECT b.*, u.username, sl.name as seller_name, 'budget' as type
            FROM budgets b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN sellers sl ON b.seller_id = sl.id
            WHERE b.is_deleted = TRUE
            ORDER BY b.id DESC
        `);

        const payables = await db.query(`
            SELECT *, 'payable' as type
            FROM payables
            WHERE is_deleted = TRUE
            ORDER BY id DESC
        `);

        res.json({
            sales: sales.rows,
            budgets: budgets.rows,
            payables: payables.rows
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trash items' });
    }
};

export const restoreItem = async (req: any, res: Response) => {
    const { type, id } = req.body;
    try {
        let table = '';
        if (type === 'sale') table = 'sales';
        else if (type === 'budget') table = 'budgets';
        else if (type === 'payable') table = 'payables';
        else return res.status(400).json({ message: 'Invalid item type' });

        if (type === 'sale') {
            // Special handling for sales: need to re-check stock
            const client = await db.connect();
            try {
                await client.query('BEGIN');
                
                const itemsResult = await client.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = $1', [id]);
                for (const item of itemsResult.rows) {
                    if (item.product_id) {
                        const prodResult = await client.query('SELECT name, stock FROM products WHERE id = $1', [item.product_id]);
                        const product = prodResult.rows[0];
                        if (!product || product.stock < item.quantity) {
                            throw new Error(`Estoque insuficiente para restaurar a venda. Produto: ${product?.name || item.product_id}`);
                        }
                        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
                    }
                }
                
                await client.query(`UPDATE ${table} SET is_deleted = FALSE WHERE id = $1`, [id]);
                await client.query('COMMIT');
            } catch (error: any) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: error.message });
            } finally {
                client.release();
            }
        } else {
            await db.query(`UPDATE ${table} SET is_deleted = FALSE WHERE id = $1`, [id]);
        }

        logActivity(req.user?.id, req.user?.username, 'restore_item', type, id);

        res.json({ message: 'Item restaurado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Error restoring item' });
    }
};

export const permanentlyDeleteItem = async (req: any, res: Response) => {
    const { type, id } = req.body;
    try {
        if (type === 'sale') {
            const client = await db.connect();
            try {
                await client.query('BEGIN');
                await client.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
                await client.query('DELETE FROM sales WHERE id = $1', [id]);
                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } else if (type === 'budget') {
            const client = await db.connect();
            try {
                await client.query('BEGIN');
                await client.query('DELETE FROM budget_items WHERE budget_id = $1', [id]);
                await client.query('DELETE FROM budgets WHERE id = $1', [id]);
                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } else if (type === 'payable') {
            await db.query('DELETE FROM payables WHERE id = $1', [id]);
        } else {
            return res.status(400).json({ message: 'Invalid item type' });
        }

        logActivity(req.user?.id, req.user?.username, 'permanently_delete_item', type, id);

        res.json({ message: 'Item excluído permanentemente!' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item permanently' });
    }
};
