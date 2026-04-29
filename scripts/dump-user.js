require('dotenv').config();
const { get, initDatabase } = require('../config/database');

async function dumpUser() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const user = await get('SELECT * FROM users');
        console.log('User Record:', user);
    } catch (error) {
        console.error('Error:', error);
    }
}

dumpUser();
