require('dotenv').config();
const { get, initDatabase } = require('../config/database');
const bcrypt = require('bcrypt');

async function testLogin() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));

    const testEmail = 'ramadan.waly83@gmail.com';
    const testPassword = 'admin123';

    try {
        const user = await get('SELECT * FROM users WHERE email = ?', [testEmail]);

        if (!user) {
            console.log('❌ User not found with email:', testEmail);
            return;
        }

        console.log('✅ User found:', user.email);
        console.log('Password hash in DB:', user.password);

        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log('Password verification result:', isValid);

        if (isValid) {
            console.log('✅ Password is correct!');
        } else {
            console.log('❌ Password is incorrect!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testLogin();
