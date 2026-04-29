const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding role column to users table...');

db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column role already exists.');
        } else {
            console.error('Error adding column:', err.message);
            process.exit(1);
        }
    } else {
        console.log('Successfully added role column.');
    }

    // Set all existing users to 'user' role
    db.run(`UPDATE users SET role = 'user' WHERE role IS NULL`, (err) => {
        if (err) console.error("Error setting default roles", err);
        else console.log("Set default role for existing users");
        db.close();
    });
});
