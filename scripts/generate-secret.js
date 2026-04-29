const crypto = require('crypto');

// توليد JWT Secret قوي
function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

console.log('\n🔐 JWT Secret Generator\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nقم بنسخ المفتاح التالي ووضعه في ملف .env:\n');
console.log('JWT_SECRET=' + generateSecret());
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n⚠️  تحذير: لا تشارك هذا المفتاح مع أحد!\n');
