const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new Database(dbPath);

const createTableSQL = `
CREATE TABLE IF NOT EXISTS deletion_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    resource_type TEXT NOT NULL, -- 'revenue', 'expense', 'all_revenues', 'all_expenses'
    resource_id INTEGER, -- NULL if deleting all
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_token ON deletion_requests(admin_token);
`;

try {
    db.exec(createTableSQL);
    console.log('✅ deletion_requests table created successfully.');
} catch (err) {
    console.error('Error creating deletion_requests table:', err.message);
} finally {
    db.close();
}
