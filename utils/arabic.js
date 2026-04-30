/**
 * أدوات معالجة اللغة العربية
 */

/**
 * تبسيط النص العربي لتجاهل الهمزات والاختلافات البسيطة
 * @param {string} text 
 * @returns {string}
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
 * توليد تعبير SQL لتطبيع عمود في SQLite
 * @param {string} column 
 * @returns {string}
 */
function getSqlNormalize(column) {
    // SQLite REPLACE(REPLACE(REPLACE(...)))
    // استبدال أ، إ، آ بـ ا
    // استبدال ة بـ ه
    // استبدال ى بـ ي
    return `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${column}, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ة', 'ه'), 'ى', 'ي')`;
}

module.exports = {
    normalizeArabic,
    getSqlNormalize
};
