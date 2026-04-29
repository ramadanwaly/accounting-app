const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// إنشاء مجلد قاعدة البيانات إذا لم يكن موجوداً
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure DB_PATH is absolute
let dbPath = process.env.DB_PATH;
if (dbPath && dbPath !== ':memory:' && !path.isAbsolute(dbPath)) {
    dbPath = path.join(__dirname, '..', dbPath);
}
dbPath = dbPath || path.join(dbDir, 'accounting.db');

// إنشاء اتصال بقاعدة البيانات
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
        process.exit(1);
    }
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
});

// تفعيل foreign keys
db.run('PRAGMA foreign_keys = ON');

const runMigrations = async () => {
    console.log('🔄 جاري فحص تحديثات قاعدة البيانات...');

    // 1. إنشاء جدول تتبع الهجرات إذا لم يكن موجوداً
    await run(`CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. الحصول على جميع الهجرات المنفذة
    const executedMigrations = await query('SELECT name FROM schema_migrations');
    const executedNames = executedMigrations.map(m => m.name);

    // 3. قائمة ملفات الهجرة (يمكن مستقبلاً قراءتها من المجلد تلقائياً)
    const migrations = [
        require('../database/migrations/001_baseline_updates'),
        require('../database/migrations/002_add_csrf_token')
    ];

    // 4. تنفيذ الهجرات الجديدة فقط
    for (const migration of migrations) {
        if (!executedNames.includes(migration.name)) {
            console.log(`🚀 جاري تنفيذ الهجرة: ${migration.name}`);
            try {
                // تنفيذ الهجرة داخل معاملة (Transaction) لضمان الأمان
                await run('BEGIN TRANSACTION');
                await migration.up(db);
                await run('INSERT INTO schema_migrations (name) VALUES (?)', [migration.name]);
                await run('COMMIT');
                console.log(`✅ تمت الهجرة ${migration.name} بنجاح`);
            } catch (error) {
                await run('ROLLBACK');
                console.log(`❌ فشلت الهجرة ${migration.name}: ${error.message}`);
                throw error; // إيقاف التشغيل في حال حدوث خطأ فادح
            }
        }
    }

    console.log('✅ قاعدة البيانات محدثة وجاهزة');
};

// تهيئة قاعدة البيانات
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        const schema = fs.readFileSync(
            path.join(__dirname, '..', 'models', 'database.sql'),
            'utf8'
        );

        db.exec(schema, async (err) => {
            if (err) {
                console.error('خطأ في تهيئة قاعدة البيانات:', err.message);
                reject(err);
            } else {
                try {
                    await runMigrations();
                    resolve();
                } catch (migrationError) {
                    reject(migrationError);
                }
            }
        });
    });
};

// دالة للاستعلام مع Promise
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// دالة للتنفيذ (INSERT, UPDATE, DELETE) مع Promise
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({
                    lastID: this.lastID,
                    changes: this.changes
                });
            }
        });
    });
};

// دالة للحصول على صف واحد
const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// دالة لإغلاق قاعدة البيانات بشكل آمن
const closeDatabase = () => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {
                console.error('خطأ أثناء إغلاق قاعدة البيانات:', err.message);
                reject(err);
            } else {
                console.log('✅ تم إغلاق اتصال قاعدة البيانات');
                resolve();
            }
        });
    });
};

module.exports = {
    db,
    initDatabase,
    query,
    run,
    get,
    closeDatabase
};
