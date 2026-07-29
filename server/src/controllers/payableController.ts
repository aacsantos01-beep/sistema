import { Request, Response } from 'express';
import { db } from '../db/database';

export const getAllPayables = async (req: Request, res: Response) => {
    try {
        const result = await db.query('SELECT * FROM payables WHERE is_deleted = FALSE ORDER BY due_date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payables' });
    }
};

export const getPayableById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('SELECT * FROM payables WHERE id = $1 AND is_deleted = FALSE', [id]);
        const payable = result.rows[0];
        if (!payable) return res.status(404).json({ message: 'Payable not found' });
        res.json(payable);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payable' });
    }
};

export const createPayable = async (req: Request, res: Response) => {
    const { description, amount, due_date, status, category, payment_method } = req.body;
    
    try {
        const result = await db.query(
            'INSERT INTO payables (description, amount, due_date, status, category, payment_method) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [description, amount, due_date, status || 'pending', category, payment_method]
        );
        res.status(201).json({ id: result.rows[0].id, description, amount, due_date, status, category, payment_method });
    } catch (error: any) {
        console.error('Error creating payable:', error);
        res.status(500).json({ message: 'Error creating payable' });
    }
};

export const updatePayable = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description, amount, due_date, status, category, payment_method } = req.body;

    try {
        const result = await db.query(
            'UPDATE payables SET description = $1, amount = $2, due_date = $3, status = $4, category = $5, payment_method = $6 WHERE id = $7',
            [description, amount, due_date, status, category, payment_method, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Payable not found' });
        res.json({ id, description, amount, due_date, status, category, payment_method });
    } catch (error: any) {
        console.error('Error updating payable:', error);
        res.status(500).json({ message: 'Error updating payable' });
    }
};

export const updatePayableStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await db.query(
            'UPDATE payables SET status = $1 WHERE id = $2',
            [status, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Payable not found' });
        res.json({ message: 'Status updated' });
    } catch (error: any) {
        console.error('Error updating payable status:', error);
        res.status(500).json({ message: 'Error updating payable status' });
    }
};

export const deletePayable = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await db.query('UPDATE payables SET is_deleted = TRUE WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Payable not found' });
        res.json({ message: 'Payable deleted' });
    } catch (error: any) {
        console.error('Error deleting payable:', error);
        res.status(500).json({ message: 'Error deleting payable' });
    }
};
