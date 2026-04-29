const User = require('../../models/User');
const { initDatabase } = require('../../config/database');

describe('User Model', () => {
    beforeAll(async () => {
        await initDatabase();
    });

    describe('create()', () => {
        it('يجب إنشاء مستخدم جديد بنجاح', async () => {
            const email = `test${Date.now()}@test.com`;
            const password = 'test123456';
            const fullName = 'Test User';

            const userId = await User.create(email, password, fullName);

            expect(userId).toBeDefined();
            expect(typeof userId).toBe('number');
            expect(userId).toBeGreaterThan(0);
        });

        it('يجب تشفير كلمة المرور', async () => {
            const email = `test${Date.now()}@test.com`;
            const password = 'test123456';

            const userId = await User.create(email, password);
            const user = await User.findByIdWithPassword(userId);

            expect(user.password).toBeDefined();
            expect(user.password).not.toBe(password); // كلمة المرور مشفرة
            expect(user.password.length).toBeGreaterThan(20); // bcrypt hash
        });
    });

    describe('findByEmail()', () => {
        it('يجب إيجاد مستخدم بالبريد الإلكتروني', async () => {
            const email = `test${Date.now()}@test.com`;
            const password = 'test123456';
            await User.create(email, password);

            const user = await User.findByEmail(email);

            expect(user).toBeDefined();
            expect(user.email).toBe(email);
            expect(user.password).toBeDefined();
        });

        it('يجب إرجاع null للبريد غير الموجود', async () => {
            const user = await User.findByEmail('nonexistent@test.com');
            expect(user).toBeUndefined();
        });
    });

    describe('verifyPassword()', () => {
        it('يجب التحقق من كلمة المرور الصحيحة', async () => {
            const email = `test${Date.now()}@test.com`;
            const password = 'test123456';
            const userId = await User.create(email, password);
            const user = await User.findByIdWithPassword(userId);

            const isValid = await User.verifyPassword(password, user.password);

            expect(isValid).toBe(true);
        });

        it('يجب رفض كلمة المرور الخاطئة', async () => {
            const email = `test${Date.now()}@test.com`;
            const password = 'test123456';
            const userId = await User.create(email, password);
            const user = await User.findByIdWithPassword(userId);

            const isValid = await User.verifyPassword('wrongpassword', user.password);

            expect(isValid).toBe(false);
        });
    });

    describe('Account Lockout', () => {
        let testUserId;

        beforeEach(async () => {
            const email = `test${Date.now()}@test.com`;
            testUserId = await User.create(email, 'test123456');
        });

        it('يجب زيادة عدد المحاولات الفاشلة', async () => {
            await User.incrementFailedAttempts(testUserId);

            const lockInfo = await User.getLockoutInfo(testUserId);
            expect(lockInfo.failed_login_attempts).toBe(1);
        });

        it('يجب قفل الحساب بعد 5 محاولات فاشلة', async () => {
            // محاولات فاشلة 5 مرات
            for (let i = 0; i < 5; i++) {
                await User.incrementFailedAttempts(testUserId);
            }

            const isLocked = await User.isAccountLocked(testUserId);
            expect(isLocked).toBe(true);

            const lockInfo = await User.getLockoutInfo(testUserId);
            expect(lockInfo.failed_login_attempts).toBe(5);
            expect(lockInfo.locked_until).toBeDefined();
        });

        it('يجب إعادة تعيين المحاولات الفاشلة', async () => {
            await User.incrementFailedAttempts(testUserId);
            await User.incrementFailedAttempts(testUserId);

            await User.resetFailedAttempts(testUserId);

            const lockInfo = await User.getLockoutInfo(testUserId);
            expect(lockInfo.failed_login_attempts).toBe(0);
            expect(lockInfo.locked_until).toBeNull();
        });

        it('يجب فتح الحساب المقفل', async () => {
            // قفل الحساب
            for (let i = 0; i < 5; i++) {
                await User.incrementFailedAttempts(testUserId);
            }

            // فتح الحساب
            await User.unlockAccount(testUserId);

            const isLocked = await User.isAccountLocked(testUserId);
            expect(isLocked).toBe(false);

            const lockInfo = await User.getLockoutInfo(testUserId);
            expect(lockInfo.failed_login_attempts).toBe(0);
        });
    });

    describe('updatePassword()', () => {
        it('يجب تحديث كلمة المرور بنجاح', async () => {
            const email = `test${Date.now()}@test.com`;
            const oldPassword = 'oldpass123';
            const newPassword = 'newpass456';

            const userId = await User.create(email, oldPassword);

            const updated = await User.updatePassword(userId, newPassword);
            expect(updated).toBe(true);

            const user = await User.findByIdWithPassword(userId);
            const isValid = await User.verifyPassword(newPassword, user.password);
            expect(isValid).toBe(true);

            const isOldValid = await User.verifyPassword(oldPassword, user.password);
            expect(isOldValid).toBe(false);
        });
    });
});
