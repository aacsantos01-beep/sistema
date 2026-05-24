import { Request, Response } from 'express';
import { db } from '../db/database';

export const getAllSellers = (req: Request, res: Response) => {
    try {
        const sellers = db.prepare('SELECT * FROM sellers WHERE active = 1 ORDER BY name ASC').all();
        res.json(sellers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sellers' });
    }
};

export const createSeller = (req: Request, res: Response) => {
    const { name, email, phone } = req.body;
    try {
        const result = db.prepare(
            'INSERT INTO sellers (name, email, phone) VALUES (?, ?, ?)'
        ).run(name, email, phone);
        res.status(201).json({ id: result.lastInsertRowid, name, email, phone });
    } catch (error) {
        res.status(500).json({ message: 'Error creating seller' });
    }
};

export const updateSeller = (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, phone, active } = req.body;
    try {
        const result = db.prepare(
            'UPDATE sellers SET name = ?, email = ?, phone = ?, active = ? WHERE id = ?'
        ).run(name, email, phone, active, id);
        if (result.changes === 0) return res.status(404).json({ message: 'Seller not found' });
        res.json({ id, name, email, phone, active });
    } catch (error) {
        res.status(500).json({ message: 'Error updating seller' });
    }
};

export const deleteSeller = (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Soft delete
        const result = db.prepare('UPDATE sellers SET active = 0 WHERE id = ?').run(id);
        if (result.changes === 0) return res.status(404).json({ message: 'Seller not found' });
        res.json({ message: 'Seller deactivated' });
    } catch (error) {
        res.status(500).json({ message: 'Error deactivating seller' });
    }
};
