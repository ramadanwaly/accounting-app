const request = require('supertest');
const { app } = require('../../server');
const { run, query, initDatabase, closeDatabase } = require('../../config/database');
const User = require('../../models/User');

let token;
let userId;

beforeAll(async () => {
    await initDatabase();
    await run("DELETE FROM users");
    userId = await User.create('test-expenses@example.com', 'password123', 'Test User');
    await run("UPDATE users SET is_approved = 1 WHERE id = ?", [userId]);

    const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test-expenses@example.com', password: 'password123' });
    token = res.body.token;
});

afterAll(async () => {
    await closeDatabase();
});

beforeEach(async () => {
    await run("DELETE FROM expenses");
});

describe('Expenses API', () => {
    it('should create a new expense', async () => {
        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .send({
                date: '2023-10-01',
                category: 'خامات',
                project: 'مشروع أ',
                quantity: 2,
                price: 50.50,
                amount: 101.00,
                notes: 'اختبار'
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBeTruthy();
    });

    it('should fetch user expenses', async () => {
        await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .send({ date: '2023-10-01', category: 'خامات', project: 'مشروع أ', amount: 100 });

        const res = await request(app)
            .get('/api/expenses')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.length).toEqual(1);
        expect(res.body.data[0].category).toEqual('خامات');
    });

    it('should rollback transaction on bulk create failure', async () => {
        const res = await request(app)
            .post('/api/expenses/bulk')
            .set('Authorization', `Bearer ${token}`)
            .send({
                items: [
                    { date: '2023-10-01', category: 'خامات', project: 'مشروع', amount: 100 },
                    { date: 'invalid-date', category: 'invalid', project: 'مشروع', amount: -50 } // بيانات خاطئة لإفشال الطلب
                ]
            });

        expect(res.statusCode).toEqual(400);

        // التأكد من عدم إدخال العنصر الأول (التراجع عن الـ transaction)
        const checkRes = await request(app)
            .get('/api/expenses')
            .set('Authorization', `Bearer ${token}`);
        
        expect(checkRes.body.data.length).toEqual(0);
    });
});
