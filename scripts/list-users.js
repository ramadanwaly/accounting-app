const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new sqlite3.Database(dbPath);

db.all(`SELECT id, email, full_name, role, is_approved, created_at FROM users ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
        console.error('Error fetching users:', err.message);
        process.exit(1);
    }

    console.log('\n=== All Users ===\n');
    rows.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.full_name || 'N/A'}`);
        console.log(`Role: ${user.role}`);
        console.log(`Approved: ${user.is_approved ? 'Yes' : 'No'}`);
        console.log(`Created: ${user.created_at}`);
        console.log('---');
    });

    db.close();
});
