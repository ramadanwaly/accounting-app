require('dotenv').config();
const User = require('../models/User');
const { initDatabase } = require('../config/database');

async function resetPassword() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));

    const email = 'ramadan.waly83@gmail.com';
    const newPassword = 'admin123';

    try {
        const user = await User.findByEmail(email);
        if (user) {
            console.log(`Resetting password for: ${email}`);
            await User.updatePassword(user.id, newPassword);
            console.log(`✅ Password has been reset to: ${newPassword}`);
        } else {
            console.log(`❌ User ${email} not found.`);
        }
    } catch (error) {
        console.error('Password reset failed:', error);
    }
}

resetPassword();
