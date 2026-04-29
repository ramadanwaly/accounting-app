// ===== إدارة الإيرادات =====

async function loadRevenues() {
    const container = document.getElementById('revenuesContent');
    container.innerHTML = '<p class="loading">جاري التحميل...</p>';
    try {
        const response = await revenuesAPI.getAll();
        const revenues = response.data;
        if (revenues.length === 0) {
            container.innerHTML = '<p style="text-align:center; padding:30px;">لا توجد إيرادات مسجلة</p>';
            return;
        }
        const monthlyGroups = groupRevenuesByMonth(revenues);
        container.innerHTML = Object.entries(monthlyGroups).sort((a, b) => new Date(b[1].date) - new Date(a[1].date)).map(([key, group]) => `
            <div class="project-card">
                <div class="project-header" style="cursor: pointer;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="btn-toggle" style="pointer-events: none; transform: rotate(-90deg);">▼</button>
                        <div class="project-name">📅 ${group.label}</div>
                    </div>
                    <div class="project-total">إجمالي: ${formatCurrency(group.total)}</div>
                </div>
                <div class="project-details" style="display: none;">
                    <div class="table-container">
                        <table><thead><tr><th>التاريخ</th><th>المصدر</th><th>المبلغ</th><th>الملاحظات</th><th>الإجراءات</th></tr></thead>
                            <tbody>${group.revenues.map(rev => `<tr><td>${formatDate(rev.date)}</td><td>${escapeHtml(rev.source)}</td><td>${formatCurrency(rev.amount)}</td><td>${escapeHtml(rev.notes || '-')}</td><td><button class="btn btn-icon edit-btn" data-id="${rev.id}" title="تعديل">✏️</button><button class="btn btn-icon btn-danger delete-btn" data-id="${rev.id}" title="حذف">🗑️</button></td></tr>`).join('')}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p style="text-align:center; padding:30px; color:var(--danger-color);">خطأ في تحميل البيانات</p>';
        showAlert('فشل في تحميل الإيرادات', 'error');
    }
}

function groupRevenuesByMonth(revenues) {
    const groups = {};
    revenues.forEach(rev => {
        const date = new Date(rev.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!groups[key]) {
            groups[key] = { date, label: date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }), revenues: [], total: 0 };
        }
        groups[key].revenues.push(rev);
        groups[key].total += parseFloat(rev.amount);
    });
    return groups;
}

function showRevenueModal(id = null) {
    currentEditId = id;
    currentEditType = 'revenue';
    const modal = document.getElementById('revenueModal');
    const title = document.getElementById('revenueModalTitle');
    const form = document.getElementById('revenueForm');
    form.reset();
    if (id) { title.textContent = 'تعديل الإيراد'; loadRevenueData(id); }
    else { title.textContent = 'إضافة إيراد جديد'; document.getElementById('revenueDate').valueAsDate = new Date(); }
    modal.classList.add('active');
}

async function loadRevenueData(id) {
    try {
        const response = await revenuesAPI.getAll();
        const revenue = response.data.find(r => r.id === id);
        if (revenue) {
            document.getElementById('revenueDate').value = revenue.date;
            document.getElementById('revenueSource').value = revenue.source;
            document.getElementById('revenueAmount').value = revenue.amount;
            document.getElementById('revenueNotes').value = revenue.notes || '';
        }
    } catch (error) { showAlert('فشل في تحميل بيانات الإيراد', 'error'); closeRevenueModal(); }
}

function closeRevenueModal() { document.getElementById('revenueModal').classList.remove('active'); currentEditId = null; currentEditType = null; }

document.getElementById('revenueForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const data = { date: document.getElementById('revenueDate').value, source: document.getElementById('revenueSource').value, amount: parseFloat(document.getElementById('revenueAmount').value), notes: document.getElementById('revenueNotes').value || null };
    showLoading(true);
    try {
        if (currentEditId) { await revenuesAPI.update(currentEditId, data); showAlert('تم تحديث الإيراد بنجاح', 'success'); }
        else { await revenuesAPI.create(data); showAlert('تم إضافة الإيراد بنجاح', 'success'); }
        closeRevenueModal(); await loadRevenues(); await loadSummary();
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
});

async function editRevenue(id) { showRevenueModal(id); }

async function deleteRevenue(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الإيراد؟')) return;
    showLoading(true);
    try {
        const response = await revenuesAPI.delete(id);
        if (response._status === 202) { showAlert('تم إرسال طلب الحذف للمسؤول للموافقة', 'info'); }
        else { showAlert('تم حذف الإيراد بنجاح', 'success'); await loadRevenues(); await loadSummary(); }
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
}

async function deleteAllRevenues() {
    requestVerificationAction('DELETE_DATA', async (code) => {
        showLoading(true);
        try {
            const response = await revenuesAPI.deleteAll(code);
            if (response._status === 202) { showAlert('تم إرسال طلب حذف الكل للمسؤول للموافقة', 'info'); }
            else { showAlert('تم حذف جميع الإيرادات بنجاح', 'success'); await loadRevenues(); await loadSummary(); }
        } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
    });
}

// ===== الإضافة المتعددة =====
function showBulkRevenueModal() {
    const modal = document.getElementById('bulkRevenueModal');
    document.getElementById('bulkRevenueForm').reset();
    document.getElementById('bulkRevenueDate').valueAsDate = new Date();
    document.getElementById('bulkRevenueRows').innerHTML = '';
    addBulkRevenueRow(); addBulkRevenueRow(); updateBulkRevenueSummary();
    modal.classList.add('active');
}

function addBulkRevenueRow() {
    const tbody = document.getElementById('bulkRevenueRows');
    const row = document.createElement('tr');
    row.className = 'bulk-row';
    row.innerHTML = `<td><input type="text" class="bulk-input" name="source" placeholder="مصدر الإيراد" required></td><td><input type="number" class="bulk-input" name="amount" step="0.01" min="0.01" placeholder="0.00" required></td><td><input type="text" class="bulk-input" name="notes" placeholder="ملاحظات"></td><td><button type="button" class="btn btn-icon btn-danger btn-remove-row" title="حذف الصف">✕</button></td>`;
    tbody.appendChild(row);
    row.querySelector('[name="amount"]').addEventListener('input', updateBulkRevenueSummary);
    row.querySelector('.btn-remove-row').addEventListener('click', () => { row.remove(); updateBulkRevenueSummary(); });
    updateBulkRevenueSummary();
    row.querySelector('[name="source"]').focus();
}

function updateBulkRevenueSummary() {
    const rows = document.querySelectorAll('#bulkRevenueRows .bulk-row');
    let total = 0;
    rows.forEach(row => { total += parseFloat(row.querySelector('[name="amount"]').value) || 0; });
    document.getElementById('bulkRevenueTotalDisplay').textContent = formatCurrency(total);
    document.getElementById('bulkRevenueCountDisplay').textContent = rows.length;
}

document.getElementById('addBulkRevenueRow')?.addEventListener('click', addBulkRevenueRow);

document.getElementById('bulkRevenueForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const date = document.getElementById('bulkRevenueDate').value;
    const rows = document.querySelectorAll('#bulkRevenueRows .bulk-row');
    if (rows.length === 0) { showAlert('يرجى إضافة صف واحد على الأقل', 'error'); return; }
    const items = []; let hasError = false;
    rows.forEach((row) => {
        const source = row.querySelector('[name="source"]').value.trim();
        const amount = parseFloat(row.querySelector('[name="amount"]').value);
        const notes = row.querySelector('[name="notes"]').value.trim() || null;
        if (!source || !amount || amount <= 0) { hasError = true; return; }
        items.push({ date, source, amount, notes });
    });
    if (hasError || items.length === 0) { showAlert('يرجى ملء جميع الحقول المطلوبة في كل الصفوف', 'error'); return; }
    showLoading(true);
    try {
        const response = await revenuesAPI.createBulk(items);
        showAlert(response.message, 'success');
        document.getElementById('bulkRevenueModal').classList.remove('active');
        await loadRevenues(); await loadSummary();
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
});
