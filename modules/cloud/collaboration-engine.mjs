/**
 * Real-time Collaboration Engine
 * Phase 17: Cloud Integration & Collaboration
 *
 * Enables real-time collaborative editing:
 * - WebSocket-based messaging
 * - Operational Transformation (OT) for conflict resolution
 * - Presence tracking
 * - Comment threads
 */

export class CollaborationEngine {
  constructor(options = {}) {
    this.options = {
      maxConcurrentUsers: options.maxConcurrentUsers || 50,
      messageQueueSize: options.messageQueueSize || 1000,
      presenceTimeout: options.presenceTimeout || 30000, // 30 seconds
      conflictResolutionMode: options.conflictResolutionMode || 'OT', // 'OT' or 'CRDT'
      ...options,
    };

    this.activeUsers = new Map(); // userId -> { name, lastSeen, color, status }
    this.documentStates = new Map(); // projectId -> document version and state
    this.operations = new Map(); // projectId -> [{ op, userId, timestamp }]
    this.comments = new Map(); // projectId -> [{ id, userId, content, position }]
    this.messageQueue = [];
    this.listeners = {};
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
   * User joins collaboration session
   */
  joinSession(params) {
    if (!params || !params.userId || !params.projectId) {
      throw new Error('Join session requires userId and projectId');
    }

    const { userId, projectId, userName = 'User', userColor = this._generateColor() } = params;

    // Check concurrent user limit
    if (this.activeUsers.size >= this.options.maxConcurrentUsers) {
      throw new Error('Session at capacity');
    }

    const userData = {
      userId,
      userName,
      projectId,
      userColor,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      status: 'ACTIVE',
      cursorPosition: 0,
      selectedText: null,
    };

    this.activeUsers.set(userId, userData);

    // Initialize document state if needed
    if (!this.documentStates.has(projectId)) {
      this.documentStates.set(projectId, {
        projectId,
        version: 0,
        content: '',
        lastModified: Date.now(),
      });
      this.operations.set(projectId, []);
      this.comments.set(projectId, []);
    }

    const joinEvent = {
      userId,
      projectId,
      action: 'USER_JOINED',
      activeUsers: this.activeUsers.size,
      userList: this._getUserList(projectId),
      documentVersion: this.documentStates.get(projectId).version,
      timestamp: Date.now(),
    };

    this.messageQueue.push(joinEvent);
    this.emit('user:joined', joinEvent);

    return joinEvent;
  }

  /**
   * User leaves collaboration session
   */
  leaveSession(params) {
    if (!params || !params.userId) {
      throw new Error('Leave session requires userId');
    }

    const { userId } = params;

    const user = this.activeUsers.get(userId);
    if (!user) {
      return { message: 'User not in session' };
    }

    const projectId = user.projectId;
    this.activeUsers.delete(userId);

    const leaveEvent = {
      userId,
      projectId,
      action: 'USER_LEFT',
      activeUsers: this.activeUsers.size,
      timestamp: Date.now(),
    };

    this.messageQueue.push(leaveEvent);
    this.emit('user:left', leaveEvent);

    return leaveEvent;
  }

  /**
   * Submit edit operation
   */
  submitEdit(params) {
    if (!params || !params.userId || !params.projectId || params.operation === undefined) {
      throw new Error('Edit submission requires userId, projectId, and operation');
    }

    const { userId, projectId, operation } = params;

    const user = this.activeUsers.get(userId);
    if (!user) {
      throw new Error('User not in active session');
    }

    const docState = this.documentStates.get(projectId);
    if (!docState) {
      throw new Error('Document not found');
    }

    // Apply Operational Transformation
    const transformedOp = this._applyOperationalTransform(projectId, operation);

    const opEntry = {
      userId,
      projectId,
      operation: transformedOp,
      version: docState.version + 1,
      timestamp: Date.now(),
    };

    const ops = this.operations.get(projectId);
    ops.push(opEntry);

    // Update document state
    docState.version++;
    docState.lastModified = Date.now();

    const editEvent = {
      userId,
      projectId,
      operation: transformedOp,
      version: docState.version,
      userColor: user.userColor,
      timestamp: Date.now(),
    };

    this.messageQueue.push(editEvent);
    this.emit('edit:submitted', editEvent);

    return editEvent;
  }

  /**
   * Add comment
   */
  addComment(params) {
    if (!params || !params.userId || !params.projectId || !params.content) {
      throw new Error('Comment requires userId, projectId, and content');
    }

    const { userId, projectId, content, position = 0 } = params;

    const user = this.activeUsers.get(userId);
    if (!user) {
      throw new Error('User not in active session');
    }

    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const comment = {
      id: commentId,
      userId,
      userName: user.userName,
      userColor: user.userColor,
      projectId,
      content,
      position,
      createdAt: Date.now(),
      replies: [],
      resolved: false,
    };

    const projectComments = this.comments.get(projectId);
    projectComments.push(comment);

    const commentEvent = {
      action: 'COMMENT_ADDED',
      comment,
      timestamp: Date.now(),
    };

    this.messageQueue.push(commentEvent);
    this.emit('comment:added', commentEvent);

    return comment;
  }

  /**
   * Reply to comment
   */
  replyToComment(params) {
    if (!params || !params.userId || !params.projectId || !params.commentId || !params.content) {
      throw new Error('Reply requires userId, projectId, commentId, and content');
    }

    const { userId, projectId, commentId, content } = params;

    const user = this.activeUsers.get(userId);
    if (!user) {
      throw new Error('User not in active session');
    }

    const projectComments = this.comments.get(projectId);
    const comment = projectComments.find((c) => c.id === commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    const reply = {
      userId,
      userName: user.userName,
      userColor: user.userColor,
      content,
      createdAt: Date.now(),
    };

    comment.replies.push(reply);

    const replyEvent = {
      action: 'COMMENT_REPLY_ADDED',
      commentId,
      reply,
      timestamp: Date.now(),
    };

    this.messageQueue.push(replyEvent);
    this.emit('comment:replied', replyEvent);

    return reply;
  }

  /**
   * Get active users presence
   */
  getActiveUsers(params) {
    const { projectId } = params || {};

    const users = Array.from(this.activeUsers.values())
      .filter((u) => !projectId || u.projectId === projectId)
      .map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userColor: u.userColor,
        status: u.status,
        cursorPosition: u.cursorPosition,
        connectedFor: Math.floor((Date.now() - u.joinedAt) / 1000),
      }));

