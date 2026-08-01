import { Request, Response } from 'express';
import { db } from '../db/database';

export const getActivityLogs = async (req: Request, res: Response) => {
    const { userId, action, page = '1', limit = '50' } = req.query as Record<string, string>;
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];

    if (userId) {
        params.push(userId);
        conditions.push(`user_id = $${params.length}`);
    }
    if (action) {
        params.push(`%${action}%`);
        conditions.push(`action ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
        const countResult = await db.query(`SELECT COUNT(*) FROM activity_logs ${where}`, params);

        const listParams = [...params, limitNum, offset];
        const result = await db.query(
            `SELECT * FROM activity_logs ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
            listParams
        );

        res.json({
            logs: result.rows,
            total: parseInt(countResult.rows[0].count, 10),
            page: pageNum,
            limit: limitNum
        });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ message: 'Error fetching activity logs' });
    }
};
