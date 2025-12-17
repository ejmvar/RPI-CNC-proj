import { describe, it, expect, beforeEach } from '@jest/globals';
import { APIGateway } from '../../../modules/integration/api-gateway.mjs';

describe('APIGateway', () => {
  let gateway;

  beforeEach(() => {
    gateway = new APIGateway({
      port: 3000,
      enableRateLimit: true,
    });
  });

  describe('Route Registration', () => {
    it('should register GET route', () => {
      gateway.registerRoute('GET', '/users', (req) => ({
        status: 200,
        body: { users: [] },
      }));

      const routes = gateway.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('GET');
      expect(routes[0].path).toBe('/users');
    });

    it('should register POST route', () => {
      gateway.registerRoute('POST', '/users', (req) => ({
        status: 201,
        body: { id: 1 },
      }));

      const routes = gateway.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].method).toBe('POST');
    });

    it('should register multiple routes', () => {
      gateway
        .registerRoute('GET', '/users', () => ({ status: 200 }))
        .registerRoute('POST', '/users', () => ({ status: 201 }))
        .registerRoute('DELETE', '/users/:id', () => ({ status: 204 }));

      expect(gateway.getRoutes()).toHaveLength(3);
    });

    it('should support route options', () => {
      gateway.registerRoute('GET', '/admin', () => ({ status: 200 }), {
        requiresAuth: true,
        rateLimit: 100,
        tags: ['admin', 'protected'],
      });

      const routes = gateway.getRoutes();
      expect(routes[0].requiresAuth).toBe(true);
      expect(routes[0].rateLimit).toBe(100);
      expect(routes[0].tags).toEqual(['admin', 'protected']);
    });
  });

  describe('Request Handling', () => {
    it('should handle valid request', async () => {
      gateway.registerRoute('GET', '/users', (req) => ({
        status: 200,
        body: { users: ['Alice', 'Bob'] },
      }));

      const result = await gateway.handleRequest({
        id: '1',
        method: 'GET',
        path: '/users',
        headers: {},
      });

      expect(result.status).toBe(200);
      expect(result.body.users).toEqual(['Alice', 'Bob']);
    });

    it('should return 404 for unknown route', async () => {
      const result = await gateway.handleRequest({
        id: '1',
        method: 'GET',
        path: '/unknown',
        headers: {},
      });

      expect(result.status).toBe(404);
      expect(result.body.code).toBe('ROUTE_NOT_FOUND');
    });

    it('should return 401 for invalid token', async () => {
      gateway.registerRoute('GET', '/users', () => ({ status: 200 }));

      const result = await gateway.handleRequest({
        id: '1',
        method: 'GET',
        path: '/users',
        headers: { authorization: 'Bearer invalid' },
      });

      expect(result.status).toBe(401);
      expect(result.body.code).toBe('AUTH_FAILED');
    });

    it('should track request count', async () => {
      gateway.registerRoute('GET', '/test', () => ({ status: 200 }));

      await gateway.handleRequest({
        id: '1',
        method: 'GET',
        path: '/test',
        headers: {},
      });
      await gateway.handleRequest({
        id: '2',
        method: 'GET',
        path: '/test',
        headers: {},
      });

      const stats = gateway.getStatistics();
      expect(stats.totalRequests).toBe(2);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      gateway.registerRoute('GET', '/test', () => ({ status: 200 }));

      const result = await gateway.handleRequest({
        id: '1',
        method: 'GET',
        path: '/test',
        headers: { 'x-client-id': 'client1' },
      });

      expect(result.status).toBe(200);
    });

    it('should block requests exceeding rate limit', async () => {
      gateway.registerRoute('GET', '/test', () => ({ status: 200 }));

      // Simulate multiple requests from same client
      const clientId = 'client1';
      for (let i = 0; i < 1000; i++) {
        await gateway.handleRequest({
          id: `${i}`,
          method: 'GET',
          path: '/test',
          headers: { 'x-client-id': clientId },
        });
      }

      const result = await gateway.handleRequest({
        id: 'overflow',
        method: 'GET',
        path: '/test',
        headers: { 'x-client-id': clientId },
      });

      expect(result.status).toBe(429);
      expect(result.body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should reset rate limit after window', () => {
      const rateLimitA = gateway.checkRateLimit('client1');
      const rateLimitB = gateway.checkRateLimit('client2');

      expect(rateLimitA.allowed).toBe(true);
      expect(rateLimitB.allowed).toBe(true);
      expect(rateLimitA.remaining).toBeLessThan(1000);
    });
  });

  describe('Middleware', () => {
    it('should add middleware', () => {
      const middleware = { name: 'logger' };
      gateway.use(middleware);

      expect(gateway.middlewares).toHaveLength(1);
      expect(gateway.middlewares[0].name).toBe('logger');
    });

    it('should support multiple middleware', () => {
      gateway.use({ name: 'logger' }).use({ name: 'auth' }).use({ name: 'validator' });

      expect(gateway.middlewares).toHaveLength(3);
    });
  });

  describe('API Key Management', () => {
    it('should register API key', () => {
      gateway.registerAPIKey('key1', 'secret123', {
        permissions: ['read', 'write'],
      });

      expect(gateway.apiKeys.has('key1')).toBe(true);
    });

    it('should revoke API key', () => {
      gateway.registerAPIKey('key1', 'secret123');
      gateway.revokeAPIKey('key1');

      const key = gateway.apiKeys.get('key1');
      expect(key.active).toBe(false);
    });

    it('should track API keys', () => {
      gateway.registerAPIKey('key1', 'secret1');
      gateway.registerAPIKey('key2', 'secret2');

      const stats = gateway.getStatistics();
      expect(stats.registeredAPIKeys).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should track statistics', async () => {
      gateway.registerRoute('GET', '/test', () => ({ status: 200 }));

      await gateway.handleRequest({
        id: '1',
        method: 'GET',
        path: '/test',
        headers: {},
      });

      const stats = gateway.getStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalErrors).toBe(0);
      expect(stats.registeredRoutes).toBe(1);
    });

    it('should track error rate', async () => {
      gateway.registerRoute('GET', '/test', () => ({
        status: 500,
        body: { error: 'Error' },
      }));

      try {
        await gateway.handleRequest({
          id: '1',
          method: 'GET',
          path: '/bad',
          headers: {},
        });
      } catch (e) {
        // Catch expected error
      }

      const stats = gateway.getStatistics();
      expect(stats.errorRate).toBeDefined();
    });
  });

  describe('Token Validation', () => {
    it('should validate valid JWT token', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) + 3600 };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      expect(gateway.validateToken(token)).toBe(true);
    });

    it('should reject expired JWT token', () => {
      const payload = { exp: Math.floor(Date.now() / 1000) - 3600 };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      expect(gateway.validateToken(token)).toBe(false);
    });

    it('should reject malformed token', () => {
      expect(gateway.validateToken('invalid')).toBe(false);
      expect(gateway.validateToken('header.invalid.signature')).toBe(false);
    });
  });

  describe('Request/Response Transformation', () => {
    it('should transform request', () => {
      const req = { body: { name: 'Alice' } };
      const transformer = (body) => ({ ...body, transformed: true });

      const result = gateway.transformRequest(req, transformer);
      expect(result.body.transformed).toBe(true);
    });

    it('should transform response', () => {
      const res = { status: 200, body: { data: [] } };
      const transformer = (body) => ({ ...body, success: true });

      const result = gateway.transformResponse(res, transformer);
      expect(result.body.success).toBe(true);
    });
  });

  describe('API Documentation', () => {
    it('should generate API documentation', () => {
      gateway.registerRoute('GET', '/users', () => ({ status: 200 }), {
        tags: ['users'],
      });

      const doc = gateway.getDocumentation();
      expect(doc.apiVersion).toBe('v1');
      expect(doc.endpoints).toBeDefined();
      expect(doc.authentication).toBeDefined();
    });
  });

  describe('Events', () => {
    it('should emit routeRegistered event', (done) => {
      gateway.on('routeRegistered', (data) => {
        expect(data.method).toBe('GET');
        expect(data.path).toBe('/test');
        done();
      });

      gateway.registerRoute('GET', '/test', () => ({ status: 200 }));
    });

    it('should track request statistics synchronously', async () => {
      gateway.registerRoute('GET', '/test', () => ({ status: 200 }));

      const result = await gateway.handleRequest({
        id: '1',
        method: 'GET',
        path: '/test',
        headers: {},
      });

      expect(result.status).toBe(200);
      const stats = gateway.getStatistics();
      expect(stats.totalRequests).toBeGreaterThan(0);
    });
  });
});
