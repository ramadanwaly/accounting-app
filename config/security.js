const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const setupSecurity = (app) => {
    // Helmet: حماية الهيدرز
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdn.jsdelivr.net",
                    "https://static.cloudflareinsights.com",
                    "https://*.cloudflareinsights.com"
                ],
                scriptSrcAttr: ["'unsafe-inline'"], // للسماح بـ inline event handlers
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "blob:"],
                connectSrc: [
                    "'self'",
                    "https://cdn.jsdelivr.net",
                    "https://cloudflareinsights.com",
                    "https://*.cloudflareinsights.com"
                ],
                fontSrc: ["'self'", "data:"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: [],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // CORS: سياسة مشاركة الموارد (مقيد للأمان)
    const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
        : ['http://localhost:3000', 'http://127.0.0.1:3000'];

    if (process.env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
        throw new Error('CORS_ORIGIN cannot include "*" in production');
    }

    app.use(cors({
        origin: function (origin, callback) {
            // السماح للطلبات بدون origin (مثل mobile apps أو curl)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
                callback(null, true);
            } else {
                callback(new Error('غير مسموح بالوصول من هذا النطاق (CORS)'));
            }
        },
        credentials: true
    }));

    // Rate Limiting: تحديد عدد الطلبات
    const limiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 دقيقة
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        skip: (req) => {
            // استثناء المديرين من القيود لضمان سلاسة العمل لمالك المشروع
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    return decoded && decoded.role === 'admin';
                } catch (err) {
                    return false;
                }
            }
            return false;
        },
        message: {
            success: false,
            message: 'تم تجاوز عدد الطلبات المسموح به، يرجى المحاولة لاحقاً'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    app.use('/api/', limiter);
};

module.exports = setupSecurity;
