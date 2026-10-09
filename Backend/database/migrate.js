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

try {
  await connection.query(sql);
  console.log('Schema applied.');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await connection.end();
}
