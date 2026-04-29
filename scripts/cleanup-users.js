require('dotenv').config();
const { run, get, initDatabase } = require('../config/database');

async function cleanup() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        // حذف اليوزر القديم
        const result = await run('DELETE FROM users WHERE email = ?', ['test@mail.com']);
        console.log('Deleted old user:', result.changes, 'rows');

        // التأكد من اليوزر الصح موجود
        const user = await get('SELECT * FROM users WHERE email = ?', ['ramadan.waly83@gmail.com']);
        if (user) {
            console.log('✅ Correct user exists:', user.email);
        } else {
            console.log('❌ Correct user not found!');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

cleanup();
