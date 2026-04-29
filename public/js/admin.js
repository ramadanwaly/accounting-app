// admin.js

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    // Setup button event listeners
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = '/';
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadUsers();
    });

    // Event delegation for approve/reject buttons
    document.getElementById('usersTableBody').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-approve')) {
            const userId = e.target.dataset.userId;
            approveUser(userId);
        } else if (e.target.classList.contains('btn-reject')) {
            const userId = e.target.dataset.userId;
            rejectUser(userId);
        }
    });
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
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
            renderUsers(data.users);
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" class="error">${escapeHtml(data.message || 'حدث خطأ')}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="error">حدث خطأ أثناء تحميل البيانات</td></tr>`;
    }
}

function renderUsers(users) {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '';

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">لا يوجد مستخدمين</td></tr>';
        return;
    }

    users.forEach(user => {
        const tr = document.createElement('tr');

        let statusClass = 'status-pending';
        let statusText = 'قيد الانتظار';

        if (user.is_approved) {
            statusClass = 'status-approved';
            statusText = 'موافق عليه';
        }

        const roleClass = user.role === 'admin' ? 'status-admin' : '';
        const roleText = user.role === 'admin' ? 'مدير' : 'مستخدم';

        const createdDate = new Date(user.created_at).toLocaleDateString('ar-EG');
        const userId = Number.parseInt(user.id, 10);

        let actions = '';
        if (!user.is_approved && Number.isInteger(userId)) {
            actions += `<button class="action-btn btn-approve" data-user-id="${userId}">✅ موافقة</button>`;
        }
        if (user.role !== 'admin' && Number.isInteger(userId)) { // Admin cannot delete another admin lightly (safety)
            actions += `<button class="action-btn btn-reject" data-user-id="${userId}">❌ حذف</button>`;
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

async function approveUser(userId) {
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
            alert('تمت الموافقة بنجاح');
            loadUsers();
        } else {
            alert(data.message || 'حدث خطأ');
        }
    } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء الاتصال بالخادم');
    }
}

async function rejectUser(userId) {
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
            alert('تم الحذف بنجاح');
            loadUsers();
        } else {
            alert(data.message || 'حدث خطأ');
        }
    } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء الاتصال بالخادم');
    }
}
