require('dotenv').config();
const fs = require('fs');
const path = require('path');

// سكريبت النسخ الاحتياطي لقاعدة البيانات
async function backupDatabase() {
    try {
        const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'database', 'accounting.db');
        const backupDir = path.join(__dirname, '..', 'backups');

        // إنشاء مجلد backups إذا لم يكن موجوداً
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // التحقق من وجود قاعدة البيانات
        if (!fs.existsSync(dbPath)) {
            console.error('❌ قاعدة البيانات غير موجودة:', dbPath);
            process.exit(1);
        }

        // إنشاء اسم النسخة الاحتياطية مع الوقت والتاريخ
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupFileName = `accounting-backup-${timestamp}.db`;
        const backupPath = path.join(backupDir, backupFileName);

        // نسخ قاعدة البيانات
        fs.copyFileSync(dbPath, backupPath);

        const stats = fs.statSync(backupPath);
        const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('✅ تم إنشاء النسخة الاحتياطية بنجاح!');
        console.log(`📁 المسار: ${backupPath}`);
        console.log(`📊 الحجم: ${fileSizeInMB} MB`);

        // حذف النسخ القديمة (الاحتفاظ بآخر 30 نسخة)
        cleanOldBackups(backupDir, 30);

    } catch (error) {
        console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error.message);
        process.exit(1);
    }
}

// حذف النسخ الاحتياطية القديمة
function cleanOldBackups(backupDir, keepCount) {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('accounting-backup-') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(backupDir, file),
                time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // ترتيب من الأحدث للأقدم

        // حذف النسخ الزائدة
        if (files.length > keepCount) {
            const filesToDelete = files.slice(keepCount);
            filesToDelete.forEach(file => {
                fs.unlinkSync(file.path);
                console.log(`🗑️  تم حذف نسخة قديمة: ${file.name}`);
            });
        }

        console.log(`📦 عدد النسخ الاحتياطية المحفوظة: ${Math.min(files.length, keepCount)}`);
    } catch (error) {
        console.error('⚠️  تحذير: فشل في تنظيف النسخ القديمة:', error.message);
    }
}

// تشغيل النسخ الاحتياطي
backupDatabase();
