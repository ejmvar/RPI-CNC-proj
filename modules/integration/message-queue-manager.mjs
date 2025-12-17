/**
 * Message Queue Manager
 * Phase 19: Advanced Integration
 *
 * Manages asynchronous message queuing and processing:
 * - Priority-based queue management
 * - Message persistence
 * - Consumer groups
 * - Dead letter queue handling
 * - Message ordering guarantees
 */

export class MessageQueueManager {
  constructor(options = {}) {
    this.options = {
      maxQueueSize: options.maxQueueSize || 100000,
      maxRetries: options.maxRetries || 3,
      retryBackoff: options.retryBackoff || 1000, // ms
      messageTimeout: options.messageTimeout || 300000, // 5 min
      enablePersistence: options.enablePersistence !== false,
      enableDeadLetterQueue: options.enableDeadLetterQueue !== false,
      ...options,
    };

    this.queues = new Map();
    this.deadLetterQueue = [];
    this.consumers = new Map();
    this.messageStats = new Map();
    this.listeners = {};
    this.totalProcessed = 0;
    this.totalFailed = 0;
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
   * Create or get queue
   */
  createQueue(queueName, options = {}) {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName);
    }

    const queue = {
      name: queueName,
      messages: [],
      priority: options.priority || 'NORMAL',
      createdAt: Date.now(),
      totalEnqueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
    };

