const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const DeletionRequest = require('../models/DeletionRequest');
const Revenue = require('../models/Revenue');
const Expense = require('../models/Expense');
const logger = require('../config/logger');
const AuditLog = require('../models/AuditLog');

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getResourceLabel = (resourceType) => {
    const labels = {
        revenue: 'إيراد',
        expense: 'مصروف',
        all_revenues: 'جميع الإيرادات',
        all_expenses: 'جميع المصروفات'
    };
    return labels[resourceType] || 'بيانات';
};

const renderMessagePage = (title, message, color = '#2c3e50') => `
    <div style="direction: rtl; font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: ${color};">${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
    </div>
`;

const renderConfirmationPage = (request, action, csrfToken) => {
    const isApprove = action === 'approve';
    const title = isApprove ? 'تأكيد حذف البيانات' : 'تأكيد رفض طلب الحذف';
    const buttonText = isApprove ? 'نعم، احذف نهائياً' : 'نعم، ارفض الطلب';
    const buttonColor = isApprove ? '#e74c3c' : '#7f8c8d';
    const path = isApprove ? 'approve-deletion' : 'reject-deletion';

    return `
        <div style="direction: rtl; font-family: Arial, sans-serif; max-width: 560px; margin: 60px auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
            <h1 style="margin-top: 0; color: ${buttonColor};">${title}</h1>
            <p>نوع البيانات: <strong>${escapeHtml(getResourceLabel(request.resource_type))}</strong></p>
            <p>سبب الطلب: <strong>${escapeHtml(request.reason || '-')}</strong></p>
            <p style="color: #c0392b;">هذا الإجراء لا يمكن التراجع عنه بعد التأكيد.</p>
            <form method="POST" action="/api/requests/${path}/${escapeHtml(request.admin_token)}">
                <input type="hidden" name="_csrf" value="${csrfToken}">
                <button type="submit" style="background: ${buttonColor}; color: #fff; border: 0; padding: 12px 22px; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    ${buttonText}
                </button>
            </form>
        </div>
    `;
};

const loadPendingRequest = async (token, res) => {
    const request = await DeletionRequest.findByToken(token);

    if (!request) {
        res.status(404).send(renderMessagePage('رابط غير صالح أو منتهي الصلاحية', 'لم يتم العثور على طلب حذف صالح.', '#c0392b'));
        return null;
    }

    if (request.status !== 'pending') {
        res.status(400).send(renderMessagePage('تمت معالجة هذا الطلب مسبقاً', `الحالة الحالية: ${request.status}`, '#7f8c8d'));
        return null;
    }

    return request;
};

const executeDeletion = async (request) => {
    if (request.resource_type === 'revenue') {
        return await Revenue.delete(request.resource_id, request.user_id);
    }
    if (request.resource_type === 'expense') {
        return await Expense.delete(request.resource_id, request.user_id);
    }
    if (request.resource_type === 'all_revenues') {
        await Revenue.deleteAll(request.user_id);
        return true;
    }
    if (request.resource_type === 'all_expenses') {
        await Expense.deleteAll(request.user_id);
        return true;
    }

    return false;
};

const auditDeletionDecision = async (request, action) => {
    try {
        await AuditLog.create({
            userId: request.user_id,
            action,
            entityType: request.resource_type,
            entityId: request.resource_id,
            details: {
                deletionRequestId: request.id,
                reason: request.reason
            }
        });
    } catch (error) {
        logger.error('Failed to write deletion decision audit log', error);
    }
};

// عرض صفحة تأكيد الموافقة دون تنفيذ الحذف
router.get('/approve-deletion/:token', async (req, res) => {
    try {
        const request = await loadPendingRequest(req.params.token, res);
        if (!request) return;

        // توليد CSRF token وتخزينه مؤقتاً مع الطلب
        const csrfToken = crypto.randomBytes(32).toString('hex');
        await DeletionRequest.setCsrfToken(request.id, csrfToken);

        res.send(renderConfirmationPage(request, 'approve', csrfToken));

    } catch (error) {
        logger.error('Error approving deletion:', error);
        res.status(500).send(renderMessagePage('حدث خطأ داخلي', 'تعذر تحميل طلب الحذف.', '#c0392b'));
    }
});

// تنفيذ الموافقة على طلب الحذف
router.post('/approve-deletion/:token', express.urlencoded({ extended: false }), async (req, res) => {
    try {
        const request = await loadPendingRequest(req.params.token, res);
        if (!request) return;

        // التحقق من CSRF token
        if (!request.csrf_token || request.csrf_token !== req.body._csrf) {
            return res.status(403).send(renderMessagePage('طلب غير صالح', 'انتهت صلاحية الصفحة. يرجى استخدام الرابط الأصلي مرة أخرى.', '#c0392b'));
        }

        const deleted = await executeDeletion(request);

        if (deleted) {
            await DeletionRequest.markApproved(request.id);
            await auditDeletionDecision(request, 'deletion.approve_execute');
            logger.info(`Deletion request approved and executed: ${request.id}`);
            return res.send(renderMessagePage('تمت الموافقة والحذف بنجاح', 'تم حذف البيانات المطلوبة نهائياً من النظام.', 'green'));
        }

        return res.status(500).send(renderMessagePage('تعذر حذف البيانات', 'قد تكون البيانات محذوفة بالفعل أو أن نوع الطلب غير مدعوم.', '#c0392b'));

    } catch (error) {
        logger.error('Error executing deletion approval:', error);
        res.status(500).send(renderMessagePage('حدث خطأ داخلي', 'تعذر تنفيذ طلب الحذف.', '#c0392b'));
    }
});

// عرض صفحة تأكيد رفض طلب الحذف
router.get('/reject-deletion/:token', async (req, res) => {
    try {
        const request = await loadPendingRequest(req.params.token, res);
        if (!request) return;

        const csrfToken = crypto.randomBytes(32).toString('hex');
        await DeletionRequest.setCsrfToken(request.id, csrfToken);

        res.send(renderConfirmationPage(request, 'reject', csrfToken));

    } catch (error) {
        logger.error('Error loading deletion rejection:', error);
        res.status(500).send(renderMessagePage('حدث خطأ داخلي', 'تعذر تحميل طلب الحذف.', '#c0392b'));
    }
});

// تنفيذ رفض طلب الحذف
router.post('/reject-deletion/:token', express.urlencoded({ extended: false }), async (req, res) => {
    try {
        const request = await loadPendingRequest(req.params.token, res);
        if (!request) return;

        if (!request.csrf_token || request.csrf_token !== req.body._csrf) {
            return res.status(403).send(renderMessagePage('طلب غير صالح', 'انتهت صلاحية الصفحة. يرجى استخدام الرابط الأصلي مرة أخرى.', '#c0392b'));
        }

        await DeletionRequest.markRejected(request.id);
        await auditDeletionDecision(request, 'deletion.reject');
        logger.info(`Deletion request rejected: ${request.id}`);

        res.send(renderMessagePage('تم إلغاء الطلب', 'لم يتم حذف أي بيانات.', 'gray'));

    } catch (error) {
        logger.error('Error executing deletion rejection:', error);
        res.status(500).send(renderMessagePage('حدث خطأ داخلي', 'تعذر رفض طلب الحذف.', '#c0392b'));
    }
});

module.exports = router;
