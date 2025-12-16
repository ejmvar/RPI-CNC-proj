#!/usr/bin/env node
/**
 * Database migration runner
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, query, closeDatabase } from '../connection.mjs';
import logger from '../../logging/logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create migrations table
 */
async function createMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

/**
 * Get executed migrations
 */
async function getExecutedMigrations() {
  const result = await query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map((row) => row.name);
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(name) {
  await query('INSERT INTO migrations (name) VALUES ($1)', [name]);
}

/**
 * Run migrations
 */
async function runMigrations() {
  try {
    // Initialize database
    initDatabase();
    logger.info('Running database migrations...');

    // Create migrations table
    await createMigrationsTable();

    // Get executed migrations
    const executed = await getExecutedMigrations();
    logger.info(`Found ${executed.length} executed migrations`);

    // Get migration files
    const migrationsDir = path.join(__dirname);
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter((f) => f.endsWith('.sql') && f !== 'schema.sql').sort();

    logger.info(`Found ${migrationFiles.length} migration files`);

    // Run pending migrations
    let executedCount = 0;
    for (const file of migrationFiles) {
      if (executed.includes(file)) {
        logger.info(`Skipping already executed migration: ${file}`);
        continue;
      }

      logger.info(`Executing migration: ${file}`);
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf-8');

      try {
        await query(sql);
        await markMigrationExecuted(file);
        executedCount++;
        logger.info(`✓ Migration executed: ${file}`);
      } catch (error) {
        logger.error(`✗ Migration failed: ${file}`, { error: error.message });
        throw error;
      }
    }

    logger.info(`Migrations complete. Executed ${executedCount} new migrations.`);
  } catch (error) {
    logger.error('Migration error', { error: error.message });
    throw error;
  } finally {
    await closeDatabase();
  }
}

/**
 * Initialize database with schema
 */
async function initSchema() {
  try {
    initDatabase();
    logger.info('Initializing database schema...');

    const schemaPath = path.join(path.dirname(__dirname), 'schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf-8');

    await query(sql);
    logger.info('✓ Schema initialized successfully');
  } catch (error) {
    logger.error('Schema initialization failed', { error: error.message });
    throw error;
  } finally {
    await closeDatabase();
  }
}

// CLI
const command = process.argv[2];

if (command === 'init') {
  initSchema().catch((err) => {
    console.error('Failed to initialize schema:', err.message);
    process.exit(1);
  });
} else if (command === 'migrate') {
  runMigrations().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
} else {
  console.log(`
Database Migration Tool

Usage:
  node migrate.mjs init      - Initialize database with schema
  node migrate.mjs migrate   - Run pending migrations

Environment Variables:
  DB_HOST     - Database host (default: localhost)
  DB_PORT     - Database port (default: 5432)
  DB_NAME     - Database name (default: cnc_simulator)
  DB_USER     - Database user (default: postgres)
  DB_PASSWORD - Database password
  `);
  process.exit(0);
}
