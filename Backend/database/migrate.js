// Applies database/schema.sql to the database configured in .env.
//   npm run db:migrate
import { readFile } from 'fs/promises';
import { createConnection } from 'mysql2/promise';
import { DB_CONFIG } from '../src/config.js';

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');

const connection = await createConnection({
  host: DB_CONFIG.host,
  user: DB_CONFIG.user,
  port: DB_CONFIG.port,
  password: DB_CONFIG.password,
  database: DB_CONFIG.database,
  multipleStatements: true,
});

const requiredColumns = [
  ['users', 'role', "ENUM('patient', 'staff') NOT NULL DEFAULT 'patient'"],
  ['users', 'password_changed_at', 'TIMESTAMP NULL DEFAULT NULL'],
  ['users', 'theme', "ENUM('light', 'dark') NOT NULL DEFAULT 'light'"],
  ['conversations', 'pinned_at', 'DATETIME NULL DEFAULT NULL'],
  ['conversations', 'archived_at', 'DATETIME NULL DEFAULT NULL'],
];

async function ensureColumn(table, column, definition) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (rows.length === 0) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

try {
  await connection.query(sql);
  for (const [table, column, definition] of requiredColumns) {
    await ensureColumn(table, column, definition);
  }
  console.log('Schema applied.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
