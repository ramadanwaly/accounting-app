const express = require('express');
const router = express.Router();
const multer = require('multer');
const Expense = require('../models/Expense');
const ReceiptService = require('../services/receiptService');
const { verifyToken } = require('../middleware/auth');
const VerificationCode = require('../models/VerificationCode');
const { expenseValidator, bulkExpenseValidator, idValidator, receiptFileValidator } = require('../middleware/validators');
const { audit } = require('../services/auditService');
const { parsePagination, hasListFilters } = require('../utils/queryOptions');
const { requestDeletionApproval } = require('../utils/deletionHelper');
const { verifyReceiptAccess } = require('../middleware/receiptAuth');

// إعداد multer لتحميل الملفات في الذاكرة مؤقتاً
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
        files: 10
    }
});

// دالة مساعدة: استخراج ملفات الإيصالات من req.files بغض النظر عن اسم الحقل
function getReceiptFiles(req) {
    if (!req.files) return [];
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    return files.filter(f => ['receipt', 'receipts'].includes(f.fieldname));
}

// جميع المسارات تتطلب تسجيل الدخول
router.use(verifyToken);

// الحصول على أسماء المشاريع (للـ Auto-complete)
router.get('/projects/names', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const projects = await Expense.getUniqueProjects(userId);

        res.json({
            success: true,
            data: projects
        });
    } catch (error) {
        next(error);
    }
});

// الحصول على جميع المصروفات
router.get('/', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        if (hasListFilters(req.query)) {
            const pagination = parsePagination(req.query);
            const result = await Expense.getAllByUserPaginated(userId, {
                ...pagination,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                project: req.query.project,
                category: req.query.category,
                search: req.query.search
            });

            // إضافة الإيصالات لكل مصروف
            const expensesWithReceipts = await Promise.all(result.data.map(async (exp) => {
                const receipts = await Expense.getReceipts(exp.id);
                return { ...exp, receipts };
            }));

            return res.json({
                success: true,
                data: expensesWithReceipts,
                pagination: result.pagination
            });
        }

        const expenses = await Expense.getAllByUser(userId);
        
        // إضافة الإيصالات
        const expensesWithReceipts = await Promise.all(expenses.map(async (exp) => {
            const receipts = await Expense.getReceipts(exp.id);
            return { ...exp, receipts };
        }));

        res.json({
            success: true,
            data: expensesWithReceipts
        });
    } catch (error) {
        next(error);
    }
});

// إضافة مصروف جديد
router.post('/', upload.any(), receiptFileValidator, expenseValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { date, category, project, amount, quantity, price, notes } = req.body;

        const expenseId = await Expense.create(userId, date, category, project, amount, quantity, price, notes);
        
        // حفظ الإيصالات إذا وجدت
        const receiptFiles = getReceiptFiles(req);
        if (receiptFiles.length > 0) {
            for (const file of receiptFiles) {
                try {
                    const receiptData = await ReceiptService.saveReceipt(file);
                    await Expense.addReceipt(expenseId, receiptData);
                } catch (uploadError) {
                    console.error('Error saving receipt:', uploadError.message);
                }
            }
        }

        await audit(req, 'expense.create', {
            entityType: 'expense',
            entityId: expenseId,
            details: { date, category, project, amount, quantity, price, hasReceipts: req.files ? req.files.length : 0 }
        });

        res.status(201).json({
            success: true,
            message: 'تم إضافة المصروف بنجاح',
            data: { id: expenseId }
        });
    } catch (error) {
        next(error);
    }
});

