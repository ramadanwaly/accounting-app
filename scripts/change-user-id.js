const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const oldId = process.argv[2];
const newId = process.argv[3];

if (!oldId || !newId) {
    console.error('الرجاء توفير المعرف القديم والمعرف الجديد.');
    console.error('الاستخدام: node scripts/change-user-id.js <old_id> <new_id>');
    process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // 1. التفتيش عما إذا كان المعرف الجديد موجوداً بالفعل
    db.get('SELECT id FROM users WHERE id = ?', [newId], (err, row) => {
        if (row) {
            console.error('خطأ: المعرف الجديد موجود بالفعل لمستخدم آخر.');
            db.run('ROLLBACK');
            db.close();
            process.exit(1);
        }

        // 2. تحديث جدول المستخدمين (نحتاج لتعطيل قيود المفاتيح الأجنبية مؤقتاً أو التحديث في ترتيب معين)
        // في SQLite، تغيير الـ PRIMARY KEY مباشرة قد يكون صعباً، الأفضل هو تفعيل ON UPDATE CASCADE إن أمكن، 
        // ولكن بما أن الجداول منشأة بالفعل بدونه، سنقوم بالتحديث يدوياً.

        const tables = [
            { name: 'revenues', col: 'user_id' },
            { name: 'expenses', col: 'user_id' },
            { name: 'verification_codes', col: 'user_id' },
            { name: 'deletion_requests', col: 'user_id' },
            { name: 'audit_logs', col: 'user_id' }
        ];

        let completed = 0;

        const checkCompletion = () => {
            completed++;
            if (completed === tables.length + 1) {
                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('خطأ في حفظ التغييرات:', err.message);
                    } else {
                        console.log(`تم تغيير المعرف من ${oldId} إلى ${newId} بنجاح.`);
                    }
                    db.close();
                });
            }
        };

        // تحديث جدول المستخدمين أولاً
        db.run('UPDATE users SET id = ? WHERE id = ?', [newId, oldId], function(err) {
            if (err) {
                console.error('خطأ في تحديث جدول المستخدمين:', err.message);
                db.run('ROLLBACK');
                db.close();
                process.exit(1);
            }
            if (this.changes === 0) {
                console.error('المستخدم غير موجود.');
                db.run('ROLLBACK');
                db.close();
                process.exit(1);
            }
            checkCompletion();
        });

        // تحديث الجداول المرتبطة
        tables.forEach(table => {
            db.run(`UPDATE ${table.name} SET ${table.col} = ? WHERE ${table.col} = ?`, [newId, oldId], (err) => {
                if (err) {
                    console.error(`خطأ في تحديث جدول ${table.name}:`, err.message);
                    db.run('ROLLBACK');
                    db.close();
                    process.exit(1);
                }
                checkCompletion();
            });
        });
    });
});
