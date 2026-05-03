const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new Database(dbPath);

console.log('Adding is_approved column to users table...');

try {
    db.prepare(`ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 0`).run();
    console.log('Successfully added is_approved column.');
} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log('Column is_approved already exists.');
    } else {
        console.error('Error adding column:', err.message);
        process.exit(1);
    }
}

try {
    // Set existing users to approved (1) so we don't lock them out
    db.prepare(`UPDATE users SET is_approved = 1`).run();
    console.log('Updated existing users to be approved.');
} catch (err) {
    console.error('Error updating existing users:', err.message);
} finally {
    db.close();
}
