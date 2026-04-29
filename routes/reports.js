const express = require('express');
const router = express.Router();
const Revenue = require('../models/Revenue');
const Expense = require('../models/Expense');
const { verifyToken } = require('../middleware/auth');

// جميع المسارات تتطلب تسجيل الدخول
router.use(verifyToken);

// الملخص المالي
router.get('/summary', async (req, res, next) => {
    try {
        const userId = req.user.userId;

        const totalRevenues = await Revenue.getTotalByUser(userId);
        const totalExpenses = await Expense.getTotalByUser(userId);
        const netProfit = totalRevenues - totalExpenses;

        res.json({
            success: true,
            data: {
                totalRevenues: Number(totalRevenues).toFixed(2),
                totalExpenses: Number(totalExpenses).toFixed(2),
                netProfit: Number(netProfit).toFixed(2)
            }
        });
    } catch (error) {
        next(error);
    }
});

// تقرير المشاريع
router.get('/projects', async (req, res, next) => {
    try {
        const userId = req.user.userId;

        // الحصول على جميع المشاريع الفريدة
        const projects = await Expense.getUniqueProjects(userId);

        // جمع معلومات كل مشروع
        const projectsData = await Promise.all(
            projects.map(async (projectName) => {
                const expenses = await Expense.getByProject(userId, projectName);
                const total = await Expense.getTotalByProject(userId, projectName);

                return {
                    name: projectName,
                    total: Number(total).toFixed(2),
                    expenses: expenses
                };
            })
        );

        res.json({
            success: true,
            data: projectsData
        });
    } catch (error) {
        next(error);
    }
});

// تقرير شهري للإيرادات والمصروفات وصافي الربح
router.get('/monthly', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate } = req.query;

        const [revenues, expenses] = await Promise.all([
            Revenue.getMonthlyTotals(userId, startDate, endDate),
            Expense.getMonthlyTotals(userId, startDate, endDate)
        ]);

        const months = new Map();
        revenues.forEach(row => {
            months.set(row.month, {
                month: row.month,
                totalRevenues: Number(row.total),
                totalExpenses: 0
            });
        });
        expenses.forEach(row => {
            const current = months.get(row.month) || {
                month: row.month,
                totalRevenues: 0,
                totalExpenses: 0
            };
            current.totalExpenses = Number(row.total);
            months.set(row.month, current);
        });

        const data = Array.from(months.values())
            .map(row => ({
                ...row,
                netProfit: Number(row.totalRevenues - row.totalExpenses)
            }))
            .sort((a, b) => b.month.localeCompare(a.month));

        res.json({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
});

// إجماليات المصروفات حسب التصنيف
router.get('/expense-categories', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate } = req.query;
        const data = await Expense.getCategoryTotals(userId, startDate, endDate);

        res.json({
            success: true,
            data: data.map(row => ({
                category: row.category,
                total: Number(row.total).toFixed(2),
                count: row.count
            }))
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
