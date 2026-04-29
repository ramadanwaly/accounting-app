// ===== تقرير المشاريع =====

async function loadProjects() {
    const container = document.getElementById('projectsContent');
    container.innerHTML = '<p class="loading">جاري تحميل التقرير...</p>';
    try {
        const response = await reportsAPI.getProjects();
        const projects = response.data;
        if (projects.length === 0) { container.innerHTML = '<p style="text-align:center; padding:30px;">لا توجد مشاريع مسجلة</p>'; return; }
        container.innerHTML = projects.map(project => {
            const categoryTotals = {};
            project.expenses.forEach(exp => {
                if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
                categoryTotals[exp.category] += parseFloat(exp.amount);
            });
            const summaryHtml = Object.entries(categoryTotals).map(([category, total]) => `
                <div class="category-summary-item">
                    <span class="category-name">${escapeHtml(category)}</span>
                    <span class="category-total">${formatCurrency(total)}</span>
                </div>
            `).join('');
            return `
            <div class="project-card">
                <div class="project-header" style="cursor: pointer;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button class="btn-toggle" style="pointer-events: none; transform: rotate(-90deg);">▼</button>
                        <div class="project-name">📁 ${escapeHtml(project.name)}</div>
                    </div>
                    <div class="project-total">إجمالي: ${formatCurrency(project.total)}</div>
                </div>
                <div class="project-details">
                    <div class="project-summary-section">
                        <h4>ملخص البنود</h4>
                        <div class="category-summary-grid">${summaryHtml}</div>
                    </div>
                    <div class="table-container">
                        <table><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الملاحظات</th></tr></thead>
                            <tbody>${project.expenses.map(exp => `<tr><td>${formatDate(exp.date)}</td><td>${escapeHtml(exp.category)}</td><td>${formatCurrency(exp.amount)}</td><td>${escapeHtml(exp.notes || '-')}</td></tr>`).join('')}</tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p style="text-align:center; padding:30px; color:var(--danger-color);">خطأ في تحميل التقرير</p>';
        showAlert('فشل في تحميل تقرير المشاريع', 'error');
    }
}

function setupProjectDelegation() {
    document.getElementById('projectsContent')?.addEventListener('click', (e) => {
        const header = e.target.closest('.project-header');
        if (!header) return;
        const card = header.closest('.project-card');
        const details = card.querySelector('.project-details');
        const btn = card.querySelector('.btn-toggle');
        if (details.style.display === 'none' || details.style.display === '') {
            details.style.display = 'block';
            if (btn) btn.style.transform = 'rotate(0deg)';
        } else {
            details.style.display = 'none';
            if (btn) btn.style.transform = 'rotate(-90deg)';
        }
    });
}
