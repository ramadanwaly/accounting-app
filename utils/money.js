/**
 * أدوات التعامل الآمن مع المبالغ المالية
 * تمنع أخطاء التقريب الناتجة عن استخدام أرقام الفاصلة العائمة (floating-point)
 */

/**
 * تقريب مبلغ مالي لمنزلتين عشريتين بدقة
 * يستخدم Math.round مع ضرب/قسمة على 100 لتجنب أخطاء الـ float
 * @param {number} amount - المبلغ المراد تقريبه
 * @returns {number} المبلغ المقرّب
 */
function roundMoney(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 0;
    return Math.round((parseFloat(amount) + Number.EPSILON) * 100) / 100;
}

/**
 * جمع آمن لعدة مبالغ مالية
 * يتجنب تراكم أخطاء التقريب عند جمع عدد كبير من الأرقام
 * @param {number[]} amounts - مصفوفة المبالغ
 * @returns {number} المجموع المقرّب
 */
function sumMoney(amounts) {
    const total = amounts.reduce((sum, amount) => {
        return sum + (parseFloat(amount) || 0);
    }, 0);
    return roundMoney(total);
}

module.exports = {
    roundMoney,
    sumMoney
};
