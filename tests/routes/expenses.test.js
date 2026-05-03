const request = require('supertest');
const { app } = require('../../server');
const { run, query, initDatabase, closeDatabase } = require('../../config/database');
const User = require('../../models/User');

let token;
let userId;
const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6L8AAAAASUVORK5CYII=',
    'base64'
);

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

    it('should create an expense with a receipt image (US1)', async () => {
        const res = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .field('date', '2023-10-01')
            .field('category', 'خامات')
            .field('project', 'مشروع أ')
            .field('amount', 100)
            .attach('receipt', validPngBuffer, 'test-receipt.png');

        expect(res.statusCode).toEqual(201);
        expect(res.body.success).toBeTruthy();
        expect(res.body.data).toHaveProperty('id');
        
        // التحقق من أن الملف تم حفظه في قاعدة البيانات
        const receipts = await query('SELECT * FROM expense_receipts WHERE expense_id = ?', [res.body.data.id]);
        expect(receipts.length).toBe(1);
        expect(receipts[0].original_name).toBe('test-receipt.png');
    });

    it('should create bulk expenses with receipt images (US2)', async () => {
        const res = await request(app)
            .post('/api/expenses/bulk')
            .set('Authorization', `Bearer ${token}`)
            .field('items[0][date]', '2023-10-01')
            .field('items[0][category]', 'خامات')
            .field('items[0][project]', 'مشروع أ')
            .field('items[0][amount]', 100)
            .field('items[1][date]', '2023-10-02')
            .field('items[1][category]', 'نقل')
            .field('items[1][project]', 'مشروع أ')
            .field('items[1][amount]', 50)
            .attach('receipts', validPngBuffer, 'receipt1.png')
            .attach('receipts', validPngBuffer, 'receipt2.png');

        expect(res.statusCode).toEqual(201);
        expect(res.body.data.ids.length).toBe(2);
        
        // التحقق من أن الإيصالات تم ربطها
        const allReceipts = await query('SELECT * FROM expense_receipts ORDER BY original_name ASC');
        // قد يكون هناك إيصالات من اختبارات سابقة إذا لم يتم تنظيف الجداول بشكل صحيح، 
        // لكن beforeEach ينظف expenses والجداول الأخرى مرتبطة بـ CASCADE.
        expect(allReceipts.length).toBe(2);
    });

    it('should enforce access control for receipt images (US3)', async () => {
        // 1. إنشاء مصروف مع إيصال للمستخدم الحالي
        const createRes = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .field('date', '2023-10-01')
            .field('category', 'خامات')
            .field('project', 'مشروع أ')
            .field('amount', 100)
            .attach('receipt', validPngBuffer, 'owner-receipt.png');

        expect(createRes.statusCode).toEqual(201);
        const expenseId = createRes.body.data.id;
        const receipt = (await query('SELECT * FROM expense_receipts WHERE expense_id = ?', [expenseId]))[0];
        
        // استخراج اسم الملف فقط من المسار الكامل
        const filename = receipt.file_path.split('/').pop();

        // 2. إنشاء مستخدم آخر ومحاولة الوصول للملف (يجب أن يعيد 403)
        const otherEmail = `other-us3-${Date.now()}@example.com`;
        const otherUserId = await User.create(otherEmail, 'Password123', 'Other User');
        await run("UPDATE users SET is_approved = 1 WHERE id = ?", [otherUserId]);
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: otherEmail, password: 'Password123' });
        const otherToken = loginRes.body.token;

        const unauthorizedRes = await request(app)
            .get(`/api/expenses/receipts/original/${filename}`)
            .set('Authorization', `Bearer ${otherToken}`);

        expect(unauthorizedRes.statusCode).toEqual(403);
    });

    it('should delete a receipt from an expense (US5)', async () => {
        // 1. إنشاء مصروف مع إيصال
        const createRes = await request(app)
            .post('/api/expenses')
            .set('Authorization', `Bearer ${token}`)
            .field('date', '2023-10-01')
            .field('category', 'خامات')
            .field('project', 'مشروع حذف')
            .field('amount', 200)
            .attach('receipt', validPngBuffer, 'to-delete.png');

        expect(createRes.statusCode).toEqual(201);
        const expenseId = createRes.body.data.id;
        const receiptsBefore = await query('SELECT * FROM expense_receipts WHERE expense_id = ?', [expenseId]);
        expect(receiptsBefore.length).toBe(1);
        const receiptId = receiptsBefore[0].id;

        // 2. حذف الإيصال
        const deleteRes = await request(app)
            .delete(`/api/expenses/${expenseId}/receipts/${receiptId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.statusCode).toEqual(200);
        expect(deleteRes.body.success).toBeTruthy();

        // 3. التحقق من حذف الإيصال من القاعدة
        const receiptsAfter = await query('SELECT * FROM expense_receipts WHERE expense_id = ?', [expenseId]);
        expect(receiptsAfter.length).toBe(0);
    });
});
