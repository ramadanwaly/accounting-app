require('dotenv').config();
const { get, initDatabase } = require('../config/database');
const bcrypt = require('bcrypt');

async function verifyHash() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const user = await get('SELECT * FROM users WHERE email = ?', ['ramadan.waly83@gmail.com']);

        if (!user) {
            console.log('❌ User not found');
            return;
        }

        console.log('User:', user.email);
        console.log('Hash in DB:', user.password);

        // Test with admin123
        const testPassword = 'admin123';
        const result = await bcrypt.compare(testPassword, user.password);

        console.log(`\nTesting password: "${testPassword}"`);
        console.log('Match result:', result);

        if (!result) {
            console.log('\n❌ Password does NOT match!');
            console.log('Generating new hash for admin123...');
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log('New hash:', newHash);
        } else {
            console.log('\n✅ Password matches!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

verifyHash();
