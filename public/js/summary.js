// ===== الملخص المالي والرسوم البيانية =====

let expensesPieChart = null;
let profitLineChart = null;

async function loadSummary() {
    try {
        const response = await reportsAPI.getSummary();
        const { totalRevenues, totalExpenses, netProfit } = response.data;
        document.getElementById('totalRevenues').textContent = formatCurrency(totalRevenues);
        document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
        const netProfitEl = document.getElementById('netProfit');
        netProfitEl.textContent = formatCurrency(netProfit);
        netProfitEl.style.color = parseFloat(netProfit) >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        await Promise.all([renderQuickStats(), renderCharts()]);
    } catch (error) { console.error('Error loading summary:', error); }
}

async function renderQuickStats() {
    try {
        const [categoriesRes, projectsRes, monthlyRes] = await Promise.all([
            reportsAPI.getExpenseCategories(), reportsAPI.getProjects(), reportsAPI.getMonthlyReport()
        ]);
        // أعلى مصدر دخل
        const revResponse = await revenuesAPI.getAll();
        const revenues = revResponse.data || [];
        if (revenues.length > 0) {
            const topSource = revenues.reduce((prev, current) => (prev.amount > current.amount) ? prev : current, {source: '-', amount: 0});
            document.getElementById('topRevenueSource').textContent = topSource.source;
        } else { document.getElementById('topRevenueSource').textContent = 'لا توجد بيانات'; }
        // المشروع الأكثر تكلفة
        const projects = projectsRes.data || [];
        if (projects.length > 0) {
            const topProject = projects.reduce((prev, current) => (parseFloat(prev.total) > parseFloat(current.total)) ? prev : current, {name: '-', total: 0});
            document.getElementById('topExpenseProject').textContent = topProject.name;
        } else { document.getElementById('topExpenseProject').textContent = 'لا توجد مشاريع'; }
        // أداء هذا الشهر
        const monthlyData = monthlyRes.data || [];
        if (monthlyData.length > 0) {
            const currentMonthData = monthlyData[0];
            const status = currentMonthData.netProfit >= 0 ? '📈 رابح' : '📉 خاسر';
            document.getElementById('currentMonthStatus').textContent = `${status} (${formatCurrency(currentMonthData.netProfit)})`;
        } else { document.getElementById('currentMonthStatus').textContent = 'لا توجد بيانات للشهر'; }
    } catch (error) { console.error('Error rendering quick stats:', error); }
}

async function renderCharts() {
    if (typeof Chart === 'undefined') { console.error('CRITICAL: Chart.js library is not loaded!'); return; }
    try {
        const [categoriesRes, monthlyRes] = await Promise.all([reportsAPI.getExpenseCategories(), reportsAPI.getMonthlyReport()]);
        const categories = categoriesRes.data || [];
        const monthlyData = monthlyRes.data || [];
        setTimeout(() => {
            // 1. الرسم البياني الدائري للمصروفات
            const pieCanvas = document.getElementById('expensesPieChart');
            if (pieCanvas) {
                const pieCtx = pieCanvas.getContext('2d');
                if (expensesPieChart) expensesPieChart.destroy();
                expensesPieChart = new Chart(pieCtx, {
                    type: 'doughnut',
                    data: {
                        labels: categories.length > 0 ? categories.map(item => item.category) : ['لا توجد بيانات'],
                        datasets: [{ data: categories.length > 0 ? categories.map(item => item.total) : [1], backgroundColor: categories.length > 0 ? ['#667eea','#764ba2','#27ae60','#e74c3c','#f39c12','#3498db','#9b59b6','#1abc9c','#34495e','#d35400'] : ['#e1e8ed'] }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', rtl: true, labels: { font: { family: 'Dubai', size: 12 } } } } }
                });
            }
            // 2. الرسم البياني الخطي للأرباح
            const lineCanvas = document.getElementById('profitLineChart');
            if (lineCanvas) {
                const lineCtx = lineCanvas.getContext('2d');
                if (profitLineChart) profitLineChart.destroy();
                const sortedMonthly = [...monthlyData].reverse();
                profitLineChart = new Chart(lineCtx, {
                    type: 'line',
                    data: {
                        labels: sortedMonthly.length > 0 ? sortedMonthly.map(item => item.month) : ['لا توجد بيانات'],
                        datasets: [
                            { label: 'الإيرادات', data: sortedMonthly.length > 0 ? sortedMonthly.map(item => item.totalRevenues) : [0], borderColor: '#27ae60', backgroundColor: 'rgba(39, 174, 96, 0.1)', fill: true, tension: 0.4 },
                            { label: 'المصروفات', data: sortedMonthly.length > 0 ? sortedMonthly.map(item => item.totalExpenses) : [0], borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.1)', fill: true, tension: 0.4 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', rtl: true, labels: { font: { family: 'Dubai', size: 12 } } } }, scales: { y: { beginAtZero: true } } }
                });
            }
        }, 200);
    } catch (error) { console.error('Error rendering charts:', error); }
}
