const { verifyToken, generateToken } = require('../../middleware/auth');
const jwt = require('jsonwebtoken');

describe('Auth Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    describe('generateToken()', () => {
        it('يجب إنشاء JWT token صحيح', () => {
            const userId = 1;
            const email = 'test@test.com';
            const role = 'user';

            const token = generateToken(userId, email, role);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            // فك تشفير الـ token والتحقق من المحتوى
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.userId).toBe(userId);
            expect(decoded.email).toBe(email);
            expect(decoded.role).toBe(role);
        });
    });

    describe('verifyToken()', () => {
        it('يجب قبول token صحيح', () => {
            const token = generateToken(1, 'test@test.com', 'user');
            req.headers.authorization = `Bearer ${token}`;

            verifyToken(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.user).toBeDefined();
            expect(req.user.userId).toBe(1);
            expect(req.user.email).toBe('test@test.com');
            expect(req.user.role).toBe('user');
        });

        it('يجب رفض الطلب بدون token', () => {
            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'يرجى تسجيل الدخول أولاً'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('يجب رفض token غير صالح', () => {
            req.headers.authorization = 'Bearer invalid-token';

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'رمز المصادقة غير صالح'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('يجب رفض token منتهي الصلاحية', () => {
            // إنشاء token منتهي الصلاحية
            const expiredToken = jwt.sign(
                { userId: 1, email: 'test@test.com', role: 'user' },
                process.env.JWT_SECRET,
                { expiresIn: '-1h' } // منتهي منذ ساعة
            );

            req.headers.authorization = `Bearer ${expiredToken}`;

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                message: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى'
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('يجب قبول token مع Bearer prefix', () => {
            const token = generateToken(1, 'test@test.com', 'user');
            req.headers.authorization = `Bearer ${token}`;

            verifyToken(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('يجب رفض authorization header بدون Bearer', () => {
            const token = generateToken(1, 'test@test.com', 'user');
            req.headers.authorization = token; // بدون Bearer

            verifyToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
