/**
 * Unit tests for Health Check system
 */

import { jest } from '@jest/globals';

// Mock logger before importing health
const mockLogger = {
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

jest.unstable_mockModule('../../../../modules/backend/logging/logger.mjs', () => ({
  default: mockLogger,
}));

// Import health functions
const {
  registerHealthCheck,
  getHealthStatus,
  healthCheckHandler,
  livenessHandler,
  readinessHandler,
} = await import('../../../../modules/backend/monitoring/health.mjs');

describe('Health Check system', () => {
  let cleanups = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    cleanups = [];
  });

  afterEach(() => {
    // Clean up all registered checks
    cleanups.forEach((fn) => fn());
    cleanups = [];
    jest.useRealTimers();
  });

  describe('registerHealthCheck', () => {
    test('registers a health check', async () => {
      const checkFn = jest.fn().mockResolvedValue(true);
      const unregister = registerHealthCheck('test-check', checkFn);
      cleanups.push(unregister);

      expect(typeof unregister).toBe('function');

      // Run timers to execute the check
      await jest.runOnlyPendingTimersAsync();

      expect(checkFn).toHaveBeenCalled();
    });

    test('runs initial check immediately', async () => {
      const checkFn = jest.fn().mockResolvedValue(true);
      const unregister = registerHealthCheck('immediate-check', checkFn);
      cleanups.push(unregister);

      // Should be called without advancing timers
      await Promise.resolve(); // Let async operations complete

      expect(checkFn).toHaveBeenCalledTimes(1);
    });

    test('schedules periodic checks', async () => {
      const checkFn = jest.fn().mockResolvedValue(true);
      const unregister = registerHealthCheck('periodic-check', checkFn, 1000);
      cleanups.push(unregister);

      await Promise.resolve();
      const initialCalls = checkFn.mock.calls.length;
      expect(initialCalls).toBeGreaterThanOrEqual(1);

      // Advance timer by 1 second
      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();

      // Should have been called at least one more time
      expect(checkFn.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    test('unregister function stops checks', async () => {
      const checkFn = jest.fn().mockResolvedValue(true);
      const unregister = registerHealthCheck('stop-check', checkFn, 1000);

      await Promise.resolve();
      expect(checkFn).toHaveBeenCalledTimes(1);

      unregister();

      jest.advanceTimersByTime(1000);
      await jest.runOnlyPendingTimersAsync();

      // Should still be 1, not called again
      expect(checkFn).toHaveBeenCalledTimes(1);
    });

    test('logs warning when check fails', async () => {
      const checkFn = jest.fn().mockResolvedValue(false);
      const unregister = registerHealthCheck('failing-check', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Health check failed'));
    });

    test('logs error when check throws', async () => {
      const error = new Error('Check error');
      const checkFn = jest.fn().mockRejectedValue(error);
      const unregister = registerHealthCheck('error-check', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Health check error'),
        expect.objectContaining({ error: 'Check error' })
      );
    });
  });

  describe('getHealthStatus', () => {
    test('returns healthy status when all checks pass', async () => {
      const checkFn = jest.fn().mockResolvedValue(true);
      const unregister = registerHealthCheck('healthy-check', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      const status = getHealthStatus();

      expect(status.status).toBe('healthy');
      expect(status.timestamp).toBeDefined();
      expect(status.checks.length).toBeGreaterThanOrEqual(1);
      const ourCheck = status.checks.find((c) => c.name === 'healthy-check');
      expect(ourCheck).toBeDefined();
      expect(ourCheck.status).toBe('healthy');
    });

    test('returns unhealthy status when a check fails', async () => {
      const checkFn = jest.fn().mockResolvedValue(false);
      const unregister = registerHealthCheck('unhealthy-check', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      const status = getHealthStatus();

      expect(status.status).toBe('unhealthy');
      const ourCheck = status.checks.find((c) => c.name === 'unhealthy-check');
      expect(ourCheck.status).toBe('unhealthy');
    });

    test('includes error information when check throws', async () => {
      const checkFn = jest.fn().mockRejectedValue(new Error('Connection failed'));
      const unregister = registerHealthCheck('error-check', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      const status = getHealthStatus();

      expect(status.status).toBe('unhealthy');
      const ourCheck = status.checks.find((c) => c.name === 'error-check');
      expect(ourCheck.status).toBe('error');
      expect(ourCheck.error).toBe('Connection failed');
    });
  });

  describe('healthCheckHandler', () => {
    let req, res;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    test('returns 200 when healthy', async () => {
      const checkFn = jest.fn().mockResolvedValue(true);
      const unregister = registerHealthCheck('handler-check', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      healthCheckHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
        })
      );
    });

    test('returns 503 when unhealthy', async () => {
      const checkFn = jest.fn().mockResolvedValue(false);
      const unregister = registerHealthCheck('handler-check-fail', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      healthCheckHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy',
        })
      );
    });
  });

  describe('livenessHandler', () => {
    test('always returns alive status', () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      livenessHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'alive',
        })
      );
    });
  });

  describe('readinessHandler', () => {
    let req, res;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    test('returns ready when healthy', async () => {
      const checkFn = jest.fn().mockResolvedValue(true);
      const unregister = registerHealthCheck('readiness-check', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      readinessHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.stringMatching(/ready/),
        })
      );
    });

    test('returns not ready when unhealthy', async () => {
      const checkFn = jest.fn().mockResolvedValue(false);
      const unregister = registerHealthCheck('readiness-check-fail', checkFn);
      cleanups.push(unregister);

      await jest.runOnlyPendingTimersAsync();

      readinessHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'not ready',
        })
      );
    });
  });
});
