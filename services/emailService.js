const nodemailer = require('nodemailer');
const config = require('../config/mail');
const logger = require('../config/logger');

// إنشاء ناقل البريد
const transporter = config.enabled ? nodemailer.createTransport(config.smtp) : null;

// التحقق من الاتصال، مع تجنب أي اتصال خارجي أثناء الاختبارات.
if (config.enabled && process.env.NODE_ENV !== 'test') {
    transporter.verify(function (error, success) {
        if (error) {
            logger.error('SMTP Connection Error:', error);
        } else {
            logger.info('SMTP Server is ready to take our messages');
        }
    });
} else if (!config.enabled) {
    logger.warn('SMTP is not configured. Email-dependent features will return a configuration error.');
}

const ensureMailConfigured = () => {
    if (!config.enabled || !transporter) {
        const error = new Error('لم يتم ضبط إعدادات البريد الإلكتروني. يرجى ضبط SMTP_USER و SMTP_PASS في ملف .env');
        error.statusCode = 503;
        throw error;
    }
};

const sendVerificationEmail = async (to, code, actionType) => {
    ensureMailConfigured();

    let actionName = '';
    switch (actionType) {
        case 'CHANGE_PASSWORD': actionName = 'تغيير كلمة المرور'; break;
        case 'DELETE_DATA': actionName = 'حذف بيانات'; break;
        case 'MODIFY_DATA': actionName = 'تعديل بيانات'; break;
        default: actionName = 'عملية حساسة';
    }

    const mailOptions = {
        from: config.from,
        to: to,
        subject: `رمز التحقق - ${actionName}`,
        html: `
            <div style="direction: rtl; font-family: Arial, sans-serif; padding: 20px;">
                <h2>رمز التحقق لـ ${actionName}</h2>
                <p>لقد طلبت إجراء <strong>${actionName}</strong>.</p>
                <p>يرجى استخدام الرمز التالي لإكمال العملية:</p>
                <h1 style="color: #2c3e50; letter-spacing: 5px; background: #ecf0f1; padding: 10px; display: inline-block;">${code}</h1>
                <p>صلاحية الرمز 10 دقائق.</p>
                <p>إذا لم تقم بهذا الطلب، يرجى تجاهل هذا البريد.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Email sent: ${info.messageId}`);
        return true;
    } catch (error) {
        logger.error('Error sending email:', error);
        throw error;
    }
};

const sendDeletionApprovalEmail = async (adminEmail, userEmail, resourceType, resourceDetails, approvalToken, reqBaseUrl = null) => {
    ensureMailConfigured();

    // بناء رابط الموافقة
    // الأولوية: 1. الرابط المرسل من الـ Request (عشان يدعم Cloudflare/Domain)
    // 2. متغير البيئة APP_URL
    // 3. الافتراضي localhost
    const baseUrl = reqBaseUrl || process.env.APP_URL || 'http://localhost:3000';

    const approvalLink = `${baseUrl}/api/requests/approve-deletion/${approvalToken}`;
    const rejectionLink = `${baseUrl}/api/requests/reject-deletion/${approvalToken}`;

    const mailOptions = {
        from: config.from,
        to: adminEmail,
        subject: '⚠️ طلب موافقة على حذف بيانات',
        html: `
            <div style="direction: rtl; font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #c0392b;">طلب حذف بيانات</h2>
                <p>قام المستخدم <strong>${userEmail}</strong> بطلب حذف <strong>${resourceType}</strong>.</p>
                
                <div style="background: #f9f9f9; padding: 15px; margin: 15px 0;">
                    <h3 style="margin-top: 0;">تفاصيل البيانات:</h3>
                    <pre style="white-space: pre-wrap;">${JSON.stringify(resourceDetails, null, 2)}</pre>
                </div>

                <p>هل توافق على الحذف؟</p>
                
                <div style="margin-top: 25px;">
                    <a href="${approvalLink}" style="background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-left: 10px;">✅ نعم، احذف نهائياً</a>
                    <a href="${rejectionLink}" style="background-color: #95a5a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">❌ إلغاء الطلب</a>
                </div>
                
                <p style="margin-top: 30px; font-size: 0.8em; color: #7f8c8d;">هذا الإجراء لا يمكن التراجع عنه بمجرد الموافقة.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info(`Deletion Approval Email sent to ${adminEmail}: ${info.messageId}`);
        return true;
    } catch (error) {
        logger.error('Error sending deletion approval email:', error);
        throw error;
    }
};

module.exports = {
    sendVerificationEmail,
    sendDeletionApprovalEmail
};
