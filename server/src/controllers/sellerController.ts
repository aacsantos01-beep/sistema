import { Request, Response } from 'express';
import { db } from '../db/database';

export const getAllSellers = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM sellers WHERE active = 1 ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sellers' });
    }
};

export const createSeller = async (req: Request, res: Response) => {
    const { name, email, phone } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO sellers (name, email, phone) VALUES ($1, $2, $3) RETURNING id',
            [name, email, phone]
        );
        res.status(201).json({ id: result.rows[0].id, name, email, phone });
    } catch (error) {
        res.status(500).json({ message: 'Error creating seller' });
    }
};

export const updateSeller = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, phone, active } = req.body;
    try {
        const result = await db.query(
            'UPDATE sellers SET name = $1, email = $2, phone = $3, active = $4 WHERE id = $5',
            [name, email, phone, active, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Seller not found' });
        res.json({ id, name, email, phone, active });
    } catch (error) {
        res.status(500).json({ message: 'Error updating seller' });
    }
};

export const deleteSeller = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Soft delete
        const result = await db.query('UPDATE sellers SET active = 0 WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Seller not found' });
        res.json({ message: 'Seller deactivated' });
    } catch (error) {
        res.status(500).json({ message: 'Error deactivating seller' });
    }
};
