/**
 * الهجرة الثانية: إضافة عمود csrf_token لجدول deletion_requests
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

module.exports = {
    name: '002_add_csrf_token',
    up: async (db) => {
        await addColumnIfMissing(db, 'deletion_requests', 'csrf_token', "ALTER TABLE deletion_requests ADD COLUMN csrf_token TEXT");
        console.log('✅ اكتملت إضافة csrf_token بنجاح');
    }
};