// إضافة مصروفات متعددة (ملفوفة في Transaction لضمان الذرية)
router.post('/bulk', upload.any(), receiptFileValidator, bulkExpenseValidator, async (req, res, next) => {
    const { transaction: dbTransaction } = require('../config/database');
    try {
        const userId = req.user.userId;
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'بيانات غير صحيحة' });
        }

        const createdIds = dbTransaction(() => {
            const ids = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                // ملاحظة: create و addReceipt هنا تنفذ استعلامات متزامنة تحت الغطاء
                // ولكن بما أننا داخل dbTransaction، فإنه سيتم التعامل معها بشكل صحيح
                // حتى لو كانت ترجع Promises، فإن better-sqlite3 سيتعامل مع الاستدعاءات المتزامنة داخلها
                
                // بما أن create ترجع Promise، نحتاج لاستخدام نسخة متزامنة أو التعامل معها بحذر
                // في better-sqlite3، db.prepare().run() هو متزامن.
                // سنقوم بتعديل Model Expense ليدعم العمليات المتزامنة إذا لزم الأمر،
                // ولكن حالياً سنقوم بتنفيذ الاستعلامات مباشرة لضمان الذرية داخل الـ Transaction
                const { db } = require('../config/database');
                const { roundMoney } = require('../utils/money');
                
                const stmt = db.prepare(
                    'INSERT INTO expenses (user_id, date, category, project, amount, quantity, price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );
                const result = stmt.run(
                    userId, item.date, item.category, item.project, 
                    roundMoney(item.amount), item.quantity || 1, roundMoney(item.price || 0), item.notes || null
                );
                
                const id = typeof result.lastInsertRowid === 'bigint' ? Number(result.lastInsertRowid) : result.lastInsertRowid;
                ids.push(id);

                // البحث عن ملف لهذا الصف
                const file = req.files.find(f => 
                    f.fieldname === `receipt_${i}` || 
                    (f.fieldname === 'receipts' && req.files.filter(ff => ff.fieldname === 'receipts').indexOf(f) === i)
                );

                if (file) {
                    // حفظ الملف (عملية IO غير متزامنة، لا يمكن أن تكون داخل Transaction في SQLite بشكل مثالي)
                    // ولكن بما أننا نحفظ في الملفات أولاً ثم في القاعدة، سنقوم بحفظ البيانات في مصفوفة ومعالجتها لاحقاً
                    // أو الأفضل: حفظ الملف خارج الـ Transaction ثم إضافة السجل داخلها
                }
            }
            return ids;
        });

        // معالجة الإيصالات خارج الـ Transaction لضمان أداء أفضل ولأن IO غير متزامن
        for (let i = 0; i < items.length; i++) {
            const file = req.files.find(f => 
                f.fieldname === `receipt_${i}` || 
                (f.fieldname === 'receipts' && req.files.filter(ff => ff.fieldname === 'receipts').indexOf(f) === i)
            );

            if (file) {
                const receiptData = await ReceiptService.saveReceipt(file);
                await Expense.addReceipt(createdIds[i], receiptData);
            }
        }

        await audit(req, 'expense.bulk_create', {
            entityType: 'expense',
            details: { count: createdIds.length, ids: createdIds, hasReceipts: req.files.length > 0 }
        });

        res.status(201).json({
            success: true,
            message: `تم إضافة ${createdIds.length} مصروف بنجاح`,
            data: { ids: createdIds, count: createdIds.length }
        });
    } catch (error) {
        next(error);
    }
});

// الحصول على مصروف معين
router.get('/:id', idValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const expense = await Expense.findById(id, userId);

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'المصروف غير موجود'
            });
        }

        res.json({
            success: true,
            data: expense
        });
    } catch (error) {
        next(error);
    }
});

// تحديث مصروف
router.put('/:id', upload.any(), receiptFileValidator, [...idValidator, ...expenseValidator], async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        const { date, category, project, amount, quantity, price, notes, keepExistingReceipts } = req.body;

        const updated = await Expense.update(id, userId, date, category, project, amount, quantity, price, notes);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'المصروف غير موجود'
            });
        }

        // إذا تم رفع ملفات جديدة ولم يتم طلب الاحتفاظ بالقديمة، نقوم بحذف القديمة
        const newReceiptFiles = getReceiptFiles(req);
        const hasNewFiles = newReceiptFiles.length > 0;
        const shouldReplace = hasNewFiles && keepExistingReceipts !== 'true';

        if (shouldReplace) {
            const oldReceipts = await Expense.getReceipts(id);
            for (const rec of oldReceipts) {
                const filename = rec.file_path.split('/').pop();
                await ReceiptService.deleteReceipt(filename);
                await Expense.deleteReceipt(rec.id, id);
            }
        }

        // حفظ الإيصالات الجديدة إذا وجدت
        for (const file of newReceiptFiles) {
            try {
                const receiptData = await ReceiptService.saveReceipt(file);
                await Expense.addReceipt(id, receiptData);
            } catch (uploadError) {
                console.error('Error saving receipt during update:', uploadError.message);
            }
        }

        res.json({
            success: true,
            message: 'تم تحديث المصروف بنجاح'
        });
        await audit(req, 'expense.update', {
            entityType: 'expense',
            entityId: Number(id),
            details: { date, category, project, amount, quantity, price, hasNewReceipts: req.files ? req.files.length : 0, replacedOld: shouldReplace }
        });
    } catch (error) {
        next(error);
    }
});

