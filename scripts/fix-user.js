require('dotenv').config();
const { run, get, initDatabase } = require('../config/database');
const bcrypt = require('bcrypt');
const { bcryptSaltRounds } = require('../config/auth');

async function fixUser() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));

    const correctEmail = 'ramadan.waly83@gmail.com';
    const correctPassword = 'admin123';

    try {
        // نتحقق الأول في حد بالإيميل ده ولا لأ
        const targetUser = await get('SELECT * FROM users WHERE email = ?', [correctEmail]);

        if (targetUser) {
            console.log('User already exists with correct email.');
            // بس نحدث الباسورد احتياطي
            const hashedPassword = await bcrypt.hash(correctPassword, bcryptSaltRounds);
            await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, targetUser.id]);
            console.log('Password reset successfully.');
        } else {
            // لو مش موجود، نشوف هل فيه أي يوزر تاني (زي test@mail.com) نعدله؟
            const anyUser = await get('SELECT * FROM users LIMIT 1');

            if (anyUser) {
                console.log(`Found existing user: ${anyUser.email}. Updating to correct credentials...`);
                const hashedPassword = await bcrypt.hash(correctPassword, bcryptSaltRounds);
                await run('UPDATE users SET email = ?, password = ? WHERE id = ?', [correctEmail, hashedPassword, anyUser.id]);
                console.log('User updated successfully.');
            } else {
                console.log('No users found. Creating new admin...');
                const hashedPassword = await bcrypt.hash(correctPassword, bcryptSaltRounds);
                await run('INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)', [correctEmail, hashedPassword, 'Admin']);
                console.log('User created successfully.');
            }
        }
    } catch (error) {
        console.error('Fix failed:', error);
    }
}

fixUser();
