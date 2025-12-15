/* global WebSocket */
/**
 * Collaborative Editing Client
 * Connects to WebSocket server for real-time multi-user editing
 */

/**
 * Client for collaborative editing
 */
export class CollaborativeClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'ws://localhost:8765';
    this.userId = options.userId || this.generateUserId();
    this.userName = options.userName || `User-${this.userId.substring(0, 6)}`;
    this.color = options.color || null;
    this.sessionId = null;
    this.ws = null;
    this.connected = false;
    this.callbacks = new Map();
    this.localOperationQueue = [];
    this.pendingOperations = 0;
  }

  /**
   * Connect to server and join session
   */
  async connect(sessionId) {
    return new Promise((resolve, reject) => {
      this.sessionId = sessionId;

      try {
        this.ws = new WebSocket(this.serverUrl);
      } catch (err) {
        reject(new Error(`Failed to create WebSocket: ${err.message}`));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        if (this.ws) {
          this.ws.close();
        }
      }, 5000);

      this.ws.onopen = () => {
        clearTimeout(timeout);
        this.connected = true;

        // Join session
        this.send({
          type: 'join',
          payload: {
            sessionId: this.sessionId,
            userId: this.userId,
            userName: this.userName,
            color: this.color,
          },
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);

          if (message.type === 'joined') {
            resolve(message.payload);
          }
        } catch (err) {
          console.error('Error handling message:', err);
        }
      };

      this.ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error('WebSocket error:', err);
        reject(err);
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.trigger('disconnected');
      };
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.send({
        type: 'leave',
        payload: {},
      });
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /**
   * Send local operation to server
   */
  sendOperation(operation) {
    if (!this.connected) {
      console.warn('Not connected to collaborative server');
      return;
    }

    this.pendingOperations++;
    this.localOperationQueue.push(operation);

    this.send({
      type: 'operation',
      payload: {
        ...operation,
        baseVersion: this.getVersion(),
      },
    });
  }

  /**
   * Update cursor position
   */
  updateCursor(cursor) {
    if (!this.connected) return;

    this.send({
      type: 'cursor',
      payload: cursor,
    });
  }

  /**
   * Send chat message
   */
  sendChat(message) {
    if (!this.connected) return;

    this.send({
      type: 'chat',
      payload: { message },
    });
  }

  /**
   * Handle incoming message
   */
  handleMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'joined':
        this.trigger('joined', payload);
        break;
      case 'user-joined':
        this.trigger('user-joined', payload);
        break;
      case 'user-left':
        this.trigger('user-left', payload);
        break;
      case 'operation':
        this.handleRemoteOperation(payload);
        break;
      case 'cursor':
        this.trigger('cursor', payload);
        break;
      case 'chat':
        this.trigger('chat', payload);
        break;
      case 'error':
        console.error('Server error:', payload.error);
        this.trigger('error', payload);
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }

  /**
   * Handle remote operation
   */
  handleRemoteOperation(payload) {
    // Transform against pending local operations
    let transformedOp = payload;

    for (const localOp of this.localOperationQueue) {
      transformedOp = this.transformPair(transformedOp, localOp);
    }

    this.trigger('remote-operation', transformedOp);
  }

  /**
   * Transform two operations against each other
   * (Same logic as server-side)
   */
  transformPair(op1, op2) {
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        return { ...op1, position: op1.position + op2.text.length };
      }
      return op1;
    }

    if (op1.type === 'insert' && op2.type === 'delete') {
      if (op2.position < op1.position) {
        return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      }
      return op1;
    }

    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        return { ...op1, position: op1.position + op2.text.length };
      }
      return op1;
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op2.position < op1.position) {
        return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      }
      return op1;
    }

    return op1;
  }

  /**
   * Clear pending operations
   */
  clearPendingOperations() {
    this.localOperationQueue = [];
    this.pendingOperations = 0;
  }

  /**
   * Get current version (operation count)
   */
  getVersion() {
    return this.localOperationQueue.length;
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Register event callback
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * Remove event callback
   */
  off(event, callback) {
    if (!this.callbacks.has(event)) return;
    const callbacks = this.callbacks.get(event);
    const index = callbacks.indexOf(callback);
    if (index >= 0) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Trigger event
   */
  trigger(event, data) {
    if (!this.callbacks.has(event)) return;
    const callbacks = this.callbacks.get(event);
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`Error in ${event} callback:`, err);
      }
    });
  }

  /**
   * Generate unique user ID
   */
  generateUserId() {
    return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get connection status
   */
  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get user info
   */
  getUserInfo() {
    return {
      userId: this.userId,
      userName: this.userName,
      color: this.color,
      sessionId: this.sessionId,
    };
  }
}
