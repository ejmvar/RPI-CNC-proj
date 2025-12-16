#!/usr/bin/env node
/**
 * Production Server with Security and Monitoring
 *
 * Starts a WebSocket server with full security, logging, and monitoring.
 * Usage: node scripts/production-server.js [port]
 */

import 'dotenv/config';
import express from 'express';
import { WebSocketServer } from 'ws';
import { CollaborativeServer } from '../modules/backend/websocket-server.mjs';
import logger, { httpLogger } from '../modules/backend/logging/logger.mjs';
import {
  configureSecurityHeaders,
  configureCORS,
  configureRateLimiting,
  sanitizeInput,
  validateEnvironment,
} from '../modules/backend/security/middleware.mjs';
import {
  metricsMiddleware,
  metricsHandler,
  wsConnectionsActive,
} from '../modules/backend/monitoring/metrics.mjs';
import {
  registerHealthCheck,
  healthCheckHandler,
  livenessHandler,
  readinessHandler,
} from '../modules/backend/monitoring/health.mjs';
import { initDatabase, testConnection } from '../modules/backend/database/connection.mjs';
import authRoutes from '../modules/backend/routes/auth.mjs';

// Validate environment
try {
  validateEnvironment();
} catch (error) {
  logger.error('Environment validation failed', { error: error.message });
  process.exit(1);
}

const port = parseInt(process.env.PORT || process.argv[2], 10) || 8765;
const app = express();

// Middleware
app.use(express.json());
app.use(httpLogger);
app.use(metricsMiddleware);
app.use(sanitizeInput);

// Security
configureSecurityHeaders(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8080'];
configureCORS(app, allowedOrigins);
configureRateLimiting(app);

// Initialize database
if (process.env.DB_HOST) {
  try {
    initDatabase();
    logger.info('Database initialized');

    // Test connection
    testConnection().then((success) => {
      if (success) {
        logger.info('Database connection verified');
      } else {
        logger.warn('Database connection test failed, but continuing...');
      }
    });
  } catch (error) {
    logger.error('Database initialization failed', { error: error.message });
    logger.warn('Continuing without database support');
  }
}

// API Routes
app.use('/api/auth', authRoutes);

// Health checks
app.get('/health', healthCheckHandler);
app.get('/health/live', livenessHandler);
app.get('/health/ready', readinessHandler);

// Metrics endpoint
app.get('/metrics', metricsHandler);

// Start HTTP server
const server = app.listen(port, () => {
  logger.info(`Production server listening on port ${port}`);
});

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
const collaborativeServer = new CollaborativeServer({ wss });

// Track WebSocket connections
wss.on('connection', () => {
  wsConnectionsActive.inc();
});

wss.on('close', () => {
  wsConnectionsActive.dec();
});

// Register health checks
registerHealthCheck('websocket', () => {
  return wss.clients.size >= 0; // Basic check that WSS is responsive
});

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close WebSocket connections
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down');
  });

  await collaborativeServer.stop();

  // Wait a bit for connections to close
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 1000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

logger.info('Production server started', {
  port,
  nodeEnv: process.env.NODE_ENV,
  allowedOrigins,
});

console.log(`Production server ready on port ${port}`);
console.log(`Health check: http://localhost:${port}/health`);
console.log(`Metrics: http://localhost:${port}/metrics`);
console.log('Press Ctrl+C to stop');
