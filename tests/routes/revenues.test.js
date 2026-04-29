const request = require('supertest');
const { app } = require('../../server');
const { run, query, initDatabase, closeDatabase } = require('../../config/database');
const User = require('../../models/User');

let token;
let userId;

beforeAll(async () => {
    // إعداد قاعدة بيانات نظيفة
    await initDatabase();
    
    // إنشاء مستخدم اختباري وتسجيل الدخول
    await run("DELETE FROM users");
    userId = await User.create('test-revenues@example.com', 'password123', 'Test User');
    await run("UPDATE users SET is_approved = 1 WHERE id = ?", [userId]);

    const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test-revenues@example.com', password: 'password123' });
    
    token = res.body.token;
});

afterAll(async () => {
    await closeDatabase();
});

beforeEach(async () => {
    await run("DELETE FROM revenues");
});

describe('Revenues API', () => {
    it('should create a new revenue', async () => {
        const res = await request(app)
            .post('/api/revenues')
            .set('Authorization', `Bearer ${token}`)
            .send({
                date: '2023-10-01',
                source: 'مبيعات',
                amount: 1500.50,
                notes: 'ملاحظة اختبار'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBeTruthy();
        expect(res.body.data).toHaveProperty('id');
    });

    it('should fetch user revenues', async () => {
        await request(app)
            .post('/api/revenues')
            .set('Authorization', `Bearer ${token}`)
            .send({ date: '2023-10-01', source: 'مبيعات', amount: 1000 });

        const res = await request(app)
            .get('/api/revenues')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].amount).toEqual(1000);
    });

    it('should create bulk revenues', async () => {
        const res = await request(app)
            .post('/api/revenues/bulk')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [
                    { date: '2023-10-01', source: 'مبيعات 1', amount: 100 },
                    { date: '2023-10-02', source: 'مبيعات 2', amount: 200 }
                ]
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.data.count).toEqual(2);

        const verifyRes = await request(app)
            .get('/api/revenues')
            .set('Authorization', `Bearer ${token}`);
        
        expect(verifyRes.body.data.length).toEqual(2);
    });

    it('should calculate revenue rounded properly', async () => {
        await request(app)
            .post('/api/revenues')
            .set('Authorization', `Bearer ${token}`)
            .send({ date: '2023-10-01', source: 'مبيعات', amount: 10.334 }); // سيتم تقريبه إلى 10.33

        const res = await request(app)
            .get('/api/revenues')
            .set('Authorization', `Bearer ${token}`);

        expect(res.body.data[0].amount).toEqual(10.33);
    });
});
