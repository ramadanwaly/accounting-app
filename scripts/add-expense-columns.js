const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'database', 'accounting.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function migrate() {
    console.log('🔧 Starting database migration (v2)...');

    try {
        const columns = await all("PRAGMA table_info(expenses)");
        const columnNames = columns.map(c => c.name);

        console.log('Current columns:', columnNames);

        if (!columnNames.includes('quantity')) {
            console.log('Adding "quantity" column...');
            await run("ALTER TABLE expenses ADD COLUMN quantity REAL DEFAULT 1");
            console.log('✅ Added "quantity" column.');
        } else {
            console.log('✅ "quantity" column already exists.');
        }

        if (!columnNames.includes('price')) {
            console.log('Adding "price" column...');
            await run("ALTER TABLE expenses ADD COLUMN price REAL DEFAULT 0");
            console.log('✅ Added "price" column.');

            console.log('Updating existing prices...');
            await run("UPDATE expenses SET price = amount");
            console.log('✅ Updated "price" for existing records.');
        } else {
            console.log('✅ "price" column already exists.');
        }

        console.log('✨ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate()
    .then(() => {
        db.close();
        process.exit(0);
    });
