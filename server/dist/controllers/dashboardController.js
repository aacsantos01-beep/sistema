"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = void 0;
const database_1 = require("../db/database");
const getStats = (req, res) => {
    try {
        const totalSalesResult = database_1.db.prepare('SELECT SUM(total_amount) as total FROM sales').get();
        const totalProductsResult = database_1.db.prepare('SELECT COUNT(*) as count FROM products').get();
        const lowStockResult = database_1.db.prepare('SELECT COUNT(*) as count FROM products WHERE stock < 10').get();
        const recentSales = database_1.db.prepare(`
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
            recentSales
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};
exports.getStats = getStats;
