const { run, get, query } = require('../config/database');
const { roundMoney } = require('../utils/money');
const { MAX_RECORDS_LIMIT } = require('../config/constants');
const { normalizeArabic, getSqlNormalize } = require('../utils/arabic');

class Expense {
    // إضافة مصروف جديد
    static async create(userId, date, category, project, amount, quantity = 1, price = 0, notes = null) {
        const result = await run(
            'INSERT INTO expenses (user_id, date, category, project, amount, quantity, price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, date, category, project, roundMoney(amount), quantity, roundMoney(price), notes]
        );
        return result.lastID;
    }

    // الحصول على جميع المصروفات للمستخدم
    static async getAllByUser(userId) {
        return await query(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT ?',
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
        if (filters.project) {
            where.push('project = ?');
            params.push(filters.project);
        }
        if (filters.category) {
            where.push('category = ?');
            params.push(filters.category);
        }
        if (filters.search) {
            const normalizedProject = getSqlNormalize('project');
            const normalizedCategory = getSqlNormalize('category');
            const normalizedNotes = getSqlNormalize('notes');
            where.push(`(${normalizedProject} LIKE ? OR ${normalizedCategory} LIKE ? OR ${normalizedNotes} LIKE ?)`);
            const searchTerm = `%${normalizeArabic(filters.search)}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        return {
            whereSql: where.join(' AND '),
            params
        };
    }

    // الحصول على المصروفات بالصفحات مع فلاتر اختيارية
    static async getAllByUserPaginated(userId, { page = 1, limit = 50, offset = 0, startDate, endDate, project, category, search } = {}) {
        const filters = this.buildListFilters(userId, { startDate, endDate, project, category, search });

        const data = await query(
            `SELECT * FROM expenses WHERE ${filters.whereSql} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`,
            [...filters.params, limit, offset]
        );

        const countResult = await get(
            `SELECT COUNT(*) as total FROM expenses WHERE ${filters.whereSql}`,
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

    // الحصول على مصروف معين
    static async findById(id, userId) {
        return await get(
            'SELECT * FROM expenses WHERE id = ? AND user_id = ?',
            [id, userId]
        );
    }

    // تحديث مصروف
    static async update(id, userId, date, category, project, amount, quantity, price, notes) {
        const result = await run(
            `UPDATE expenses 
             SET date = ?, category = ?, project = ?, amount = ?, quantity = ?, price = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ? AND user_id = ?`,
            [date, category, project, roundMoney(amount), quantity, roundMoney(price), notes, id, userId]
        );
        return result.changes > 0;
    }

    // حذف مصروف
    static async delete(id, userId) {
        const result = await run(
            'DELETE FROM expenses WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        return result.changes > 0;
    }

    // حذف جميع المصروفات للمستخدم
    static async deleteAll(userId) {
        const result = await run(
            'DELETE FROM expenses WHERE user_id = ?',
            [userId]
        );
        return result.changes > 0;
    }

    // حساب إجمالي المصروفات للمستخدم
    static async getTotalByUser(userId) {
        const result = await get(
            'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ?',
            [userId]
        );
        return result.total;
    }

    // المصروفات حسب المشروع
    static async getByProject(userId, project) {
        return await query(
            'SELECT * FROM expenses WHERE user_id = ? AND project = ? ORDER BY date DESC',
            [userId, project]
        );
    }

    // الحصول على جميع المشاريع الفريدة (للـ Auto-complete)
    static async getUniqueProjects(userId) {
        const results = await query(
            'SELECT DISTINCT project FROM expenses WHERE user_id = ? ORDER BY project',
            [userId]
        );
        return results.map(r => r.project);
    }

    // المصروفات حسب النوع
    static async getByCategory(userId, category) {
        return await query(
            'SELECT * FROM expenses WHERE user_id = ? AND category = ? ORDER BY date DESC',
            [userId, category]
        );
    }

    // الإجمالي حسب المشروع
    static async getTotalByProject(userId, project) {
        const result = await get(
            'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND project = ?',
            [userId, project]
        );
        return result.total;
    }

    // المصروفات حسب الفترة الزمنية
    static async getByDateRange(userId, startDate, endDate) {
        return await query(
            'SELECT * FROM expenses WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC',
            [userId, startDate, endDate]
        );
    }

    static async getMonthlyTotals(userId, startDate = null, endDate = null) {
        const filters = this.buildListFilters(userId, { startDate, endDate });
        return await query(
            `SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(amount), 0) as total
             FROM expenses
             WHERE ${filters.whereSql}
             GROUP BY strftime('%Y-%m', date)
             ORDER BY month DESC`,
            filters.params
        );
    }

    static async getCategoryTotals(userId, startDate = null, endDate = null) {
        const filters = this.buildListFilters(userId, { startDate, endDate });
        return await query(
            `SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
             FROM expenses
             WHERE ${filters.whereSql}
             GROUP BY category
             ORDER BY total DESC`,
            filters.params
        );
    }
}

module.exports = Expense;
