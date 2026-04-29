const db = require('../config/database');
const crypto = require('crypto');

class DeletionRequest {
    static async create(userId, resourceType, resourceId, reason = null) {
        const token = crypto.randomBytes(32).toString('hex');

        await db.run(
            `INSERT INTO deletion_requests (user_id, resource_type, resource_id, reason, admin_token, expires_at) 
             VALUES (?, ?, ?, ?, ?, datetime('now', '+24 hours'))`,
            [userId, resourceType, resourceId, reason, token]
        );

        return token;
    }

    static async findByToken(token) {
        return await db.get(
            `SELECT * FROM deletion_requests 
             WHERE admin_token = ? AND (expires_at IS NULL OR expires_at > datetime('now'))`,
            [token]
        );
    }

    static async markApproved(id) {
        await db.run(
            `UPDATE deletion_requests SET status = 'approved' WHERE id = ?`,
            [id]
        );
    }

    static async markRejected(id) {
        await db.run(
            `UPDATE deletion_requests SET status = 'rejected' WHERE id = ?`,
            [id]
        );
    }

    static async setCsrfToken(id, token) {
        await db.run(
            `UPDATE deletion_requests SET csrf_token = ? WHERE id = ?`,
            [token, id]
        );
    }
}

module.exports = DeletionRequest;
