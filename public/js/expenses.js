// ===== إدارة المصروفات =====

async function loadExpenses() {
    const container = document.getElementById('expensesContent');
    container.innerHTML = '<p class="loading">جاري التحميل...</p>';
    try {
        const response = await expensesAPI.getAll();
        const expenses = response.data;
        if (expenses.length === 0) { container.innerHTML = '<p style="text-align:center; padding:30px;">لا توجد مصروفات مسجلة</p>'; return; }
        const monthlyGroups = groupExpensesByMonth(expenses);
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
                        <table><thead><tr><th>التاريخ</th><th>النوع</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th>ملاحظات</th><th>المشروع</th><th>الإجراءات</th></tr></thead>
                            <tbody>${group.expenses.map(exp => `<tr><td>${formatDate(exp.date)}</td><td>${escapeHtml(exp.category)}</td><td>${exp.quantity || 1}</td><td>${formatCurrency(exp.price || exp.amount)}</td><td>${formatCurrency(exp.amount)}</td><td>${escapeHtml(exp.notes || '-')}</td><td>${escapeHtml(exp.project)}</td><td><button class="btn btn-icon edit-btn" data-id="${exp.id}" title="تعديل">✏️</button><button class="btn btn-icon btn-danger delete-btn" data-id="${exp.id}" title="حذف">🗑️</button></td></tr>`).join('')}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="text-align:center; padding:30px; color:var(--danger-color);">خطأ في تحميل البيانات</p>';
        showAlert('فشل في تحميل المصروفات', 'error');
    }
}

function groupExpensesByMonth(expenses) {
    const groups = {};
    expenses.forEach(exp => {
        const date = new Date(exp.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!groups[key]) { groups[key] = { date, label: date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }), expenses: [], total: 0 }; }
        groups[key].expenses.push(exp);
        groups[key].total += parseFloat(exp.amount);
    });
    return groups;
}

function showExpenseModal(id = null) {
    currentEditId = id; currentEditType = 'expense';
    const modal = document.getElementById('expenseModal');
    const title = document.getElementById('expenseModalTitle');
    const form = document.getElementById('expenseForm');
    form.reset();
    if (id) { title.textContent = 'تعديل المصروف'; loadExpenseData(id); }
    else { title.textContent = 'إضافة مصروف جديد'; document.getElementById('expenseDate').valueAsDate = new Date(); }
    modal.classList.add('active');
}

async function loadExpenseData(id) {
    try {
        const response = await expensesAPI.getAll();
        const expense = response.data.find(e => e.id === id);
        if (expense) {
            document.getElementById('expenseDate').value = expense.date;
            document.getElementById('expenseCategory').value = expense.category;
            document.getElementById('expenseProject').value = expense.project;
            document.getElementById('expenseQuantity').value = expense.quantity || 1;
            document.getElementById('expensePrice').value = expense.price || expense.amount;
            document.getElementById('expenseAmount').value = expense.amount;
            document.getElementById('expenseNotes').value = expense.notes || '';
        }
    } catch (error) { showAlert('فشل في تحميل بيانات المصروف', 'error'); closeExpenseModal(); }
}

function closeExpenseModal() { document.getElementById('expenseModal').classList.remove('active'); currentEditId = null; currentEditType = null; }

document.getElementById('expenseForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const data = { date: document.getElementById('expenseDate').value, category: document.getElementById('expenseCategory').value, project: document.getElementById('expenseProject').value, quantity: parseFloat(document.getElementById('expenseQuantity').value), price: parseFloat(document.getElementById('expensePrice').value), amount: parseFloat(document.getElementById('expenseAmount').value), notes: document.getElementById('expenseNotes').value || null };
    showLoading(true);
    try {
        if (currentEditId) { await expensesAPI.update(currentEditId, data); showAlert('تم تحديث المصروف بنجاح', 'success'); }
        else { await expensesAPI.create(data); showAlert('تم إضافة المصروف بنجاح', 'success'); }
        closeExpenseModal(); await loadExpenses(); await loadSummary(); await loadProjects();
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
});

async function editExpense(id) { showExpenseModal(id); }

