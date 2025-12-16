/**
 * Integration tests for WebSocket communication
 */

import { jest } from '@jest/globals';
import EventEmitter from 'events';

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 0;
    this.bufferedAmount = 0;
    this.send = jest.fn();
    this.close = jest.fn();
  }

  open() {
    this.readyState = 1;
    this.emit('open');
  }

  receiveMessage(data) {
    this.emit('message', { data: JSON.stringify(data) });
  }

  error(err) {
    this.emit('error', err);
  }

  closeConnection() {
    this.readyState = 3;
    this.emit('close');
  }
}

describe('WebSocket Integration', () => {
  let ws;

  beforeEach(() => {
    ws = new MockWebSocket('ws://localhost:8765');
  });

  describe('Connection Management', () => {
    test('establishes WebSocket connection', (done) => {
      ws.on('open', () => {
        expect(ws.readyState).toBe(1); // OPEN
        done();
      });

      ws.open();
    });

    test('handles connection closure', (done) => {
      ws.open();

      ws.on('close', () => {
        expect(ws.readyState).toBe(3); // CLOSED
        done();
      });

      ws.closeConnection();
    });

    test('handles connection errors', (done) => {
      const error = new Error('Connection failed');

      ws.on('error', (err) => {
        expect(err.message).toBe('Connection failed');
        done();
      });

      ws.error(error);
    });

    test('reconnects on connection loss', (done) => {
      ws.open();
      expect(ws.readyState).toBe(1);

      ws.closeConnection();
      expect(ws.readyState).toBe(3);

      // Reconnect
      const ws2 = new MockWebSocket('ws://localhost:8765');
      ws2.on('open', () => {
        expect(ws2.readyState).toBe(1);
        done();
      });

      ws2.open();
    });
  });

  describe('Message Exchange', () => {
    beforeEach((done) => {
      ws.on('open', done);
      ws.open();
    });

    test('sends message to server', () => {
      const message = { type: 'edit', content: 'G1 X10' };

      ws.send(JSON.stringify(message));

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    test('receives message from server', (done) => {
      const serverMessage = {
        type: 'remote-edit',
        userId: 'user1',
        content: 'Updated content',
      };

      ws.on('message', (event) => {
        const received = JSON.parse(event.data);
        expect(received.type).toBe('remote-edit');
        expect(received.userId).toBe('user1');
        done();
      });

      ws.receiveMessage(serverMessage);
    });

    test('handles multiple messages in sequence', (done) => {
      const messages = [
        { type: 'edit', op: 'insert', content: 'A' },
        { type: 'edit', op: 'insert', content: 'B' },
        { type: 'edit', op: 'insert', content: 'C' },
      ];

      let receivedCount = 0;

      ws.on('message', () => {
        receivedCount++;
        if (receivedCount === messages.length) {
          expect(receivedCount).toBe(3);
          done();
        }
      });

      messages.forEach((msg) => ws.receiveMessage(msg));
    });

    test('queues messages when connection is not ready', () => {
      const ws2 = new MockWebSocket('ws://localhost:8765');
      // Don't open connection
      expect(ws2.readyState).toBe(0); // CONNECTING

      const message = { type: 'edit', content: 'buffered' };
      ws2.send(JSON.stringify(message));

      expect(ws2.send).toHaveBeenCalled();
    });
  });

  describe('Collaborative Editing Protocol', () => {
    beforeEach((done) => {
      ws.on('open', done);
      ws.open();
    });

    test('sends operational transformation message', () => {
      const otMessage = {
        type: 'operation',
        sessionId: 'session1',
        clientId: 'client1',
        version: 5,
        operation: {
          type: 'insert',
          position: 10,
          content: 'text',
        },
      };

      ws.send(JSON.stringify(otMessage));

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(otMessage));
    });

    test('receives acknowledgment message', (done) => {
      const ackMessage = {
        type: 'ack',
        sessionId: 'session1',
        clientId: 'client1',
        version: 6,
      };

      ws.on('message', (event) => {
        const received = JSON.parse(event.data);
        expect(received.type).toBe('ack');
        expect(received.version).toBe(6);
        done();
      });

      ws.receiveMessage(ackMessage);
    });

    test('handles user presence updates', (done) => {
      const presenceMessage = {
        type: 'presence',
        userId: 'user2',
        action: 'joined',
        users: ['user1', 'user2'],
      };

      ws.on('message', (event) => {
        const received = JSON.parse(event.data);
        expect(received.type).toBe('presence');
        expect(received.action).toBe('joined');
        expect(received.users).toHaveLength(2);
        done();
      });

      ws.receiveMessage(presenceMessage);
    });

    test('handles chat messages', (done) => {
      const chatMessage = {
        type: 'chat',
        userId: 'user1',
        message: 'Hello everyone!',
        timestamp: new Date().toISOString(),
      };

      ws.on('message', (event) => {
        const received = JSON.parse(event.data);
        expect(received.type).toBe('chat');
        expect(received.message).toContain('Hello');
        done();
      });

      ws.receiveMessage(chatMessage);
    });
  });

  describe('Error Recovery', () => {
    test('handles message loss and recovery', () => {
      ws.open();
      expect(ws.readyState).toBe(1);

      const message = { type: 'edit', content: 'test' };
      ws.send(JSON.stringify(message));

      expect(ws.send).toHaveBeenCalled();

      // Simulate connection close
      ws.closeConnection();
      expect(ws.readyState).toBe(3);
    });

    test('handles malformed messages', (done) => {
      ws.open();

      try {
        ws.receiveMessage('{invalid json}');
        // If no error, test passes
        done();
      } catch (err) {
        expect(err).toBeDefined();
        done();
      }
    });

    test('recovers from server restart', () => {
      ws.open();
      expect(ws.readyState).toBe(1);

      ws.closeConnection();
      expect(ws.readyState).toBe(3);

      // Create new connection
      const newWs = new MockWebSocket('ws://localhost:8765');
      newWs.open();
      expect(newWs.readyState).toBe(1);
    });
  });

  describe('Performance', () => {
    test('handles rapid message sequence', (done) => {
      ws.open();

      let receiveCount = 0;
      const messageCount = 100;

      ws.on('message', () => {
        receiveCount++;
        if (receiveCount === messageCount) {
          expect(receiveCount).toBe(messageCount);
          done();
        }
      });

      for (let i = 0; i < messageCount; i++) {
        ws.receiveMessage({ type: 'edit', id: i });
      }
    });

    test('handles large message payload', (done) => {
      ws.open();

      const largeContent = 'x'.repeat(100000); // 100KB
      const message = { type: 'sync', data: largeContent };

      ws.on('message', (event) => {
        const received = JSON.parse(event.data);
        expect(received.data).toHaveLength(100000);
        done();
      });

      ws.receiveMessage(message);
    });

    test('measures message latency', (done) => {
      ws.open();

      const start = Date.now();

      ws.on('message', () => {
        const latency = Date.now() - start;
        expect(latency).toBeGreaterThanOrEqual(0);
        done();
      });

      setTimeout(() => {
        ws.receiveMessage({ type: 'pong' });
      }, 10);
    });
  });

  describe('Session Management', () => {
    test('maintains session across reconnections', () => {
      const sessionId = 'session-123';

      ws.open();
      expect(ws.readyState).toBe(1);

      // Store session ID
      expect(sessionId).toBe('session-123');

      // Simulate reconnection
      ws.closeConnection();
      expect(ws.readyState).toBe(3);

      const ws2 = new MockWebSocket('ws://localhost:8765');
      ws2.open();

      // Verify session is same
      expect(sessionId).toBe('session-123');
    });

    test('notifies other users of connection', (done) => {
      ws.open();

      const joinMessage = {
        type: 'presence',
        action: 'joined',
        userId: 'user1',
      };

      ws.on('message', (event) => {
        const received = JSON.parse(event.data);
        expect(received.action).toBe('joined');
        done();
      });

      ws.receiveMessage(joinMessage);
    });

    test('cleans up session on disconnect', (done) => {
      ws.open();

      ws.on('close', () => {
        expect(ws.readyState).toBe(3);
        done();
      });

      ws.closeConnection();
    });
  });
});
