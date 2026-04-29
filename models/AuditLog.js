const { run, query } = require('../config/database');

class AuditLog {
    static async create({ userId = null, action, entityType = null, entityId = null, details = null, ipAddress = null, userAgent = null }) {
        const serializedDetails = details ? JSON.stringify(details) : null;
        const result = await run(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, action, entityType, entityId, serializedDetails, ipAddress, userAgent]
        );
        return result.lastID;
    }

    static async getRecent(limit = 100) {
        const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 500);
        return await query(
            `SELECT audit_logs.*, users.email
             FROM audit_logs
             LEFT JOIN users ON users.id = audit_logs.user_id
             ORDER BY audit_logs.created_at DESC
             LIMIT ?`,
            [safeLimit]
        );
    }
}

module.exports = AuditLog;
