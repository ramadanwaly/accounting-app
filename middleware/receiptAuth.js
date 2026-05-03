const { get } = require('../config/database');

/**
 * ميدل وير للتحقق من صلاحية الوصول لملف الإيصال
 * يضمن أن المستخدم الحالي هو صاحب المصروف المرتبط بالإيصال، أو مدير النظام
 */
const verifyReceiptAccess = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { filename } = req.params;

        // البحث عن المصروف المرتبط بهذا الملف
        // نستخدم LIKE لأن file_path يخزن المسار الكامل بينما filename هو اسم الملف فقط
        const receipt = await get(
            `SELECT e.user_id 
             FROM expense_receipts er
             JOIN expenses e ON er.expense_id = e.id
             WHERE er.file_path LIKE ? OR er.thumbnail_path LIKE ?`,
            [`%${filename}`, `%${filename}`]
        );

        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'الإيصال غير موجود'
            });
        }

        // التحقق من الملكية (أو إذا كان المستخدم مديراً)
        if (receipt.user_id !== userId && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح لك بالوصول لهذا الملف'
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { verifyReceiptAccess };
