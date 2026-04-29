const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new sqlite3.Database(dbPath);

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

db.exec(createTableSQL, (err) => {
    if (err) {
        console.error('Error creating deletion_requests table:', err.message);
    } else {
        console.log('✅ deletion_requests table created successfully.');
    }
    db.close();
});
