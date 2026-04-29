// استخدام قاعدة بيانات في الذاكرة للاختبار
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { initDatabase } = require('../config/database');

beforeAll(async () => {
    await initDatabase();
});

afterAll(async () => {
    // تنظيف
});
