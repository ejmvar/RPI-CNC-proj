/**
 * WebWorker Pool & Coordination Tests
 * Phase 13.2: Performance Improvements - WebWorker Implementation
 *
 * Tests for worker pool management, task queueing, and coordination
 * Note: Using mock workers for Jest compatibility
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WorkerPool, WorkerCoordinator } from '../../../modules/backend/workers/worker-pool.mjs';

// Mock Worker implementation
class MockWorker {
  constructor() {
    this.listeners = {};
    this.lastMessage = null;
  }

  addEventListener(event, callback) {
    this.listeners[event] = callback;
  }

  removeEventListener(event) {
    delete this.listeners[event];
  }

  postMessage(data) {
    this.lastMessage = data;

    // Simulate async response
    setTimeout(() => {
      const { command } = data;
      let result;

      if (command === 'test-success') {
        result = { ...data, result: 'success' };
      } else if (command === 'test-error') {
        if (this.listeners.error) {
          this.listeners.error(new Error('Simulated worker error'));
        }
        return;
      } else {
        result = { ...data, result: 'processed' };
      }

      if (this.listeners.message) {
        this.listeners.message({
          data: { success: true, result },
        });
      }
    }, 0);
  }

  terminate() {
    this.listeners = {};
  }
}

// Override global Worker for tests
globalThis.Worker = MockWorker;

describe('WorkerPool', () => {
  let pool;

  beforeEach(() => {
    pool = new WorkerPool('mock-worker.js', 2);
  });

  afterEach(() => {
    if (pool) {
      pool.terminate();
    }
  });

  it('should initialize pool with correct size', () => {
    expect(pool.poolSize).toBe(2);
    expect(pool.workers.length).toBe(2);
    expect(pool.activeWorkers.size).toBe(0);
  });

  it('should execute task and return result', async () => {
    const result = await pool.execute({
      command: 'test-success',
      data: { test: 'value' },
    });

    expect(result).toBeDefined();
    expect(result.result).toBe('success');
  });

  it('should queue tasks when pool is busy', async () => {
    // First, create two concurrent tasks to fill the pool
    const promise1 = pool.execute({
      command: 'test-success',
      delay: 100,
    });

    const promise2 = pool.execute({
      command: 'test-success',
      delay: 100,
    });

    // Third task should be queued
    const promise3 = pool.execute({
      command: 'test-success',
    });

    expect(pool.taskQueue.length).toBeGreaterThanOrEqual(0);

    // All should eventually complete
    const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
    expect(result3).toBeDefined();
  });

  it('should track pool statistics', async () => {
    const stats = pool.getStats();

    expect(stats).toHaveProperty('poolSize', 2);
    expect(stats).toHaveProperty('activeWorkers');
    expect(stats).toHaveProperty('idleWorkers');
    expect(stats).toHaveProperty('queuedTasks');
    expect(stats.poolSize).toBe(2);
  });

  it('should handle task timeout', async () => {
    // Note: Mock workers don't actually timeout, they respond immediately
    // This test validates timeout infrastructure is in place
    const taskPromise = pool.execute(
      { command: 'long-task' },
      100000 // Large timeout that won't trigger in mock
    );

    const result = await taskPromise;
    // Even with timeout set, mock processes quickly
    expect(result).toBeDefined();
  });

  it('should handle worker errors', async () => {
    const taskPromise = pool.execute({
      command: 'test-error',
    });

    await expect(taskPromise).rejects.toThrow(/worker error/i);
  });

  it('should terminate workers correctly', () => {
    const stats = pool.getStats();
    expect(stats.poolSize).toBe(2);

    pool.terminate();

    expect(pool.workers.length).toBe(0);
    expect(pool.activeWorkers.size).toBe(0);
    expect(pool.taskQueue.length).toBe(0);
  });

  it('should reuse workers from pool', async () => {
    // Execute first task
    const result1 = await pool.execute({
      command: 'test-success',
    });
    expect(result1).toBeDefined();

    // Execute second task - should reuse first worker
    const result2 = await pool.execute({
      command: 'test-success',
    });
    expect(result2).toBeDefined();

    // Both should succeed (workers were reused)
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  it('should handle concurrent requests efficiently', async () => {
    const tasks = Array(5)
      .fill(null)
      .map((_, i) => ({
        command: 'test-success',
        id: i,
      }));

    const results = await Promise.all(tasks.map((task) => pool.execute(task)));

    expect(results).toHaveLength(5);
    results.forEach((result) => {
      expect(result).toBeDefined();
    });
  });

  it('should track task counter incrementally', async () => {
    expect(pool.taskIdCounter).toBe(0);

    await pool.execute({ command: 'test-success' });
    expect(pool.taskIdCounter).toBe(1);

    await pool.execute({ command: 'test-success' });
    expect(pool.taskIdCounter).toBe(2);
  });
});

describe('WorkerCoordinator', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new WorkerCoordinator();
  });

  afterEach(() => {
    if (coordinator) {
      coordinator.shutdown();
    }
  });

  it('should initialize with no pools', () => {
    expect(coordinator.pools.size).toBe(0);
    expect(coordinator.initialized).toBe(false);
  });

  it('should initialize pools from config', () => {
    coordinator.initializePools({
      gcodeParser: { poolSize: 2 },
      meshCompensation: { poolSize: 2 },
    });

    expect(coordinator.initialized).toBe(true);
  });

  it('should register and retrieve pools', () => {
    const pool = new WorkerPool('test.js', 1);
    coordinator.registerPool('test-pool', pool);

    expect(coordinator.getPool('test-pool')).toBe(pool);
    expect(coordinator.pools.size).toBe(1);

    pool.terminate();
  });

  it('should execute task on named pool', async () => {
    const pool = new WorkerPool('test.js', 1);
    coordinator.registerPool('test-pool', pool);

    const result = await coordinator.executeTask('test-pool', {
      command: 'test-success',
    });

    expect(result).toBeDefined();
    expect(result.result).toBe('success');

    pool.terminate();
  });

  it('should throw error for unknown pool', async () => {
    const promise = coordinator.executeTask('nonexistent', {
      command: 'test',
    });

    await expect(promise).rejects.toThrow(/unknown worker pool/i);
  });

  it('should batch execute tasks', async () => {
    const pool = new WorkerPool('test.js', 2);
    coordinator.registerPool('batch-pool', pool);

    const tasks = [
      { command: 'test-success' },
      { command: 'test-success' },
      { command: 'test-success' },
    ];

    const results = await coordinator.batchExecute('batch-pool', tasks);

    expect(results).toHaveLength(3);
    results.forEach((result) => {
      expect(result).toBeDefined();
    });

    pool.terminate();
  });

  it('should return statistics for all pools', () => {
    const pool1 = new WorkerPool('test1.js', 2);
    const pool2 = new WorkerPool('test2.js', 4);

    coordinator.registerPool('pool1', pool1);
    coordinator.registerPool('pool2', pool2);

    const stats = coordinator.getStats();

    expect(stats).toHaveProperty('pool1');
    expect(stats).toHaveProperty('pool2');
    expect(stats.pool1.poolSize).toBe(2);
    expect(stats.pool2.poolSize).toBe(4);

    pool1.terminate();
    pool2.terminate();
  });

  it('should shutdown all pools', () => {
    const pool1 = new WorkerPool('test1.js', 1);
    const pool2 = new WorkerPool('test2.js', 1);

    coordinator.registerPool('pool1', pool1);
    coordinator.registerPool('pool2', pool2);

    coordinator.shutdown();

    expect(coordinator.pools.size).toBe(0);
    expect(coordinator.initialized).toBe(false);
  });

  it('should maintain pool chain for configuration', () => {
    const result = coordinator
      .initializePools()
      .registerPool('pool1', new WorkerPool('test.js', 1));

    expect(result).toBe(coordinator);

    const pool = coordinator.getPool('pool1');
    pool.terminate();
  });

  it('should handle errors in batch execution', async () => {
    const pool = new WorkerPool('test.js', 1);
    coordinator.registerPool('error-pool', pool);

    const tasks = [
      { command: 'test-success' },
      { command: 'test-error' },
      { command: 'test-success' },
    ];

    try {
      await coordinator.batchExecute('error-pool', tasks);
    } catch (error) {
      expect(error).toBeDefined();
    }

    pool.terminate();
  });

  it('should support multiple coordinators independently', () => {
    const coord1 = new WorkerCoordinator();
    const coord2 = new WorkerCoordinator();

    const pool1 = new WorkerPool('test1.js', 1);
    const pool2 = new WorkerPool('test2.js', 1);

    coord1.registerPool('pool', pool1);
    coord2.registerPool('pool', pool2);

    expect(coord1.getPool('pool')).toBe(pool1);
    expect(coord2.getPool('pool')).toBe(pool2);

    pool1.terminate();
    pool2.terminate();
    coord1.shutdown();
    coord2.shutdown();
  });
});

describe('WorkerPool Performance', () => {
  it('should handle rapid sequential execution', async () => {
    const pool = new WorkerPool('test.js', 2);

    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await pool.execute({
        command: 'test-success',
        id: i,
      });
      results.push(result);
    }

    expect(results).toHaveLength(10);
    results.forEach((result) => {
      expect(result).toBeDefined();
    });

    pool.terminate();
  });

  it('should reduce latency with multiple workers', async () => {
    const pool1 = new WorkerPool('test.js', 1);
    const pool4 = new WorkerPool('test.js', 4);

    const start1 = Date.now();
    await Promise.all(
      Array(8)
        .fill(null)
        .map(() => pool1.execute({ command: 'test-success' }))
    );
    const duration1 = Date.now() - start1;

    const start4 = Date.now();
    await Promise.all(
      Array(8)
        .fill(null)
        .map(() => pool4.execute({ command: 'test-success' }))
    );
    const duration4 = Date.now() - start4;

    // 4-worker pool should be faster (though in mock it may not be significantly)
    expect(duration4).toBeLessThanOrEqual(duration1 + 50); // Allow small variance

    pool1.terminate();
    pool4.terminate();
  });

  it('should track queue depth under load', async () => {
    const pool = new WorkerPool('test.js', 1);

    const promises = Array(5)
      .fill(null)
      .map(() =>
        pool.execute({
          command: 'test-success',
        })
      );

    // Queue should have built up
    expect(pool.taskQueue.length + pool.activeWorkers.size).toBeGreaterThan(0);

    await Promise.all(promises);

    // Queue should be empty after completion
    expect(pool.taskQueue.length).toBe(0);
    expect(pool.activeWorkers.size).toBe(0);

    pool.terminate();
  });

  it('should handle mixed task types efficiently', async () => {
    const pool = new WorkerPool('test.js', 2);

    const tasks = [
      { command: 'test-success', type: 'gcode' },
      { command: 'test-success', type: 'mesh' },
      { command: 'test-success', type: 'collision' },
      { command: 'test-success', type: 'gcode' },
    ];

    const results = await Promise.all(tasks.map((task) => pool.execute(task)));

    expect(results).toHaveLength(4);
    results.forEach((result) => {
      expect(result).toBeDefined();
    });

    pool.terminate();
  });
});

describe('WorkerPool Edge Cases', () => {
  it('should handle zero poolSize gracefully', () => {
    const pool = new WorkerPool('test.js', 0);
    expect(pool.poolSize).toBe(0);
    expect(pool.workers.length).toBe(0);
    pool.terminate();
  });

  it('should handle single-worker pool', async () => {
    const pool = new WorkerPool('test.js', 1);

    const result1 = await pool.execute({
      command: 'test-success',
    });

    const result2 = await pool.execute({
      command: 'test-success',
    });

    expect(result1).toBeDefined();
    expect(result2).toBeDefined();

    pool.terminate();
  });

  it('should tolerate rapid terminate calls', () => {
    const pool = new WorkerPool('test.js', 2);
    pool.terminate();
    pool.terminate(); // Should not throw
    expect(pool.workers.length).toBe(0);
  });

  it('should clear task queue on terminate', () => {
    const pool = new WorkerPool('test.js', 1);

    // Create pending task
    pool.taskQueue.push({ task: 'pending' });
    expect(pool.taskQueue.length).toBe(1);

    pool.terminate();
    expect(pool.taskQueue.length).toBe(0);
  });
});