    return {
      projectId: projectId || 'all',
      activeUserCount: users.length,
      users,
      timestamp: Date.now(),
    };
  }

  /**
   * Get document change history
   */
  getChangeHistory(params) {
    if (!params || !params.projectId) {
      throw new Error('Change history requires projectId');
    }

    const { projectId, limit = 50 } = params;

    const ops = this.operations.get(projectId) || [];

    return {
      projectId,
      totalChanges: ops.length,
      changes: ops.slice(-limit).map((op) => ({
        userId: op.userId,
        version: op.version,
        operation: op.operation,
        timestamp: op.timestamp,
      })),
      timestamp: Date.now(),
    };
  }

  /**
   * Get all comments for project
   */
  getComments(params) {
    if (!params || !params.projectId) {
      throw new Error('Get comments requires projectId');
    }

    const { projectId, resolved = false } = params;

    const comments = (this.comments.get(projectId) || []).filter((c) => c.resolved === resolved);

    return {
      projectId,
      commentCount: comments.length,
      comments: comments.map((c) => ({
        id: c.id,
        userId: c.userId,
        userName: c.userName,
        content: c.content,
        position: c.position,
        createdAt: c.createdAt,
        replyCount: c.replies.length,
        resolved: c.resolved,
      })),
      timestamp: Date.now(),
    };
  }

  /**
   * Helper: Apply Operational Transformation
   */
  _applyOperationalTransform(projectId, operation) {
    const ops = this.operations.get(projectId);
    let transformed = operation;

    // Simple OT: adjust positions based on concurrent operations
    for (const existingOp of ops) {
      if (existingOp.operation.type === 'insert' && transformed.type === 'insert') {
        if (existingOp.operation.position <= transformed.position) {
          transformed.position += existingOp.operation.content.length;
        }
      }
    }

    return transformed;
  }

  /**
   * Helper: Generate color for user
   */
  _generateColor() {
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
   * Helper: Get user list for project
   */
  _getUserList(projectId) {
    return Array.from(this.activeUsers.values())
      .filter((u) => u.projectId === projectId)
      .map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userColor: u.userColor,
      }));
  }

  /**
   * History management
   */
  getHistory(limit = 50) {
    return this.messageQueue.slice(-limit);
  }

  clearHistory() {
    this.messageQueue = [];
  }

  /**
   * Statistics
   */
  getStatistics() {
    if (this.activeUsers.size === 0) {
      return { message: 'No active users' };
    }

    let totalOps = 0;
    let totalComments = 0;

    this.operations.forEach((ops) => {
      totalOps += ops.length;
    });

    this.comments.forEach((comments) => {
      totalComments += comments.length;
    });

    return {
      activeUsers: this.activeUsers.size,
      maxConcurrentUsers: this.options.maxConcurrentUsers,
      capacityUsed: parseFloat(
        ((this.activeUsers.size / this.options.maxConcurrentUsers) * 100).toFixed(1)
      ),
      totalOperations: totalOps,
      totalComments,
      queuedMessages: this.messageQueue.length,
    };
  }
}

export default CollaborationEngine;
