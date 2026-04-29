const { run, get, query } = require('../config/database');
const { roundMoney } = require('../utils/money');
const { MAX_RECORDS_LIMIT } = require('../config/constants');

class Revenue {
    // إضافة إيراد جديد
    static async create(userId, date, source, amount, notes = null) {
        const result = await run(
            'INSERT INTO revenues (user_id, date, source, amount, notes) VALUES (?, ?, ?, ?, ?)',
            [userId, date, source, roundMoney(amount), notes]
        );
        return result.lastID;
    }

    // الحصول على جميع الإيرادات للمستخدم
    static async getAllByUser(userId) {
        return await query(
            'SELECT * FROM revenues WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT ?',
            [userId, MAX_RECORDS_LIMIT]
        );
    }

    static buildListFilters(userId, filters = {}) {
        const where = ['user_id = ?'];
        const params = [userId];

        if (filters.startDate) {
            where.push('date >= ?');
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            where.push('date <= ?');
            params.push(filters.endDate);
        }
        if (filters.search) {
            where.push('(source LIKE ? OR notes LIKE ?)');
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }

        return {
            whereSql: where.join(' AND '),
            params
        };
    }

    // الحصول على الإيرادات بالصفحات مع فلاتر اختيارية
    static async getAllByUserPaginated(userId, { page = 1, limit = 50, offset = 0, startDate, endDate, search } = {}) {
        const filters = this.buildListFilters(userId, { startDate, endDate, search });

        const data = await query(
            `SELECT * FROM revenues WHERE ${filters.whereSql} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`,
            [...filters.params, limit, offset]
        );

        const countResult = await get(
            `SELECT COUNT(*) as total FROM revenues WHERE ${filters.whereSql}`,
            filters.params
        );

        return {
            data,
            pagination: {
                page,
                limit,
                total: countResult.total,
                totalPages: Math.ceil(countResult.total / limit)
            }
        };
    }

    // الحصول على إيراد معين
    static async findById(id, userId) {
        return await get(
            'SELECT * FROM revenues WHERE id = ? AND user_id = ?',
            [id, userId]
        );
    }

    // تحديث إيراد
    static async update(id, userId, date, source, amount, notes) {
        const result = await run(
            `UPDATE revenues 
             SET date = ?, source = ?, amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [date, source, roundMoney(amount), notes, id, userId]
        );
        return result.changes > 0;
    }

    // حذف إيراد
    static async delete(id, userId) {
        const result = await run(
            'DELETE FROM revenues WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.changes > 0;
    }

    // حذف جميع الإيرادات للمستخدم
    static async deleteAll(userId) {
        const result = await run(
            'DELETE FROM revenues WHERE user_id = ?',
            [userId]
        );
        return result.changes > 0;
    }

    // حساب إجمالي الإيرادات للمستخدم
    static async getTotalByUser(userId) {
        const result = await get(
            'SELECT COALESCE(SUM(amount), 0) as total FROM revenues WHERE user_id = ?',
            [userId]
        );
        return result.total;
    }

    // الإيرادات حسب الفترة الزمنية
    static async getByDateRange(userId, startDate, endDate) {
        return await query(
            'SELECT * FROM revenues WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
            [userId, startDate, endDate]
        );
    }

    static async getMonthlyTotals(userId, startDate = null, endDate = null) {
        const filters = this.buildListFilters(userId, { startDate, endDate });
        return await query(
            `SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount), 0) as total
             FROM revenues
             WHERE ${filters.whereSql}
             GROUP BY strftime('%Y-%m', date)
             ORDER BY month DESC`,
            filters.params
        );
    }
}

module.exports = Revenue;
