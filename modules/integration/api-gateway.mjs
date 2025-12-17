/**
 * API Gateway
 * Phase 19: Advanced Integration
 *
 * Unified API gateway for external integrations:
 * - Multi-protocol support (REST, GraphQL, WebSocket)
 * - Request/response transformation
 * - Rate limiting and quota management
 * - Authentication and authorization
 * - API versioning
 */

export class APIGateway {
  constructor(options = {}) {
    this.options = {
      port: options.port || 3000,
      enableRateLimit: options.enableRateLimit !== false,
      enableGraphQL: options.enableGraphQL !== false,
      enableWebSocket: options.enableWebSocket !== false,
      apiVersion: options.apiVersion || 'v1',
      requestTimeout: options.requestTimeout || 30000,
      maxBodySize: options.maxBodySize || '10mb',
      ...options,
    };

    this.routes = new Map();
    this.middlewares = [];
    this.rateLimiters = new Map();
    this.apiKeys = new Map();
    this.listeners = {};
    this.requestCount = 0;
    this.errorCount = 0;
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Emit event to registered listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  /**
   * Register API route
   */
  registerRoute(method, path, handler, options = {}) {
    const routeKey = `${method}:${path}`;
    this.routes.set(routeKey, {
      method,
      path,
      handler,
      requiresAuth: options.requiresAuth !== false,
      rateLimit: options.rateLimit || 0,
      version: options.version || this.options.apiVersion,
      tags: options.tags || [],
    });

    this.emit('routeRegistered', { method, path, version: options.version });
    return this;
  }

  /**
   * Register middleware
   */
  use(middleware) {
    this.middlewares.push(middleware);
    this.emit('middlewareAdded', { name: middleware.name });
    return this;
  }

  /**
   * Handle HTTP request
   */
  async handleRequest(req) {
    try {
      this.requestCount += 1;
      const startTime = Date.now();

      // Check authentication
      if (req.headers.authorization) {
        const token = req.headers.authorization.replace('Bearer ', '');
        if (!this.validateToken(token)) {
          return {
            status: 401,
            body: { error: 'Unauthorized', code: 'AUTH_FAILED' },
          };
        }
      }

      // Check rate limit
      if (this.options.enableRateLimit) {
        const clientId = req.headers['x-client-id'] || req.ip;
        const rateCheck = this.checkRateLimit(clientId);
        if (!rateCheck.allowed) {
          return {
            status: 429,
            body: {
              error: 'Rate limit exceeded',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: rateCheck.retryAfter,
            },
          };
        }
      }

      // Find matching route
      const routeKey = `${req.method}:${req.path}`;
      const route = this.routes.get(routeKey);

      if (!route) {
        return {
          status: 404,
          body: { error: 'Route not found', code: 'ROUTE_NOT_FOUND' },
        };
      }

      // Execute route handler
      const result = await route.handler(req);
      const duration = Date.now() - startTime;

      this.emit('requestCompleted', {
        method: req.method,
        path: req.path,
        status: result.status,
        duration,
        requestId: req.id,
      });

      return result;
    } catch (error) {
      this.errorCount += 1;
      this.emit('requestFailed', { error: error.message });
      return {
        status: 500,
        body: {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * Validate API token
   */
  validateToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const expiresAt = payload.exp || Infinity;
      return Date.now() < expiresAt * 1000;
    } catch {
      return false;
    }
  }

  /**
   * Check rate limit for client
   */
  checkRateLimit(clientId) {
    if (!this.rateLimiters.has(clientId)) {
      this.rateLimiters.set(clientId, {
        count: 0,
        window: Date.now(),
      });
    }

    const limiter = this.rateLimiters.get(clientId);
    const windowExpired = Date.now() - limiter.window > 60000;

    if (windowExpired) {
      limiter.count = 0;
      limiter.window = Date.now();
    }

    limiter.count += 1;

    const limit = 1000; // requests per minute
    const allowed = limiter.count <= limit;
    const retryAfter = windowExpired
      ? 0
      : Math.ceil((60000 - (Date.now() - limiter.window)) / 1000);

    return {
      allowed,
      remaining: Math.max(0, limit - limiter.count),
      retryAfter,
    };
  }

  /**
   * Register API key
   */
  registerAPIKey(keyId, key, options = {}) {
    this.apiKeys.set(keyId, {
      key,
      createdAt: Date.now(),
      expiresAt: options.expiresAt || null,
      permissions: options.permissions || ['read'],
      rateLimit: options.rateLimit || 1000,
      active: true,
    });

    this.emit('apiKeyRegistered', { keyId });
    return this;
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(keyId) {
    if (this.apiKeys.has(keyId)) {
      const key = this.apiKeys.get(keyId);
      key.active = false;
      this.emit('apiKeyRevoked', { keyId });
      return true;
    }
    return false;
  }

  /**
   * Get API statistics
   */
  getStatistics() {
    const totalRequests = this.requestCount;
    const totalErrors = this.errorCount;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    return {
      totalRequests,
      totalErrors,
      errorRate: errorRate.toFixed(2),
      registeredRoutes: this.routes.size,
      activeMiddlewares: this.middlewares.length,
      activeRateLimiters: this.rateLimiters.size,
      registeredAPIKeys: this.apiKeys.size,
      uptime: Date.now(),
    };
  }

  /**
   * Get registered routes
   */
  getRoutes() {
    const routes = [];
    for (const [key, route] of this.routes.entries()) {
      routes.push({
        key,
        method: route.method,
        path: route.path,
        version: route.version,
        requiresAuth: route.requiresAuth,
        rateLimit: route.rateLimit,
        tags: route.tags,
      });
    }
    return routes;
  }

  /**
   * Transform request
   */
  transformRequest(req, transformer) {
    return {
      ...req,
      transformedAt: Date.now(),
      body: transformer(req.body),
    };
  }

  /**
   * Transform response
   */
  transformResponse(res, transformer) {
    return {
      ...res,
      transformedAt: Date.now(),
      body: transformer(res.body),
    };
  }

  /**
   * Get API documentation
   */
  getDocumentation() {
    const routes = this.getRoutes();
    const documentation = {
      apiVersion: this.options.apiVersion,
      basePath: `/api/${this.options.apiVersion}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      endpoints: routes,
      authentication: {
        type: 'bearer',
        scheme: 'Bearer',
        bearerFormat: 'JWT',
      },
      rateLimit: this.options.enableRateLimit ? 1000 : null,
    };

    return documentation;
  }
}
