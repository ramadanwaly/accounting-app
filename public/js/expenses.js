// ===== إدارة المصروفات =====

let currentExpenseSearch = {};

function buildProtectedReceiptUrl(path, thumbnail = false) {
    if (!path) return '';
    const token = localStorage.getItem('authToken');
    if (!token) return '';

    const filename = path.split('/').pop();
    const endpoint = thumbnail
        ? `/api/expenses/receipts/thumbnails/${encodeURIComponent(filename)}`
        : `/api/expenses/receipts/original/${encodeURIComponent(filename)}`;

    return `${endpoint}?token=${encodeURIComponent(token)}`;
}

async function loadExpenses() {
    const container = document.getElementById('expensesContent');
    container.innerHTML = '<p class="loading">جاري التحميل...</p>';
    try {
        const response = await expensesAPI.getAll(currentExpenseSearch);
        const expenses = response.data;
        const totalCount = response.pagination ? response.pagination.total : expenses.length;
        updateSearchResultsInfo('expenseResultsInfo', totalCount, currentExpenseSearch.search);

        if (expenses.length === 0) { container.innerHTML = '<p style="text-align:center; padding:30px;">لا توجد مصروفات مسجلة</p>'; return; }
        const monthlyGroups = groupExpensesByMonth(expenses);
        const searchTerm = currentExpenseSearch.search || '';
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
                            <tbody>${group.expenses.map(exp => `<tr>
                                <td>${formatDate(exp.date)}</td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        ${exp.receipts && exp.receipts.length > 0 ? exp.receipts.map(r => `
                                            <img src="${buildProtectedReceiptUrl(r.thumbnail_path, true)}" 
                                                 class="receipt-thumb" 
                                                 data-path="${buildProtectedReceiptUrl(r.file_path, false)}"
                                                 alt="إيصال"
                                                 style="width:30px; height:30px; object-fit:cover; border-radius:4px; cursor:pointer; border:1px solid #ddd;">
                                        `).join('') : ''}
                                        <span>${highlightText(exp.category, searchTerm)}</span>
                                    </div>
                                </td>
                                <td>${exp.quantity || 1}</td>
                                <td>${formatCurrency(exp.price || exp.amount)}</td>
                                <td>${formatCurrency(exp.amount)}</td>
                                <td>${highlightText(exp.notes || '-', searchTerm)}</td>
                                <td>${escapeHtml(exp.project)}</td>
                                <td>
                                    <button class="btn btn-icon edit-btn" data-id="${exp.id}" title="تعديل">✏️</button>
                                    <button class="btn btn-icon btn-danger delete-btn" data-id="${exp.id}" title="حذف">🗑️</button>
                                </td>
                            </tr>`).join('')}</tbody>
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

function setupExpenseSearch() {
    const searchBtn = document.getElementById('expenseSearchBtn');
    const clearBtn = document.getElementById('expenseClearBtn');
    const keywordInput = document.getElementById('expenseSearchKeyword');
    const startDateInput = document.getElementById('expenseSearchStartDate');
    const endDateInput = document.getElementById('expenseSearchEndDate');

    if (searchBtn) {
        searchBtn.addEventListener('click', performExpenseSearch);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearExpenseSearch);
    }

    if (keywordInput) {
        keywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performExpenseSearch();
        });
    }
}

async function performExpenseSearch() {
    const keyword = document.getElementById('expenseSearchKeyword')?.value.trim() || '';
    const startDateStr = document.getElementById('expenseSearchStartDate')?.value.trim() || '';
    const endDateStr = document.getElementById('expenseSearchEndDate')?.value.trim() || '';

    if (keyword && keyword.length < 2) {
        showAlert('كلمة البحث يجب أن تكون حرفين على الأقل', 'error');
        return;
    }

    const searchParams = {};
    if (keyword) searchParams.search = keyword;

    if (startDateStr) {
        const parsedStart = parseDateInput(startDateStr);
        if (!parsedStart) {
            showAlert('تنسيق تاريخ البداية غير صحيح. استخدم YYYY-MM-DD أو DD/MM/YYYY', 'error');
            return;
        }
        searchParams.startDate = parsedStart;
    }

    if (endDateStr) {
        const parsedEnd = parseDateInput(endDateStr);
        if (!parsedEnd) {
            showAlert('تنسيق تاريخ النهاية غير صحيح. استخدم YYYY-MM-DD أو DD/MM/YYYY', 'error');
            return;
        }
        searchParams.endDate = parsedEnd;
    }

    currentExpenseSearch = searchParams;
    await loadExpenses();
}

async function clearExpenseSearch() {
    document.getElementById('expenseSearchKeyword').value = '';
    document.getElementById('expenseSearchStartDate').value = '';
    document.getElementById('expenseSearchEndDate').value = '';
    currentExpenseSearch = {};
    document.getElementById('expenseResultsInfo')?.classList.remove('active');
    await loadExpenses();
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
    
    // إخفاء حاوية الإيصالات الحالية مبدئياً
    document.getElementById('existingReceiptsContainer').style.display = 'none';
    document.getElementById('existingReceiptsList').innerHTML = '';

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

            // عرض الإيصالات الحالية
            if (expense.receipts && expense.receipts.length > 0) {
                showExistingReceipts(expense.receipts);
            }
        }
    } catch (error) { showAlert('فشل في تحميل بيانات المصروف', 'error'); closeExpenseModal(); }
}

