/**
 * WebSocket Manager
 * Phase 19: Advanced Integration
 *
 * Manages WebSocket connections for real-time communication:
 * - Client connection tracking
 * - Message broadcasting
 * - Channel subscription management
 * - Heartbeat/keepalive
 * - Binary and text message support
 */

export class WebSocketManager {
  constructor(options = {}) {
    this.options = {
      enableHeartbeat: options.enableHeartbeat !== false,
      heartbeatInterval: options.heartbeatInterval || 30000,
      maxMessageSize: options.maxMessageSize || 1048576, // 1MB
      maxConnections: options.maxConnections || 10000,
      enableBinarySupport: options.enableBinarySupport !== false,
      enableCompression: options.enableCompression !== false,
      ...options,
    };

    this.clients = new Map();
    this.channels = new Map();
    this.messageHistory = [];
    this.listeners = {};
    this.connectionCount = 0;
    this.messageCount = 0;
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
   * Handle new WebSocket connection
   */
  handleConnection(clientId, ws) {
    if (this.clients.size >= this.options.maxConnections) {
      ws.close(1008, 'Server at capacity');
      return;
    }

    const client = {
      id: clientId,
      ws,
      connectedAt: Date.now(),
      subscriptions: new Set(),
      messageCount: 0,
      lastActivity: Date.now(),
    };

    this.clients.set(clientId, client);
    this.connectionCount += 1;

    this.emit('clientConnected', { clientId, totalClients: this.clients.size });

    // Start heartbeat if enabled
    if (this.options.enableHeartbeat) {
      this._startHeartbeat(clientId);
    }

    return client;
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    // Unsubscribe from all channels
    for (const channel of client.subscriptions) {
      this.unsubscribe(clientId, channel);
    }

    this.clients.delete(clientId);

    this.emit('clientDisconnected', {
      clientId,
      messageCount: client.messageCount,
      duration: Date.now() - client.connectedAt,
      totalClients: this.clients.size,
    });
  }

  /**
   * Subscribe client to channel
   */
  subscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }

    this.channels.get(channel).add(clientId);
    client.subscriptions.add(channel);

    this.emit('subscribed', { clientId, channel });
    return true;
  }

  /**
   * Unsubscribe client from channel
   */
  unsubscribe(clientId, channel) {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    if (this.channels.has(channel)) {
      this.channels.get(channel).delete(clientId);
      if (this.channels.get(channel).size === 0) {
        this.channels.delete(channel);
      }
    }

    client.subscriptions.delete(channel);

    this.emit('unsubscribed', { clientId, channel });
    return true;
  }

  /**
   * Broadcast message to channel
   */
  broadcast(channel, message, options = {}) {
    if (!this.channels.has(channel)) {
      return 0;
    }

    const subscribers = Array.from(this.channels.get(channel));
    let sentCount = 0;

    for (const clientId of subscribers) {
      if (this.sendToClient(clientId, message, options)) {
        sentCount += 1;
      }
    }

    this.messageCount += 1;

    this.emit('broadcast', {
      channel,
      subscribers: subscribers.length,
      sent: sentCount,
      timestamp: Date.now(),
    });

    return sentCount;
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message, options = {}) {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    try {
      const payload = {
        type: options.type || 'message',
        data: message,
        timestamp: Date.now(),
        id: options.messageId || this._generateMessageId(),
      };

      const serialized =
        this.options.enableBinarySupport && options.binary
          ? Buffer.from(JSON.stringify(payload))
          : JSON.stringify(payload);

      if (serialized.length > this.options.maxMessageSize) {
        this.emit('messageTooLarge', {
          clientId,
          size: serialized.length,
          max: this.options.maxMessageSize,
        });
        return false;
      }

      // Simulate sending
      client.messageCount += 1;
      client.lastActivity = Date.now();

      this.messageHistory.push({
        clientId,
        message: payload,
        sentAt: Date.now(),
      });

      // Keep history limited
      if (this.messageHistory.length > 10000) {
        this.messageHistory.shift();
      }

      return true;
    } catch (error) {
      this.emit('sendError', { clientId, error: error.message });
      return false;
    }
  }

  /**
   * Start heartbeat for client
   */
  _startHeartbeat(clientId) {
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }

    const heartbeatId = setInterval(() => {
      if (!this.clients.has(clientId)) {
        clearInterval(heartbeatId);
        return;
      }

      const elapsed = Date.now() - client.lastActivity;
      if (elapsed > this.options.heartbeatInterval * 2) {
        // Client appears dead
        this.handleDisconnection(clientId);
        clearInterval(heartbeatId);
        return;
      }

      this.sendToClient(clientId, { type: 'ping' }, { type: 'ping' });
    }, this.options.heartbeatInterval);
  }

  /**
   * Generate unique message ID
   */
  _generateMessageId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get channel subscribers
   */
  getChannelSubscribers(channel) {
    if (!this.channels.has(channel)) {
      return [];
    }

    return Array.from(this.channels.get(channel));
  }

  /**
   * Get client subscriptions
   */
  getClientSubscriptions(clientId) {
    const client = this.clients.get(clientId);
    if (!client) {
      return [];
    }

    return Array.from(client.subscriptions);
  }

  /**
   * Get connection statistics
   */
  getStatistics() {
    return {
      totalConnections: this.connectionCount,
      activeConnections: this.clients.size,
      totalChannels: this.channels.size,
      totalMessages: this.messageCount,
      messageHistorySize: this.messageHistory.length,
      avgMessagesPerClient:
        this.clients.size > 0 ? Math.round(this.messageCount / this.clients.size) : 0,
    };
  }

  /**
   * Get client information
   */
  getClientInfo(clientId) {
    const client = this.clients.get(clientId);
    if (!client) {
      return null;
    }

    return {
      id: client.id,
      connectedAt: client.connectedAt,
      uptime: Date.now() - client.connectedAt,
      subscriptions: Array.from(client.subscriptions),
      messageCount: client.messageCount,
      lastActivity: client.lastActivity,
    };
  }

  /**
   * Get all clients
   */
  getAllClients() {
    const clients = [];
    for (const [clientId, client] of this.clients.entries()) {
      clients.push({
        id: clientId,
        uptime: Date.now() - client.connectedAt,
        subscriptions: client.subscriptions.size,
        messageCount: client.messageCount,
      });
    }
    return clients;
  }

  /**
   * Close client connection
   */
  closeConnection(clientId, code = 1000, reason = 'Normal closure') {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    this.handleDisconnection(clientId);
    this.emit('connectionClosed', { clientId, code, reason });
    return true;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(message, options = {}) {
    let sentCount = 0;

    for (const clientId of this.clients.keys()) {
      if (this.sendToClient(clientId, message, options)) {
        sentCount += 1;
      }
    }

    this.messageCount += 1;

    this.emit('broadcastAll', {
      totalClients: this.clients.size,
      sent: sentCount,
      timestamp: Date.now(),
    });

    return sentCount;
  }
}
