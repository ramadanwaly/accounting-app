#!/bin/bash

# إعدادات النسخ الاحتياطي
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKUP_DIR="$SCRIPT_DIR/backups"
DB_PATH="$SCRIPT_DIR/database/accounting.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="accounting_backup_${TIMESTAMP}.db"
GDRIVE_PATH="gdrive:accounting-backups"

# إنشاء مجلد النسخ الاحتياطية المحلي إذا لم يكن موجوداً
mkdir -p "$BACKUP_DIR"

# نسخ قاعدة البيانات
echo "جاري إنشاء نسخة احتياطية..."
cp "$DB_PATH" "$BACKUP_DIR/$BACKUP_FILE"

# التحقق من سلامة النسخة الاحتياطية
echo "جاري التحقق من سلامة النسخة الاحتياطية..."
if command -v sqlite3 >/dev/null 2>&1; then
    CHECK_RESULT=$(sqlite3 "$BACKUP_DIR/$BACKUP_FILE" "PRAGMA integrity_check;")
    if [ "$CHECK_RESULT" != "ok" ]; then
        echo "❌ خطأ: النسخة الاحتياطية تالفة! (النتيجة: $CHECK_RESULT)"
        rm "$BACKUP_DIR/$BACKUP_FILE"
        exit 1
    fi
    echo "✅ النسخة الاحتياطية سليمة."
else
    echo "⚠️ تنبيه: sqlite3 غير مثبت، تخطي فحص السلامة."
fi

# رفع النسخة إلى Google Drive
echo "جاري رفع النسخة الاحتياطية إلى Google Drive..."
rclone copy "$BACKUP_DIR/$BACKUP_FILE" "$GDRIVE_PATH"

# حذف النسخ المحلية الأقدم من 7 أيام
find "$BACKUP_DIR" -name "accounting_backup_*.db" -mtime +2 -delete

echo "تم إنشاء النسخة الاحتياطية بنجاح: $BACKUP_FILE"
