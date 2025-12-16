/**
 * Database connection pool management
 */

import pg from 'pg';
import logger from '../logging/logger.mjs';

const { Pool } = pg;

let pool = null;

/**
 * Initialize database connection pool
 */
export function initDatabase(config = {}) {
  const dbConfig = {
    host: config.host || process.env.DB_HOST || 'localhost',
    port: config.port || process.env.DB_PORT || 5432,
    database: config.database || process.env.DB_NAME || 'cnc_simulator',
    user: config.user || process.env.DB_USER || 'postgres',
    password: config.password || process.env.DB_PASSWORD || '',
    max: config.max || parseInt(process.env.DB_POOL_MAX, 10) || 20,
    idleTimeoutMillis: config.idleTimeoutMillis || 30000,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
  };

  pool = new Pool(dbConfig);

  // Log connection events
  pool.on('connect', () => {
    logger.debug('New database connection established');
  });

  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', { error: err.message });
  });

  logger.info('Database connection pool initialized', {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    maxConnections: dbConfig.max,
  });

  return pool;
}

/**
 * Get database connection pool
 */
export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

/**
 * Execute a query
 */
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed', { duration: `${duration}ms`, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', { error: error.message, query: text });
    throw error;
  }
}

/**
 * Execute a transaction
 */
export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction error', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as now');
    logger.info('Database connection test successful', { time: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error: error.message });
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

export default {
  initDatabase,
  getPool,
  query,
  transaction,
  testConnection,
  closeDatabase,
};
