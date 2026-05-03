const Database = require('better-sqlite3');
const path = require('path');

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address.');
    console.error('Usage: node scripts/approve-user.js <email>');
    process.exit(1);
}

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new Database(dbPath);

try {
    const result = db.prepare(`UPDATE users SET is_approved = 1 WHERE email = ?`).run(email);
    if (result.changes > 0) {
        console.log(`Successfully approved user: ${email}`);
    } else {
        console.log(`User not found: ${email}`);
    }
} catch (err) {
    console.error('Error approving user:', err.message);
    process.exit(1);
} finally {
    db.close();
}
