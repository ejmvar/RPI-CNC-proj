/**
 * WebSocket Server for Collaborative Editing
 * Manages real-time multi-user G-Code editing sessions
 */

import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

/**
 * Session manager for collaborative editing
 */
export class CollaborativeSession extends EventEmitter {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
    this.clients = new Map(); // userId -> client data
    this.gcode = ''; // Current G-Code content
    this.operationHistory = []; // Operational transformation history
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  /**
   * Add a client to the session
   */
  addClient(userId, userData) {
    this.clients.set(userId, {
      ...userData,
      userId,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      cursor: null,
    });
    this.lastActivity = Date.now();
    this.emit('client-joined', { userId, userData });
  }

  /**
   * Remove a client from the session
   */
  removeClient(userId) {
    const client = this.clients.get(userId);
    this.clients.delete(userId);
    this.lastActivity = Date.now();
    this.emit('client-left', { userId, client });
  }

  /**
   * Update client cursor position
   */
  updateCursor(userId, cursor) {
    const client = this.clients.get(userId);
    if (client) {
      client.cursor = cursor;
      client.lastSeen = Date.now();
      this.emit('cursor-moved', { userId, cursor });
    }
  }

  /**
   * Apply operation to G-Code content
   */
  applyOperation(userId, operation) {
    const transformedOp = this.transformOperation(operation);

    // Apply to content
    this.gcode = this.applyOperationToContent(this.gcode, transformedOp);

    // Add to history
    this.operationHistory.push({
      ...transformedOp,
      userId,
      timestamp: Date.now(),
    });

    this.lastActivity = Date.now();
    this.emit('operation-applied', { userId, operation: transformedOp });

    return transformedOp;
  }

  /**
   * Transform operation against concurrent operations
   * Implements basic operational transformation
   */
  transformOperation(operation) {
    // Get concurrent operations since this operation was created
    const concurrentOps = this.operationHistory.filter(
      (op) => op.timestamp > (operation.baseVersion || 0)
    );

    let transformedOp = { ...operation };

    // Transform against each concurrent operation
    for (const concurrentOp of concurrentOps) {
      transformedOp = this.transformPair(transformedOp, concurrentOp);
    }

    return transformedOp;
  }

  /**
   * Transform two operations against each other
   */
  transformPair(op1, op2) {
    // Insert-Insert transformation
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        return { ...op1, position: op1.position + op2.text.length };
      }
      return op1;
    }

    // Insert-Delete transformation
    if (op1.type === 'insert' && op2.type === 'delete') {
      if (op2.position < op1.position) {
        return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      }
      return op1;
    }

    // Delete-Insert transformation
    if (op1.type === 'delete' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        return { ...op1, position: op1.position + op2.text.length };
      }
      return op1;
    }

    // Delete-Delete transformation
    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op2.position < op1.position) {
        return { ...op1, position: Math.max(op2.position, op1.position - op2.length) };
      }
      return op1;
    }

    return op1;
  }

  /**
   * Apply operation to content string
   */
  applyOperationToContent(content, operation) {
    if (operation.type === 'insert') {
      return (
        content.substring(0, operation.position) +
        operation.text +
        content.substring(operation.position)
      );
    }

    if (operation.type === 'delete') {
      return (
        content.substring(0, operation.position) +
        content.substring(operation.position + operation.length)
      );
    }

    return content;
  }

  /**
   * Get session state for new clients
   */
  getState() {
    return {
      sessionId: this.sessionId,
      gcode: this.gcode,
      clients: Array.from(this.clients.values()),
      operationHistory: this.operationHistory,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
    };
  }
}

/**
 * WebSocket Server for collaborative editing
 */
export class CollaborativeServer {
  constructor(options = {}) {
    this.port = options.port || 8765;
    this.sessions = new Map(); // sessionId -> CollaborativeSession
    this.clients = new Map(); // ws -> client metadata
    this.wss = null;
  }

