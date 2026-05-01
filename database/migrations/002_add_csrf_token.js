/**
 * الهجرة الثانية: إضافة عمود csrf_token لجدول deletion_requests
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
    name: '002_add_csrf_token',
    up: (db) => {
        addColumnIfMissing(db, 'deletion_requests', 'csrf_token', "ALTER TABLE deletion_requests ADD COLUMN csrf_token TEXT");
        console.log('✅ اكتملت إضافة csrf_token بنجاح');
    }
};
