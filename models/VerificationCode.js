const { run, get, initDatabase } = require('../config/database');
const { VERIFICATION_CODE_EXPIRY_MINUTES } = require('../config/constants');

class VerificationCode {
    // حفظ رمز تحقق جديد
    static async create(userId, code, actionType) {
        // حذف أي رموز سابقة لنفس العملية
        await run('DELETE FROM verification_codes WHERE user_id = ? AND action_type = ?', [userId, actionType]);

        // صلاحية من الثوابت
        const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

        const result = await run(
            'INSERT INTO verification_codes (user_id, code, action_type, expires_at) VALUES (?, ?, ?, ?)',
            [userId, code, actionType, expiresAt]
        );
        return result.lastID;
    }

    // التحقق من الرمز
    static async verify(userId, code, actionType) {
        const record = await get(
            `SELECT * FROM verification_codes 
             WHERE user_id = ? AND code = ? AND action_type = ? AND expires_at > datetime('now')`,
            [userId, code, actionType]
        );
        return !!record;
    }

    // حذف الرمز بعد الاستخدام
    static async consume(userId, actionType) {
        await run('DELETE FROM verification_codes WHERE user_id = ? AND action_type = ?', [userId, actionType]);
    }
}

module.exports = VerificationCode;