async function deleteExpense(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    showLoading(true);
    try {
        const response = await expensesAPI.delete(id);
        if (response._status === 202) { showAlert('تم إرسال طلب الحذف للمسؤول للموافقة', 'info'); }
        else { showAlert('تم حذف المصروف بنجاح', 'success'); await loadExpenses(); await loadSummary(); await loadProjects(); }
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
}

async function deleteAllExpenses() {
    requestVerificationAction('DELETE_DATA', async (code) => {
        showLoading(true);
        try {
            const response = await expensesAPI.deleteAll(code);
            if (response._status === 202) { showAlert('تم إرسال طلب حذف الكل للمسؤول للموافقة', 'info'); }
            else { showAlert('تم حذف جميع المصروفات بنجاح', 'success'); await loadExpenses(); await loadSummary(); await loadProjects(); }
        } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
    });
}

// ===== تحميل أسماء المشاريع للـ Auto-complete =====
async function loadProjectNames() {
    try {
        const response = await expensesAPI.getProjectNames();
        const datalist = document.getElementById('projectsList');
        if (datalist && response.data) { datalist.innerHTML = response.data.map(name => `<option value="${escapeHtml(name)}">`).join(''); }
    } catch (error) { console.error('فشل في تحميل أسماء المشاريع:', error); }
}

// ===== الإضافة المتعددة =====
function showBulkExpenseModal() {
    const modal = document.getElementById('bulkExpenseModal');
    document.getElementById('bulkExpenseForm').reset();
    document.getElementById('bulkExpenseDate').valueAsDate = new Date();
    document.getElementById('bulkExpenseRows').innerHTML = '';
    addBulkExpenseRow(); addBulkExpenseRow(); updateBulkExpenseSummary();
    modal.classList.add('active');
}

function addBulkExpenseRow() {
    const tbody = document.getElementById('bulkExpenseRows');
    const row = document.createElement('tr');
    row.className = 'bulk-row';
    row.innerHTML = `<td><select class="bulk-input" name="category" required>${EXPENSE_CATEGORIES_OPTIONS}</select></td><td><input type="number" class="bulk-input" name="quantity" step="0.01" min="0.01" value="1" placeholder="1"></td><td><input type="number" class="bulk-input" name="price" step="0.01" min="0" placeholder="0.00"></td><td><input type="number" class="bulk-input bulk-total" name="amount" step="0.01" readonly style="background:#eee;" placeholder="0.00"></td><td><input type="text" class="bulk-input" name="notes" placeholder="ملاحظات"></td><td><button type="button" class="btn btn-icon btn-danger btn-remove-row" title="حذف الصف">✕</button></td>`;
    tbody.appendChild(row);
    const qtyInput = row.querySelector('[name="quantity"]');
    const priceInput = row.querySelector('[name="price"]');
    const amountInput = row.querySelector('[name="amount"]');
    const calcRowTotal = () => { const qty = parseFloat(qtyInput.value) || 0; const price = parseFloat(priceInput.value) || 0; const total = qty * price; amountInput.value = total > 0 ? total.toFixed(2) : ''; updateBulkExpenseSummary(); };
    qtyInput.addEventListener('input', calcRowTotal);
    priceInput.addEventListener('input', calcRowTotal);
    row.querySelector('.btn-remove-row').addEventListener('click', () => { row.remove(); updateBulkExpenseSummary(); });
    updateBulkExpenseSummary();
    row.querySelector('[name="category"]').focus();
}

function updateBulkExpenseSummary() {
    const rows = document.querySelectorAll('#bulkExpenseRows .bulk-row');
    let total = 0;
    rows.forEach(row => { total += parseFloat(row.querySelector('[name="amount"]').value) || 0; });
    document.getElementById('bulkExpenseTotalDisplay').textContent = formatCurrency(total);
    document.getElementById('bulkExpenseCountDisplay').textContent = rows.length;
}

document.getElementById('addBulkExpenseRow')?.addEventListener('click', addBulkExpenseRow);

document.getElementById('bulkExpenseForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const date = document.getElementById('bulkExpenseDate').value;
    const project = document.getElementById('bulkExpenseProject').value.trim();
    const rows = document.querySelectorAll('#bulkExpenseRows .bulk-row');
    if (!project) { showAlert('يرجى إدخال اسم المشروع', 'error'); return; }
    if (rows.length === 0) { showAlert('يرجى إضافة صف واحد على الأقل', 'error'); return; }
    const items = []; let hasError = false;
    rows.forEach((row) => {
        const category = row.querySelector('[name="category"]').value;
        const quantity = parseFloat(row.querySelector('[name="quantity"]').value) || 1;
        const price = parseFloat(row.querySelector('[name="price"]').value) || 0;
        const amount = parseFloat(row.querySelector('[name="amount"]').value);
        const notes = row.querySelector('[name="notes"]').value.trim() || null;
        if (!category || !amount || amount <= 0) { hasError = true; return; }
        items.push({ date, category, project, quantity, price, amount, notes });
    });
    if (hasError || items.length === 0) { showAlert('يرجى ملء جميع الحقول المطلوبة في كل الصفوف', 'error'); return; }
    showLoading(true);
    try {
        const response = await expensesAPI.createBulk(items);
        showAlert(response.message, 'success');
        document.getElementById('bulkExpenseModal').classList.remove('active');
        await loadExpenses(); await loadSummary(); await loadProjects(); await loadProjectNames();
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
});
