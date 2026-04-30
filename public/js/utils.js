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

// تحويل صيغ التاريخ المتعددة إلى صيغة YYYY-MM-DD
function parseDateInput(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    dateStr = dateStr.trim();
    if (!dateStr) return null;

    // صيغة YYYY-MM-DD (مثال: 2024-12-25)
    let match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
        if (!isNaN(date.getTime())) return dateStr;
    }

    // صيغة DD/MM/YYYY أو DD-MM-YYYY (مثال: 25/12/2024 أو 25-12-2024)
    match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
        const day = String(match[1]).padStart(2, '0');
        const month = String(match[2]).padStart(2, '0');
        const year = match[3];
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) return `${year}-${month}-${day}`;
    }

    return null;
}

/**
 * تبسيط النص العربي لتجاهل الهمزات والاختلافات البسيطة
 */
function normalizeArabic(text) {
    if (!text) return '';
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u0652]/g, ''); // إزالة التشكيل
}

/**
 * تحويل نص البحث إلى تعبير نمطي يتجاهل الهمزات
 */
function createArabicRegex(searchTerm) {
    let pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special chars
    
    // استبدال كل حرف بقاعدته المرنة
    pattern = pattern
        .replace(/[اأإآ]/g, '[اأإآ]')
        .replace(/[هة]/g, '[هة]')
        .replace(/[يى]/g, '[يى]');
        
    return new RegExp(`(${pattern})`, 'gi');
}

// تمييز الكلمات المطابقة في النص
function highlightText(text, searchTerm) {
    if (!text || !searchTerm || searchTerm.length < 2) return escapeHtml(text || '');
    
    const escapedText = escapeHtml(text);
    const regex = createArabicRegex(searchTerm);
    
    return escapedText.replace(regex, '<mark class="search-highlight">$1</mark>');
}
