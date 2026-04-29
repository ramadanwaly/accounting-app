const bcrypt = require('bcrypt');
const { run, get, query } = require('../config/database');
const { bcryptSaltRounds } = require('../config/auth');
const { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MINUTES } = require('../config/constants');

class User {
    // إنشاء مستخدم جديد
    static async create(email, password, fullName = null) {
        const hashedPassword = await bcrypt.hash(password, bcryptSaltRounds);
        const result = await run(
            'INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)',
            [email, hashedPassword, fullName]
        );
        return result.lastID;
    }

    // البحث عن مستخدم بالبريد الإلكتروني
    static async findByEmail(email) {
        return await get('SELECT * FROM users WHERE email = ?', [email]);
    }

    // البحث عن مستخدم بالـ ID
    static async findById(id) {
        return await get('SELECT id, email, full_name, created_at, role, is_approved FROM users WHERE id = ?', [id]);
    }

    // البحث عن مستخدم بالـ ID شامل كلمة المرور (لأغراض التحقق فقط)
    static async findByIdWithPassword(id) {
        return await get('SELECT * FROM users WHERE id = ?', [id]);
    }

    // التحقق من كلمة المرور
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    // تحديث كلمة المرور
    static async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, bcryptSaltRounds);
        const result = await run(
            'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, userId]
        );
        return result.changes > 0;
    }

    // تحديث البريد الإلكتروني
    static async updateEmail(userId, newEmail) {
        const result = await run(
            'UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newEmail, userId]
        );
        return result.changes > 0;
    }

    // حذف مستخدم
    static async delete(userId) {
        const result = await run('DELETE FROM users WHERE id = ?', [userId]);
        return result.changes > 0;
    }

    // الحصول على جميع المستخدمين (للإدارة)
    static async getAll() {
        return await query('SELECT id, email, full_name, created_at, role, is_approved FROM users ORDER BY created_at DESC');
    }

    // الحصول على مستخدمي الإدارة النشطين لطلبات الموافقة
    static async getApprovedAdmins() {
        return await query(
            "SELECT id, email, full_name FROM users WHERE role = 'admin' AND is_approved = 1 ORDER BY created_at ASC"
        );
    }

    // ===== Account Lockout Functions =====

    // زيادة عدد محاولات تسجيل الدخول الفاشلة
    static async incrementFailedAttempts(userId) {
        const result = await run(
            `UPDATE users 
             SET failed_login_attempts = failed_login_attempts + 1,
                 last_failed_login = datetime('now'),
                 locked_until = CASE 
                     WHEN failed_login_attempts + 1 >= ? 
                     THEN datetime('now', '+${LOCKOUT_DURATION_MINUTES} minutes')
                     ELSE locked_until
                 END
             WHERE id = ?`,
            [MAX_FAILED_ATTEMPTS, userId]
        );
        return result.changes > 0;
    }

    // إعادة تعيين محاولات تسجيل الدخول الفاشلة
    static async resetFailedAttempts(userId) {
        const result = await run(
            `UPDATE users 
             SET failed_login_attempts = 0,
                 locked_until = NULL,
                 last_failed_login = NULL
             WHERE id = ?`,
            [userId]
        );
        return result.changes > 0;
    }

    // التحقق من قفل الحساب
    static async isAccountLocked(userId) {
        const user = await get(
            `SELECT locked_until,
                    CASE
                        WHEN locked_until IS NOT NULL AND locked_until > datetime('now') THEN 1
                        ELSE 0
                    END as is_locked
             FROM users WHERE id = ?`,
            [userId]
        );

        if (!user || !user.locked_until) {
            return false;
        }

        if (user.is_locked) {
            return true;
        }

        // إذا انتهى وقت القفل، نفتح الحساب تلقائياً
        await this.resetFailedAttempts(userId);
        return false;
    }

    // فتح الحساب يدوياً (للإدارة)
    static async unlockAccount(userId) {
        return await this.resetFailedAttempts(userId);
    }

    // الحصول على معلومات القفل
    static async getLockoutInfo(userId) {
        return await get(
            `SELECT failed_login_attempts, locked_until, last_failed_login 
             FROM users WHERE id = ?`,
            [userId]
        );
    }
}

module.exports = User;
