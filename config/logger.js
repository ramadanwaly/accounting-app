const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// إنشاء مجلد logs إذا لم يكن موجوداً
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// تنسيق الرسائل
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
        if (stack) {
            return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

// إعداد daily rotation للملفات
const dailyRotateFileTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat
});

// transport للأخطاء
const errorFileTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat
});

// إنشاء logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        dailyRotateFileTransport,
        errorFileTransport
    ]
});

// في بيئة التطوير، أضف console output
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// دوال مساعدة
logger.logRequest = (req, message = 'Request received') => {
    logger.info(`${message} - ${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
};

logger.logError = (error, req = null) => {
    const errorInfo = {
        message: error.message,
        stack: error.stack,
        ...(req && {
            method: req.method,
            path: req.path,
            ip: req.ip
        })
    };
    logger.error('Error occurred', errorInfo);
};

module.exports = logger;
