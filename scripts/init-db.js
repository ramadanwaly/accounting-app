require('dotenv').config();
const { initDatabase } = require('../config/database');
const { run } = require('../config/database');
const User = require('../models/User');

// سكريبت تهيئة قاعدة البيانات
async function initializeApp() {
    console.log('🔧 جاري تهيئة قاعدة البيانات...\n');

    // تهيئة الجداول والهجرات قبل إنشاء المستخدم الافتراضي
    await initDatabase();

    try {
        // التحقق من وجود مستخدم افتراضي
        const adminEmail = 'ramadan.waly83@gmail.com';
        const existingAdmin = await User.findByEmail(adminEmail);

        if (existingAdmin) {
            await run(
                "UPDATE users SET role = 'admin', is_approved = 1 WHERE id = ?",
                [existingAdmin.id]
            );
            console.log('✅ المستخدم الافتراضي موجود بالفعل');
            console.log(`   📧 البريد: ${adminEmail}`);
        } else {
            // إنشاء مستخدم افتراضي
            const adminPassword = 'admin123';
            const adminId = await User.create(adminEmail, adminPassword, 'المسؤول');
            await run(
                "UPDATE users SET role = 'admin', is_approved = 1 WHERE id = ?",
                [adminId]
            );

            console.log('✅ تم إنشاء المستخدم الافتراضي بنجاح!\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('   المستخدم الافتراضي:');
            console.log('   📧 البريد: ramadan.waly83@gmail.com');
            console.log('   🔑 كلمة المرور: admin123');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('\n⚠️  تذكير: يُرجى تغيير كلمة المرور بعد أول تسجيل دخول!\n');
        }

        console.log('\n✨ تمت التهيئة بنجاح!');
        console.log('يمكنك الآن تشغيل التطبيق: npm start\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ خطأ في التهيئة:', error.message);
        process.exit(1);
    }
}

initializeApp();
