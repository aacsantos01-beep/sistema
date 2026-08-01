import { db } from '../db/database';

// Fire-and-forget: a logging failure must never break the actual operation.
export const logActivity = async (
    userId: number | null,
    username: string | null,
    action: string,
    entityType?: string | null,
    entityId?: string | number | null,
    details?: string | null
): Promise<void> => {
    try {
        await db.query(
            'INSERT INTO activity_logs (user_id, username, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, username, action, entityType || null, entityId != null ? String(entityId) : null, details || null]
        );
    } catch (error) {
        console.error('Failed to record activity log:', error);
    }
};
