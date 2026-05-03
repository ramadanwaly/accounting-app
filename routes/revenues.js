const express = require('express');
const router = express.Router();
const Revenue = require('../models/Revenue');
const { verifyToken } = require('../middleware/auth');
const VerificationCode = require('../models/VerificationCode');
const { revenueValidator, bulkRevenueValidator, idValidator } = require('../middleware/validators');
const { audit } = require('../services/auditService');
const { parsePagination, hasListFilters } = require('../utils/queryOptions');
const { requestDeletionApproval } = require('../utils/deletionHelper');

// جميع المسارات تتطلب تسجيل الدخول
router.use(verifyToken);

// الحصول على جميع الإيرادات
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        if (hasListFilters(req.query)) {
            const pagination = parsePagination(req.query);
            const result = await Revenue.getAllByUserPaginated(userId, {
                ...pagination,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                search: req.query.search
            });

            return res.json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
        }

        const revenues = await Revenue.getAllByUser(userId);

        res.json({
            success: true,
            data: revenues
        });
    } catch (error) {
        next(error);
    }
});

// إضافة إيراد جديد
router.post('/', revenueValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { date, source, amount, notes } = req.body;

        const revenueId = await Revenue.create(userId, date, source, amount, notes);
        await audit(req, 'revenue.create', {
            entityType: 'revenue',
            entityId: revenueId,
            details: { date, source, amount }
        });

        res.status(201).json({
            success: true,
            message: 'تم إضافة الإيراد بنجاح',
            data: { id: revenueId }
        });
    } catch (error) {
        next(error);
    }
});

// إضافة إيرادات متعددة (ملفوفة في Transaction لضمان الذرية)
router.post('/bulk', bulkRevenueValidator, async (req, res, next) => {
    const { transaction: dbTransaction, db } = require('../config/database');
    const { roundMoney } = require('../utils/money');
    try {
        const userId = req.user.userId;
        const { items } = req.body;

        const createdIds = dbTransaction(() => {
            const ids = [];
            const stmt = db.prepare(
                'INSERT INTO revenues (user_id, date, source, amount, notes) VALUES (?, ?, ?, ?, ?)'
            );
            
            for (const item of items) {
                const result = stmt.run(
                    userId, item.date, item.source, roundMoney(item.amount), item.notes || null
                );
                const id = typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid;
                ids.push(id);
            }
            return ids;
        });

        await audit(req, 'revenue.bulk_create', {
            entityType: 'revenue',
            details: { count: createdIds.length, ids: createdIds }
        });

        res.status(201).json({
            success: true,
            message: `تم إضافة ${createdIds.length} إيراد بنجاح`,
            data: { ids: createdIds, count: createdIds.length }
        });
    } catch (error) {
        next(error);
    }
});

// الحصول على إيراد معين
router.get('/:id', idValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const revenue = await Revenue.findById(id, userId);

        if (!revenue) {
            return res.status(404).json({
                success: false,
                message: 'الإيراد غير موجود'
            });
        }

        res.json({
            success: true,
            data: revenue
        });
    } catch (error) {
        next(error);
    }
});

// تحديث إيراد
router.put('/:id', [...idValidator, ...revenueValidator], async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { date, source, amount, notes } = req.body;

        const updated = await Revenue.update(id, userId, date, source, amount, notes);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'الإيراد غير موجود'
            });
        }

        res.json({
            success: true,
            message: 'تم تحديث الإيراد بنجاح'
        });
        await audit(req, 'revenue.update', {
            entityType: 'revenue',
            entityId: Number(id),
            details: { date, source, amount }
        });
    } catch (error) {
        next(error);
    }
});

// حذف جميع الإيرادات
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
        const count = (await Revenue.getAllByUser(userId)).length;
        const resourceData = { description: "حذف جميع الإيرادات", count };

        await requestDeletionApproval(req, {
            resourceType: 'all_revenues',
            resourceId: null,
            resourceLabel: 'جميع الإيرادات',
            resourceData,
            auditAction: 'revenue.delete_all_requested',
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

// حذف إيراد
router.delete('/:id', idValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const revenue = await Revenue.findById(id, userId);
        if (!revenue) {
            return res.status(404).json({
                success: false,
                message: 'الإيراد غير موجود'
            });
        }

        await requestDeletionApproval(req, {
            resourceType: 'revenue',
            resourceId: id,
            resourceLabel: 'إيراد',
            resourceData: { amount: revenue.amount, date: revenue.date, source: revenue.source },
            auditAction: 'revenue.delete_requested'
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
