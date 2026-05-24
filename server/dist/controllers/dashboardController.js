"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMonthlyReport = exports.getStats = void 0;
const database_1 = require("../db/database");
const getStats = async (req, res) => {
    try {
        const totalSalesRes = await database_1.db.query('SELECT SUM(total_amount) as total FROM sales');
        const totalProductsRes = await database_1.db.query('SELECT COUNT(*) as count FROM products');
        const lowStockRes = await database_1.db.query('SELECT COUNT(*) as count FROM products WHERE stock < 10');
        const totalPendingRes = await database_1.db.query("SELECT SUM(amount) as total FROM payables WHERE status = 'pending'");
        const totalPaidRes = await database_1.db.query("SELECT SUM(amount) as total FROM payables WHERE status = 'paid'");
        // Monthly Stats (Current Month)
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthlyRevenueRes = await database_1.db.query("SELECT SUM(total_amount) as total FROM sales WHERE TO_CHAR(created_at, 'YYYY-MM') = $1", [currentMonth]);
        const monthlyExpensesRes = await database_1.db.query("SELECT SUM(amount) as total FROM payables WHERE status = 'paid' AND TO_CHAR(due_date, 'YYYY-MM') = $1", [currentMonth]);
        const recentSalesRes = await database_1.db.query(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            ORDER BY s.id DESC 
            LIMIT 5
        `);
        res.json({
            totalRevenue: parseFloat(totalSalesRes.rows[0].total) || 0,
            totalProducts: parseInt(totalProductsRes.rows[0].count),
            lowStockCount: parseInt(lowStockRes.rows[0].count),
            totalPendingPayables: parseFloat(totalPendingRes.rows[0].total) || 0,
            totalPaidPayables: parseFloat(totalPaidRes.rows[0].total) || 0,
            monthlyRevenue: parseFloat(monthlyRevenueRes.rows[0].total) || 0,
            monthlyExpenses: parseFloat(monthlyExpensesRes.rows[0].total) || 0,
            recentSales: recentSalesRes.rows
        });
    }
    catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};
exports.getStats = getStats;
const getMonthlyReport = async (req, res) => {
    try {
        const { month } = req.query; // format: YYYY-MM
        const targetMonth = month || new Date().toISOString().slice(0, 7);
        const salesRes = await database_1.db.query(`
            SELECT s.id, s.total_amount, s.created_at, sl.name as seller_name, s.payment_method
            FROM sales s
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            WHERE TO_CHAR(s.created_at, 'YYYY-MM') = $1
            ORDER BY s.created_at ASC
        `, [targetMonth]);
        const payablesRes = await database_1.db.query(`
            SELECT id, description, amount, due_date, status, category, payment_method
            FROM payables
            WHERE TO_CHAR(due_date, 'YYYY-MM') = $1 AND status = 'paid'
            ORDER BY due_date ASC
        `, [targetMonth]);
        res.json({ sales: salesRes.rows, payables: payablesRes.rows, month: targetMonth });
    }
    catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ message: 'Error fetching monthly report' });
    }
};
exports.getMonthlyReport = getMonthlyReport;
