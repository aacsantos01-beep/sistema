import { Request, Response } from 'express';
import { db } from '../db/database';

export const getAllPayables = (req: Request, res: Response) => {
    try {
        const payables = db.prepare('SELECT * FROM payables ORDER BY due_date DESC').all();
        res.json(payables);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payables' });
    }
};

export const getPayableById = (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const payable = db.prepare('SELECT * FROM payables WHERE id = ?').get(id);
        if (!payable) return res.status(404).json({ message: 'Payable not found' });
        res.json(payable);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payable' });
    }
};

export const createPayable = (req: Request, res: Response) => {
    const { description, amount, due_date, status, category, payment_method } = req.body;
    
    try {
        const result = db.prepare(
            'INSERT INTO payables (description, amount, due_date, status, category, payment_method) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(description, amount, due_date, status || 'pending', category, payment_method);
        res.status(201).json({ id: result.lastInsertRowid, description, amount, due_date, status, category, payment_method });
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating payable: ' + error.message });
    }
};

export const updatePayable = (req: Request, res: Response) => {
    const { id } = req.params;
    const { description, amount, due_date, status, category, payment_method } = req.body;

    try {
        const result = db.prepare(
            'UPDATE payables SET description = ?, amount = ?, due_date = ?, status = ?, category = ?, payment_method = ? WHERE id = ?'
        ).run(description, amount, due_date, status, category, payment_method, id);
        if (result.changes === 0) return res.status(404).json({ message: 'Payable not found' });
        res.json({ id, description, amount, due_date, status, category, payment_method });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating payable: ' + error.message });
    }
};

export const updatePayableStatus = (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = db.prepare(
            'UPDATE payables SET status = ? WHERE id = ?'
        ).run(status, id);
        if (result.changes === 0) return res.status(404).json({ message: 'Payable not found' });
        res.json({ message: 'Status updated' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error updating payable status: ' + error.message });
    }
};

export const deletePayable = (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = db.prepare('DELETE FROM payables WHERE id = ?').run(id);
        if (result.changes === 0) return res.status(404).json({ message: 'Payable not found' });
        res.json({ message: 'Payable deleted' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error deleting payable: ' + error.message });
    }
};
