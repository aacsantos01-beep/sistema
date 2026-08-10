import { Response } from 'express';
import { db } from '../db/database';
import { sendTelegramNotification, escapeHtml } from '../services/telegramService';
import { logActivity } from '../services/activityLogService';
import { emitNfce, checkNfceStatus } from '../services/nfeService';

export const getAllSales = async (req: any, res: Response) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.username, sl.name as seller_name
            FROM sales s 
            LEFT JOIN users u ON s.user_id = u.id 
            LEFT JOIN sellers sl ON s.seller_id = sl.id
            WHERE s.is_deleted = FALSE
            ORDER BY s.id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sales' });
    }
};

export const deleteSale = async (req: any, res: Response) => {
    const { id } = req.params;
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Check if sale exists and is not already deleted
        const saleResult = await client.query('SELECT * FROM sales WHERE id = $1 AND is_deleted = FALSE', [id]);
        if (saleResult.rows.length === 0) {
            throw new Error('Venda não encontrada ou já excluída');
        }

        if (saleResult.rows[0].nfe_status === 'autorizado') {
            throw new Error('Esta venda possui uma NFC-e autorizada e não pode ser excluída. Cancele a nota fiscal junto ao contador/provedor antes de excluir.');
        }

        // Soft delete the sale
        await client.query('UPDATE sales SET is_deleted = TRUE WHERE id = $1', [id]);

        // Get sale items to restock
        const itemsResult = await client.query('SELECT product_id, quantity FROM sale_items WHERE sale_id = $1', [id]);
        
        for (const item of itemsResult.rows) {
            if (item.product_id) {
                await client.query(
                    'UPDATE products SET stock = stock + $1 WHERE id = $2',
                    [item.quantity, item.product_id]
                );
            }
        }

        await client.query('COMMIT');

        logActivity(req.user?.id, req.user?.username, 'delete_sale', 'sale', id);

        res.json({ message: 'Venda excluída com sucesso e estoque restaurado!' });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: error.message });
    } finally {
        client.release();
    }
};

export const createSale = async (req: any, res: Response) => {
    const { items, total_amount, seller_id, payment_method, customer_name, customer_document } = req.body;
    const user_id = req.user.id;

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Create sale
        const saleResult = await client.query(
            'INSERT INTO sales (total_amount, user_id, seller_id, payment_method, customer_name, customer_document) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [total_amount, user_id, seller_id, payment_method, customer_name || null, customer_document || null]
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

        logActivity(req.user?.id, req.user?.username, 'create_sale', 'sale', saleId, `Registrou venda no valor de R$ ${Number(total_amount).toFixed(2)}`);

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

export const emitNfe = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const saleResult = await db.query('SELECT * FROM sales WHERE id = $1 AND is_deleted = FALSE', [id]);
        const sale = saleResult.rows[0];
        if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });

        if (sale.nfe_status === 'autorizado' || sale.nfe_status === 'processando_autorizacao') {
            return res.status(400).json({ message: 'Esta venda já possui uma NFC-e emitida ou em processamento.' });
        }

        const itemsResult = await db.query(`
            SELECT si.product_id, si.quantity, si.price_at_sale,
                   COALESCE(p.name, si.service_name) as product_name,
                   p.ncm, p.cfop, p.unidade
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = $1
        `, [id]);

        const nfeResult = await emitNfce(sale, itemsResult.rows);
        const status = nfeResult.status || 'processando_autorizacao';

        await db.query(
            `UPDATE sales SET nfe_status = $1, nfe_ref = $2, nfe_error = NULL WHERE id = $3`,
            [status, nfeResult.ref, id]
        );

        logActivity(req.user?.id, req.user?.username, 'emit_nfe', 'sale', id, `Solicitou emissão de NFC-e (ref ${nfeResult.ref})`);

        res.json({ message: 'Emissão solicitada. Consulte o status em instantes.', ref: nfeResult.ref, status });
    } catch (error: any) {
        await db.query(`UPDATE sales SET nfe_status = 'erro', nfe_error = $1 WHERE id = $2`, [error.message, id]).catch(() => {});
        res.status(400).json({ message: error.message });
    }
};

export const getNfeStatus = async (req: any, res: Response) => {
    const { id } = req.params;
    try {
        const saleResult = await db.query('SELECT * FROM sales WHERE id = $1', [id]);
        const sale = saleResult.rows[0];
        if (!sale) return res.status(404).json({ message: 'Venda não encontrada' });

        if (!sale.nfe_ref) {
            return res.json({ nfe_status: sale.nfe_status || 'nao_emitida' });
        }

        const statusData = await checkNfceStatus(sale.nfe_ref);
        const status = statusData.status || sale.nfe_status;

        await db.query(
            `UPDATE sales SET
                nfe_status = $1,
                nfe_number = $2,
                nfe_serie = $3,
                nfe_key = $4,
                nfe_danfe_url = $5,
                nfe_xml_url = $6,
                nfe_error = $7,
                nfe_issued_at = CASE WHEN $1 = 'autorizado' AND nfe_issued_at IS NULL THEN NOW() ELSE nfe_issued_at END
             WHERE id = $8`,
            [
                status,
                statusData.numero || null,
                statusData.serie || null,
                statusData.chave_nfe || null,
                statusData.caminho_danfe || statusData.url || null,
                statusData.caminho_xml_nota_fiscal || null,
                status === 'erro_autorizacao' ? (statusData.mensagem_sefaz || 'Erro na autorização da nota') : null,
                id
            ]
        );

        res.json({ ...statusData, nfe_status: status });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
