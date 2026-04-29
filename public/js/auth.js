// إدارة المصادقة

// فحص حالة تسجيل الدخول عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    setupAuthForms();
    setupLoginTabs();
    setupForgotPassword();
    setupPasswordToggles();
});

// إعداد زر إظهار/إخفاء كلمة المرور
function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            // الزر موجود داخل div.password-wrapper مع الـ input
            const wrapper = this.closest('.password-wrapper');
            const input = wrapper.querySelector('input');
            
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '🙈'; // أيقونة الإخفاء
                this.setAttribute('aria-label', 'إخفاء كلمة المرور');
            } else {
                input.type = 'password';
                this.textContent = '👁️'; // أيقونة الإظهار
                this.setAttribute('aria-label', 'عرض كلمة المرور');
            }
        });
    });
}

// فحص المصادقة
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const userEmail = localStorage.getItem('userEmail');

    if (token && userEmail) {
        // فحص صلاحية التوكن
        if (isTokenExpiringSoon(token)) {
            showSessionWarning();
        }
        showMainApp(userEmail);
        startSessionTimer(token);
    } else {
        showLoginPage();
    }
}

// فحص إذا كان التوكن قرب ينتهي (أقل من 5 دقائق)
function isTokenExpiringSoon(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresAt = payload.exp * 1000;
        const fiveMinutes = 5 * 60 * 1000;
        return (expiresAt - Date.now()) < fiveMinutes;
    } catch {
        return false;
    }
}

// الحصول على وقت انتهاء التوكن
function getTokenExpirationTime(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000;
    } catch {
        return null;
    }
}

// بدء مؤقت الجلسة
let sessionTimer = null;
function startSessionTimer(token) {
    if (sessionTimer) clearTimeout(sessionTimer);

    const expiresAt = getTokenExpirationTime(token);
    if (!expiresAt) return;

    const fiveMinutes = 5 * 60 * 1000;
    const timeUntilWarning = expiresAt - Date.now() - fiveMinutes;

    if (timeUntilWarning > 0) {
        sessionTimer = setTimeout(() => {
            showSessionWarning();
        }, timeUntilWarning);
    }
}

// تحذير انتهاء الجلسة
function showSessionWarning() {
    if (confirm('⚠️ جلستك ستنتهي قريباً!\n\nهل تريد تسجيل الخروج الآن أم البقاء؟\n\nاضغط OK لتسجيل الخروج\nاضغط Cancel للبقاء')) {
        logout();
    }
}

// عرض صفحة تسجيل الدخول
function showLoginPage() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

// عرض التطبيق الرئيسي
function showMainApp(email) {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userInfo').textContent = `مرحباً، ${email}`;

    // Check if user is admin and show admin tab
    if (typeof checkAdminAccess === 'function') {
        checkAdminAccess();
    }

    // تحميل البيانات
    loadAllData();
}

// إعداد نماذج المصادقة
function setupAuthForms() {
    // نموذج تسجيل الدخول
    document.getElementById('loginForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        showLoading(true);

        try {
            const response = await authAPI.login(email, password);

            // حفظ البيانات
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('userEmail', response.user.email);
            localStorage.setItem('userId', response.user.id);

            showMainApp(response.user.email);
            startSessionTimer(response.token);
            showAlert('تم تسجيل الدخول بنجاح', 'success', 'loginAlert');
        } catch (error) {
            showAlert(error.message, 'error', 'loginAlert');
        } finally {
            showLoading(false);
        }
    });

    // نموذج إنشاء حساب
    document.getElementById('registerForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerPasswordConfirm').value;
        const fullName = document.getElementById('registerName').value;

        // التحقق من تأكيد كلمة المرور
        if (password !== confirmPassword) {
            showAlert('كلمتا المرور غير متطابقتين', 'error', 'loginAlert');
            return;
        }

        if (password.length < 6) {
            showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error', 'loginAlert');
            return;
        }

        showLoading(true);

        try {
            const response = await authAPI.register(email, password, fullName || null);

            if (response.token) {
                // حفظ البيانات
                localStorage.setItem('authToken', response.token);
                localStorage.setItem('userEmail', response.user.email);
                localStorage.setItem('userId', response.user.id);

                showMainApp(response.user.email);
                showAlert('تم إنشاء الحساب بنجاح', 'success', 'loginAlert');
            } else {
                // حساب معلق
                showAlert(response.message, 'success', 'loginAlert');
                document.getElementById('registerForm').reset();
                setTimeout(() => {
                    switchLoginTab('login');
                }, 3000);
            }
        } catch (error) {
            showAlert(error.message, 'error', 'loginAlert');
        } finally {
            showLoading(false);
        }
    });
}

