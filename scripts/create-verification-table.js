const { run, initDatabase } = require('../config/database');

async function migrate() {
    initDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Running migration: Create verification_codes table');

    try {
        await run(`
            CREATE TABLE IF NOT EXISTS verification_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                action_type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);
        console.log('Migration successful');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
