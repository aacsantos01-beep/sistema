"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSaleDetails = exports.createSale = exports.getAllSales = void 0;
const database_1 = require("../db/database");
const telegramService_1 = require("../services/telegramService");
const getAllSales = (req, res) => {
    try {
        const sales = database_1.db.prepare(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            ORDER BY s.id DESC
        `).all();
        res.json(sales);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching sales' });
    }
};
exports.getAllSales = getAllSales;
const createSale = async (req, res) => {
    const { items, total_amount, seller_id, payment_method } = req.body;
    const user_id = req.user.id;
    const transaction = database_1.db.transaction(() => {
        // Create sale
        const saleResult = database_1.db.prepare('INSERT INTO sales (total_amount, user_id, seller_id, payment_method) VALUES (?, ?, ?, ?)').run(total_amount, user_id, seller_id, payment_method);
        const saleId = saleResult.lastInsertRowid;
        const saleItemsData = [];
        // Process items
        for (const item of items) {
            const { productId, quantity, price, service_name } = item;
            if (productId) {
                // Check stock for products
                const product = database_1.db.prepare('SELECT name, stock FROM products WHERE id = ?').get(productId);
                if (!product || product.stock < quantity) {
                    throw new Error(`Estoque insuficiente para o produto ${product?.name || productId}`);
                }
                // Create sale item
                database_1.db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)').run(saleId, productId, quantity, price);
                // Update stock
                database_1.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, productId);
                saleItemsData.push({ name: product.name, quantity, price });
            }
            else if (service_name) {
                // Create service sale item
                database_1.db.prepare('INSERT INTO sale_items (sale_id, service_name, quantity, price_at_sale) VALUES (?, ?, ?, ?)').run(saleId, service_name, quantity, price);
                saleItemsData.push({ name: service_name, quantity, price });
            }
        }
        return { saleId, items: saleItemsData };
    });
    try {
        const { saleId, items: itemsProcessed } = transaction();
        // Prepare and send Telegram notification
        const seller = database_1.db.prepare('SELECT name FROM sellers WHERE id = ?').get(seller_id);
        let telegramMsg = `<b>🛒 NOVA VENDA REALIZADA! (#${saleId})</b>\n\n`;
        telegramMsg += `👤 <b>Vendedor:</b> ${(0, telegramService_1.escapeHtml)(seller?.name || 'N/A')}\n`;
        telegramMsg += `💳 <b>Pagamento:</b> ${(0, telegramService_1.escapeHtml)(payment_method || 'N/A')}\n\n`;
        telegramMsg += `📦 <b>Itens:</b>\n`;
        itemsProcessed.forEach(item => {
            telegramMsg += `• ${item.quantity}x ${(0, telegramService_1.escapeHtml)(item.name)} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        });
        telegramMsg += `\n💰 <b>TOTAL: R$ ${Number(total_amount).toFixed(2)}</b>\n`;
        telegramMsg += `\n<i>Agradecimento TATUTECH!</i>`;
        // Send notification
        await (0, telegramService_1.sendTelegramNotification)(telegramMsg);
        res.status(201).json({ id: saleId, message: 'Venda realizada com sucesso!' });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createSale = createSale;
const getSaleDetails = (req, res) => {
    const { id } = req.params;
    try {
        const sale = database_1.db.prepare(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            WHERE s.id = ?
        `).get(id);
        if (!sale)
            return res.status(404).json({ message: 'Sale not found' });
        const items = database_1.db.prepare(`
            SELECT si.*, COALESCE(p.name, si.service_name) as product_name 
            FROM sale_items si 
            LEFT JOIN products p ON si.product_id = p.id 
            WHERE si.sale_id = ?
        `).all(id);
        res.json({ ...sale, items });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching sale details' });
    }
};
exports.getSaleDetails = getSaleDetails;
