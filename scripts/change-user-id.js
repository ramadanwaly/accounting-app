const Database = require('better-sqlite3');
const path = require('path');

const oldId = process.argv[2];
const newId = process.argv[3];

if (!oldId || !newId) {
    console.error('الرجاء توفير المعرف القديم والمعرف الجديد.');
    console.error('الاستخدام: node scripts/change-user-id.js <old_id> <new_id>');
    process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new Database(dbPath);

try {
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(newId);
    if (existing) {
        console.error('خطأ: المعرف الجديد موجود بالفعل لمستخدم آخر.');
        process.exit(1);
    }

    const tables = [
        { name: 'revenues', col: 'user_id' },
        { name: 'expenses', col: 'user_id' },
        { name: 'verification_codes', col: 'user_id' },
        { name: 'deletion_requests', col: 'user_id' },
        { name: 'audit_logs', col: 'user_id' }
    ];

    db.transaction(() => {
        const result = db.prepare('UPDATE users SET id = ? WHERE id = ?').run(newId, oldId);
        if (result.changes === 0) {
            throw new Error('المستخدم غير موجود.');
        }

        tables.forEach(table => {
            db.prepare(`UPDATE ${table.name} SET ${table.col} = ? WHERE ${table.col} = ?`).run(newId, oldId);
        });
    })();

    console.log(`تم تغيير المعرف من ${oldId} إلى ${newId} بنجاح.`);

} catch (err) {
    console.error('خطأ:', err.message);
    process.exit(1);
} finally {
    db.close();
}
