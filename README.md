# 📊 برنامج المحاسبة الاحترافي (Accounting App)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2014.x-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-blue.svg)](#)

برنامج محاسبة متكامل لإدارة الإيرادات والمصاريف، مصمم ليعمل كخادم ويب (Web Server) أو كتطبيق سطح مكتب (Desktop Application) باستخدام Electron. يتميز النظام بواجهة عربية سهلة الاستخدام ومعايير أمان عالية.

---

## ✨ المميزات الرئيسية

*   **📦 إدارة البيانات:** تسجيل ومتابعة كاملة للإيرادات والمصاريف مع تصنيفات مخصصة.
*   **📈 التقارير المالية:** استخراج تقارير دورية وإحصائيات دقيقة للأداء المالي.
*   **🔒 أمان متقدم:**
    *   نظام صلاحيات متطور (مدير/مستخدم).
    *   تشفير كلمات المرور باستخدام `bcrypt`.
    *   حماية الجلسات باستخدام `JWT`.
    *   نظام قفل الحساب (Account Lockout) عند المحاولات الخاطئة المتكررة.
*   **🖥️ تطبيق سطح مكتب:** إمكانية التشغيل كتطبيق مستقل عبر Electron مع دعم بناء ملفات تثبيت (EXE, DMG, AppImage).
*   **💾 النسخ الاحتياطي:** نظام آلي للنسخ الاحتياطي لقاعدة البيانات لضمان عدم فقدان البيانات.
*   **📝 سجل النشاطات (Audit Log):** تتبع جميع العمليات الحساسة التي يقوم بها المستخدمون لضمان الشفافية.
*   **🐳 دعم Docker:** جاهز للتشغيل والبيئات المعزولة باستخدام Docker و Docker Compose.

---

## 🚀 التقنيات المستخدمة

*   **Backend:** Node.js & Express.js
*   **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
*   **Database:** SQLite3 (قاعدة بيانات محلية سريعة ولا تحتاج لإعدادات معقدة)
*   **Desktop:** Electron.js
*   **Testing:** Jest & Supertest
*   **Security:** Helmet, CORS, Express-validator, Rate-limiting
*   **Logging:** Winston & Winston-daily-rotate-file

---

## ⚙️ التثبيت والإعداد

### المتطلبات الأساسية
*   [Node.js](https://nodejs.org/) (إصدار 16 أو أحدث)
*   [npm](https://www.npmjs.com/)

### خطوات التشغيل
1.  **تحميل المشروع:**
    ```bash
    git clone https://github.com/your-username/accounting-app.git
    cd accounting-app
    ```

2.  **تثبيت الاعتمادات:**
    ```bash
    npm install
    ```

3.  **إعداد متغيرات البيئة:**
    قم بإنشاء ملف `.env` بناءً على `.env.example`:
    ```bash
    cp .env.example .env
    ```
    *تأكد من تغيير `JWT_SECRET` لضمان أمان النظام.*

4.  **تهيئة قاعدة البيانات:**
    ```bash
    npm run init-db
    ```

5.  **تشغيل التطبيق:**
    *   **كخادم ويب:** `npm start`
    *   **للمطورين (مع إعادة تشغيل تلقائي):** `npm run dev`
    *   **كتطبيق سطح مكتب:** `npm run electron`

---

## 🛠️ الأوامر المتاحة

| الأمر | الوصف |
| :--- | :--- |
| `npm start` | تشغيل خادم الويب |
| `npm run dev` | تشغيل وضع التطوير (Nodemon) |
| `npm run init-db` | إنشاء وتهيئة قاعدة البيانات والجداول |
| `npm run backup` | أخذ نسخة احتياطية فورية من البيانات |
| `npm run electron` | فتح البرنامج كواجهة سطح مكتب |
| `npm run build` | بناء ملفات التثبيت لسطح المكتب (Dist) |
| `npm test` | تشغيل الاختبارات البرمجية (Jest) |
| `npm run generate-secret` | توليد مفتاح JWT آمن وعشوائي |

---

## 🐳 التشغيل باستخدام Docker

يمكنك تشغيل التطبيق بالكامل في حاوية معزولة:

```bash
# بناء وتشغيل الحاوية
docker-compose up -d
```

---

## 📁 هيكلية المشروع

```text
├── config/             # إعدادات قاعدة البيانات، الأمان، والبريد
├── database/           # ملفات SQLite والتحجير (Migrations)
├── middleware/         # فلاتر الحماية والتحقق من الصلاحيات
├── models/             # تعريف نماذج البيانات (Models)
├── public/             # ملفات الواجهة الأمامية (HTML, CSS, JS)
├── routes/             # مسارات الـ API (Endpoints)
├── scripts/            # سكربتات الصيانة والإدارة والنسخ الاحتياطي
├── tests/              # الاختبارات الآلية (Unit & Integration tests)
└── electron-main.js    # نقطة الدخول لتطبيق سطح المكتب
```

---

## 🛡️ الأمان
تم بناء هذا النظام مع مراعاة أفضل ممارسات الأمان:
*   حماية ضد هجمات الـ Brute Force.
*   رؤوس حماية HTTP (Helmet).
*   التحقق من صحة البيانات المدخلة (Input Validation).
*   سجلات مفصلة للأخطاء والنشاطات.

---

## 📄 الترخيص
هذا المشروع مرخص تحت رخصة **MIT**. يمكنك استخدامه وتعديله بحرية.

---

**تم التطوير بكل ❤️ لدعم العمليات المحاسبية البسيطة والاحترافية.**
