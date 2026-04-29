const DeletionRequest = require('../models/DeletionRequest');
const { sendDeletionApprovalEmail } = require('../services/emailService');
const User = require('../models/User');
const { audit } = require('../services/auditService');

/**
 * دالة مساعدة لمعالجة طلبات الحذف التي تتطلب موافقة المدير
 * @param {Object} req - كائن الطلب (Request)
 * @param {Object} options - خيارات الحذف
 * @param {string} options.resourceType - نوع المورد (revenue, expense, all_revenues, all_expenses)
 * @param {number|null} options.resourceId - معرف المورد (أو null لحذف الكل)
 * @param {string} options.resourceLabel - مسمى المورد بالعربية (إيراد، مصروف)
 * @param {Object} options.resourceData - بيانات المورد لعرضها في البريد
 * @param {string} options.auditAction - اسم الحدث للسجل (Audit)
 */
async function requestDeletionApproval(req, options) {
    const { 
        resourceType, 
        resourceId, 
        resourceLabel, 
        resourceData, 
        auditAction,
        reason 
    } = options;

    const userId = req.user.userId;
    const userEmail = req.user.email;

    // 1. البحث عن أول مسؤول معتمد
    const admins = await User.getApprovedAdmins();

    if (!admins || admins.length === 0) {
        throw new Error('لا يوجد مسؤول في النظام للموافقة على الطلب');
    }

    const adminEmail = admins[0].email;

    // 2. إنشاء طلب الحذف في قاعدة البيانات
    const finalReason = reason || `حذف ${resourceLabel} بقيمة ${resourceData.amount || resourceData.count || ''}`;
    const token = await DeletionRequest.create(userId, resourceType, resourceId, finalReason);

    // 3. تسجيل الحدث في سجل التدقيق
    await audit(req, auditAction, {
        entityType: resourceType.replace('all_', ''),
        entityId: resourceId ? Number(resourceId) : null,
        details: resourceData
    });

    // 4. بناء رابط الواجهة البرمجية الأساسي
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['host'];
    const baseUrl = `${protocol}://${host}`;

    // 5. إرسال بريد الموافقة للمدير
    await sendDeletionApprovalEmail(
        adminEmail, 
        userEmail, 
        resourceLabel, 
        resourceData, 
        token, 
        baseUrl
    );

    return true;
}

module.exports = {
    requestDeletionApproval
};
