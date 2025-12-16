/**
 * Unit tests for websocket-server.mjs
 */

import {
  CollaborativeSession,
  CollaborativeServer,
} from '../../../modules/backend/websocket-server.mjs';

describe('CollaborativeSession', () => {
  let session;

  beforeEach(() => {
    session = new CollaborativeSession('test-session');
  });

  test('initializes with correct properties', () => {
    expect(session.sessionId).toBe('test-session');
    expect(session.clients.size).toBe(0);
    expect(session.gcode).toBe('');
    expect(session.operationHistory).toEqual([]);
  });

  test('addClient adds client to session', () => {
    session.addClient('user1', { userName: 'Alice', color: '#ff0000' });

    expect(session.clients.size).toBe(1);
    expect(session.clients.has('user1')).toBe(true);

    const client = session.clients.get('user1');
    expect(client.userName).toBe('Alice');
    expect(client.color).toBe('#ff0000');
  });

  test('removeClient removes client from session', () => {
    session.addClient('user1', { userName: 'Alice' });
    session.removeClient('user1');

    expect(session.clients.size).toBe(0);
  });

  test('updateCursor updates client cursor position', () => {
    session.addClient('user1', { userName: 'Alice' });

    const cursor = { start: 10, end: 15 };
    session.updateCursor('user1', cursor);

    const client = session.clients.get('user1');
    expect(client.cursor).toEqual(cursor);
  });

  test('applyOperation inserts text', () => {
    const operation = {
      type: 'insert',
      position: 0,
      text: 'G0 X10',
    };

    session.applyOperation('user1', operation);

    expect(session.gcode).toBe('G0 X10');
    expect(session.operationHistory).toHaveLength(1);
  });

  test('applyOperation deletes text', () => {
    session.gcode = 'G0 X10 Y20';

    const operation = {
      type: 'delete',
      position: 6,
      length: 4,
    };

    session.applyOperation('user1', operation);

    expect(session.gcode).toBe('G0 X10');
  });

  test('transformPair handles insert-insert conflict', () => {
    const op1 = { type: 'insert', position: 5, text: 'A' };
    const op2 = { type: 'insert', position: 3, text: 'B' };

    const transformed = session.transformPair(op1, op2);

    expect(transformed.position).toBe(6); // Adjusted for op2
  });

  test('transformPair handles insert-delete conflict', () => {
    const op1 = { type: 'insert', position: 10, text: 'X' };
    const op2 = { type: 'delete', position: 5, length: 3 };

    const transformed = session.transformPair(op1, op2);

    expect(transformed.position).toBe(7); // 10 - 3
  });

  test('transformPair handles delete-insert conflict', () => {
    const op1 = { type: 'delete', position: 10, length: 2 };
    const op2 = { type: 'insert', position: 5, text: 'ABC' };

    const transformed = session.transformPair(op1, op2);

    expect(transformed.position).toBe(13); // 10 + 3
  });

  test('getState returns session state', () => {
    session.addClient('user1', { userName: 'Alice' });
    session.gcode = 'G0 X10';

    const state = session.getState();

    expect(state.sessionId).toBe('test-session');
    expect(state.gcode).toBe('G0 X10');
    expect(state.clients).toHaveLength(1);
  });

  test('emits events on client operations', () => {
    let joinCalled = false;
    let leaveCalled = false;
    let joinData = null;

    const joinHandler = (data) => {
      joinCalled = true;
      joinData = data;
    };

    const leaveHandler = () => {
      leaveCalled = true;
    };

    session.on('client-joined', joinHandler);
    session.on('client-left', leaveHandler);

    session.addClient('user1', { userName: 'Alice' });
    expect(joinCalled).toBe(true);
    expect(joinData).toEqual({
      userId: 'user1',
      userData: { userName: 'Alice' },
    });

    session.removeClient('user1');
    expect(leaveCalled).toBe(true);
  });

  test('multiple operations maintain correct content', () => {
    const now = Date.now();

    // Start with empty
    session.applyOperation('user1', {
      type: 'insert',
      position: 0,
      text: 'G0 X10',
      baseVersion: now,
    });
    expect(session.gcode).toBe('G0 X10');

    const after1 = Date.now();

    // Insert at position 6
    session.applyOperation('user2', {
      type: 'insert',
      position: 6,
      text: ' Y20',
      baseVersion: after1,
    });
    expect(session.gcode).toBe('G0 X10 Y20');

    const after2 = Date.now();

    // Delete 3 chars at position 7 (deletes "Y20")
    session.applyOperation('user1', {
      type: 'delete',
      position: 7,
      length: 3,
      baseVersion: after2,
    });
    expect(session.gcode).toBe('G0 X10 ');
  });
});

describe('CollaborativeServer', () => {
  let server;

  beforeEach(() => {
    server = new CollaborativeServer({ port: 8766 });
  });

  afterEach(async () => {
    if (server && server.wss) {
      await server.stop();
      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    server = null;
  });

  test('initializes with default port', () => {
    const defaultServer = new CollaborativeServer();
    expect(defaultServer.port).toBe(8765);
  });

  test('initializes with custom port', () => {
    expect(server.port).toBe(8766);
  });

  test('starts WebSocket server', () => {
    server.start();
    expect(server.wss).toBeDefined();
  });

  test('stops WebSocket server', () => {
    server.start();
    server.stop();
    // Server should close gracefully
  });

  test('generateColor returns valid color', () => {
    const color = server.generateColor();
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test('getStats returns server statistics', () => {
    const stats = server.getStats();

    expect(stats).toHaveProperty('activeSessions');
    expect(stats).toHaveProperty('activeClients');
    expect(stats).toHaveProperty('sessions');
    expect(stats.activeSessions).toBe(0);
    expect(stats.activeClients).toBe(0);
  });

  test('creates session on first client join', () => {
    let sendCalled = false;
    // let sentData = null; // Reserved for future message validation

    const mockWs = {
      send: (/* data */) => {
        sendCalled = true;
        // sentData = data;
      },
      readyState: 1,
    };

    server.handleJoin(mockWs, {
      sessionId: 'test-session',
      userId: 'user1',
      userName: 'Alice',
      color: '#ff0000',
    });

    expect(server.sessions.has('test-session')).toBe(true);
    expect(server.clients.has(mockWs)).toBe(true);
    expect(sendCalled).toBe(true);
  });

  test('broadcast sends to all clients except sender', () => {
    let ws1SendCalled = false;
    let ws2SendCalled = false;
    let ws2Data = null;

    const ws1 = {
      send: () => {
        ws1SendCalled = true;
      },
      readyState: 1,
    };

    const ws2 = {
      send: (data) => {
        ws2SendCalled = true;
        ws2Data = data;
      },
      readyState: 1,
    };

    server.clients.set(ws1, { sessionId: 'test', userId: 'user1' });
    server.clients.set(ws2, { sessionId: 'test', userId: 'user2' });

    const message = { type: 'test', payload: {} };
    server.broadcast('test', ws1, message);

    expect(ws1SendCalled).toBe(false);
    expect(ws2SendCalled).toBe(true);
    expect(JSON.parse(ws2Data)).toEqual(message);
  });
});