// حذف إيصال معين من مصروف
router.delete('/:id/receipts/:receiptId', idValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id, receiptId } = req.params;

        // التحقق من ملكية المصروف
        const expense = await Expense.findById(id, userId);
        if (!expense) {
            return res.status(404).json({ success: false, message: 'المصروف غير موجود' });
        }

        const receipt = await Expense.getReceiptById(receiptId);
        if (!receipt || receipt.expense_id !== Number(id)) {
            return res.status(404).json({ success: false, message: 'الإيصال غير موجود' });
        }

        // حذف الملفات من القرص
        const filename = receipt.file_path.split('/').pop();
        await ReceiptService.deleteReceipt(filename);

        // حذف من القاعدة
        await Expense.deleteReceipt(receiptId, id);

        await audit(req, 'expense.receipt_delete', {
            entityType: 'expense',
            entityId: Number(id),
            details: { receiptId: Number(receiptId), filename }
        });

        res.json({ success: true, message: 'تم حذف الإيصال بنجاح' });
    } catch (error) {
        next(error);
    }
});

// حذف جميع المصروفات
router.delete('/all', async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { verificationCode } = req.body;

        if (!verificationCode) {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال كود التحقق'
            });
        }

        const isValid = await VerificationCode.verify(userId, verificationCode, 'DELETE_DATA');
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'كود التحقق غير صحيح'
            });
        }

        // تفاصيل الموارد
        const count = (await Expense.getAllByUser(userId)).length;
        const resourceData = { description: "حذف جميع المصروفات", count };

        await requestDeletionApproval(req, {
            resourceType: 'all_expenses',
            resourceId: null,
            resourceLabel: 'جميع المصروفات',
            resourceData,
            auditAction: 'expense.delete_all_requested',
            reason: 'حذف الكل بطلب المستخدم'
        });

        await VerificationCode.consume(userId, 'DELETE_DATA');

        res.status(202).json({
            success: true,
            approvalCallback: true,
            message: 'تم إرسال طلب الحذف إلى المسؤول للموافقة. سيصلك إشعار عند الموافقة.'
        });
    } catch (error) {
        next(error);
    }
});

// حذف مصروف
router.delete('/:id', idValidator, async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;

        const expense = await Expense.findById(id, userId);
        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'المصروف غير موجود'
            });
        }

        await requestDeletionApproval(req, {
            resourceType: 'expense',
            resourceId: id,
            resourceLabel: 'مصروف',
            resourceData: { amount: expense.amount, date: expense.date, category: expense.category, project: expense.project },
            auditAction: 'expense.delete_requested'
        });

        res.status(202).json({
            success: true,
            approvalCallback: true,
            message: 'تم إرسال طلب الحذف للمسؤول للموافقة'
        });
    } catch (error) {
        next(error);
    }
});

// --- مسارات الإيصالات ---

// الحصول على صورة الإيصال الأصلية
router.get('/receipts/original/:filename', verifyReceiptAccess, (req, res) => {
    try {
        const filePath = ReceiptService.getFullPath(req.params.filename, false);
        res.sendFile(filePath);
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب الملف' });
    }
});

// الحصول على النسخة المصغرة للإيصال
router.get('/receipts/thumbnails/:filename', verifyReceiptAccess, (req, res) => {
    try {
        const filePath = ReceiptService.getFullPath(req.params.filename, true);
        res.sendFile(filePath);
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب الملف' });
    }
});

module.exports = router;
