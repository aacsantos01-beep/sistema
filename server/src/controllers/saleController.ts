import { Response } from 'express';
import { db } from '../db/database';
import { sendTelegramNotification, escapeHtml } from '../services/telegramService';

export const getAllSales = (req: any, res: Response) => {
    try {
        const sales = db.prepare(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            ORDER BY s.id DESC
        `).all();
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales' });
    }
};

export const createSale = async (req: any, res: Response) => {
    const { items, total_amount, seller_id, payment_method } = req.body;
    const user_id = req.user.id;

    const transaction = db.transaction(() => {
        // Create sale
        const saleResult = db.prepare(
            'INSERT INTO sales (total_amount, user_id, seller_id, payment_method) VALUES (?, ?, ?, ?)'
        ).run(total_amount, user_id, seller_id, payment_method);
        const saleId = saleResult.lastInsertRowid;

        const saleItemsData: any[] = [];

        // Process items
        for (const item of items) {
            const { productId, quantity, price, service_name } = item;
            
            if (productId) {
                // Check stock for products
                const product: any = db.prepare('SELECT name, stock FROM products WHERE id = ?').get(productId);
                if (!product || product.stock < quantity) {
                    throw new Error(`Estoque insuficiente para o produto ${product?.name || productId}`);
                }

                // Create sale item
                db.prepare(
                    'INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)'
                ).run(saleId, productId, quantity, price);

                // Update stock
                db.prepare(
                    'UPDATE products SET stock = stock - ? WHERE id = ?'
                ).run(quantity, productId);

                saleItemsData.push({ name: product.name, quantity, price });
            } else if (service_name) {
                // Create service sale item
                db.prepare(
                    'INSERT INTO sale_items (sale_id, service_name, quantity, price_at_sale) VALUES (?, ?, ?, ?)'
                ).run(saleId, service_name, quantity, price);

                saleItemsData.push({ name: service_name, quantity, price });
            }
        }

        return { saleId, items: saleItemsData };
    });

    try {
        const { saleId, items: itemsProcessed } = transaction();
        
        // Prepare and send Telegram notification
        const seller: any = db.prepare('SELECT name FROM sellers WHERE id = ?').get(seller_id);
        
        let telegramMsg = `<b>🛒 NOVA VENDA REALIZADA! (#${saleId})</b>\n\n`;
        telegramMsg += `👤 <b>Vendedor:</b> ${escapeHtml(seller?.name || 'N/A')}\n`;
        telegramMsg += `💳 <b>Pagamento:</b> ${escapeHtml(payment_method || 'N/A')}\n\n`;
        telegramMsg += `📦 <b>Itens:</b>\n`;
        
        itemsProcessed.forEach(item => {
            telegramMsg += `• ${item.quantity}x ${escapeHtml(item.name)} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        });
        
        telegramMsg += `\n💰 <b>TOTAL: R$ ${Number(total_amount).toFixed(2)}</b>\n`;
        telegramMsg += `\n<i>Agradecimento IR Assistência Técnica!</i>`;

        // Send notification
        await sendTelegramNotification(telegramMsg);

        res.status(201).json({ id: saleId, message: 'Venda realizada com sucesso!' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getSaleDetails = (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const sale: any = db.prepare(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            WHERE s.id = ?
        `).get(id);

        if (!sale) return res.status(404).json({ message: 'Sale not found' });

        const items = db.prepare(`
            SELECT si.*, COALESCE(p.name, si.service_name) as product_name 
            FROM sale_items si 
            LEFT JOIN products p ON si.product_id = p.id 
            WHERE si.sale_id = ?
        `).all(id);

        res.json({ ...sale, items });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sale details' });
    }
};
