const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new Database(dbPath);

console.log('Adding role column to users table...');

try {
    db.prepare(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`).run();
    console.log('Successfully added role column.');
} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log('Column role already exists.');
    } else {
        console.error('Error adding column:', err.message);
        process.exit(1);
    }
}

try {
    // Set all existing users to 'user' role
    db.prepare(`UPDATE users SET role = 'user' WHERE role IS NULL`).run();
    console.log("Set default role for existing users");
} catch (err) {
    console.error("Error setting default roles", err);
} finally {
    db.close();
}
