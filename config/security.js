const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const normalizeOrigin = (value) => (value || '').trim().replace(/\/+$/, '');

const buildAllowedOrigins = () => {
    const configured = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(normalizeOrigin).filter(Boolean)
        : [];

    if (configured.length > 0) {
        return configured;
    }

    if (process.env.NODE_ENV === 'production') {
        return ['https://app.ramadanwaly.click'];
    }

    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
};

const isOriginAllowed = (origin, allowedOrigins) => {
    const normalizedOrigin = normalizeOrigin(origin);
    return allowedOrigins.some((allowed) => {
        if (allowed === '*') return true;
        if (allowed === normalizedOrigin) return true;
        if (allowed.startsWith('*.')) {
            const suffix = allowed.slice(1); // ".example.com"
            return normalizedOrigin.endsWith(suffix);
        }
        return false;
    });
};

const isDeletionApprovalRoute = (req) => {
    const path = req.path || '';
    return (
        path.startsWith('/api/requests/approve-deletion/') ||
        path.startsWith('/api/requests/reject-deletion/')
    );
};

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
    const allowedOrigins = buildAllowedOrigins();

    if (process.env.NODE_ENV === 'production' && allowedOrigins.includes('*')) {
        throw new Error('CORS_ORIGIN cannot include "*" in production');
    }

    app.use(cors((req, callback) => {
        // روابط الموافقة/الرفض القادمة من الإيميل قد تحمل Origin خارجي (mail clients/webmail).
        // نسمح بها حتى يمكن فتح صفحة التأكيد.
        if (isDeletionApprovalRoute(req)) {
            return callback(null, { origin: true, credentials: true });
        }

        const requestOrigin = req.header('Origin');

        // السماح للطلبات بدون origin (مثل mobile apps أو curl)
        if (!requestOrigin) {
            return callback(null, { origin: true, credentials: true });
        }

        if (isOriginAllowed(requestOrigin, allowedOrigins)) {
            return callback(null, { origin: true, credentials: true });
        }

        return callback(new Error('غير مسموح بالوصول من هذا النطاق (CORS)'));
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
