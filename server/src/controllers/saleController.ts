import { Response } from 'express';
import { db } from '../db/database';
import { sendTelegramNotification, escapeHtml } from '../services/telegramService';

export const getAllSales = async (req: any, res: Response) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            ORDER BY s.id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales' });
    }
};

export const createSale = async (req: any, res: Response) => {
    const { items, total_amount, seller_id, payment_method } = req.body;
    const user_id = req.user.id;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Create sale
        const saleResult = await client.query(
            'INSERT INTO sales (total_amount, user_id, seller_id, payment_method) VALUES ($1, $2, $3, $4) RETURNING id',
            [total_amount, user_id, seller_id, payment_method]
        );
        const saleId = saleResult.rows[0].id;

        const saleItemsData: any[] = [];

        // Process items
        for (const item of items) {
            const { productId, quantity, price, service_name } = item;
            
            if (productId) {
                // Check stock for products
                const prodResult = await client.query('SELECT name, stock FROM products WHERE id = $1', [productId]);
                const product = prodResult.rows[0];
                if (!product || product.stock < quantity) {
                    throw new Error(`Estoque insuficiente para o produto ${product?.name || productId}`);
                }

                // Create sale item
                await client.query(
                    'INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES ($1, $2, $3, $4)',
                    [saleId, productId, quantity, price]
                );

                // Update stock
                await client.query(
                    'UPDATE products SET stock = stock - $1 WHERE id = $2',
                    [quantity, productId]
                );

                saleItemsData.push({ name: product.name, quantity, price });
            } else if (service_name) {
                // Create service sale item
                await client.query(
                    'INSERT INTO sale_items (sale_id, service_name, quantity, price_at_sale) VALUES ($1, $2, $3, $4)',
                    [saleId, service_name, quantity, price]
                );

                saleItemsData.push({ name: service_name, quantity, price });
            }
        }

        await client.query('COMMIT');

        // Prepare and send Telegram notification
        const sellerResult = await db.query('SELECT name FROM sellers WHERE id = $1', [seller_id]);
        const seller = sellerResult.rows[0];
        
        let telegramMsg = `<b>🛒 NOVA VENDA REALIZADA! (#${saleId})</b>\n\n`;
        telegramMsg += `👤 <b>Vendedor:</b> ${escapeHtml(seller?.name || 'N/A')}\n`;
        telegramMsg += `💳 <b>Pagamento:</b> ${escapeHtml(payment_method || 'N/A')}\n\n`;
        telegramMsg += `📦 <b>Itens:</b>\n`;
        
        saleItemsData.forEach(item => {
            telegramMsg += `• ${item.quantity}x ${escapeHtml(item.name)} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        });
        
        telegramMsg += `\n💰 <b>TOTAL: R$ ${Number(total_amount).toFixed(2)}</b>\n`;
        telegramMsg += `\n<i>Agradecimento IR Assistência Técnica!</i>`;

        // Send notification (async)
        sendTelegramNotification(telegramMsg).catch(err => console.error('Telegram notification error:', err));

        res.status(201).json({ id: saleId, message: 'Venda realizada com sucesso!' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    } finally {
        client.release();
    }
};

export const getSaleDetails = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const saleResult = await db.query(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            WHERE s.id = $1
        `, [id]);

        const sale = saleResult.rows[0];
        if (!sale) return res.status(404).json({ message: 'Sale not found' });

        const itemsResult = await db.query(`
            SELECT si.*, COALESCE(p.name, si.service_name) as product_name 
            FROM sale_items si 
            LEFT JOIN products p ON si.product_id = p.id 
            WHERE si.sale_id = $1
        `, [id]);

        res.json({ ...sale, items: itemsResult.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sale details' });
    }
};
