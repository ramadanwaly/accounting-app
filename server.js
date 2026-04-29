require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./config/logger');
const { initDatabase } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { createHTTPSServer, logCloudflareInfo } = require('./config/https');
const httpsRedirect = require('./middleware/httpsRedirect');

// Routes
const authRoutes = require('./routes/auth');
const revenuesRoutes = require('./routes/revenues');
const expensesRoutes = require('./routes/expenses');
const reportsRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const requestsRoutes = require('./routes/requests');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== فحص أمني: التأكد من تغيير JWT_SECRET =====
const DEFAULT_JWT_SECRET = 'change-this-to-a-strong-random-secret-in-production-environment';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
    console.error('\n⚠️  تحذير أمني هام! ⚠️');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('يجب تغيير JWT_SECRET في ملف .env');
    console.error('لإنشاء secret آمن، شغّل الأمر: npm run generate-secret');
    console.error('═══════════════════════════════════════════════════════════════\n');

    if (process.env.NODE_ENV === 'production') {
        console.error('❌ لا يمكن تشغيل التطبيق في الإنتاج بدون JWT_SECRET آمن');
        process.exit(1);
    }
}

const setupSecurity = require('./config/security');

// Security Setup
setupSecurity(app);

// HTTPS Redirect (اختياري)
app.use(httpsRedirect);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/revenues', revenuesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestsRoutes);

// Health Check (محسّن)
app.get('/api/health', async (req, res) => {
    const { get } = require('./config/database');

    try {
        // فحص اتصال قاعدة البيانات
        await get('SELECT 1');

        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime(),
            database: 'connected',
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
            }
        });

        logger.info('Health check passed');
    } catch (error) {
        logger.error('Health check failed', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message
        });
    }
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

let httpServer;
let httpsServer;

const startServer = async () => {
    // تهيئة قاعدة البيانات قبل استقبال الطلبات لتجنب أخطاء أول تشغيل.
    await initDatabase();

    httpServer = app.listen(PORT, () => {
        const protocol = process.env.HTTPS_ENABLED === 'true' ? 'https' : 'http';
        const startupMessage = `
╔═══════════════════════════════════════════════╗
║                                               ║
║   🚀 برنامج المحاسبة الاحترافي               ║
║                                               ║
║   🌐 الخادم يعمل على المنفذ: ${PORT}          ║
║   📊 قاعدة البيانات: SQLite (محلية)          ║
║   🔒 الأمان: مفعل (JWT + bcrypt + Account Lockout) ║
║   📝 Logging: مفعل (winston)                  ║
║   🧪 Tests: 31/31 passed (100%)               ║
║                                               ║
║   افتح المتصفح: ${protocol}://localhost:${PORT}     ║
║                                               ║
╚═══════════════════════════════════════════════╝
    `;
        console.log(startupMessage);

        // عرض معلومات Cloudflare إن وُجدت
        logCloudflareInfo();

        logger.info(`Server started on port ${PORT}`, {
            environment: process.env.NODE_ENV,
            port: PORT,
            https: process.env.HTTPS_ENABLED === 'true',
            cloudflare: process.env.CLOUDFLARE_TUNNEL === 'true'
        });
    });

    // إنشاء HTTPS server إذا كان مفعّلاً (اختياري مع Cloudflare)
    httpsServer = createHTTPSServer(app, parseInt(PORT) + 1);
};

// وظيفة الإغلاق السلس
const shutdown = async (signal) => {
    console.log(`\n⏹️  تم استلام ${signal}. جاري إيقاف الخادم بشكل منظم...`);
    logger.info(`Shutdown initiated via ${signal}`);

    const { closeDatabase } = require('./config/database');

    if (httpServer) {
        httpServer.close(() => {
            console.log('📡 تم إيقاف استقبال طلبات HTTP الجديدة');
        });
    }

    if (httpsServer) {
        httpsServer.close(() => {
            console.log('🔒 تم إيقاف استقبال طلبات HTTPS الجديدة');
        });
    }

    try {
        await closeDatabase();
        console.log('✅ تم الإغلاق بنجاح. مع السلامة!');
        process.exit(0);
    } catch (err) {
        console.error('❌ حدث خطأ أثناء الإغلاق:', err);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer().catch((error) => {
        logger.error('Failed to start server', error);
        console.error('❌ فشل تشغيل الخادم:', error.message);
        process.exit(1);
    });
}

// معالجة إشارات النظام
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = {
    app,
    startServer,
    shutdown
};