function showExistingReceipts(receipts) {
    const container = document.getElementById('existingReceiptsContainer');
    const list = document.getElementById('existingReceiptsList');
    
    container.style.display = 'block';
    list.innerHTML = receipts.map(rec => `
        <div class="receipt-preview-item" id="receipt-item-${rec.id}">
            <img src="${buildProtectedReceiptUrl(rec.thumbnail_path, true)}" alt="${rec.original_name}" onclick="showReceiptModal('${buildProtectedReceiptUrl(rec.file_path, false)}')">
            <button type="button" class="btn-delete-receipt" onclick="handleDeleteReceipt(${currentEditId}, ${rec.id})" title="حذف الإيصال">✕</button>
        </div>
    `).join('');
}

async function handleDeleteReceipt(expenseId, receiptId) {
    if (!confirm('هل أنت متأكد من حذف هذا الإيصال؟')) return;
    
    try {
        await expensesAPI.deleteReceipt(expenseId, receiptId);
        const item = document.getElementById(`receipt-item-${receiptId}`);
        if (item) item.remove();
        
        // إذا حذفت كل الإيصالات، أخفِ الحاوية
        const list = document.getElementById('existingReceiptsList');
        if (list.children.length === 0) {
            document.getElementById('existingReceiptsContainer').style.display = 'none';
        }
        
        showAlert('تم حذف الإيصال بنجاح', 'success');
        // تحديث القائمة الرئيسية في الخلفية
        loadExpenses();
    } catch (error) {
        showAlert('فشل في حذف الإيصال: ' + error.message, 'error');
    }
}

function closeExpenseModal() { document.getElementById('expenseModal').classList.remove('active'); currentEditId = null; currentEditType = null; }

document.getElementById('expenseForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('date', document.getElementById('expenseDate').value);
    formData.append('category', document.getElementById('expenseCategory').value);
    formData.append('project', document.getElementById('expenseProject').value);
    formData.append('quantity', document.getElementById('expenseQuantity').value);
    formData.append('price', document.getElementById('expensePrice').value);
    formData.append('amount', document.getElementById('expenseAmount').value);
    formData.append('notes', document.getElementById('expenseNotes').value || '');
    
    const keepExisting = document.getElementById('keepExistingReceipts').checked;
    formData.append('keepExistingReceipts', keepExisting);

    const receiptFiles = document.getElementById('expenseReceipt').files;
    for (let i = 0; i < receiptFiles.length; i++) {
        formData.append('receipts', receiptFiles[i]);
    }

    showLoading(true);
    try {
        if (currentEditId) { 
            await expensesAPI.update(currentEditId, formData); 
            showAlert('تم تحديث المصروف بنجاح', 'success'); 
        }
        else { 
            await expensesAPI.create(formData); 
            showAlert('تم إضافة المصروف بنجاح', 'success'); 
        }
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

function showReceiptModal(path) {
    const modal = document.getElementById('receiptModal');
    const img = document.getElementById('fullReceiptImage');
    const downloadBtn = document.getElementById('downloadReceiptBtn');
    
    img.src = path;
    if (downloadBtn) {
        downloadBtn.href = path;
    }
    
    modal.classList.add('active');
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
    row.innerHTML = `<td><select class="bulk-input" name="category" required>${EXPENSE_CATEGORIES_OPTIONS}</select></td><td><input type="number" class="bulk-input" name="quantity" step="0.01" min="0.01" value="1" placeholder="1"></td><td><input type="number" class="bulk-input" name="price" step="0.01" min="0" placeholder="0.00"></td><td><input type="number" class="bulk-input bulk-total" name="amount" step="0.01" readonly style="background:#eee;" placeholder="0.00"></td><td><input type="text" class="bulk-input" name="notes" placeholder="ملاحظات"></td><td><input type="file" class="bulk-input" name="receipt" accept="image/jpeg,image/png" style="width:100px; font-size:10px;"></td><td><button type="button" class="btn btn-icon btn-danger btn-remove-row" title="حذف الصف">✕</button></td>`;
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
    
    const formData = new FormData();
    let itemsCount = 0;
    
    rows.forEach((row) => {
        const category = row.querySelector('[name="category"]').value;
        const quantity = parseFloat(row.querySelector('[name="quantity"]').value) || 1;
        const price = parseFloat(row.querySelector('[name="price"]').value) || 0;
        const amount = parseFloat(row.querySelector('[name="amount"]').value);
        const notes = row.querySelector('[name="notes"]').value.trim() || '';
        const receipt = row.querySelector('[name="receipt"]').files[0];

        if (!category || !amount || amount <= 0) return;

        formData.append(`items[${itemsCount}][date]`, date);
        formData.append(`items[${itemsCount}][category]`, category);
        formData.append(`items[${itemsCount}][project]`, project);
        formData.append(`items[${itemsCount}][quantity]`, quantity);
        formData.append(`items[${itemsCount}][price]`, price);
        formData.append(`items[${itemsCount}][amount]`, amount);
        formData.append(`items[${itemsCount}][notes]`, notes);
        
        if (receipt) {
            formData.append(`receipt_${itemsCount}`, receipt);
        }
        itemsCount++;
    });

    if (itemsCount === 0) { showAlert('يرجى ملء جميع الحقول المطلوبة في كل الصفوف', 'error'); return; }
    
    showLoading(true);
    try {
        const response = await expensesAPI.createBulk(formData);
        showAlert(response.message, 'success');
        document.getElementById('bulkExpenseModal').classList.remove('active');
        await loadExpenses(); await loadSummary(); await loadProjects(); await loadProjectNames();
    } catch (error) { showAlert(error.message, 'error'); } finally { showLoading(false); }
});
