/**
 * Health check system
 */

import logger from '../logging/logger.mjs';

// Health check status
let isHealthy = true;
const healthChecks = new Map();

/**
 * Register a health check
 */
export function registerHealthCheck(name, checkFn, intervalMs = 30000) {
  const check = {
    name,
    checkFn,
    status: 'unknown',
    lastCheck: null,
    error: null,
  };

  healthChecks.set(name, check);

  // Run initial check
  runHealthCheck(name);

  // Schedule periodic checks
  const interval = setInterval(() => runHealthCheck(name), intervalMs);

  return () => {
    clearInterval(interval);
    healthChecks.delete(name);
  };
}

/**
 * Run a specific health check
 */
async function runHealthCheck(name) {
  const check = healthChecks.get(name);
  if (!check) return;

  try {
    const result = await check.checkFn();
    check.status = result ? 'healthy' : 'unhealthy';
    check.error = null;
    check.lastCheck = new Date().toISOString();

    if (!result) {
      logger.warn(`Health check failed: ${name}`);
      isHealthy = false;
    }
  } catch (error) {
    check.status = 'error';
    check.error = error.message;
    check.lastCheck = new Date().toISOString();
    logger.error(`Health check error: ${name}`, { error: error.message });
    isHealthy = false;
  }
}

/**
 * Get overall health status
 */
export function getHealthStatus() {
  const checks = Array.from(healthChecks.values()).map((check) => ({
    name: check.name,
    status: check.status,
    lastCheck: check.lastCheck,
    error: check.error,
  }));

  const allHealthy = checks.every((check) => check.status === 'healthy');

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  };
}

/**
 * Health check endpoint handler
 */
export function healthCheckHandler(req, res) {
  const health = getHealthStatus();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
}

/**
 * Liveness probe (simple check)
 */
export function livenessHandler(req, res) {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
}

/**
 * Readiness probe (checks if app is ready to serve traffic)
 */
export function readinessHandler(req, res) {
  const ready = isHealthy;
  const statusCode = ready ? 200 : 503;
  res.status(statusCode).json({
    status: ready ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
  });
}
