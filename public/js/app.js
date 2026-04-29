// ===== الملف الرئيسي — تنسيق وربط المكونات =====
// تم تقسيم المنطق إلى: constants.js, utils.js, revenues.js, expenses.js, summary.js, projects.js

let currentEditId = null;
let currentEditType = null;

// ===== إدارة السمة (الوضوء/الظلام) =====
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // إذا كان هناك سمة محفوظة، استخدمها؛ وإلا استخدم تفضيل النظام
    const themeToApply = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(themeToApply);
    updateThemeIcon(themeToApply);
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        // شمس للوضوء (للتحول للظلام)، قمر للظلام (للتحول للوضوء)
        toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    setupEventListeners();
    setupKeyboardShortcuts();

    // إضافة مستمع لزر التبديل
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
});

function setupEventListeners() {
    // التنقل بين الصفحات
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => switchPage(tab.dataset.page));
    });

    // الأزرار الرئيسية
    document.getElementById('settingsBtn')?.addEventListener('click', showSettingsModal);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('addRevenueBtn')?.addEventListener('click', () => showRevenueModal());
    document.getElementById('deleteAllRevenuesBtn')?.addEventListener('click', deleteAllRevenues);
    document.getElementById('addBulkRevenueBtn')?.addEventListener('click', showBulkRevenueModal);
    document.getElementById('addExpenseBtn')?.addEventListener('click', () => showExpenseModal());
    document.getElementById('deleteAllExpensesBtn')?.addEventListener('click', deleteAllExpenses);
    document.getElementById('addBulkExpenseBtn')?.addEventListener('click', showBulkExpenseModal);

    // حساب الإجمالي تلقائياً
    const calculateTotal = () => {
        const qty = parseFloat(document.getElementById('expenseQuantity').value) || 0;
        const price = parseFloat(document.getElementById('expensePrice').value) || 0;
        const total = qty * price;
        document.getElementById('expenseAmount').value = total > 0 ? total.toFixed(2) : '';
    };
    document.getElementById('expenseQuantity')?.addEventListener('input', calculateTotal);
    document.getElementById('expensePrice')?.addEventListener('input', calculateTotal);

    // إغلاق النوافذ المنبثقة
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal;
            if (modalId) { document.getElementById(modalId).classList.remove('active'); currentEditId = null; currentEditType = null; }
        });
    });

    // تفويض الأحداث للجداول
    setupTableDelegation();
    setupProjectDelegation();
}

// ===== اختصارات لوحة المفاتيح =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            if (e.key === 'Escape') { document.querySelectorAll('.modal.active').forEach(modal => modal.classList.remove('active')); }
            return;
        }
        if (e.altKey) {
            switch (e.key) {
                case '1': e.preventDefault(); switchPage('revenues'); break;
                case '2': e.preventDefault(); switchPage('expenses'); break;
                case '3': e.preventDefault(); switchPage('summary'); break;
                case '4': e.preventDefault(); switchPage('projects'); break;
                case 'n': case 'N':
                    e.preventDefault();
                    const activePage = document.querySelector('.page.active');
                    if (activePage?.id === 'revenuesPage') showRevenueModal();
                    else if (activePage?.id === 'expensesPage') showExpenseModal();
                    break;
            }
        }
        if (e.key === 'Escape') { document.querySelectorAll('.modal.active').forEach(modal => modal.classList.remove('active')); }
    });
}

function setupTableDelegation() {
    // تفويض أحداث الإيرادات
    document.getElementById('revenuesContent')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-icon');
        if (btn) {
            const id = parseInt(btn.dataset.id);
            if (btn.classList.contains('edit-btn')) editRevenue(id);
            else if (btn.classList.contains('delete-btn')) deleteRevenue(id);
            return;
        }
        const header = e.target.closest('.project-header');
        if (header) { toggleCardDetails(header); }
    });
    // تفويض أحداث المصروفات
    document.getElementById('expensesContent')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-icon');
        if (btn) {
            const id = parseInt(btn.dataset.id);
            if (btn.classList.contains('edit-btn')) editExpense(id);
            else if (btn.classList.contains('delete-btn')) deleteExpense(id);
            return;
        }
        const header = e.target.closest('.project-header');
        if (header) { toggleCardDetails(header); }
    });
}

