// إعداد البيئة قبل استيراد أي شيء
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const setupSecurity = require('../config/security');
const { initDatabase, db, run } = require('../config/database');

const app = express();
app.use(express.json());
setupSecurity(app);
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
    beforeAll(async () => {
        await initDatabase();
    });

    afterEach((done) => {
        // تنظيف البيانات بعد كل اختبار
        db.run('DELETE FROM users', done);
    });

    const testUser = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
    };

    test('POST /register - should create a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        if (res.statusCode !== 201) {
            console.error('Register Error:', res.body);
        }

        expect(res.statusCode).toBe(201);
        expect(res.body).not.toHaveProperty('token');
        expect(res.body.user).toHaveProperty('email', testUser.email);
    });

    test('POST /register - should fail if email exists', async () => {
        // Create user first
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.statusCode).toBe(400);
    });

    test('POST /login - should login with valid credentials', async () => {
        // Create user first
        await request(app).post('/api/auth/register').send(testUser);
        await run('UPDATE users SET is_approved = 1 WHERE email = ?', [testUser.email]);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('token');
    });

    test('POST /login - should fail with invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            });

        expect(res.statusCode).toBe(401);
    });
});
