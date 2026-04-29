#!/bin/bash

# سكريبت cron لعمل نسخ احتياطي تلقائي

# الانتقال لمجلد المشروع
cd /home/ramadan/Projects/accounting-app

# تشغيل النسخ الاحتياطي
npm run backup

# يمكنك إضافة هذا السكريبت لـ crontab لتشغيله يومياً:
# crontab -e
# أضف السطر التالي للتشغيل يومياً في الساعة 3 صباحاً:
# 0 3 * * * /home/ramadan/Documents/accounting-app/scripts/cron-backup.sh >> /home/ramadan/Documents/accounting-app/logs/backup.log 2>&1
