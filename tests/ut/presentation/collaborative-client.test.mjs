/**
 * Unit tests for collaborative-client.mjs
 */

import { CollaborativeClient } from '../../../modules/presentation/collaborative-client.mjs';

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  static get OPEN() {
    return 1;
  }
  static get CONNECTING() {
    return 0;
  }
  static get CLOSING() {
    return 2;
  }
  static get CLOSED() {
    return 3;
  }

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    this.sentMessages = [];

    // Store reference for manual triggering
    const ws = this;

    // Simulate connection after short delay
    setTimeout(() => {
      ws.readyState = MockWebSocket.OPEN;
      // Call onopen if it was set
      if (ws.onopen) {
        ws.onopen();
      }
    }, 15);
  }

  send(data) {
    this.sentMessages.push(JSON.parse(data));
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }

  // Helper to simulate receiving message
  simulateMessage(message) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(message) });
    }
  }
};

describe('CollaborativeClient', () => {
  let client;

  beforeEach(() => {
    client = new CollaborativeClient({
      serverUrl: 'ws://localhost:8765',
      userName: 'TestUser',
    });
  });

  afterEach(() => {
    if (client.isConnected()) {
      client.disconnect();
    }
  });

  test('initializes with correct properties', () => {
    expect(client.serverUrl).toBe('ws://localhost:8765');
    expect(client.userName).toBe('TestUser');
    expect(client.connected).toBe(false);
    expect(client.sessionId).toBeNull();
  });

  test('generates user ID if not provided', () => {
    expect(client.userId).toBeDefined();
    expect(client.userId).toMatch(/^user-/);
  });

  test('connect establishes WebSocket connection', async () => {
    const connectPromise = client.connect('test-session');

    // Simulate server response
    setTimeout(() => {
      client.ws.simulateMessage({
        type: 'joined',
        payload: {
          sessionId: 'test-session',
          gcode: '',
          clients: [],
        },
      });
    }, 20);

    const state = await connectPromise;

    expect(client.connected).toBe(true);
    expect(client.sessionId).toBe('test-session');
    expect(state).toHaveProperty('sessionId');
  });

  test('disconnect closes WebSocket connection', async () => {
    const connectPromise = client.connect('test-session');
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.ws.simulateMessage({
      type: 'joined',
      payload: { sessionId: 'test-session', gcode: '', clients: [] },
    });

    await connectPromise;

    client.disconnect();

    expect(client.connected).toBe(false);
    expect(client.ws).toBeNull();
  });

  test('sendOperation sends operation to server', async () => {
    const connectPromise = client.connect('test-session');

    // Wait longer for mock WebSocket to open (10ms) and send join message
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.ws.simulateMessage({
      type: 'joined',
      payload: { sessionId: 'test-session', gcode: '', clients: [] },
    });

    await connectPromise;

    // Check connection status
    expect(client.isConnected()).toBe(true);
    expect(client.connected).toBe(true);

    const operation = {
      type: 'insert',
      position: 0,
      text: 'G0 X10',
    };

    client.sendOperation(operation);

    expect(client.ws).not.toBeNull();
    expect(client.ws.sentMessages).toBeDefined();
    expect(client.ws.sentMessages.length).toBeGreaterThan(0);

    const opMessage = client.ws.sentMessages.find((m) => m.type === 'operation');

    expect(opMessage).toBeDefined();
    expect(opMessage.payload.type).toBe('insert');
    expect(opMessage.payload.text).toBe('G0 X10');
  });

  test('updateCursor sends cursor position', async () => {
    const connectPromise = client.connect('test-session');
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.ws.simulateMessage({
      type: 'joined',
      payload: { sessionId: 'test-session', gcode: '', clients: [] },
    });

    await connectPromise;

    const cursor = { start: 10, end: 15 };
    client.updateCursor(cursor);

    const sentMessages = client.ws.sentMessages;
    const cursorMessage = sentMessages.find((m) => m.type === 'cursor');

    expect(cursorMessage).toBeDefined();
    expect(cursorMessage.payload).toEqual(cursor);
  });

  test('sendChat sends chat message', async () => {
    const connectPromise = client.connect('test-session');
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.ws.simulateMessage({
      type: 'joined',
      payload: { sessionId: 'test-session', gcode: '', clients: [] },
    });

    await connectPromise;

    client.sendChat('Hello world');

    const sentMessages = client.ws.sentMessages;
    const chatMessage = sentMessages.find((m) => m.type === 'chat');

    expect(chatMessage).toBeDefined();
    expect(chatMessage.payload.message).toBe('Hello world');
  });

  test('on registers event callback', () => {
    let callbackCalled = false;
    let callbackData = null;

    const callback = (data) => {
      callbackCalled = true;
      callbackData = data;
    };

    client.on('test-event', callback);
    client.trigger('test-event', { data: 'test' });

    expect(callbackCalled).toBe(true);
    expect(callbackData).toEqual({ data: 'test' });
  });

  test('off removes event callback', () => {
    let callbackCalled = false;

    const callback = () => {
      callbackCalled = true;
    };

    client.on('test-event', callback);
    client.off('test-event', callback);

    client.trigger('test-event', {});

    expect(callbackCalled).toBe(false);
  });

  test('transformPair handles insert-insert correctly', () => {
    const op1 = { type: 'insert', position: 10, text: 'A' };
    const op2 = { type: 'insert', position: 5, text: 'B' };

    const transformed = client.transformPair(op1, op2);

    expect(transformed.position).toBe(11); // 10 + 1
  });

  test('transformPair handles insert-delete correctly', () => {
    const op1 = { type: 'insert', position: 10, text: 'A' };
    const op2 = { type: 'delete', position: 5, length: 3 };

    const transformed = client.transformPair(op1, op2);

    expect(transformed.position).toBe(7); // max(5, 10 - 3)
  });

  test('getUserInfo returns user information', () => {
    client.sessionId = 'test-session';

    const info = client.getUserInfo();

    expect(info.userId).toBe(client.userId);
    expect(info.userName).toBe('TestUser');
    expect(info.sessionId).toBe('test-session');
  });

  test('isConnected returns connection status', async () => {
    expect(client.isConnected()).toBe(false);

    // Start connection
    const connectPromise = client.connect('test-session');

    // Wait for mock WebSocket to "open"
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check if onopen was called
    expect(client.connected).toBe(true); // Should be true after onopen
    expect(client.ws).not.toBeNull(); // WebSocket should exist

    // Now simulate server joining response
    client.ws.simulateMessage({
      type: 'joined',
      payload: { sessionId: 'test-session', gcode: '', clients: [] },
    });

    // Wait for promise to resolve
    await connectPromise;

    // Final check
    expect(client.connected).toBe(true); // Still connected?
    expect(client.isConnected()).toBe(true);
  });

  test('handles remote operation event', async () => {
    const connectPromise = client.connect('test-session');
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.ws.simulateMessage({
      type: 'joined',
      payload: { sessionId: 'test-session', gcode: '', clients: [] },
    });

    await connectPromise;

    let remoteOpCalled = false;
    let remoteOpData = null;
    client.on('remote-operation', (data) => {
      remoteOpCalled = true;
      remoteOpData = data;
    });

    client.ws.simulateMessage({
      type: 'operation',
      payload: {
        type: 'insert',
        position: 0,
        text: 'G0 X10',
        userId: 'other-user',
      },
    });

    expect(remoteOpCalled).toBe(true);
    expect(remoteOpData).toBeDefined();
  });

  test('handles user joined event', async () => {
    const connectPromise = client.connect('test-session');
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.ws.simulateMessage({
      type: 'joined',
      payload: { sessionId: 'test-session', gcode: '', clients: [] },
    });

    await connectPromise;

    let userJoinedCalled = false;
    let userData = null;
    client.on('user-joined', (data) => {
      userJoinedCalled = true;
      userData = data;
    });

    client.ws.simulateMessage({
      type: 'user-joined',
      payload: {
        userId: 'user2',
        userName: 'Alice',
        color: '#ff0000',
      },
    });

    expect(userJoinedCalled).toBe(true);
    expect(userData).toEqual({
      userId: 'user2',
      userName: 'Alice',
      color: '#ff0000',
    });
  });

  test('handles chat message event', async () => {
    const connectPromise = client.connect('test-session');
    await new Promise((resolve) => setTimeout(resolve, 50));

    client.ws.simulateMessage({
      type: 'joined',
      payload: { sessionId: 'test-session', gcode: '', clients: [] },
    });

    await connectPromise;

    let chatCalled = false;
    let chatData = null;
    client.on('chat', (data) => {
      chatCalled = true;
      chatData = data;
    });

    client.ws.simulateMessage({
      type: 'chat',
      payload: {
        userId: 'user2',
        userName: 'Alice',
        message: 'Hello!',
        timestamp: Date.now(),
      },
    });

    expect(chatCalled).toBe(true);
    expect(chatData.message).toBe('Hello!');
  });
});
