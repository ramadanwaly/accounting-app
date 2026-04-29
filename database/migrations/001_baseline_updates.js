/**
 * الهجرة الأولى: توحيد الأعمدة المضافة يدوياً سابقاً.
 * هذا الملف يضمن أن جميع الجداول تحتوي على الحقول المطلوبة بشكل آمن.
 */

const addColumnIfMissing = (db, tableName, columnName, alterSql) => {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                reject(err);
                return;
            }

            const exists = columns.some(column => column.name === columnName);
            if (exists) {
                console.log(`  - العمود ${columnName} موجود بالفعل في جدول ${tableName} (تخطي)`);
                resolve();
                return;
            }

            console.log(`  - إضافة العمود ${columnName} إلى جدول ${tableName}...`);
            db.run(alterSql, (alterErr) => {
                if (alterErr) {
                    reject(alterErr);
                } else {
                    resolve();
                }
            });
        });
    });
};

const runStatement = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

module.exports = {
    name: '001_baseline_updates',
    up: async (db) => {
        // تحديثات جدول المستخدمين
        await addColumnIfMissing(db, 'users', 'is_approved', "ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 0");
        await addColumnIfMissing(db, 'users', 'role', "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
        await addColumnIfMissing(db, 'users', 'failed_login_attempts', "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0");
        await addColumnIfMissing(db, 'users', 'locked_until', "ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL");
        await addColumnIfMissing(db, 'users', 'last_failed_login', "ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP NULL");
        
        // تحديثات جدول المصروفات
        await addColumnIfMissing(db, 'expenses', 'quantity', "ALTER TABLE expenses ADD COLUMN quantity REAL DEFAULT 1");
        await addColumnIfMissing(db, 'expenses', 'price', "ALTER TABLE expenses ADD COLUMN price REAL DEFAULT 0");
        
        // تحديثات جدول طلبات الحذف
        await addColumnIfMissing(db, 'deletion_requests', 'expires_at', "ALTER TABLE deletion_requests ADD COLUMN expires_at DATETIME");

        // تحديث البيانات المفقودة
        await runStatement(db, "UPDATE deletion_requests SET expires_at = datetime(created_at, '+24 hours') WHERE expires_at IS NULL");

        // التأكد من وجود الفهارس
        await runStatement(db, 'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
        await runStatement(db, 'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)');
        await runStatement(db, 'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
        
        console.log('✅ اكتملت الهجرة الأساسية بنجاح');
    }
};