  /**
   * Start the WebSocket server
   */
  start() {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws, req) => {
      console.log('Client connected from', req.socket.remoteAddress);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (err) {
          console.error('Error handling message:', err);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
      });
    });

    console.log(`Collaborative editing server started on port ${this.port}`);
  }

  /**
   * Stop the WebSocket server
   */
  stop() {
    if (this.wss) {
      this.wss.close();
      console.log('Collaborative editing server stopped');
    }
  }

  /**
   * Handle incoming message
   */
  handleMessage(ws, message) {
    const { type, payload } = message;

    switch (type) {
      case 'join':
        this.handleJoin(ws, payload);
        break;
      case 'operation':
        this.handleOperation(ws, payload);
        break;
      case 'cursor':
        this.handleCursor(ws, payload);
        break;
      case 'chat':
        this.handleChat(ws, payload);
        break;
      case 'leave':
        this.handleLeave(ws, payload);
        break;
      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  /**
   * Handle client joining a session
   */
  handleJoin(ws, payload) {
    const { sessionId, userId, userName, color } = payload;

    // Create session if it doesn't exist
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new CollaborativeSession(sessionId));
    }

    const session = this.sessions.get(sessionId);

    // Store client metadata
    this.clients.set(ws, {
      sessionId,
      userId,
      userName,
      color: color || this.generateColor(),
    });

    // Add client to session
    session.addClient(userId, { userName, color });

    // Send initial state to client
    this.send(ws, {
      type: 'joined',
      payload: session.getState(),
    });

    // Notify other clients
    this.broadcast(sessionId, ws, {
      type: 'user-joined',
      payload: { userId, userName, color },
    });

    // Setup session event handlers
    this.setupSessionEvents(session);
  }

  /**
   * Handle client operation
   */
  handleOperation(ws, payload) {
    const client = this.clients.get(ws);
    if (!client) return;

    const session = this.sessions.get(client.sessionId);
    if (!session) return;

    const transformedOp = session.applyOperation(client.userId, payload);

    // Broadcast to all clients except sender
    this.broadcast(client.sessionId, ws, {
      type: 'operation',
      payload: {
        ...transformedOp,
        userId: client.userId,
      },
    });
  }

  /**
   * Handle cursor update
   */
  handleCursor(ws, payload) {
    const client = this.clients.get(ws);
    if (!client) return;

    const session = this.sessions.get(client.sessionId);
    if (!session) return;

    session.updateCursor(client.userId, payload);

    // Broadcast to all clients except sender
    this.broadcast(client.sessionId, ws, {
      type: 'cursor',
      payload: {
        userId: client.userId,
        cursor: payload,
      },
    });
  }

  /**
   * Handle chat message
   */
  handleChat(ws, payload) {
    const client = this.clients.get(ws);
    if (!client) return;

    // Broadcast to all clients in session
    this.broadcast(client.sessionId, null, {
      type: 'chat',
      payload: {
        userId: client.userId,
        userName: client.userName,
        message: payload.message,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Handle client leaving
   */
  handleLeave(ws, payload) {
    this.handleDisconnect(ws);
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(ws) {
    const client = this.clients.get(ws);
    if (!client) return;

    const session = this.sessions.get(client.sessionId);
    if (session) {
      session.removeClient(client.userId);

      // Notify other clients
      this.broadcast(client.sessionId, ws, {
        type: 'user-left',
        payload: { userId: client.userId },
      });

      // Clean up empty sessions
      if (session.clients.size === 0) {
        this.sessions.delete(client.sessionId);
        console.log(`Session ${client.sessionId} closed (no clients)`);
      }
    }

    this.clients.delete(ws);
  }

  /**
   * Setup session event handlers
   */
  setupSessionEvents(session) {
    // Only setup once
    if (session._eventsSetup) return;
    session._eventsSetup = true;

    session.on('operation-applied', ({ userId, operation }) => {
      console.log(`Operation applied in ${session.sessionId} by ${userId}`);
    });

    session.on('cursor-moved', ({ userId, cursor }) => {
      // Already broadcast in handleCursor
    });
  }

  /**
   * Send message to a client
   */
  send(ws, message) {
    if (ws.readyState === 1) {
      // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to a client
   */
  sendError(ws, error) {
    this.send(ws, {
      type: 'error',
      payload: { error },
    });
  }

  /**
   * Broadcast message to all clients in a session
   */
  broadcast(sessionId, excludeWs, message) {
    this.clients.forEach((client, ws) => {
      if (client.sessionId === sessionId && ws !== excludeWs) {
        this.send(ws, message);
      }
    });
  }

  /**
   * Generate random color for user
   */
  generateColor() {
    const colors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      activeClients: this.clients.size,
      sessions: Array.from(this.sessions.values()).map((session) => ({
        sessionId: session.sessionId,
        clients: session.clients.size,
        gcodeLength: session.gcode.length,
        operations: session.operationHistory.length,
        lastActivity: session.lastActivity,
      })),
    };
  }
}

// Export singleton instance
let serverInstance = null;

export function getCollaborativeServer(options) {
  if (!serverInstance) {
    serverInstance = new CollaborativeServer(options);
  }
  return serverInstance;
}
