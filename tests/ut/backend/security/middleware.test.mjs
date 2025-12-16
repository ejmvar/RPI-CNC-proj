/**
 * Unit tests for Security middleware
 */

import { jest } from '@jest/globals';

// Import middleware functions
import {
  sanitizeInput,
  validateEnvironment,
} from '../../../../modules/backend/security/middleware.mjs';

describe('Security middleware', () => {
  describe('sanitizeInput', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        query: {},
        body: {},
      };
      res = {};
      next = jest.fn();
    });

    test('trims string values in query parameters', () => {
      req.query = {
        search: '  test query  ',
        filter: 'normal',
      };

      sanitizeInput(req, res, next);

      expect(req.query.search).toBe('test query');
      expect(req.query.filter).toBe('normal');
      expect(next).toHaveBeenCalled();
    });

    test('trims string values in request body', () => {
      req.body = {
        username: '  testuser  ',
        password: 'password123  ',
        age: 25, // Not a string, should not be modified
      };

      sanitizeInput(req, res, next);

      expect(req.body.username).toBe('testuser');
      expect(req.body.password).toBe('password123');
      expect(req.body.age).toBe(25);
      expect(next).toHaveBeenCalled();
    });

    test('handles empty query and body', () => {
      req.query = {};
      req.body = {};

      sanitizeInput(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('handles missing query and body', () => {
      delete req.query;
      delete req.body;

      expect(() => sanitizeInput(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });

    test('preserves non-string values', () => {
      req.body = {
        count: 42,
        isActive: true,
        tags: ['tag1', 'tag2'],
        metadata: { key: 'value' },
      };

      sanitizeInput(req, res, next);

      expect(req.body.count).toBe(42);
      expect(req.body.isActive).toBe(true);
      expect(req.body.tags).toEqual(['tag1', 'tag2']);
      expect(req.body.metadata).toEqual({ key: 'value' });
    });

    test('handles nested strings in arrays', () => {
      req.body = {
        tags: ['  tag1  ', 'tag2  ', '  tag3'],
      };

      sanitizeInput(req, res, next);

      // Arrays are not trimmed by default in this implementation
      expect(req.body.tags).toEqual(['  tag1  ', 'tag2  ', '  tag3']);
    });
  });

  describe('validateEnvironment', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('passes with all required variables', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '3000';

      expect(() => validateEnvironment()).not.toThrow();
    });

    test('throws error when NODE_ENV is missing', () => {
      delete process.env.NODE_ENV;
      process.env.PORT = '3000';

      expect(() => validateEnvironment()).toThrow(
        'Missing required environment variables: NODE_ENV'
      );
    });

    test('throws error when PORT is missing', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.PORT;

      expect(() => validateEnvironment()).toThrow('Missing required environment variables: PORT');
    });

    test('throws error when multiple variables are missing', () => {
      delete process.env.NODE_ENV;
      delete process.env.PORT;

      expect(() => validateEnvironment()).toThrow(
        'Missing required environment variables: NODE_ENV, PORT'
      );
    });

    test('throws error for invalid PORT (not a number)', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = 'not-a-number';

      expect(() => validateEnvironment()).toThrow(
        'PORT must be a valid number between 1 and 65535'
      );
    });

    test('throws error for PORT below range', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '0';

      expect(() => validateEnvironment()).toThrow(
        'PORT must be a valid number between 1 and 65535'
      );
    });

    test('throws error for PORT above range', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '65536';

      expect(() => validateEnvironment()).toThrow(
        'PORT must be a valid number between 1 and 65535'
      );
    });

    test('accepts PORT at minimum valid value', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '1';

      expect(() => validateEnvironment()).not.toThrow();
    });

    test('accepts PORT at maximum valid value', () => {
      process.env.NODE_ENV = 'test';
      process.env.PORT = '65535';

      expect(() => validateEnvironment()).not.toThrow();
    });
  });
});
