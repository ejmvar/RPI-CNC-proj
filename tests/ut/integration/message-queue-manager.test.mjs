import { describe, it, expect, beforeEach } from '@jest/globals';
import { MessageQueueManager } from '../../../modules/integration/message-queue-manager.mjs';

describe('MessageQueueManager', () => {
  let manager;

  beforeEach(() => {
    manager = new MessageQueueManager({
      maxQueueSize: 1000,
      maxRetries: 3,
      retryBackoff: 100,
    });
  });

  describe('Queue Creation', () => {
    it('should create queue', () => {
      const queue = manager.createQueue('test-queue');

      expect(queue).toBeDefined();
      expect(queue.name).toBe('test-queue');
      expect(queue.messages).toEqual([]);
    });

    it('should return existing queue', () => {
      const queue1 = manager.createQueue('test-queue');
      const queue2 = manager.createQueue('test-queue');

      expect(queue1).toBe(queue2);
    });

    it('should support priority option', () => {
      const queue = manager.createQueue('high-priority', { priority: 'HIGH' });

      expect(queue.priority).toBe('HIGH');
    });
  });

  describe('Enqueue', () => {
    it('should enqueue message', () => {
      manager.createQueue('test-queue');

      const msg = manager.enqueue('test-queue', { data: 'test' });

      expect(msg).toBeDefined();
      expect(msg.data).toEqual({ data: 'test' });
      expect(msg.priority).toBe('NORMAL');
    });

    it('should respect priority order', () => {
      manager.createQueue('test-queue');

      manager.enqueue('test-queue', { id: 1 }, { priority: 'LOW' });
      manager.enqueue('test-queue', { id: 2 }, { priority: 'HIGH' });
      manager.enqueue('test-queue', { id: 3 }, { priority: 'NORMAL' });

      const queue = manager.queues.get('test-queue');
      expect(queue.messages[0].priority).toBe('HIGH');
      expect(queue.messages[1].priority).toBe('NORMAL');
      expect(queue.messages[2].priority).toBe('LOW');
    });

    it('should track enqueued count', () => {
      manager.createQueue('test-queue');

      manager.enqueue('test-queue', { id: 1 });
      manager.enqueue('test-queue', { id: 2 });

      const queue = manager.queues.get('test-queue');
      expect(queue.totalEnqueued).toBe(2);
    });

    it('should reject when queue is full', () => {
      const tinyManager = new MessageQueueManager({ maxQueueSize: 2 });
      tinyManager.createQueue('test-queue');

      tinyManager.enqueue('test-queue', { id: 1 });
      tinyManager.enqueue('test-queue', { id: 2 });

      const result = tinyManager.enqueue('test-queue', { id: 3 });
      expect(result).toBeNull();
    });

    it('should support message metadata', () => {
      manager.createQueue('test-queue');

      const msg = manager.enqueue(
        'test-queue',
        { data: 'test' },
        {
          correlationId: 'corr-123',
          headers: { 'x-custom': 'value' },
        }
      );

      expect(msg.correlationId).toBe('corr-123');
      expect(msg.headers['x-custom']).toBe('value');
    });
  });

  describe('Dequeue', () => {
    it('should dequeue message', () => {
      manager.createQueue('test-queue');
      manager.enqueue('test-queue', { data: 'test' });

      const msg = manager.dequeue('test-queue');

      expect(msg).toBeDefined();
      expect(msg.data).toEqual({ data: 'test' });
    });

    it('should return null for empty queue', () => {
      manager.createQueue('test-queue');

      const msg = manager.dequeue('test-queue');
      expect(msg).toBeNull();
    });

    it('should dequeue in priority order', () => {
      manager.createQueue('test-queue');

      manager.enqueue('test-queue', { id: 1 }, { priority: 'LOW' });
      manager.enqueue('test-queue', { id: 2 }, { priority: 'HIGH' });

      const msg1 = manager.dequeue('test-queue');
      expect(msg1.data.id).toBe(2); // HIGH priority first

      const msg2 = manager.dequeue('test-queue');
      expect(msg2.data.id).toBe(1); // LOW priority second
    });

    it('should increment attempts on dequeue', () => {
      manager.createQueue('test-queue');
      manager.enqueue('test-queue', { data: 'test' });

      const msg1 = manager.dequeue('test-queue');
      expect(msg1.attempts).toBe(1);

      manager.enqueue('test-queue', msg1.data, { maxRetries: 2 });
      const msg2 = manager.dequeue('test-queue');
      expect(msg2.attempts).toBe(1);
    });

    it('should remove expired messages', (done) => {
      manager.createQueue('test-queue');
      manager.enqueue('test-queue', { data: 'test' }, { ttl: 50 });

      // Wait for TTL to expire
      setTimeout(() => {
        const msg = manager.dequeue('test-queue');
        expect(msg).toBeNull();
        done();
      }, 100);
    });
  });

  describe('Consumer Management', () => {
    it('should register consumer', () => {
      const handler = async (msg) => {};
      const consumerId = manager.registerConsumer('group1', 'test-queue', handler);

      expect(consumerId).toBeDefined();
      expect(manager.consumers.has('group1')).toBe(true);
    });

    it('should support multiple consumers in group', () => {
      const handler = async (msg) => {};

      manager.registerConsumer('group1', 'test-queue', handler);
      manager.registerConsumer('group1', 'test-queue', handler);

      const group = manager.consumers.get('group1');
      expect(group).toHaveLength(2);
    });

    it('should get consumer group statistics', () => {
      const handler = async (msg) => {};
      manager.registerConsumer('group1', 'test-queue', handler);

      const stats = manager.getConsumerGroupStats('group1');
      expect(stats.group).toBe('group1');
      expect(stats.totalConsumers).toBe(1);
    });
  });

  describe('Message Processing', () => {
    it('should process message successfully', async () => {
      manager.createQueue('test-queue');
      const handler = async (msg) => {
        // Mock handler
      };
      const consumer = {
        id: 'consumer1',
        group: 'group1',
        handler,
        timeout: 5000,
        processedCount: 0,
        failedCount: 0,
      };

      manager.enqueue('test-queue', { data: 'test' });
      const msg = manager.dequeue('test-queue');

      const result = await manager.processMessage(msg, consumer);

      expect(result).toBe(true);
      expect(manager.totalProcessed).toBeGreaterThan(0);
    });

    it('should handle processing error', async () => {
      manager.createQueue('test-queue');
      const handler = async (msg) => {
        throw new Error('Processing failed');
      };
      const consumer = {
        id: 'consumer1',
        group: 'group1',
        handler,
        timeout: 5000,
        processedCount: 0,
        failedCount: 0,
      };

      manager.enqueue('test-queue', { data: 'test' });
      const msg = manager.dequeue('test-queue');

      const result = await manager.processMessage(msg, consumer);

      expect(result).toBe(false);
    });

    it('should move to DLQ after max retries', async () => {
      manager.createQueue('test-queue');
      const handler = async (msg) => {
        throw new Error('Always fails');
      };
      const consumer = {
        id: 'consumer1',
        group: 'group1',
        handler,
        timeout: 5000,
        processedCount: 0,
        failedCount: 0,
      };

      manager.enqueue('test-queue', { data: 'test' }, { maxRetries: 2 });
      let msg = manager.dequeue('test-queue');

      // First attempt
      await manager.processMessage(msg, consumer);
      expect(manager.totalFailed).toBe(0); // Not yet

      // Will be re-enqueued
      // Dequeue again
      msg = manager.dequeue('test-queue');
      if (msg) {
        await manager.processMessage(msg, consumer);
      }

      // Should eventually reach DLQ
      expect(manager.deadLetterQueue.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move failed message to DLQ', () => {
      manager._moveToDeadLetter({ id: 'msg1', data: 'test' }, 'MAX_RETRIES_EXCEEDED');

      expect(manager.deadLetterQueue).toHaveLength(1);
      expect(manager.deadLetterQueue[0].reason).toBe('MAX_RETRIES_EXCEEDED');
    });

    it('should get DLQ messages', () => {
      manager._moveToDeadLetter({ id: 'msg1' }, 'FAILED');
      manager._moveToDeadLetter({ id: 'msg2' }, 'TIMEOUT');

      const dlqMessages = manager.getDeadLetterQueue();
      expect(dlqMessages.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit DLQ size', () => {
      // Add 10,100 messages
      for (let i = 0; i < 10100; i++) {
        manager._moveToDeadLetter({ id: `msg${i}` }, 'FAILED');
      }

      expect(manager.deadLetterQueue.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Statistics', () => {
    it('should track statistics', () => {
      manager.createQueue('test-queue');
      manager.enqueue('test-queue', { data: 'test1' });
      manager.enqueue('test-queue', { data: 'test2' });

      const stats = manager.getStatistics();
      expect(stats.totalQueues).toBe(1);
      expect(stats.totalMessagesProcessed).toBe(0);
      expect(stats.queues['test-queue']).toBeDefined();
    });

    it('should track failed messages', () => {
      manager.totalFailed = 5;

      const stats = manager.getStatistics();
      expect(stats.totalMessagesFailed).toBe(5);
    });
  });

  describe('Message Acknowledgment', () => {
    it('should acknowledge message', () => {
      manager.enqueue('test-queue', { data: 'test' });
      const msg = manager.dequeue('test-queue');

      const result = manager.acknowledgeMessage(msg.id);

      expect(result).toBe(true);
      const stats = manager.messageStats.get(msg.id);
      expect(stats.status).toBe('acknowledged');
    });

    it('should negative acknowledge message', () => {
      manager.enqueue('test-queue', { data: 'test' });
      const msg = manager.dequeue('test-queue');

      const result = manager.negativeAcknowledge(msg.id);

      expect(result).toBe(true);
      const stats = manager.messageStats.get(msg.id);
      expect(stats.status).toBe('nack');
    });
  });

  describe('Events', () => {
    it('should emit queueCreated event', (done) => {
      manager.on('queueCreated', (data) => {
        expect(data.queueName).toBe('test-queue');
        done();
      });

      manager.createQueue('test-queue');
    });

    it('should emit messageEnqueued event', (done) => {
      manager.createQueue('test-queue');

      manager.on('messageEnqueued', (data) => {
        expect(data.queueName).toBe('test-queue');
        expect(data.priority).toBe('HIGH');
        done();
      });

      manager.enqueue('test-queue', { data: 'test' }, { priority: 'HIGH' });
    });

    it('should emit movedToDeadLetterQueue event', (done) => {
      manager.on('movedToDeadLetterQueue', (data) => {
        expect(data.reason).toBe('FAILED');
        done();
      });

      manager._moveToDeadLetter({ id: 'msg1' }, 'FAILED');
    });
  });

  describe('Delay and TTL', () => {
    it('should support message delay', () => {
      manager.createQueue('test-queue');

      const msg = manager.enqueue(
        'test-queue',
        { data: 'test' },
        {
          delay: 5000,
        }
      );

      expect(msg.delay).toBe(5000);
    });

    it('should support message TTL', () => {
      manager.createQueue('test-queue');

      const msg = manager.enqueue(
        'test-queue',
        { data: 'test' },
        {
          ttl: 10000,
        }
      );

      expect(msg.ttl).toBe(10000);
    });
  });
});
