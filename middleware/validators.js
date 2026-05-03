const { body, param, validationResult } = require('express-validator');

// معالج الأخطاء للتحقق
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'بيانات غير صحيحة',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// قواعد التحقق من تسجيل الدخول
const loginValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح'),
    body('password')
        .notEmpty()
        .withMessage('كلمة المرور مطلوبة')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    handleValidationErrors
];

// قواعد التحقق من إنشاء حساب
const registerValidator = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('البريد الإلكتروني غير صحيح'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
        .matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/)
        .withMessage('كلمة المرور يجب أن تحتوي على أرقام وحروف'),
    body('fullName')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('الاسم طويل جداً'),
    handleValidationErrors
];

// قواعد التحقق من الإيرادات
const revenueValidator = [
    body('date')
        .isDate()
        .withMessage('التاريخ غير صحيح'),
    body('source')
        .trim()
        .notEmpty()
        .withMessage('مصدر الإيراد مطلوب')
        .isLength({ max: 200 })
        .withMessage('مصدر الإيراد طويل جداً'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('المبلغ يجب أن يكون أكبر من صفر'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('الملاحظات طويلة جداً'),
    handleValidationErrors
];

// قواعد التحقق من المصروفات
const expenseValidator = [
    body('date')
        .isDate()
        .withMessage('التاريخ غير صحيح'),
    body('category')
        .trim()
        .notEmpty()
        .withMessage('نوع المصروف مطلوب')
        .isIn([
            'خامات', 'إكسسوارات', 'نقل', 'صيانة', 'كهرباء',
            'حساب قشرة', 'دهانات', 'حساب مكنة', 'حساب صانيعية', 'رسوم تحويل',
            'إيجار', 'مصاريف عمومية', 'زجاج', 'سلفة', 'تنجيد'
        ])
        .withMessage('نوع المصروف غير صحيح'),
    body('project')
        .trim()
        .notEmpty()
        .withMessage('اسم المشروع مطلوب')
        .isLength({ max: 200 })
        .withMessage('اسم المشروع طويل جداً'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('المبلغ يجب أن يكون أكبر من صفر'),
    body('quantity')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('الكمية يجب أن تكون أكبر من صفر'),
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('السعر يجب أن يكون رقم صحيح'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('الملاحظات طويلة جداً'),
    handleValidationErrors
];

// قواعد التحقق من الإضافة المتعددة للمصروفات
const bulkExpenseValidator = [
    body('items')
        .isArray({ min: 1, max: 50 })
        .withMessage('يجب إرسال مصفوفة تحتوي على عنصر واحد على الأقل (حد أقصى 50)'),
    body('items.*.date')
        .isDate()
        .withMessage('التاريخ غير صحيح'),
    body('items.*.category')
        .trim()
        .notEmpty()
        .withMessage('نوع المصروف مطلوب')
        .isIn([
            'خامات', 'إكسسوارات', 'نقل', 'صيانة', 'كهرباء',
            'حساب قشرة', 'دهانات', 'حساب مكنة', 'حساب صانيعية', 'رسوم تحويل',
            'إيجار', 'مصاريف عمومية', 'زجاج', 'سلفة', 'تنجيد'
        ])
        .withMessage('نوع المصروف غير صحيح'),
    body('items.*.project')
        .trim()
        .notEmpty()
        .withMessage('اسم المشروع مطلوب')
        .isLength({ max: 200 })
        .withMessage('اسم المشروع طويل جداً'),
    body('items.*.amount')
        .isFloat({ min: 0.01 })
        .withMessage('المبلغ يجب أن يكون أكبر من صفر'),
    body('items.*.quantity')
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage('الكمية يجب أن تكون أكبر من صفر'),
    body('items.*.price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('السعر يجب أن يكون رقم صحيح'),
    body('items.*.notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('الملاحظات طويلة جداً'),
    handleValidationErrors
];

// قواعد التحقق من الإضافة المتعددة للإيرادات
const bulkRevenueValidator = [
    body('items')
        .isArray({ min: 1, max: 50 })
        .withMessage('يجب إرسال مصفوفة تحتوي على عنصر واحد على الأقل (حد أقصى 50)'),
    body('items.*.date')
        .isDate()
        .withMessage('التاريخ غير صحيح'),
    body('items.*.source')
        .trim()
        .notEmpty()
        .withMessage('مصدر الإيراد مطلوب')
        .isLength({ max: 200 })
        .withMessage('مصدر الإيراد طويل جداً'),
    body('items.*.amount')
        .isFloat({ min: 0.01 })
        .withMessage('المبلغ يجب أن يكون أكبر من صفر'),
    body('items.*.notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('الملاحظات طويلة جداً'),
    handleValidationErrors
];

// قواعد التحقق من ID
const idValidator = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('المعرف غير صحيح'),
    handleValidationErrors
];

// التحقق من ملفات الإيصالات
const receiptFileValidator = (req, res, next) => {
    // إذا لم يكن هناك ملفات، ننتقل للمرحلة التالية (الملف اختياري)
    if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
        return next();
    }

    // تجميع الملفات في مصفوفة واحدة للتحقق منها
    const files = req.file ? [req.file] : (Array.isArray(req.files) ? req.files : Object.values(req.files).flat());

    for (const file of files) {
        // التحقق من نوع الملف (JPG, PNG)
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedMimes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: `نوع الملف ${file.originalname} غير مدعوم. يرجى رفع صور JPG أو PNG فقط.`
            });
        }

        // التحقق من الحجم (الحد الأقصى 2 ميجابايت)
        const maxSize = 2 * 1024 * 1024;
        if (file.size > maxSize) {
            return res.status(400).json({
                success: false,
                message: `حجم الملف ${file.originalname} كبير جداً. الحد الأقصى المسموح به هو 2 ميجابايت.`
            });
        }
    }

    next();
};

module.exports = {
    loginValidator,
    registerValidator,
    revenueValidator,
    expenseValidator,
    bulkExpenseValidator,
    bulkRevenueValidator,
    idValidator,
    receiptFileValidator,
    handleValidationErrors
};
