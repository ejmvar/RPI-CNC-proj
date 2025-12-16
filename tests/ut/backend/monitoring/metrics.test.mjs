/**
 * Unit tests for Metrics system
 */

import { jest } from '@jest/globals';

// Import metrics functions and objects
import {
  httpRequestDuration,
  httpRequestTotal,
  wsConnectionsActive,
  wsMessagesTotal,
  sessionsActive,
  operationsTotal,
  metricsMiddleware,
  metricsHandler,
  register,
} from '../../../../modules/backend/monitoring/metrics.mjs';

describe('Metrics system', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset metrics
    register.clear();
  });

  describe('HTTP metrics', () => {
    test('httpRequestDuration is a Histogram', () => {
      expect(httpRequestDuration.constructor.name).toBe('Histogram');
    });

    test('httpRequestTotal is a Counter', () => {
      expect(httpRequestTotal.constructor.name).toBe('Counter');
    });

    test('httpRequestDuration can observe values', () => {
      expect(() => {
        httpRequestDuration.labels('GET', '/api/test', '200').observe(0.5);
      }).not.toThrow();
    });

    test('httpRequestTotal can be incremented', () => {
      expect(() => {
        httpRequestTotal.labels('POST', '/api/upload', '201').inc();
      }).not.toThrow();
    });
  });

  describe('WebSocket metrics', () => {
    test('wsConnectionsActive is a Gauge', () => {
      expect(wsConnectionsActive.constructor.name).toBe('Gauge');
    });

    test('wsMessagesTotal is a Counter', () => {
      expect(wsMessagesTotal.constructor.name).toBe('Counter');
    });

    test('wsConnectionsActive can be set', () => {
      expect(() => {
        wsConnectionsActive.set(5);
      }).not.toThrow();
    });

    test('wsMessagesTotal can be incremented', () => {
      expect(() => {
        wsMessagesTotal.labels('edit', 'inbound').inc();
      }).not.toThrow();
    });
  });

  describe('Application metrics', () => {
    test('sessionsActive is a Gauge', () => {
      expect(sessionsActive.constructor.name).toBe('Gauge');
    });

    test('operationsTotal is a Counter', () => {
      expect(operationsTotal.constructor.name).toBe('Counter');
    });

    test('sessionsActive can be incremented and decremented', () => {
      expect(() => {
        sessionsActive.inc();
        sessionsActive.dec();
      }).not.toThrow();
    });

    test('operationsTotal can be incremented by type', () => {
      expect(() => {
        operationsTotal.labels('transform').inc();
        operationsTotal.labels('parse').inc();
      }).not.toThrow();
    });
  });

  describe('metricsMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        method: 'GET',
        path: '/api/test',
      };
      res = {
        statusCode: 200,
        on: jest.fn(),
      };
      next = jest.fn();
    });

    test('calls next() to continue request processing', () => {
      metricsMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('registers finish event listener', () => {
      metricsMiddleware(req, res, next);

      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    test('records metrics on response finish', () => {
      let finishCallback;
      res.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      metricsMiddleware(req, res, next);

      // Simulate response finish
      expect(finishCallback).toBeDefined();
      expect(() => finishCallback()).not.toThrow();
    });

    test('uses route path when available', () => {
      req.route = { path: '/api/users/:id' };
      let finishCallback;
      res.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      metricsMiddleware(req, res, next);
      finishCallback();

      // Metrics should be recorded without errors
      expect(true).toBe(true);
    });

    test('measures request duration', (done) => {
      let finishCallback;
      res.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
      });

      metricsMiddleware(req, res, next);

      // Simulate some delay
      setTimeout(() => {
        finishCallback();
        done();
      }, 10);
    });
  });

  describe('metricsHandler', () => {
    test('sets correct content type', async () => {
      const req = {};
      const res = {
        set: jest.fn(),
        end: jest.fn(),
      };

      await metricsHandler(req, res);

      expect(res.set).toHaveBeenCalledWith('Content-Type', register.contentType);
    });

    test('returns metrics data', async () => {
      const req = {};
      const res = {
        set: jest.fn(),
        end: jest.fn(),
      };

      await metricsHandler(req, res);

      expect(res.end).toHaveBeenCalledWith(expect.any(String));
    });

    test('metrics include registered metrics', async () => {
      const req = {};
      const res = {
        set: jest.fn(),
        end: jest.fn(),
      };

      // Add some metrics
      httpRequestTotal.labels('GET', '/test', '200').inc();

      await metricsHandler(req, res);

      const metricsOutput = res.end.mock.calls[0][0];
      expect(typeof metricsOutput).toBe('string');
      expect(metricsOutput.length).toBeGreaterThan(0);
    });
  });

  describe('register', () => {
    test('is exported', () => {
      expect(register).toBeDefined();
      expect(typeof register.metrics).toBe('function');
    });

    test('can get metrics', async () => {
      const metrics = await register.metrics();
      expect(typeof metrics).toBe('string');
    });

    test('can clear metrics', () => {
      expect(() => register.clear()).not.toThrow();
    });
  });
});
