const Database = require('better-sqlite3');
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
let db;
try {
    db = new Database(dbPath);
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
} catch (err) {
    console.error('خطأ في الاتصال بقاعدة البيانات:', err.message);
    process.exit(1);
}

// تفعيل foreign keys و WAL mode لأداء أفضل
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

const runMigrations = async () => {
    console.log('🔄 جاري فحص تحديثات قاعدة البيانات...');

    // 1. إنشاء جدول تتبع الهجرات إذا لم يكن موجوداً
    db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. الحصول على جميع الهجرات المنفذة
    const executedMigrations = db.prepare('SELECT name FROM schema_migrations').all();
    const executedNames = executedMigrations.map(m => m.name);

    // 3. قائمة ملفات الهجرة
    const migrations = [
        require('../database/migrations/001_baseline_updates'),
        require('../database/migrations/002_add_csrf_token')
    ];

    // 4. تنفيذ الهجرات الجديدة فقط
    for (const migration of migrations) {
        if (!executedNames.includes(migration.name)) {
            console.log(`🚀 جاري تنفيذ الهجرة: ${migration.name}`);
            // تنفيذ الهجرة داخل معاملة (Transaction) لضمان الأمان
            const runInTransaction = db.transaction(() => {
                migration.up(db);
                db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(migration.name);
            });
            try {
                runInTransaction();
                console.log(`✅ تمت الهجرة ${migration.name} بنجاح`);
            } catch (error) {
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
        try {
            const schema = fs.readFileSync(
                path.join(__dirname, '..', 'models', 'database.sql'),
                'utf8'
            );

            db.exec(schema);
            runMigrations();
            resolve();
        } catch (err) {
            console.error('خطأ في تهيئة قاعدة البيانات:', err.message);
            reject(err);
        }
    });
};

// دالة للاستعلام مع Promise (تُرجع جميع الصفوف)
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const rows = stmt.all(...params);
            resolve(rows);
        } catch (err) {
            reject(err);
        }
    });
};

// دالة للتنفيذ (INSERT, UPDATE, DELETE) مع Promise
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        try {
            // أوامر التحكم في المعاملات تحتاج db.exec() وليس db.prepare()
            const trimmedSql = sql.trim().toUpperCase();
            if (trimmedSql === 'BEGIN TRANSACTION' || trimmedSql === 'BEGIN' ||
                trimmedSql === 'COMMIT' || trimmedSql === 'ROLLBACK') {
                db.exec(sql);
                resolve({ lastID: 0, changes: 0 });
                return;
            }

            const stmt = db.prepare(sql);
            const result = stmt.run(...params);
            resolve({
                lastID: result.lastInsertRowid,
                changes: result.changes
            });
        } catch (err) {
            reject(err);

        }
    });
};

// دالة للحصول على صف واحد
const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            const row = stmt.get(...params);
            resolve(row);
        } catch (err) {
            reject(err);
        }
    });
};

// دالة لإغلاق قاعدة البيانات بشكل آمن
const closeDatabase = () => {
    return new Promise((resolve, reject) => {
        try {
            db.close();
            console.log('✅ تم إغلاق اتصال قاعدة البيانات');
            resolve();
        } catch (err) {
            console.error('خطأ أثناء إغلاق قاعدة البيانات:', err.message);
            reject(err);
        }
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
