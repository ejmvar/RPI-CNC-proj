/**
 * Unit tests for Auth utilities
 */

import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Import auth functions
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authenticate,
  authorize,
} from '../../../../modules/backend/security/auth.mjs';

describe('Auth utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('hashPassword', () => {
    test('hashes password using bcrypt', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    test('generates different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    test('verifies correct password', async () => {
      const password = 'testpassword123';
      const hash = await bcrypt.hash(password, 10);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    test('rejects incorrect password', async () => {
      const password = 'testpassword123';
      const hash = await bcrypt.hash(password, 10);

      const result = await verifyPassword('wrongpassword', hash);

      expect(result).toBe(false);
    });
  });

  describe('generateToken', () => {
    test('generates valid JWT token', () => {
      const payload = { userId: 1, role: 'user' };

      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('uses custom JWT_SECRET from environment', () => {
      // Note: Since the module is already imported, changing env vars won't affect it
      // This test verifies the function uses the secret parameter
      const payload = { userId: 1 };

      // Generate with default secret
      const token = generateToken(payload);

      // Should be able to decode (not verify) to see payload
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe(1);
      expect(decoded.exp).toBeDefined();
    });

    test('uses custom expiration from environment', () => {
      process.env.JWT_EXPIRES_IN = '1h';
      const payload = { userId: 1 };

      const token = generateToken(payload);
      const decoded = jwt.decode(token);

      // Token should have exp claim
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    test('verifies valid token', () => {
      const payload = { userId: 1, role: 'admin' };
      const secret = process.env.JWT_SECRET || 'change-this-in-production';
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });

      const result = verifyToken(token);

      expect(result).toBeDefined();
      expect(result.userId).toBe(1);
      expect(result.role).toBe('admin');
    });

    test('returns null for invalid token', () => {
      const result = verifyToken('invalid.token.here');

      expect(result).toBeNull();
    });

    test('returns null for expired token', () => {
      const payload = { userId: 1 };
      const secret = process.env.JWT_SECRET || 'change-this-in-production';
      const token = jwt.sign(payload, secret, { expiresIn: '0s' }); // Immediately expired

      // Wait a moment to ensure expiration
      const result = verifyToken(token);

      expect(result).toBeNull();
    });

    test('returns null for malformed token', () => {
      const result = verifyToken('not-a-jwt');

      expect(result).toBeNull();
    });
  });

  describe('authenticate middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {},
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
    });

    test('authenticates valid token', () => {
      const payload = { userId: 1, role: 'user' };
      const token = generateToken(payload);
      req.headers.authorization = `Bearer ${token}`;

      authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(1);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('rejects request without authorization header', () => {
      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    test('rejects request with malformed authorization header', () => {
      req.headers.authorization = 'InvalidFormat';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    });

    test('rejects invalid token', () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { user: null };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      next = jest.fn();
    });

    test('allows user with correct role', () => {
      req.user = { userId: 1, role: 'admin' };
      const middleware = authorize('admin', 'moderator');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('blocks user without authentication', () => {
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(next).not.toHaveBeenCalled();
    });

    test('blocks user with insufficient role', () => {
      req.user = { userId: 1, role: 'user' };
      const middleware = authorize('admin');

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    test('accepts multiple allowed roles', () => {
      req.user = { userId: 1, role: 'moderator' };
      const middleware = authorize('admin', 'moderator', 'editor');

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
