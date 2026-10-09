import { createPool } from 'mysql2/promise';
import { DB_CONFIG } from '../config.js';

const pool = createPool({
  host: DB_CONFIG.host,
  user: DB_CONFIG.user,
  port: DB_CONFIG.port,
  password: DB_CONFIG.password,
  database: DB_CONFIG.database,
  waitForConnections: true,
  connectionLimit: DB_CONFIG.connectionLimit,
  queueLimit: 0,
});

pool.getConnection()
  .then((connection) => {
    console.log('Connected to MySQL (pool)');
    connection.release();
  })
  .catch((err) => {
    console.error('Error connecting to MySQL pool:', err);
  });

export default pool;