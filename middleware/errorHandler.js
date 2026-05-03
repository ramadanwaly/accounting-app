// معالج الأخطاء المركزي
const errorHandler = (err, req, res, next) => {
    // Log the error
    const logger = require('../config/logger');
    logger.error('Error occurred', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    // أخطاء قاعدة البيانات
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({
            success: false,
            message: 'البيانات المدخلة تتعارض مع قيود قاعدة البيانات'
        });
    }

    // أخطاء رفع الملفات (multer)
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'حجم الملف كبير جداً. الحد الأقصى المسموح به هو 2 ميجابايت.'
        });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
            success: false,
            message: 'عدد الملفات المرفوعة كبير جداً. الحد الأقصى 10 ملفات.'
        });
    }

    // أخطاء JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'رمز المصادقة غير صالح'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'انتهت صلاحية الجلسة'
        });
    }

    // خطأ عام
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'حدث خطأ في الخادم',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// معالج 404
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'المسار غير موجود'
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
