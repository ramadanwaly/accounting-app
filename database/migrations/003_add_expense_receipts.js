/**
 * الهجرة الثالثة: إضافة جدول إيصالات المصروفات
 */

module.exports = {
    name: '003_add_expense_receipts',
    up: (db) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS expense_receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                expense_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                thumbnail_path TEXT NOT NULL,
                original_name TEXT,
                mime_type TEXT,
                size INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
            )
        `);
        
        // فهرس لتحسين الأداء عند البحث عن إيصالات مصروف معين
        db.exec('CREATE INDEX IF NOT EXISTS idx_expense_receipts_expense_id ON expense_receipts(expense_id)');
        
        console.log('✅ تم إنشاء جدول إيصالات المصروفات بنجاح');
    }
};
