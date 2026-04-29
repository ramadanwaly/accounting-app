require('dotenv').config();
const path = require('path');

console.log('Environment Variables:');
console.log('DB_PATH from .env:', process.env.DB_PATH);

const dbDir = path.join(__dirname, '..', 'database');
let dbPath = process.env.DB_PATH;
if (dbPath && !path.isAbsolute(dbPath)) {
    dbPath = path.join(__dirname, '..', dbPath);
}
dbPath = dbPath || path.join(dbDir, 'accounting.db');

console.log('\nResolved DB Path:', dbPath);
console.log('Absolute path:', path.resolve(dbPath));

// Now check what's in that database
const { get, initDatabase } = require('../config/database');

async function checkDB() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const users = await get('SELECT id, email FROM users');
        console.log('\nUsers in database:', users);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkDB();
