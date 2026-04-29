#!/bin/bash
# سكريبت رفع التحديثات للسيرفر
# Usage: ./deploy.sh user@server:/path/to/app

SERVER=$1

if [ -z "$SERVER" ]; then
    echo "❌ يرجى تحديد عنوان السيرفر"
    echo "Usage: ./deploy.sh user@server:/path/to/app"
    exit 1
fi

echo "📦 جاري رفع التحديثات إلى: $SERVER"
echo "==========================================="

# الملفات المطلوب رفعها فقط
FILES=(
    "server.js"
    "config/security.js"
    "routes/admin.js"
    "routes/auth.js"
    "routes/expenses.js"
    "models/Revenue.js"
    "models/Expense.js"
    "public/index.html"
    "public/js/api.js"
    "public/js/app.js"
    "public/js/auth.js"
    "public/css/styles.css"
)

echo ""
echo "📋 الملفات التي سيتم رفعها:"
for file in "${FILES[@]}"; do
    echo "  ✓ $file"
done

echo ""
echo "⚠️ تأكيد: هل تريد المتابعة؟ (y/n)"
read -r confirm

if [ "$confirm" != "y" ]; then
    echo "❌ تم الإلغاء"
    exit 0
fi

# رفع الملفات
for file in "${FILES[@]}"; do
    echo "📤 جاري رفع: $file"
    scp "$file" "$SERVER/$file"
done

echo ""
echo "✅ تم رفع جميع الملفات بنجاح!"
echo ""
echo "🔄 لإعادة تشغيل التطبيق على السيرفر:"
echo "   ssh ${SERVER%:*} 'cd ${SERVER#*:} && pm2 restart all'"
