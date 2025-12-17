/**
 * Unit Tests: Remote Operations API
 * Phase 17: Cloud Integration & Collaboration
 */

import RemoteOperationsAPI from '../../../modules/cloud/remote-operations-api.mjs';

describe('RemoteOperationsAPI', () => {
  let api;

  beforeEach(() => {
    api = new RemoteOperationsAPI({
      enableAuth: true,
      rateLimitPerMinute: 1000,
      requestTimeout: 30000,
    });
  });

  describe('registerEndpoint', () => {
    test('should register API endpoint', () => {
      const endpoint = api.registerEndpoint({
        path: '/render',
        method: 'POST',
        handler: (params) => ({ result: 'rendered' }),
        description: 'Render CNC path',
      });

      expect(endpoint.path).toBe('/render');
      expect(endpoint.method).toBe('POST');
      expect(endpoint.handler).toBeDefined();
    });

    test('should throw error without path', () => {
      expect(() => {
        api.registerEndpoint({
          method: 'POST',
          handler: () => {},
        });
      }).toThrow('Endpoint registration requires path and method');
    });

    test('should normalize method to uppercase', () => {
      const endpoint = api.registerEndpoint({
        path: '/render',
        method: 'post',
        handler: () => {},
      });

      expect(endpoint.method).toBe('POST');
    });

    test('should emit endpoint registered event', (done) => {
      api.on('endpoint:registered', (endpoint) => {
        expect(endpoint.path).toBe('/render');
        done();
      });

      api.registerEndpoint({
        path: '/render',
        method: 'POST',
        handler: () => {},
      });
    });
  });

  describe('registerAPIKey', () => {
    test('should register API key', () => {
      const result = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['READ', 'WRITE'],
        name: 'Production Key',
      });

      expect(result.apiKey).toBeDefined();
      expect(result.apiKey).toMatch(/^sk_/);
      expect(result.userId).toBe('user_123');
    });

    test('should throw error without userId', () => {
      expect(() => {
        api.registerAPIKey({
          permissions: ['READ'],
        });
      }).toThrow('API key registration requires userId');
    });

    test('should emit API key registered event', (done) => {
      api.on('apikey:registered', (data) => {
        expect(data.userId).toBe('user_123');
        done();
      });

      api.registerAPIKey({
        userId: 'user_123',
        name: 'Test Key',
      });
    });
  });

  describe('validateAPIKey', () => {
    test('should validate valid API key', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['READ', 'WRITE'],
      });

      const validation = api.validateAPIKey({
        apiKey: keyResult.apiKey,
        requiredPermission: 'READ',
      });

      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe('user_123');
    });

    test('should reject invalid API key', () => {
      const validation = api.validateAPIKey({
        apiKey: 'invalid_key',
        requiredPermission: 'READ',
      });

      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('not found');
    });

    test('should reject insufficient permissions', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['READ'],
      });

      const validation = api.validateAPIKey({
        apiKey: keyResult.apiKey,
        requiredPermission: 'WRITE',
      });

      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('Permission');
    });

    test('should bypass validation when auth disabled', () => {
      const noAuthApi = new RemoteOperationsAPI({ enableAuth: false });

      const validation = noAuthApi.validateAPIKey({
        apiKey: 'anything',
        requiredPermission: 'READ',
      });

      expect(validation.valid).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    test('should allow requests within limit', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['READ'],
      });

      const check = api.checkRateLimit({ apiKey: keyResult.apiKey });

      expect(check.allowed).toBe(true);
      expect(check.requestsUsed).toBe(1);
    });

    test('should track multiple requests', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['READ'],
      });

      api.checkRateLimit({ apiKey: keyResult.apiKey });
      api.checkRateLimit({ apiKey: keyResult.apiKey });
      const check = api.checkRateLimit({ apiKey: keyResult.apiKey });

      expect(check.requestsUsed).toBe(3);
    });
  });

  describe('executeCommand', () => {
    test('should execute remote command', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const result = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        args: { x: 10, y: 20 },
        apiKey: keyResult.apiKey,
      });

      expect(result.requestId).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.command).toBe('move');
    });

    test('should enforce permission check', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['READ'],
      });

      const result = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Permission');
    });

    test('should respect rate limits', () => {
      const limitedApi = new RemoteOperationsAPI({ rateLimitPerMinute: 2 });

      const keyResult = limitedApi.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      limitedApi.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      limitedApi.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      const result = limitedApi.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Rate limit');
    });

    test('should emit command submitted event', (done) => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      api.on('command:submitted', (data) => {
        expect(data.command).toBe('move');
        done();
      });

      api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });
    });
  });

  describe('pollCommandResult', () => {
    test('should poll command result', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const exec = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      const result = api.pollCommandResult({ requestId: exec.requestId });

      expect(result.status).toBe('PENDING');
      expect(result.result).toBeNull();
    });

    test('should throw error for non-existent request', () => {
      expect(() => {
        api.pollCommandResult({ requestId: 'unknown' });
      }).toThrow('Request not found');
    });
  });

  describe('updateCommandStatus', () => {
    test('should update command status to running', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const exec = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      const update = api.updateCommandStatus({
        requestId: exec.requestId,
        status: 'RUNNING',
        progress: 50,
      });

      expect(update.status).toBe('RUNNING');
      expect(update.progress).toBe(50);
    });

    test('should complete command with result', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const exec = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      api.updateCommandStatus({
        requestId: exec.requestId,
        status: 'RUNNING',
      });

      const complete = api.updateCommandStatus({
        requestId: exec.requestId,
        status: 'COMPLETED',
        result: { moved: true, duration: 1000 },
      });

      expect(complete.status).toBe('COMPLETED');
      expect(complete.result).toBeDefined();
    });

    test('should handle command failure with retry', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const exec = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      const failed = api.updateCommandStatus({
        requestId: exec.requestId,
        status: 'FAILED',
        error: 'Connection lost',
      });

      expect(failed.status).toBe('RETRY_PENDING');
      expect(failed.retryCount).toBe(1);
    });

    test('should emit command completed event', (done) => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const exec = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      api.on('command:completed', (data) => {
        expect(data.requestId).toBe(exec.requestId);
        done();
      });

      api.updateCommandStatus({
        requestId: exec.requestId,
        status: 'COMPLETED',
        result: { success: true },
      });
    });
  });

  describe('getActiveRequests', () => {
    test('should return active requests', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      api.executeCommand({
        machineId: 'cnc_002',
        command: 'render',
        apiKey: keyResult.apiKey,
      });

      const active = api.getActiveRequests();

      expect(active.activeCount).toBe(2);
      expect(active.requests.length).toBe(2);
    });
  });

  describe('streamCommandResult', () => {
    test('should create command stream', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const exec = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      const stream = api.streamCommandResult({
        requestId: exec.requestId,
        onData: (data) => {},
      });

      expect(stream.streamId).toBeDefined();
      expect(stream.status).toBe('STREAMING');
    });

    test('should emit stream created event', (done) => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const exec = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      api.on('stream:created', (stream) => {
        expect(stream.requestId).toBe(exec.requestId);
        done();
      });

      api.streamCommandResult({
        requestId: exec.requestId,
        onData: () => {},
      });
    });
  });

  describe('getStatistics', () => {
    test('should return API statistics', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['READ', 'WRITE'],
      });

      api.registerEndpoint({
        path: '/test',
        method: 'GET',
        handler: () => {},
      });

      const stats = api.getStatistics();

      expect(stats.endpointCount).toBeGreaterThan(0);
      expect(stats.apiKeyCount).toBeGreaterThan(0);
      expect(stats.activeAPIKeys).toBeGreaterThan(0);
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('request history', () => {
    test('should maintain request history', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      const exec = api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      api.updateCommandStatus({
        requestId: exec.requestId,
        status: 'COMPLETED',
        result: { success: true },
      });

      const history = api.getRequestHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    test('should clear history', () => {
      const keyResult = api.registerAPIKey({
        userId: 'user_123',
        permissions: ['WRITE'],
      });

      api.executeCommand({
        machineId: 'cnc_001',
        command: 'move',
        apiKey: keyResult.apiKey,
      });

      api.clearHistory();

      const history = api.getRequestHistory();

      expect(history.length).toBe(0);
    });
  });

  describe('event system', () => {
    test('should support multiple listeners', () => {
      let count = 0;

      api.on('endpoint:registered', () => count++);
      api.on('endpoint:registered', () => count++);

      api.registerEndpoint({
        path: '/test',
        method: 'GET',
        handler: () => {},
      });

      expect(count).toBe(2);
    });
  });
});