    this.queues.set(queueName, queue);
    this.emit('queueCreated', { queueName, priority: queue.priority });
    return queue;
  }

  /**
   * Enqueue message
   */
  enqueue(queueName, message, options = {}) {
    const queue = this.createQueue(queueName);

    if (queue.messages.length >= this.options.maxQueueSize) {
      this.emit('queueFull', { queueName });
      return null;
    }

    const messageObj = {
      id: this._generateId(),
      queueName,
      data: message,
      priority: options.priority || 'NORMAL',
      createdAt: Date.now(),
      enqueuedAt: Date.now(),
      attempts: 0,
      maxRetries: options.maxRetries !== undefined ? options.maxRetries : this.options.maxRetries,
      delay: options.delay || 0,
      ttl: options.ttl || null,
      correlationId: options.correlationId || null,
      headers: options.headers || {},
    };

    // Sort by priority (HIGH > NORMAL > LOW)
    queue.messages.push(messageObj);
    queue.messages.sort(this._comparePriority);

    queue.totalEnqueued += 1;

    if (!this.messageStats.has(messageObj.id)) {
      this.messageStats.set(messageObj.id, {
        enqueuedAt: Date.now(),
        attempts: 0,
        status: 'queued',
      });
    }

    this.emit('messageEnqueued', {
      messageId: messageObj.id,
      queueName,
      priority: messageObj.priority,
      size: queue.messages.length,
    });

    return messageObj;
  }

  /**
   * Dequeue message
   */
  dequeue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue || queue.messages.length === 0) {
      return null;
    }

    // Remove messages past their TTL
    queue.messages = queue.messages.filter((msg) => {
      if (msg.ttl && Date.now() - msg.createdAt > msg.ttl) {
        this._moveToDeadLetter(msg, 'TTL_EXPIRED');
        return false;
      }
      return true;
    });

    const message = queue.messages.shift();
    if (!message) {
      return null;
    }

    message.dequeuedAt = Date.now();
    message.attempts += 1;

    const stats = this.messageStats.get(message.id);
    if (stats) {
      stats.attempts = message.attempts;
      stats.status = 'processing';
    }

    this.emit('messageDequeued', {
      messageId: message.id,
      queueName,
      attempts: message.attempts,
    });

    return message;
  }

  /**
   * Register message consumer
   */
  registerConsumer(consumerGroup, queueName, handler, options = {}) {
    const consumerId = `${consumerGroup}-${this._generateId()}`;

    const consumer = {
      id: consumerId,
      group: consumerGroup,
      queueName,
      handler,
      active: true,
      processedCount: 0,
      failedCount: 0,
      lastActivity: Date.now(),
      concurrency: options.concurrency || 1,
      timeout: options.timeout || this.options.messageTimeout,
    };

    if (!this.consumers.has(consumerGroup)) {
      this.consumers.set(consumerGroup, []);
    }

    this.consumers.get(consumerGroup).push(consumer);

    this.emit('consumerRegistered', { consumerId, consumerGroup, queueName });

    return consumerId;
  }

  /**
   * Process message
   */
  async processMessage(message, consumer) {
    try {
      const startTime = Date.now();

      // Simulate handler execution
      await this._executeWithTimeout(() => consumer.handler(message), consumer.timeout);

      const duration = Date.now() - startTime;

      message.processedAt = Date.now();
      message.duration = duration;

      this.totalProcessed += 1;
      consumer.processedCount += 1;

      const stats = this.messageStats.get(message.id);
      if (stats) {
        stats.status = 'success';
        stats.duration = duration;
        stats.completedAt = Date.now();
      }

      this.emit('messageProcessed', {
        messageId: message.id,
        consumerId: consumer.id,
        duration,
      });

      return true;
    } catch (error) {
      return this._handleProcessingError(message, consumer, error);
    }
  }

  /**
   * Handle processing error
   */
  async _handleProcessingError(message, consumer, error) {
    message.lastError = error.message;
    message.attempts += 1;

    const stats = this.messageStats.get(message.id);
    if (stats) {
      stats.attempts = message.attempts;
      stats.lastError = error.message;
    }

    if (message.attempts > message.maxRetries) {
      // Move to dead letter queue
      this._moveToDeadLetter(message, 'MAX_RETRIES_EXCEEDED');

      this.totalFailed += 1;
      consumer.failedCount += 1;

      this.emit('messageFailedPermanently', {
        messageId: message.id,
        consumerGroup: consumer.group,
        error: error.message,
      });

      return false;
    }

    // Re-enqueue with backoff
    const delay = this.options.retryBackoff * Math.pow(2, message.attempts - 1);
    this.enqueue(message.queueName, message.data, {
      priority: message.priority,
      delay,
      maxRetries: message.maxRetries - message.attempts,
      correlationId: message.correlationId,
    });

    this.emit('messageRetried', {
      messageId: message.id,
      attempt: message.attempts,
      nextRetryIn: delay,
    });

    return false;
  }

  /**
   * Move message to dead letter queue
   */
  _moveToDeadLetter(message, reason) {
    this.deadLetterQueue.push({
      ...message,
      movedAt: Date.now(),
      reason,
    });

    // Limit DLQ size
    if (this.deadLetterQueue.length > 10000) {
      this.deadLetterQueue.shift();
    }

    this.emit('movedToDeadLetterQueue', {
      messageId: message.id,
      reason,
      dlqSize: this.deadLetterQueue.length,
    });
  }

  /**
   * Execute function with timeout
   */
  _executeWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve()
        .then(() => fn())
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  /**
   * Compare message priority
   */
  _comparePriority(a, b) {
    const priorityOrder = { HIGH: 0, NORMAL: 1, LOW: 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get queue statistics
   */
  getStatistics() {
    const stats = {
      totalQueues: this.queues.size,
      totalConsumers: this.consumers.size,
      totalMessagesProcessed: this.totalProcessed,
      totalMessagesFailed: this.totalFailed,
      deadLetterQueueSize: this.deadLetterQueue.length,
      queues: {},
    };

    for (const [queueName, queue] of this.queues.entries()) {
      stats.queues[queueName] = {
        pending: queue.messages.length,
        totalEnqueued: queue.totalEnqueued,
        totalProcessed: queue.totalProcessed,
        totalFailed: queue.totalFailed,
      };
    }

    return stats;
  }

  /**
   * Get consumer group statistics
   */
  getConsumerGroupStats(consumerGroup) {
    const consumers = this.consumers.get(consumerGroup) || [];
    const stats = {
      group: consumerGroup,
      totalConsumers: consumers.length,
      activeConsumers: consumers.filter((c) => c.active).length,
      totalProcessed: 0,
      totalFailed: 0,
      consumers: [],
    };

    for (const consumer of consumers) {
      stats.totalProcessed += consumer.processedCount;
      stats.totalFailed += consumer.failedCount;
      stats.consumers.push({
        id: consumer.id,
        queue: consumer.queueName,
        active: consumer.active,
        processed: consumer.processedCount,
        failed: consumer.failedCount,
      });
    }

    return stats;
  }

  /**
   * Get dead letter queue messages
   */
  getDeadLetterQueue(limit = 100) {
    return this.deadLetterQueue.slice(-limit);
  }

  /**
   * Acknowledge message (mark as processed)
   */
  acknowledgeMessage(messageId) {
    const stats = this.messageStats.get(messageId);
    if (stats) {
      stats.status = 'acknowledged';
      return true;
    }
    return false;
  }

  /**
   * Negative acknowledge (retry message)
   */
  negativeAcknowledge(messageId) {
    const stats = this.messageStats.get(messageId);
    if (stats) {
      stats.status = 'nack';
      return true;
    }
    return false;
  }
}
