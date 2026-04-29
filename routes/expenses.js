const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { verifyToken } = require('../middleware/auth');
const VerificationCode = require('../models/VerificationCode');
const { expenseValidator, bulkExpenseValidator, idValidator } = require('../middleware/validators');
const { audit } = require('../services/auditService');
const { parsePagination, hasListFilters } = require('../utils/queryOptions');
const { requestDeletionApproval } = require('../utils/deletionHelper');

// جميع المسارات تتطلب تسجيل الدخول
router.use(verifyToken);

// الحصول على أسماء المشاريع (للـ Auto-complete)
router.get('/projects/names', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const projects = await Expense.getUniqueProjects(userId);

        res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        next(error);
    }
});

// الحصول على جميع المصروفات
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        if (hasListFilters(req.query)) {
            const pagination = parsePagination(req.query);
            const result = await Expense.getAllByUserPaginated(userId, {
                ...pagination,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                project: req.query.project,
                category: req.query.category,
                search: req.query.search
            });

            return res.json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        }

        const expenses = await Expense.getAllByUser(userId);

        res.json({
            success: true,
            data: expenses
        });
    } catch (error) {
        next(error);
    }
});

// إضافة مصروف جديد
router.post('/', expenseValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { date, category, project, amount, quantity, price, notes } = req.body;

        const expenseId = await Expense.create(userId, date, category, project, amount, quantity, price, notes);
        await audit(req, 'expense.create', {
            entityType: 'expense',
            entityId: expenseId,
            details: { date, category, project, amount, quantity, price }
        });

        res.status(201).json({
            success: true,
            message: 'تم إضافة المصروف بنجاح',
            data: { id: expenseId }
        });
    } catch (error) {
        next(error);
    }
});

// إضافة مصروفات متعددة (ملفوفة في Transaction لضمان الذرية)
router.post('/bulk', bulkExpenseValidator, async (req, res, next) => {
    const { run: dbRun } = require('../config/database');
    try {
        const userId = req.user.userId;
        const { items } = req.body;

        await dbRun('BEGIN TRANSACTION');
        const createdIds = [];
        try {
            for (const item of items) {
                const id = await Expense.create(
                    userId, item.date, item.category, item.project,
                    item.amount, item.quantity || 1, item.price || 0, item.notes || null
                );
                createdIds.push(id);
            }
            await dbRun('COMMIT');
        } catch (insertError) {
            await dbRun('ROLLBACK');
            throw insertError;
        }

        await audit(req, 'expense.bulk_create', {
            entityType: 'expense',
            details: { count: createdIds.length, ids: createdIds }
        });

        res.status(201).json({
            success: true,
            message: `تم إضافة ${createdIds.length} مصروف بنجاح`,
            data: { ids: createdIds, count: createdIds.length }
        });
    } catch (error) {
        next(error);
    }
});

// الحصول على مصروف معين
router.get('/:id', idValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const expense = await Expense.findById(id, userId);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'المصروف غير موجود'
            });
        }

        res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        next(error);
    }
});

// تحديث مصروف
router.put('/:id', [...idValidator, ...expenseValidator], async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { date, category, project, amount, quantity, price, notes } = req.body;

        const updated = await Expense.update(id, userId, date, category, project, amount, quantity, price, notes);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'المصروف غير موجود'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث المصروف بنجاح'
        });
        await audit(req, 'expense.update', {
            entityType: 'expense',
            entityId: Number(id),
            details: { date, category, project, amount, quantity, price }
        });
    } catch (error) {
        next(error);
    }
});

// حذف جميع المصروفات
router.delete('/all', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { verificationCode } = req.body;

        if (!verificationCode) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال كود التحقق'
            });
        }

        const isValid = await VerificationCode.verify(userId, verificationCode, 'DELETE_DATA');
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'كود التحقق غير صحيح'
            });
        }

        // تفاصيل الموارد
        const count = (await Expense.getAllByUser(userId)).length;
        const resourceData = { description: "حذف جميع المصروفات", count };

        await requestDeletionApproval(req, {
            resourceType: 'all_expenses',
            resourceId: null,
            resourceLabel: 'جميع المصروفات',
            resourceData,
            auditAction: 'expense.delete_all_requested',
            reason: 'حذف الكل بطلب المستخدم'
        });

        await VerificationCode.consume(userId, 'DELETE_DATA');

        res.status(202).json({
            success: true,
            approvalCallback: true,
            message: 'تم إرسال طلب الحذف إلى المسؤول للموافقة. سيصلك إشعار عند الموافقة.'
        });
    } catch (error) {
        next(error);
    }
});

// حذف مصروف
router.delete('/:id', idValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const expense = await Expense.findById(id, userId);
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'المصروف غير موجود'
            });
        }

        await requestDeletionApproval(req, {
            resourceType: 'expense',
            resourceId: id,
            resourceLabel: 'مصروف',
            resourceData: { amount: expense.amount, date: expense.date, category: expense.category, project: expense.project },
            auditAction: 'expense.delete_requested'
        });

        res.status(202).json({
            success: true,
            approvalCallback: true,
            message: 'تم إرسال طلب الحذف للمسؤول للموافقة'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
