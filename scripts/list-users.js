const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new Database(dbPath);

try {
    const rows = db.prepare(`SELECT id, email, full_name, role, is_approved, created_at FROM users ORDER BY created_at DESC`).all();

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
} catch (err) {
    console.error('Error fetching users:', err.message);
    process.exit(1);
} finally {
    db.close();
}
