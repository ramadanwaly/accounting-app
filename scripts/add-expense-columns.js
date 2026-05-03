const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new Database(dbPath);

function migrate() {
    console.log('🔧 Starting database migration (v2)...');

    try {
        const columns = db.pragma("table_info(expenses)");
        const columnNames = columns.map(c => c.name);

        console.log('Current columns:', columnNames);

        if (!columnNames.includes('quantity')) {
            console.log('Adding "quantity" column...');
            db.prepare("ALTER TABLE expenses ADD COLUMN quantity REAL DEFAULT 1").run();
            console.log('✅ Added "quantity" column.');
        } else {
            console.log('✅ "quantity" column already exists.');
        }

        if (!columnNames.includes('price')) {
            console.log('Adding "price" column...');
            db.prepare("ALTER TABLE expenses ADD COLUMN price REAL DEFAULT 0").run();
            console.log('✅ Added "price" column.');

            console.log('Updating existing prices...');
            db.prepare("UPDATE expenses SET price = amount").run();
            console.log('✅ Updated "price" for existing records.');
        } else {
            console.log('✅ "price" column already exists.');
        }

        console.log('✨ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

migrate();
