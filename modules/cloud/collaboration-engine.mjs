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
      throw new Error('Session join requires projectId and userId');
    }

    const { userId, projectId, userName = 'User', userColor = this._generateColor() } = params;

    // Check concurrent user limit
    if (this.activeUsers.size >= this.options.maxConcurrentUsers) {
      throw new Error('Max concurrent users reached');
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

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const joinEvent = {
      sessionId,
      userId,
      userName,
      projectId,
      status: 'ACTIVE',
      activeUsers: this.activeUsers.size,
      userList: this._getUserList(projectId),
      documentVersion: this.documentStates.get(projectId).version,
      timestamp: Date.now(),
    };

    this.messageQueue.push(joinEvent);
    this.emit('session:joined', joinEvent);

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
      status: 'LEFT',
      activeUsers: this.activeUsers.size,
      timestamp: Date.now(),
    };

    this.messageQueue.push(leaveEvent);
    this.emit('session:left', leaveEvent);

    return leaveEvent;
  }

  /**
   * Submit edit operation
   */
  submitEdit(params) {
    if (!params || !params.userId || !params.projectId || params.operation === undefined) {
      throw new Error('Edit submission requires userId, projectId, and operation');
    }

    const { userId, projectId } = params;
    let operation = params.operation;

    // Accept both test-friendly shape and internal OT shape
    if (operation.type === 'INSERT' || operation.type === 'insert') {
      operation = {
        type: 'insert',
        position: operation.pos ?? operation.position,
        content: operation.text ?? operation.content,
      };
    }

    // Allow replies from users who may not be actively connected
    const user = this.activeUsers.get(userId) || { userName: userId, userColor: null };

    const docState = this.documentStates.get(projectId);
    if (!docState) {
      throw new Error('Document not found');
    }

    // Apply Operational Transformation
    const transformedOp = this._applyOperationalTransform(projectId, operation);

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const opEntry = {
      operationId,
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
      operationId,
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
    if (!params || !params.userId || !params.projectId || !params.text) {
      throw new Error('Comment requires text');
    }

    const { userId, projectId, text, lineNumber = 0 } = params;

    // Allow replies from users who may not be actively connected
    const user = this.activeUsers.get(userId) || { userName: userId, userColor: null };

    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const comment = {
      commentId,
      userId,
      userName: user.userName,
      userColor: user.userColor,
      projectId,
      text,
      lineNumber,
      createdAt: Date.now(),
      replies: [],
      resolved: false,
    };

    const projectComments = this.comments.get(projectId);
    projectComments.push(comment);

    const commentEvent = {
      action: 'COMMENT_ADDED',
      commentId,
      userId,
      text,
      lineNumber,
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
    if (!params || !params.userId || !params.projectId || !params.commentId || !params.text) {
      throw new Error('Reply requires text');
    }

    const { userId, projectId, commentId, text } = params;

    const user = this.activeUsers.get(userId) || { userName: userId, userColor: null };

    const projectComments = this.comments.get(projectId);
    const comment = projectComments.find((c) => c.commentId === commentId);
    if (!comment) {
      throw new Error(`Comment not found: ${commentId}`);
    }

    const replyId = `rpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const reply = {
      replyId,
      userId,
      userName: user.userName,
      userColor: user.userColor,
      text,
      createdAt: Date.now(),
    };

    comment.replies.push(reply);

    const replyEvent = {
      action: 'COMMENT_REPLY_ADDED',
      commentId,
      replyId,
      userId,
      text,
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
        lastPresence: Date.now() - u.lastSeen,
      }));

    if (projectId) {
      return users;
    }

    return {
      projectId: 'all',
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

    return ops.slice(-limit).map((op) => ({
      operationId: op.operationId,
      userId: op.userId,
      version: op.version,
      operation: op.operation,
      timestamp: op.timestamp,
    }));
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

    return comments.map((c) => ({
      commentId: c.commentId,
      userId: c.userId,
      userName: c.userName,
      text: c.text,
      lineNumber: c.lineNumber,
      createdAt: c.createdAt,
      replyCount: c.replies.length,
      resolved: c.resolved,
      replies: c.replies,
    }));
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
    let totalOps = 0;
    let totalComments = 0;

    this.operations.forEach((ops) => {
      totalOps += ops.length;
    });

    this.comments.forEach((comments) => {
      totalComments += comments.length;
    });

    const activeProjects = new Set();
    this.activeUsers.forEach((u) => activeProjects.add(u.projectId));

    return {
      activeSessions: activeProjects.size,
      activeUsers: this.activeUsers.size,
      totalEdits: totalOps,
      totalComments,
      queuedMessages: this.messageQueue.length,
    };
  }
}

export default CollaborationEngine;
