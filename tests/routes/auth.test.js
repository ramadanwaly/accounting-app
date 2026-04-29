const request = require('supertest');
const express = require('express');
const authRoutes = require('../../routes/auth');
const { initDatabase } = require('../../config/database');
const User = require('../../models/User');

// إعداد Express app للاختبار
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes Integration Tests', () => {
    beforeAll(async () => {
        await initDatabase();
    });

    describe('POST /api/auth/login', () => {
        let testUser;

        beforeEach(async () => {
            const email = `test${Date.now()}@test.com`;
            const password = 'test123456';
            const userId = await User.create(email, password, 'Test User');

            // الموافقة على الحساب
            const { run } = require('../../config/database');
            await run('UPDATE users SET is_approved = 1 WHERE id = ?', [userId]);

            testUser = { userId, email, password };
        });

        it('يجب تسجيل الدخول بنجاح مع بيانات صحيحة', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.token).toBeDefined();
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(testUser.email);
        });

        it('يجب رفض تسجيل الدخول مع كلمة مرور خاطئة', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('غير صحيحة');
        });

        it('يجب رفض تسجيل الدخول مع بريد غير موجود', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'test123456'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('يجب قفل الحساب بعد 5 محاولات فاشلة', async () => {
            // 5 محاولات فاشلة
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: testUser.email,
                        password: 'wrongpassword'
                    });
            }

            // المحاولة السادسة يجب أن تُرفض بسبب القفل
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password // حتى مع كلمة المرور الصحيحة
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('مقفل');
            expect(response.body.locked).toBe(true);
        });

        it('يجب عرض عدد المحاولات المتبقية', async () => {
            // محاولة فاشلة واحدة
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.remainingAttempts).toBeDefined();
            expect(response.body.remainingAttempts).toBe(4);
        });

        it('يجب إعادة تعيين المحاولات الفاشلة بعد تسجيل دخول ناجح', async () => {
            // محاولتان فاشلتان
            await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'wrong1' });

            await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'wrong2' });

            // تسجيل دخول ناجح
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                });

            // التحقق من إعادة تعيين العداد
            const lockInfo = await User.getLockoutInfo(testUser.userId);
            expect(lockInfo.failed_login_attempts).toBe(0);
        });
    });

    describe('POST /api/auth/register', () => {
        it('يجب إنشاء حساب جديد بنجاح', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `newuser${Date.now()}@test.com`,
                    password: 'test123456',
                    fullName: 'New User'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.user).toBeDefined();
        });

        it('يجب رفض إنشاء حساب ببريد مستخدم', async () => {
            const email = `duplicate${Date.now()}@test.com`;

            // إنشاء الحساب الأول
            await User.create(email, 'test123456');

            // محاولة إنشاء حساب آخر بنفس البريد
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email,
                    password: 'test123456'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('مستخدم بالفعل');
        });

        it('يجب رفض كلمة مرور ضعيفة', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: `test${Date.now()}@test.com`,
                    password: '123' // أقل من 6 أحرف
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});
