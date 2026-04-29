// ===== Admin Panel Integration =====

// Show admin tab if user is admin
function checkAdminAccess() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === 'admin') {
            document.getElementById('adminTab').style.display = 'block';
            return true;
        }
    } catch (e) {
        console.error('Error parsing token:', e);
    }
    return false;
}

// Load admin users
async function loadAdminUsers() {
    const tableBody = document.getElementById('adminUsersTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="loading">جاري التحميل...</td></tr>';

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            renderAdminUsers(data.users);
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" class="error">${escapeHtml(data.message)}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="error">حدث خطأ أثناء تحميل البيانات</td></tr>`;
    }
}

function renderAdminUsers(users) {
    const tableBody = document.getElementById('adminUsersTableBody');
    tableBody.innerHTML = '';

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">لا يوجد مستخدمين</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');

        let statusClass = user.is_approved ? 'status-approved' : 'status-pending';
        let statusText = user.is_approved ? 'موافق عليه' : 'قيد الانتظار';

        const roleClass = user.role === 'admin' ? 'status-admin' : '';
        const roleText = user.role === 'admin' ? 'مدير' : 'مستخدم';

        const createdDate = new Date(user.created_at).toLocaleDateString('ar-EG');

        let actions = '';
        if (!user.is_approved) {
            actions += `<button class="btn btn-sm btn-success approve-user-btn" data-user-id="${user.id}">✅ موافقة</button> `;
        }
        if (user.role !== 'admin') {
            actions += `<button class="btn btn-sm btn-danger reject-user-btn" data-user-id="${user.id}">❌ حذف</button>`;
        }

        tr.innerHTML = `
            <td>${escapeHtml(user.full_name || '-')}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${createdDate}</td>
            <td><span class="user-status ${statusClass}">${statusText}</span></td>
            <td><span class="user-status ${roleClass}">${roleText}</span></td>
            <td>${actions}</td>
        `;

        tableBody.appendChild(tr);
    });
}

async function approveAdminUser(userId) {
    if (!confirm('هل أنت متأكد من الموافقة على هذا المستخدم؟')) return;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/users/approve', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('تمت الموافقة بنجاح', 'success');
            loadAdminUsers();
        } else {
            showAlert(data.message || 'حدث خطأ', 'error');
        }
    } catch (error) {
        console.error(error);
        showAlert('حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
}

async function rejectAdminUser(userId) {
    if (!confirm('هل أنت متأكد من حذف/رفض هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/users/reject', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('تم الحذف بنجاح', 'success');
            loadAdminUsers();
        } else {
            showAlert(data.message || 'حدث خطأ', 'error');
        }
    } catch (error) {
        console.error(error);
        showAlert('حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
}

// Event delegation for admin user actions
document.getElementById('adminUsersTableBody')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('approve-user-btn')) {
        const userId = e.target.dataset.userId;
        approveAdminUser(userId);
    } else if (e.target.classList.contains('reject-user-btn')) {
        const userId = e.target.dataset.userId;
        rejectAdminUser(userId);
    }
});

// Refresh users button
document.getElementById('refreshUsersBtn')?.addEventListener('click', () => {
    loadAdminUsers();
});

// Admin password change form
document.getElementById('adminChangePasswordForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const currentPassword = document.getElementById('adminCurrentPassword').value;
    const newPassword = document.getElementById('adminNewPassword').value;
    const verificationCodeInput = document.getElementById('adminVerificationCode');
    const verificationCodeGroup = document.getElementById('adminVerificationCodeGroup');
    const submitBtn = document.getElementById('adminChangePasswordBtn');

    if (newPassword.length < 6) {
        showAlert('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }

    showLoading(true);

    try {
        if (verificationCodeGroup.style.display === 'none') {
            // Step 1: Request verification code
            await authAPI.requestVerification('CHANGE_PASSWORD');
            verificationCodeGroup.style.display = 'block';
            submitBtn.textContent = 'تغيير كلمة المرور';
            showAlert('تم إرسال رمز التحقق إلى بريدك الإلكتروني', 'success');
        } else {
            // Step 2: Change password with code
            const verificationCode = verificationCodeInput.value;
            if (!verificationCode) {
                showAlert('يرجى إدخال رمز التحقق', 'error');
                return;
            }

            await authAPI.changePassword(currentPassword, newPassword, verificationCode);
            showAlert('تم تغيير كلمة المرور بنجاح', 'success');

            // Reset form
            document.getElementById('adminChangePasswordForm').reset();
            verificationCodeGroup.style.display = 'none';
            submitBtn.textContent = 'طلب رمز التحقق';
        }
    } catch (error) {
        showAlert(error.message, 'error');
    } finally {
        showLoading(false);
    }
});

// Add user button
document.getElementById('addUserBtn')?.addEventListener('click', () => {
    document.getElementById('createUserModal').classList.add('active');
    document.getElementById('createUserForm').reset();
});

// Create user form
document.getElementById('createUserForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const fullName = document.getElementById('newUserName').value;
    const role = document.getElementById('newUserRole').value;
    const isApproved = document.getElementById('newUserApproved').checked;

    showLoading(true);

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/admin/users/create', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                fullName,
                role,
                isApproved
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('تم إنشاء المستخدم بنجاح', 'success');
            document.getElementById('createUserModal').classList.remove('active');
            document.getElementById('createUserForm').reset();
            loadAdminUsers();
        } else {
            showAlert(data.message || 'حدث خطأ', 'error');
        }
    } catch (error) {
        console.error(error);
        showAlert('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
        showLoading(false);
    }
});
