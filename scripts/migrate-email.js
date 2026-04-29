const User = require('../models/User');
const { initDatabase } = require('../config/database');

async function migrateEmail() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for connection

    const oldEmail = 'admin@accounting.local';
    const newEmail = 'ramadan.waly83@gmail.com';

    try {
        const oldUser = await User.findByEmail(oldEmail);
        if (oldUser) {
            console.log(`Found user with old email: ${oldEmail}`);
            await User.updateEmail(oldUser.id, newEmail);
            console.log(`Successfully updated email to: ${newEmail}`);
        } else {
            console.log(`User with email ${oldEmail} not found. Checking for new email...`);
            const newUser = await User.findByEmail(newEmail);
            if (newUser) {
                console.log(`User with ${newEmail} already exists.`);
            } else {
                console.log('Neither old nor new user found. Please run init-db script.');
            }
        }
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrateEmail();
