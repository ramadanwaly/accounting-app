const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const isAdmin = require('../middleware/admin.js');
const { run, query } = require('../config/database');
const { body } = require('express-validator');
const { audit } = require('../services/auditService');
const { handleValidationErrors } = require('../middleware/validators');

// Validator for userId
const userIdValidator = [
    body('userId')
        .notEmpty().withMessage('معرف المستخدم مطلوب')
        .isInt({ min: 1 }).withMessage('معرف المستخدم يجب أن يكون رقم صحيح موجب'),
    handleValidationErrors
];

// Middleware to ensure user is logged in AND is admin
router.use(verifyToken, isAdmin);

// Get all users
router.get('/users', async (req, res, next) => {
    try {
        const users = await query('SELECT id, email, full_name, created_at, is_approved, role FROM users ORDER BY created_at DESC');
        res.json({
            success: true,
            users
        });
    } catch (error) {
        next(error);
    }
});

// Approve user
router.post('/users/approve', userIdValidator, async (req, res, next) => {
    try {
        const { userId } = req.body;

        // التحقق من وجود المستخدم
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        await run('UPDATE users SET is_approved = 1 WHERE id = ?', [userId]);
        await audit(req, 'user.approve', {
            entityType: 'user',
            entityId: Number(userId),
            details: { email: user.email }
        });
        res.json({
            success: true,
            message: 'تمت الموافقة على المستخدم بنجاح'
        });
    } catch (error) {
        next(error);
    }
});

// Reject/Delete user
router.post('/users/reject', userIdValidator, async (req, res, next) => {
    try {
        const { userId } = req.body;

        // التحقق من وجود المستخدم
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // منع حذف الأدمن لنفسه
        if (userId === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكنك حذف حسابك الخاص'
            });
        }

        await run('DELETE FROM users WHERE id = ?', [userId]);
        await audit(req, 'user.reject_delete', {
            entityType: 'user',
            entityId: Number(userId),
            details: { email: user.email, role: user.role }
        });
        res.json({
            success: true,
            message: 'تم رفض/حذف المستخدم بنجاح'
        });
    } catch (error) {
        next(error);
    }
});

// إنشاء مستخدم جديد (Admin only)
router.post('/users/create', async (req, res, next) => {
    try {
        const { email, password, fullName, role, isApproved } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني وكلمة المرور مطلوبان'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
            });
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'البريد الإلكتروني مستخدم بالفعل'
            });
        }

        // Create user
        const userId = await User.create(email, password, fullName || null);

        // Set role and approval status
        const userRole = role === 'admin' ? 'admin' : 'user';
        const approved = isApproved ? 1 : 0;

        await run(
            'UPDATE users SET role = ?, is_approved = ? WHERE id = ?',
            [userRole, approved, userId]
        );
        await audit(req, 'user.create', {
            entityType: 'user',
            entityId: userId,
            details: { email, role: userRole, isApproved: approved }
        });

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المستخدم بنجاح',
            user: {
                id: userId,
                email,
                fullName,
                role: userRole,
                isApproved: approved
            }
        });
    } catch (error) {
        next(error);
    }
});

// فتح حساب مقفل (Unlock Account)
router.post('/users/unlock', userIdValidator, async (req, res, next) => {
    try {
        const { userId } = req.body;

        // التحقق من وجود المستخدم
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'المستخدم غير موجود'
            });
        }

        // فتح الحساب
        await User.unlockAccount(userId);
        await audit(req, 'user.unlock', {
            entityType: 'user',
            entityId: Number(userId),
            details: { email: user.email }
        });

        res.json({
            success: true,
            message: 'تم فتح الحساب بنجاح'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
