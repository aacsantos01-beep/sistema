import { Response } from 'express';
import { db } from '../db/database';

export const getStats = (req: any, res: Response) => {
    try {
        const totalSalesResult: any = db.prepare('SELECT SUM(total_amount) as total FROM sales').get();
        const totalProductsResult: any = db.prepare('SELECT COUNT(*) as count FROM products').get();
        const lowStockResult: any = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock < 10').get();
        
        const totalPendingPayables: any = db.prepare("SELECT SUM(amount) as total FROM payables WHERE status = 'pending'").get();
        const totalPaidPayables: any = db.prepare("SELECT SUM(amount) as total FROM payables WHERE status = 'paid'").get();

        // Monthly Stats (Current Month)
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthlyRevenueResult: any = db.prepare("SELECT SUM(total_amount) as total FROM sales WHERE strftime('%Y-%m', created_at) = ?").get(currentMonth);
        const monthlyExpensesResult: any = db.prepare("SELECT SUM(amount) as total FROM payables WHERE status = 'paid' AND strftime('%Y-%m', due_date) = ?").get(currentMonth);

        const recentSales = db.prepare(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            ORDER BY s.id DESC 
            LIMIT 5
        `).all();

        res.json({
            totalRevenue: totalSalesResult.total || 0,
            totalProducts: totalProductsResult.count,
            lowStockCount: lowStockResult.count,
            totalPendingPayables: totalPendingPayables.total || 0,
            totalPaidPayables: totalPaidPayables.total || 0,
            monthlyRevenue: monthlyRevenueResult.total || 0,
            monthlyExpenses: monthlyExpensesResult.total || 0,
            recentSales
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

export const getMonthlyReport = (req: any, res: Response) => {
    try {
        const { month } = req.query; // format: YYYY-MM
        const targetMonth = month || new Date().toISOString().slice(0, 7);

        const sales = db.prepare(`
            SELECT s.id, s.total_amount, s.created_at, sl.name as seller_name, s.payment_method
            FROM sales s
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            WHERE strftime('%Y-%m', s.created_at) = ?
            ORDER BY s.created_at ASC
        `).all(targetMonth);

        const payables = db.prepare(`
            SELECT id, description, amount, due_date, status, category, payment_method
            FROM payables
            WHERE strftime('%Y-%m', due_date) = ? AND status = 'paid'
            ORDER BY due_date ASC
        `).all(targetMonth);

        res.json({ sales, payables, month: targetMonth });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching monthly report' });
    }
};
