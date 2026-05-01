/**
 * الهجرة الأولى: توحيد الأعمدة المضافة يدوياً سابقاً.
 * هذا الملف يضمن أن جميع الجداول تحتوي على الحقول المطلوبة بشكل آمن.
 */

const addColumnIfMissing = (db, tableName, columnName, alterSql) => {
    const columns = db.pragma(`table_info(${tableName})`);
    const exists = columns.some(column => column.name === columnName);

    if (exists) {
        console.log(`  - العمود ${columnName} موجود بالفعل في جدول ${tableName} (تخطي)`);
        return;
    }

    console.log(`  - إضافة العمود ${columnName} إلى جدول ${tableName}...`);
    db.exec(alterSql);
};

module.exports = {
    name: '001_baseline_updates',
    up: (db) => {
        // تحديثات جدول المستخدمين
        addColumnIfMissing(db, 'users', 'is_approved', "ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 0");
        addColumnIfMissing(db, 'users', 'role', "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
        addColumnIfMissing(db, 'users', 'failed_login_attempts', "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0");
        addColumnIfMissing(db, 'users', 'locked_until', "ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL");
        addColumnIfMissing(db, 'users', 'last_failed_login', "ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP NULL");
        
        // تحديثات جدول المصروفات
        addColumnIfMissing(db, 'expenses', 'quantity', "ALTER TABLE expenses ADD COLUMN quantity REAL DEFAULT 1");
        addColumnIfMissing(db, 'expenses', 'price', "ALTER TABLE expenses ADD COLUMN price REAL DEFAULT 0");
        
        // تحديثات جدول طلبات الحذف
        addColumnIfMissing(db, 'deletion_requests', 'expires_at', "ALTER TABLE deletion_requests ADD COLUMN expires_at DATETIME");

        // تحديث البيانات المفقودة
        db.prepare("UPDATE deletion_requests SET expires_at = datetime(created_at, '+24 hours') WHERE expires_at IS NULL").run();

        // التأكد من وجود الفهارس
        db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
        
        console.log('✅ اكتملت الهجرة الأساسية بنجاح');
    }
};