// إعداد نموذج نسيت كلمة المرور
function setupForgotPassword() {
    // رابط نسيت كلمة المرور
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordForm();
    });

    // رابط العودة لتسجيل الدخول
    document.getElementById('backToLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        hideForgotPasswordForm();
        switchLoginTab('login');
    });

    // نموذج نسيت كلمة المرور
    document.getElementById('forgotPasswordForm')?.addEventListener('submit', async function (e) {
        e.preventDefault();

        const btn = document.getElementById('forgotPasswordBtn');
        const email = document.getElementById('forgotEmail').value;
        const resetCodeGroup = document.getElementById('resetCodeGroup');
        const newPasswordGroup = document.getElementById('newPasswordGroup');
        const confirmNewPasswordGroup = document.getElementById('confirmNewPasswordGroup');

        showLoading(true);

        try {
            if (resetCodeGroup.style.display === 'none') {
                // الخطوة 1: طلب الكود
                await authAPI.forgotPassword(email);

                resetCodeGroup.style.display = 'block';
                newPasswordGroup.style.display = 'block';
                confirmNewPasswordGroup.style.display = 'block';
                btn.textContent = 'إعادة تعيين كلمة المرور';

                showAlert('تم إرسال رمز التحقق إلى بريدك الإلكتروني', 'success', 'loginAlert');
            } else {
                // الخطوة 2: إعادة تعيين كلمة المرور
                const code = document.getElementById('resetCode').value;
                const newPassword = document.getElementById('newResetPassword').value;
                const confirmPassword = document.getElementById('confirmResetPassword').value;

                if (!code) {
                    showAlert('يرجى إدخال رمز التحقق', 'error', 'loginAlert');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    showAlert('كلمتا المرور غير متطابقتين', 'error', 'loginAlert');
                    return;
                }

                if (newPassword.length < 6) {
                    showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error', 'loginAlert');
                    return;
                }

                await authAPI.resetPassword(email, code, newPassword);

                showAlert('تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول', 'success', 'loginAlert');

                // إعادة تعيين النموذج والعودة لتسجيل الدخول
                resetForgotPasswordForm();
                setTimeout(() => {
                    hideForgotPasswordForm();
                    switchLoginTab('login');
                }, 2000);
            }
        } catch (error) {
            showAlert(error.message, 'error', 'loginAlert');
        } finally {
            showLoading(false);
        }
    });
}

function showForgotPasswordForm() {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.getElementById('forgotPasswordForm').classList.add('active');
    document.querySelectorAll('.login-tab').forEach(tab => tab.classList.remove('active'));
}

function hideForgotPasswordForm() {
    document.getElementById('forgotPasswordForm').classList.remove('active');
    resetForgotPasswordForm();
}

function resetForgotPasswordForm() {
    document.getElementById('forgotPasswordForm').reset();
    document.getElementById('resetCodeGroup').style.display = 'none';
    document.getElementById('newPasswordGroup').style.display = 'none';
    document.getElementById('confirmNewPasswordGroup').style.display = 'none';
    document.getElementById('forgotPasswordBtn').textContent = 'إرسال رمز التحقق';
}

// إعداد تبويبات تسجيل الدخول
function setupLoginTabs() {
    document.querySelectorAll('.login-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            hideForgotPasswordForm();
            switchLoginTab(tabName);
        });
    });
}

// التبديل بين تسجيل الدخول وإنشاء حساب
function switchLoginTab(tab) {
    const loginBtn = document.querySelector('.login-tab[data-tab="login"]');
    const registerBtn = document.querySelector('.login-tab[data-tab="register"]');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (tab === 'login') {
        loginBtn.classList.add('active');
        registerBtn.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginBtn.classList.remove('active');
        registerBtn.classList.add('active');
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }

    // إخفاء الرسائل
    document.getElementById('loginAlert').classList.remove('show');
}

// تسجيل الخروج
async function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        if (sessionTimer) clearTimeout(sessionTimer);
        localStorage.clear();
        showLoginPage();

        // إعادة تعيين النماذج
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();

        showAlert('تم تسجيل الخروج بنجاح', 'success', 'loginAlert');
    }
}

// عرض/إخفاء شاشة التحميل
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

