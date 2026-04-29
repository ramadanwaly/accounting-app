const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

const audit = async (req, action, { entityType = null, entityId = null, details = null } = {}) => {
    try {
        await AuditLog.create({
            userId: req.user?.userId || null,
            action,
            entityType,
            entityId,
            details,
            ipAddress: req.ip,
            userAgent: req.get ? req.get('user-agent') : null
        });
    } catch (error) {
        logger.error('Failed to write audit log', error);
    }
};

module.exports = {
    audit
};
