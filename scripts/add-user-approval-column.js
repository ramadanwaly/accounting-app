const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new sqlite3.Database(dbPath);

console.log('Adding is_approved column to users table...');

db.run(`ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 0`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('Column is_approved already exists.');
        } else {
            console.error('Error adding column:', err.message);
            process.exit(1);
        }
    } else {
        console.log('Successfully added is_approved column.');
    }

    // Set existing users to approved (1) so we don't lock them out
    db.run(`UPDATE users SET is_approved = 1`, (err) => {
        if (err) {
            console.error('Error updating existing users:', err.message);
        } else {
            console.log('Updated existing users to be approved.');
        }
        db.close();
    });
});
