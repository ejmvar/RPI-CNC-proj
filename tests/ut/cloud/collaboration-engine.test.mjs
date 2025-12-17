/**
 * Unit Tests: Real-time Collaboration Engine
 * Phase 17: Cloud Integration & Collaboration
 */

import CollaborationEngine from '../../../modules/cloud/collaboration-engine.mjs';

describe('CollaborationEngine', () => {
  let engine;

  beforeEach(() => {
    engine = new CollaborationEngine({
      maxConcurrentUsers: 50,
      messageQueueCapacity: 1000,
      presenceTimeoutMs: 30000,
    });
  });

  describe('joinSession', () => {
    test('should join session successfully', () => {
      const session = engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
        userColor: '#FF0000',
      });

      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe('user_456');
      expect(session.status).toBe('ACTIVE');
    });

    test('should throw error without projectId', () => {
      expect(() => {
        engine.joinSession({
          userId: 'user_456',
          userName: 'Alice',
        });
      }).toThrow('Session join requires projectId and userId');
    });

    test('should limit concurrent users', () => {
      const smallEngine = new CollaborationEngine({ maxConcurrentUsers: 2 });

      smallEngine.joinSession({
        projectId: 'proj_123',
        userId: 'user_1',
        userName: 'User1',
      });

      smallEngine.joinSession({
        projectId: 'proj_123',
        userId: 'user_2',
        userName: 'User2',
      });

      expect(() => {
        smallEngine.joinSession({
          projectId: 'proj_123',
          userId: 'user_3',
          userName: 'User3',
        });
      }).toThrow('Max concurrent users reached');
    });

    test('should emit session joined event', (done) => {
      engine.on('session:joined', (data) => {
        expect(data.userId).toBe('user_456');
        expect(data.userName).toBe('Alice');
        done();
      });

      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });
    });
  });

  describe('leaveSession', () => {
    test('should leave session successfully', () => {
      const session = engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      const leave = engine.leaveSession({
        projectId: 'proj_123',
        userId: 'user_456',
      });

      expect(leave.status).toBe('LEFT');
    });

    test('should emit session left event', (done) => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      engine.on('session:left', (data) => {
        expect(data.userId).toBe('user_456');
        done();
      });

      engine.leaveSession({
        projectId: 'proj_123',
        userId: 'user_456',
      });
    });
  });

  describe('submitEdit', () => {
    test('should submit edit operation', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      const edit = engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_456',
        operation: { type: 'INSERT', pos: 0, text: 'G01 X10' },
      });

      expect(edit.operationId).toBeDefined();
      expect(edit.version).toBeGreaterThan(0);
    });

    test('should apply Operational Transformation', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_1',
        userName: 'User1',
      });

      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_2',
        userName: 'User2',
      });

      const edit1 = engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_1',
        operation: { type: 'INSERT', pos: 0, text: 'A' },
      });

      const edit2 = engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_2',
        operation: { type: 'INSERT', pos: 0, text: 'B' },
      });

      expect(edit1.version).toBeDefined();
      expect(edit2.version).toBeDefined();
    });

    test('should emit edit submitted event', (done) => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      engine.on('edit:submitted', (data) => {
        expect(data.operationId).toBeDefined();
        done();
      });

      engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_456',
        operation: { type: 'INSERT', pos: 0, text: 'test' },
      });
    });
  });

  describe('addComment', () => {
    test('should add comment to document', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      const comment = engine.addComment({
        projectId: 'proj_123',
        userId: 'user_456',
        lineNumber: 5,
        text: 'This needs fixing',
      });

      expect(comment.commentId).toBeDefined();
      expect(comment.lineNumber).toBe(5);
      expect(comment.text).toBe('This needs fixing');
    });

    test('should throw error without comment text', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      expect(() => {
        engine.addComment({
          projectId: 'proj_123',
          userId: 'user_456',
          lineNumber: 5,
        });
      }).toThrow('Comment requires text');
    });

    test('should emit comment added event', (done) => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      engine.on('comment:added', (data) => {
        expect(data.text).toBe('Review this');
        done();
      });

      engine.addComment({
        projectId: 'proj_123',
        userId: 'user_456',
        lineNumber: 10,
        text: 'Review this',
      });
    });
  });

  describe('replyToComment', () => {
    test('should reply to comment', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      const comment = engine.addComment({
        projectId: 'proj_123',
        userId: 'user_456',
        lineNumber: 5,
        text: 'This needs fixing',
      });

      const reply = engine.replyToComment({
        projectId: 'proj_123',
        userId: 'user_789',
        commentId: comment.commentId,
        text: 'I agree, will fix it',
      });

      expect(reply.replyId).toBeDefined();
      expect(reply.text).toBe('I agree, will fix it');
    });

    test('should build comment thread', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_1',
        userName: 'User1',
      });

      const comment = engine.addComment({
        projectId: 'proj_123',
        userId: 'user_1',
        lineNumber: 5,
        text: 'Issue 1',
      });

      engine.replyToComment({
        projectId: 'proj_123',
        userId: 'user_2',
        commentId: comment.commentId,
        text: 'Response 1',
      });

      engine.replyToComment({
        projectId: 'proj_123',
        userId: 'user_3',
        commentId: comment.commentId,
        text: 'Response 2',
      });

      const comments = engine.getComments({ projectId: 'proj_123' });
      const thread = comments.find((c) => c.commentId === comment.commentId);

      expect(thread.replies.length).toBe(2);
    });
  });

  describe('getActiveUsers', () => {
    test('should return all active users in session', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_1',
        userName: 'User1',
        userColor: '#FF0000',
      });

      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_2',
        userName: 'User2',
        userColor: '#00FF00',
      });

      const users = engine.getActiveUsers({ projectId: 'proj_123' });

      expect(users.length).toBe(2);
      expect(users[0].userName).toBe('User1');
      expect(users[1].userName).toBe('User2');
    });

    test('should track user presence', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      const users = engine.getActiveUsers({ projectId: 'proj_123' });

      expect(users[0].status).toBe('ACTIVE');
      expect(users[0].lastPresence).toBeDefined();
    });
  });

  describe('getChangeHistory', () => {
    test('should return operation history', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_456',
        operation: { type: 'INSERT', pos: 0, text: 'test1' },
      });

      engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_456',
        operation: { type: 'INSERT', pos: 5, text: 'test2' },
      });

      const history = engine.getChangeHistory({ projectId: 'proj_123' });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].operationId).toBeDefined();
    });

    test('should include version information', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_456',
        operation: { type: 'INSERT', pos: 0, text: 'v1' },
      });

      const history = engine.getChangeHistory({ projectId: 'proj_123' });

      expect(history[0].version).toBeDefined();
      expect(history[0].timestamp).toBeDefined();
    });
  });

  describe('getComments', () => {
    test('should return all comments for project', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      engine.addComment({
        projectId: 'proj_123',
        userId: 'user_456',
        lineNumber: 5,
        text: 'Comment 1',
      });

      engine.addComment({
        projectId: 'proj_123',
        userId: 'user_456',
        lineNumber: 10,
        text: 'Comment 2',
      });

      const comments = engine.getComments({ projectId: 'proj_123' });

      expect(comments.length).toBe(2);
      expect(comments[0].text).toBe('Comment 1');
    });
  });

  describe('event system', () => {
    test('should emit edit submitted event', (done) => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_456',
        userName: 'Alice',
      });

      engine.on('edit:submitted', () => {
        done();
      });

      engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_456',
        operation: { type: 'INSERT', pos: 0, text: 'test' },
      });
    });
  });

  describe('statistics', () => {
    test('should return session statistics', () => {
      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_1',
        userName: 'User1',
      });

      engine.joinSession({
        projectId: 'proj_123',
        userId: 'user_2',
        userName: 'User2',
      });

      engine.submitEdit({
        projectId: 'proj_123',
        userId: 'user_1',
        operation: { type: 'INSERT', pos: 0, text: 'test' },
      });

      const stats = engine.getStatistics();

      expect(stats.activeSessions).toBeGreaterThan(0);
      expect(stats.activeUsers).toBe(2);
      expect(stats.totalEdits).toBeGreaterThan(0);
    });
  });
});
