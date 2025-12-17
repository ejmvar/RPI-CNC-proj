/**
 * Remote Operations API
 * Phase 17: Cloud Integration & Collaboration
 *
 * Exposes RESTful APIs for remote machine control:
 * - Command execution on remote machines
 * - Result delivery and streaming
 * - Request validation and auth
 * - Error handling and retry logic
 */

export class RemoteOperationsAPI {
  constructor(options = {}) {
    this.options = {
      apiVersion: options.apiVersion || 'v1',
      requestTimeout: options.requestTimeout || 30000, // 30 seconds
      maxRetries: options.maxRetries || 3,
      enableAuth: options.enableAuth !== false,
      rateLimitPerMinute: options.rateLimitPerMinute || 1000,
      ...options,
    };

    this.endpoints = new Map();
    this.activeRequests = new Map();
    this.requestHistory = [];
    this.apiKeys = new Map();
    this.rateLimits = new Map();
    this.listeners = {};
    this.middleware = [];
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
   * Register API endpoint
   */
  registerEndpoint(params) {
    if (!params || !params.path || !params.method) {
      throw new Error('Endpoint registration requires path and method');
    }

    const { path, method, handler, requireAuth = true, description = '' } = params;

    const endpointKey = `${method.toUpperCase()} ${path}`;

    const endpoint = {
      path,
      method: method.toUpperCase(),
      handler,
      requireAuth,
      description,
      createdAt: Date.now(),
      callCount: 0,
      lastCalled: null,
    };

    this.endpoints.set(endpointKey, endpoint);

    this.emit('endpoint:registered', endpoint);

    return endpoint;
  }

  /**
   * Register API key
   */
  registerAPIKey(params) {
    if (!params || !params.userId) {
      throw new Error('API key registration requires userId');
    }

    const { userId, permissions = ['READ', 'WRITE'], expiresAt = null, name = '' } = params;

    const apiKey = `sk_${Date.now()}_${Math.random().toString(36).substr(2, 20)}`;

    const keyEntry = {
      apiKey,
      userId,
      name,
      permissions,
      createdAt: Date.now(),
      lastUsed: null,
      expiresAt,
      isActive: true,
      requestCount: 0,
    };

    this.apiKeys.set(apiKey, keyEntry);

    this.emit('apikey:registered', { userId, apiKey });

    return { apiKey, userId, name };
  }

  /**
   * Validate API key and permissions
   */
  validateAPIKey(params) {
    if (!params || !params.apiKey || !params.requiredPermission) {
      throw new Error('Validation requires apiKey and requiredPermission');
    }

    const { apiKey, requiredPermission } = params;

    if (!this.options.enableAuth) {
      return { valid: true, message: 'Auth disabled' };
    }

    const keyEntry = this.apiKeys.get(apiKey);
    if (!keyEntry) {
      return { valid: false, message: 'API key not found' };
    }

    if (!keyEntry.isActive) {
      return { valid: false, message: 'API key is inactive' };
    }

    if (keyEntry.expiresAt && keyEntry.expiresAt < Date.now()) {
      return { valid: false, message: 'API key has expired' };
    }

    if (!keyEntry.permissions.includes(requiredPermission)) {
      return { valid: false, message: `Permission ${requiredPermission} not granted` };
    }

    return { valid: true, userId: keyEntry.userId };
  }

  /**
   * Check rate limit
   */
  checkRateLimit(params) {
    if (!params || !params.apiKey) {
      throw new Error('Rate limit check requires apiKey');
    }

    const { apiKey } = params;

    const now = Date.now();
    const minuteAgo = now - 60000;

    if (!this.rateLimits.has(apiKey)) {
      this.rateLimits.set(apiKey, []);
    }

    const requests = this.rateLimits.get(apiKey).filter((t) => t > minuteAgo);

    if (requests.length >= this.options.rateLimitPerMinute) {
      return { allowed: false, message: 'Rate limit exceeded' };
    }

    requests.push(now);
    this.rateLimits.set(apiKey, requests);

    return { allowed: true, requestsUsed: requests.length, limit: this.options.rateLimitPerMinute };
  }

  /**
   * Execute remote command
   */
  executeCommand(params) {
    if (!params || !params.machineId || !params.command) {
      throw new Error('Command execution requires machineId and command');
    }

    const {
      machineId,
      command,
      args = {},
      apiKey,
      priority = 'NORMAL',
      timeout = this.options.requestTimeout,
    } = params;

    // Validate auth
    if (this.options.enableAuth && apiKey) {
      const validation = this.validateAPIKey({ apiKey, requiredPermission: 'WRITE' });
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // Check rate limit
      const rateCheck = this.checkRateLimit({ apiKey });
      if (!rateCheck.allowed) {
        return { success: false, message: rateCheck.message };
      }
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request = {
      requestId,
      machineId,
      command,
      args,
      priority,
      timeout,
      status: 'PENDING',
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      retryCount: 0,
      maxRetries: this.options.maxRetries,
    };

    this.activeRequests.set(requestId, request);

    this.emit('command:submitted', { requestId, machineId, command });

    return { requestId, machineId, command, status: 'PENDING' };
  }

  /**
   * Poll for command result
   */
  pollCommandResult(params) {
    if (!params || !params.requestId) {
      throw new Error('Poll requires requestId');
    }

    const { requestId } = params;

    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    return {
      requestId,
      status: request.status,
      result: request.result,
      error: request.error,
      progress: request.progress || 0,
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    };
  }

  /**
   * Stream command result (simulate streaming)
   */
  streamCommandResult(params) {
    if (!params || !params.requestId || !params.onData) {
      throw new Error('Stream requires requestId and onData callback');
    }

    const { requestId, onData, onComplete, onError } = params;

    const request = this.activeRequests.get(requestId);
    if (!request) {
      if (onError) onError('Request not found');
      return;
    }

    // Simulate streaming
    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stream = {
      streamId,
      requestId,
      chunks: [],
      isActive: true,
      createdAt: Date.now(),
    };

    this.emit('stream:created', stream);

    return {
      streamId,
      requestId,
      status: 'STREAMING',
    };
  }

  /**
   * Update command status
   */
  updateCommandStatus(params) {
    if (!params || !params.requestId || !params.status) {
      throw new Error('Status update requires requestId and status');
    }

    const { requestId, status, progress = 0, result = null, error = null } = params;

    const request = this.activeRequests.get(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    request.status = status;
    request.progress = progress;

    if (status === 'RUNNING' && !request.startedAt) {
      request.startedAt = Date.now();
    }

    if (status === 'COMPLETED') {
      request.completedAt = Date.now();
      request.result = result;
      this.activeRequests.delete(requestId);
      this.requestHistory.push(request);

      this.emit('command:completed', { requestId, result });
    } else if (status === 'FAILED') {
      request.completedAt = Date.now();
      request.error = error;

      if (request.retryCount < request.maxRetries) {
        request.retryCount++;
        request.status = 'RETRY_PENDING';
        this.emit('command:retried', { requestId, retryCount: request.retryCount });
      } else {
        this.activeRequests.delete(requestId);
        this.requestHistory.push(request);
        this.emit('command:failed', { requestId, error });
      }
    }

    return request;
  }

  /**
   * Get all active requests
   */
  getActiveRequests() {
    const requests = Array.from(this.activeRequests.values()).map((r) => ({
      requestId: r.requestId,
      machineId: r.machineId,
      command: r.command,
      status: r.status,
      progress: r.progress || 0,
      createdAt: r.createdAt,
      duration: Date.now() - r.createdAt,
    }));

    return {
      activeCount: requests.length,
      requests,
      timestamp: Date.now(),
    };
  }

  /**
   * Get API statistics
   */
  getStatistics() {
    const endpoints = Array.from(this.endpoints.values());
    const totalCalls = endpoints.reduce((sum, e) => sum + e.callCount, 0);

    const apiKeys = Array.from(this.apiKeys.values());
    const activeKeys = apiKeys.filter((k) => k.isActive).length;

    return {
      endpointCount: this.endpoints.size,
      totalEndpointCalls: totalCalls,
      apiKeyCount: this.apiKeys.size,
      activeAPIKeys: activeKeys,
      activeRequests: this.activeRequests.size,
      completedRequests: this.requestHistory.length,
      averageRequestDuration: this._calculateAverageRequestDuration(),
      timestamp: Date.now(),
    };
  }

  /**
   * Helper: Calculate average request duration
   */
  _calculateAverageRequestDuration() {
    if (this.requestHistory.length === 0) return 0;

    const durations = this.requestHistory.map((r) => (r.completedAt || Date.now()) - r.createdAt);

    return parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0));
  }

  /**
   * History management
   */
  getRequestHistory(limit = 50) {
    return this.requestHistory.slice(-limit);
  }

  clearHistory() {
    this.requestHistory = [];
  }
}

export default RemoteOperationsAPI;
