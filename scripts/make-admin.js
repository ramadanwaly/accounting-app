const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address.');
    console.error('Usage: node scripts/make-admin.js <email>');
    process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new sqlite3.Database(dbPath);

db.run(`UPDATE users SET role = 'admin', is_approved = 1 WHERE email = ?`, [email], function (err) {
    if (err) {
        console.error('Error updating user role:', err.message);
        process.exit(1);
    }

    if (this.changes > 0) {
        console.log(`Successfully promoted user to admin: ${email}`);
    } else {
        console.log(`User not found: ${email}`);
    }

    db.close();
});
