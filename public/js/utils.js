// ===== دوال مساعدة مشتركة =====

function showAlert(message, type = 'info', elementId = 'appAlert') {
    const alert = document.getElementById(elementId);
    alert.className = `alert ${type} show`;
    alert.textContent = message;

    setTimeout(() => {
        alert.classList.remove('show');
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatCurrency(amount) {
    return parseFloat(amount).toLocaleString('ar-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
