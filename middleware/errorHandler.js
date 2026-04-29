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