// دالة مشتركة لطي/فتح الكروت
function toggleCardDetails(header) {
    const card = header.closest('.project-card');
    const details = card.querySelector('.project-details');
    const toggleBtn = card.querySelector('.btn-toggle');
    if (details.style.display === 'none' || details.style.display === '') {
        details.style.display = 'block';
        if (toggleBtn) toggleBtn.style.transform = 'rotate(0deg)';
    } else {
        details.style.display = 'none';
        if (toggleBtn) toggleBtn.style.transform = 'rotate(-90deg)';
    }
}

// التنقل بين الصفحات
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(pageName + 'Page').classList.add('active');
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
    if (pageName === 'summary') loadSummary();
    else if (pageName === 'projects') loadProjects();
    else if (pageName === 'admin' && typeof loadAdminUsers === 'function') loadAdminUsers();
}

// تحميل جميع البيانات
async function loadAllData() {
    await Promise.all([loadRevenues(), loadExpenses(), loadProjectNames()]);
}

// ===== كود نافذة التحقق العامة =====
let verificationCallback = null;
let currentVerificationAction = null;

function requestVerificationAction(actionType, callback) {
    const modal = document.getElementById('verificationModal');
    const verifyBtn = document.getElementById('genericVerifyBtn');
    const inputGroup = document.getElementById('genericVerificationCodeGroup');
    const input = document.getElementById('genericVerificationCode');
    inputGroup.style.display = 'none';
    verifyBtn.textContent = 'إرسال رمز التحقق';
    input.value = '';
    currentVerificationAction = actionType;
    verificationCallback = callback;
    modal.classList.add('active');
}

document.getElementById('genericVerifyBtn').addEventListener('click', async () => {
    const inputGroup = document.getElementById('genericVerificationCodeGroup');
    const btn = document.getElementById('genericVerifyBtn');
    const input = document.getElementById('genericVerificationCode');
    try {
        if (inputGroup.style.display === 'none') {
            showLoading(true);
            await authAPI.requestVerification(currentVerificationAction);
            inputGroup.style.display = 'block';
            btn.textContent = 'تأكيد وحذف';
            showAlert('تم إرسال رمز التحقق إلى بريدك الإلكتروني', 'info');
        } else {
            const code = input.value;
            if (!code) { showAlert('يرجى إدخال رمز التحقق', 'error'); return; }
            if (verificationCallback) { await verificationCallback(code); document.getElementById('verificationModal').classList.remove('active'); }
        }
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
});

// ===== الإعدادات =====
function showSettingsModal() {
    document.getElementById('settingsModal').classList.add('active');
    document.getElementById('changePasswordForm').reset();
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
    document.getElementById('verificationCodeGroup').style.display = 'none';
    document.getElementById('changePasswordBtn').textContent = 'طلب رمز التحقق';
    document.getElementById('changePasswordForm').reset();
}

document.getElementById('changePasswordForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const verificationCodeInput = document.getElementById('verificationCode');
    const verificationCodeGroup = document.getElementById('verificationCodeGroup');
    const submitBtn = document.getElementById('changePasswordBtn');
    if (newPassword.length < 6) { showAlert('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error'); return; }
    showLoading(true);
    try {
        if (verificationCodeGroup.style.display === 'none') {
            await authAPI.requestVerification('CHANGE_PASSWORD');
            verificationCodeGroup.style.display = 'block';
            submitBtn.textContent = 'تأكيد وحفظ';
            showAlert('تم إرسال رمز التحقق إلى بريدك الإلكتروني', 'info');
        } else {
            const code = verificationCodeInput.value;
            if (!code) { showAlert('يرجى إدخال رمز التحقق', 'error'); return; }
            await authAPI.changePassword(currentPassword, newPassword, code);
            showAlert('تم تغيير كلمة المرور بنجاح', 'success');
            closeSettingsModal();
            document.getElementById('changePasswordForm').reset();
            verificationCodeGroup.style.display = 'none';
            submitBtn.textContent = 'طلب رمز التحقق';
        }
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
});

// إغلاق النوافذ المنبثقة عند النقر خارجها
window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) { event.target.classList.remove('active'); currentEditId = null; currentEditType = null; }
});
