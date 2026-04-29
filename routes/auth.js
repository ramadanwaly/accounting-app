const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, verifyToken } = require('../middleware/auth');
const VerificationCode = require('../models/VerificationCode');
const { sendVerificationEmail } = require('../services/emailService');
const { loginValidator, registerValidator } = require('../middleware/validators');

const parseSqliteDateTime = (value) => {
    if (!value) return null;
    return new Date(String(value).replace(' ', 'T') + 'Z');
};

// تسجيل الدخول
router.post('/login', loginValidator, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // البحث عن المستخدم
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            });
        }

        // ===== فحص قفل الحساب =====
        const isLocked = await User.isAccountLocked(user.id);
        if (isLocked) {
            const lockInfo = await User.getLockoutInfo(user.id);
            const lockUntil = parseSqliteDateTime(lockInfo.locked_until);
            const minutesLeft = Math.ceil((lockUntil - new Date()) / 60000);

            return res.status(403).json({
                success: false,
                message: `الحساب مقفل مؤقتاً بسبب محاولات تسجيل دخول فاشلة متعددة. يرجى المحاولة بعد ${minutesLeft} دقيقة`,
                locked: true,
                lockedUntil: lockInfo.locked_until,
                failedAttempts: lockInfo.failed_login_attempts
            });
        }

        // التحقق من كلمة المرور
        const isValidPassword = await User.verifyPassword(password, user.password);

        if (!isValidPassword) {
            // زيادة عدد المحاولات الفاشلة
            await User.incrementFailedAttempts(user.id);

            // الحصول على العدد المحدث
            const lockInfo = await User.getLockoutInfo(user.id);
            const remainingAttempts = 5 - lockInfo.failed_login_attempts;

            let message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
            if (remainingAttempts > 0 && remainingAttempts <= 3) {
                message += `. تبقى ${remainingAttempts} محاولة قبل قفل الحساب`;
            } else if (remainingAttempts === 0) {
                message = 'تم قفل الحساب لمدة 15 دقيقة بسبب محاولات تسجيل دخول فاشلة متعددة';
            }

            return res.status(401).json({
                success: false,
                message,
                remainingAttempts: Math.max(0, remainingAttempts)
            });
        }

        // التحقق من الموافقة على الحساب
        if (user.is_approved === 0) {
            return res.status(401).json({
                success: false,
                message: 'الحساب قيد المراجعة، يرجى الانتظار للموافقة'
            });
        }

        // ===== تسجيل دخول ناجح =====
        // إعادة تعيين محاولات الفشل
        await User.resetFailedAttempts(user.id);

        // إنشاء JWT Token
        const token = generateToken(user.id, user.email, user.role);

        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
});

// إنشاء حساب جديد
router.post('/register', registerValidator, async (req, res, next) => {
    try {
        const { email, password, fullName } = req.body;

        // التحقق من عدم وجود المستخدم مسبقاً
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مستخدم بالفعل'
            });
        }

        // إنشاء المستخدم
        const userId = await User.create(email, password, fullName);

        // إنشاء JWT Token
        // const token = generateToken(userId, email); // Disabled for pending approval flow

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح. يرجى الانتظار حتى تتم الموافقة على حسابك من قبل الإدارة.',
            // token, // No token returned
            user: {
                id: userId,
                email,
                fullName
            }
        });
    } catch (error) {
        next(error);
    }
});

// طلب رمز تحقق
router.post('/request-verification', verifyToken, async (req, res, next) => {
    try {
        const { actionType } = req.body; // CHANGE_PASSWORD, DELETE_DATA, etc.
        const userId = req.user.userId;
        const email = req.user.email;

        // إنشاء كود عشوائي من 6 أرقام
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // حفظ الكود في قاعدة البيانات
        await VerificationCode.create(userId, code, actionType);

        // إرسال الإيميل
        await sendVerificationEmail(email, code, actionType);

        res.json({
            success: true,
            message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني'
        });
    } catch (error) {
        next(error);
    }
});

// تغيير كلمة المرور (يتطلب تسجيل الدخول)
router.post('/change-password', verifyToken, async (req, res, next) => {
    try {
        const { currentPassword, newPassword, verificationCode } = req.body;
        const userId = req.user.userId; // من JWT

        if (!verificationCode) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال كود التحقق المرسل للبريد'
            });
        }

        // التحقق من الكود
        const isValidCode = await VerificationCode.verify(userId, verificationCode, 'CHANGE_PASSWORD');
        if (!isValidCode) {
            return res.status(400).json({
                success: false,
                message: 'كود التحقق غير صحيح أو منتهي الصلاحية'
            });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال كلمة المرور الحالية والجديدة'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
            });
        }

        // التحقق من كلمة المرور الحالية
        const user = await User.findByIdWithPassword(userId);
        const isValidPassword = await User.verifyPassword(currentPassword, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'كلمة المرور الحالية غير صحيحة'
            });
        }

        // تحديث كلمة المرور
        await User.updatePassword(userId, newPassword);

        // حذف الكود المستخدم
        await VerificationCode.consume(userId, 'CHANGE_PASSWORD');

        res.json({
            success: true,
            message: 'تم تغيير كلمة المرور بنجاح'
        });
    } catch (error) {
        next(error);
    }
});

// طلب إعادة تعيين كلمة المرور (نسيت كلمة المرور)
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال البريد الإلكتروني'
            });
        }

        // البحث عن المستخدم
        const user = await User.findByEmail(email);

        // لأسباب أمنية، نرد بنفس الرسالة حتى لو المستخدم غير موجود
        if (!user) {
            return res.json({
                success: true,
                message: 'إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة تحتوي على رمز التحقق'
            });
        }

        // إنشاء كود عشوائي من 6 أرقام
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // حفظ الكود في قاعدة البيانات
        await VerificationCode.create(user.id, code, 'RESET_PASSWORD');

        // إرسال الإيميل
        await sendVerificationEmail(email, code, 'RESET_PASSWORD');

        res.json({
            success: true,
            message: 'إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة تحتوي على رمز التحقق'
        });
    } catch (error) {
        next(error);
    }
});

// إعادة تعيين كلمة المرور
router.post('/reset-password', async (req, res, next) => {
    try {
        const { email, verificationCode, newPassword } = req.body;

        if (!email || !verificationCode || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال جميع البيانات المطلوبة'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'
            });
        }

        // البحث عن المستخدم
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني أو رمز التحقق غير صحيح'
            });
        }

        // التحقق من الكود
        const isValidCode = await VerificationCode.verify(user.id, verificationCode, 'RESET_PASSWORD');
        if (!isValidCode) {
            return res.status(400).json({
                success: false,
                message: 'رمز التحقق غير صحيح أو منتهي الصلاحية'
            });
        }

        // تحديث كلمة المرور
        await User.updatePassword(user.id, newPassword);

        // حذف الكود المستخدم
        await VerificationCode.consume(user.id, 'RESET_PASSWORD');

        // إعادة تعيين محاولات الفشل إن وجدت
        await User.resetFailedAttempts(user.id);

        res.json({
            success: true,
            message: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
