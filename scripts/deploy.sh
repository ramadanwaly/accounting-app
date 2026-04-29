#!/bin/bash

# =============================================================================
# سكريبت Deployment الآمن - برنامج المحاسبة
# =============================================================================
# الاستخدام: ./deploy.sh
# يجب تشغيله من مجلد المشروع على السيرفر
# =============================================================================

set -e  # إيقاف عند أي خطأ

# الألوان للـ output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# دوال مساعدة
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# التحقق من وجود المشروع
if [ ! -f "package.json" ]; then
    print_error "خطأ: يجب تشغيل السكريبت من مجلد المشروع"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║                                               ║"
echo "║   🚀 Deployment Script - برنامج المحاسبة     ║"
echo "║                                               ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# الخطوة 1: النسخ الاحتياطي
print_step "الخطوة 1/5: النسخ الاحتياطي"

# إنشاء مجلد backups إن لم يكن موجوداً
mkdir -p backups

# نسخة احتياطية من قاعدة البيانات
if [ -f "database/accounting.db" ]; then
    BACKUP_FILE="backups/accounting-$(date +%Y%m%d_%H%M%S).db"
    cp database/accounting.db "$BACKUP_FILE"
    print_success "تم حفظ نسخة احتياطية: $BACKUP_FILE"
else
    print_warning "قاعدة البيانات غير موجودة (تثبيت جديد؟)"
fi

# الخطوة 2: تثبيت Dependencies
print_step "الخطوة 2/5: تثبيت Dependencies"

if command -v npm &> /dev/null; then
    npm install --production
    print_success "تم تثبيت dependencies"
else
    print_error "npm غير مثبت!"
    exit 1
fi

# الخطوة 3: Database Migration
print_step "الخطوة 3/5: Database Migration"

if [ -f "scripts/add-lockout-columns.js" ]; then
    node scripts/add-lockout-columns.js
    print_success "تم تشغيل migration"
else
    print_warning "Migration script غير موجود (تخطي)"
fi

# الخطوة 4: التحقق من .env
print_step "الخطوة 4/5: التحقق من .env"

if [ ! -f ".env" ]; then
    print_warning "ملف .env غير موجود"
    echo "هل تريد إنشاؤه من .env.example؟ (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        cp .env.example .env
        print_success "تم إنشاء .env من .env.example"
        print_warning "⚠️  يجب تعديل .env وإضافة JWT_SECRET قوي!"
    fi
else
    print_success "ملف .env موجود"
fi

# الخطوة 5: إعادة تشغيل الخادم
print_step "الخطوة 5/5: إعادة تشغيل الخادم"

# محاولة اكتشاف process manager
if command -v pm2 &> /dev/null; then
    print_success "تم اكتشاف PM2"
    
    # التحقق من وجود process
    if pm2 list | grep -q "accounting-app"; then
        pm2 restart accounting-app
        print_success "تم إعادة تشغيل التطبيق"
    else
        print_warning "التطبيق غير مسجل في PM2"
        echo "هل تريد تشغيله الآن؟ (y/n)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            pm2 start server.js --name accounting-app
            pm2 save
            print_success "تم تشغيل التطبيق"
        fi
    fi
    
    echo ""
    print_step "مراقبة اللوجات (Ctrl+C للخروج):"
    sleep 2
    pm2 logs accounting-app --lines 20
    
elif systemctl is-active --quiet accounting-app 2>/dev/null; then
    print_success "تم اكتشاف systemd service"
    sudo systemctl restart accounting-app
    print_success "تم إعادة تشغيل الخدمة"
    
    echo ""
    print_step "حالة الخدمة:"
    sudo systemctl status accounting-app --no-pager
    
else
    print_warning "لم يتم اكتشاف process manager"
    print_warning "يرجى إعادة تشغيل الخادم يدوياً:"
    echo "  npm start"
fi

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║                                               ║"
echo "║   ✅ Deployment مكتمل!                        ║"
echo "║                                               ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

print_step "الخطوات التالية:"
echo "  1. اختبر تسجيل الدخول"
echo "  2. جرب account lockout (5 محاولات خاطئة)"
echo "  3. تأكد من عمل جميع الوظائف"
echo ""

print_warning "في حالة وجود مشاكل:"
echo "  استعادة النسخة الاحتياطية: cp $BACKUP_FILE database/accounting.db"
echo ""
