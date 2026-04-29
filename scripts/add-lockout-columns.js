require('dotenv').config();
const { db } = require('../config/database');

/**
 * Migration: إضافة أعمدة account lockout لجدول users
 * 
 * الأعمدة الجديدة:
 * - failed_login_attempts: عدد محاولات تسجيل الدخول الفاشلة
 * - locked_until: تاريخ انتهاء القفل
 * - last_failed_login: آخر محاولة فاشلة
 */

async function addLockoutColumns() {
    console.log('🔄 بدء إضافة أعمدة account lockout...\n');

    try {
        // التحقق من وجود الأعمدة أولاً
        const tableInfo = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(users)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        const existingColumns = tableInfo.map(col => col.name);
        console.log('📋 الأعمدة الموجودة:', existingColumns.join(', '));

        // إضافة الأعمدة إذا لم تكن موجودة
        const columnsToAdd = [
            {
                name: 'failed_login_attempts',
                sql: 'ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0'
            },
            {
                name: 'locked_until',
                sql: 'ALTER TABLE users ADD COLUMN locked_until TIMESTAMP NULL'
            },
            {
                name: 'last_failed_login',
                sql: 'ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP NULL'
            }
        ];

        for (const column of columnsToAdd) {
            if (existingColumns.includes(column.name)) {
                console.log(`⏭️  العمود "${column.name}" موجود بالفعل، تخطي...`);
            } else {
                await new Promise((resolve, reject) => {
                    db.run(column.sql, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                console.log(`✅ تمت إضافة العمود "${column.name}"`);
            }
        }

        console.log('\n✅ اكتملت عملية Migration بنجاح!');
        console.log('\n📊 بنية الجدول الجديدة:');

        const updatedTableInfo = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(users)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        updatedTableInfo.forEach(col => {
            console.log(`   - ${col.name} (${col.type})`);
        });

    } catch (error) {
        console.error('❌ خطأ في Migration:', error.message);
        process.exit(1);
    } finally {
        db.close(() => {
            console.log('\n🔒 تم إغلاق الاتصال بقاعدة البيانات');
            process.exit(0);
        });
    }
}

// تشغيل Migration
addLockoutColumns();
