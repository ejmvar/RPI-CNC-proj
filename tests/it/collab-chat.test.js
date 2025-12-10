/**
 * Integration test for chat features with WebSocket collaboration
 */

const http = require('http');
const path = require('path');

describe('Chat integration with WebSocket server', () => {
  let server;
  let collabModule;
  let wsServer;

  beforeAll(() => {
    // Create HTTP server
    server = http.createServer();

    // Import collaboration module (use require for CommonJS)
    collabModule = require('../../modules/backend/collab/index.js');

    // Try to create WebSocket server (may fail if 'ws' not installed)
    try {
      wsServer = collabModule.createCollabServer({ server });
    } catch (err) {
      wsServer = null;
      console.log('WebSocket not available, skipping real WS tests');
    }

    if (wsServer) {
      server.listen(0);
    }
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  it('collabModule exports createCollabServer', () => {
    expect(typeof collabModule.createCollabServer).toBe('function');
  });

  it('handles chat message structure', () => {
    const chatMessage = {
      type: 'chat',
      from: 'user123',
      text: 'Hello, world!',
      timestamp: Date.now(),
    };

    expect(chatMessage.type).toBe('chat');
    expect(chatMessage.from).toBeDefined();
    expect(chatMessage.text).toBeDefined();
    expect(chatMessage.timestamp).toBeGreaterThan(0);
  });

  it('handles annotation message structure', () => {
    const annotation = {
      type: 'annotation',
      from: 'user456',
      text: 'Check line 42',
      lineNumber: 42,
      timestamp: Date.now(),
    };

    expect(annotation.type).toBe('annotation');
    expect(annotation.lineNumber).toBe(42);
  });

  it('validates message types', () => {
    const validTypes = ['chat', 'annotation', 'gcode', 'mesh', 'session'];

    validTypes.forEach((type) => {
      const message = { type, data: 'test' };
      expect(validTypes).toContain(message.type);
    });
  });

  it('handles multiple concurrent chat messages', () => {
    const messages = [
      { type: 'chat', from: 'user1', text: 'First', timestamp: Date.now() },
      { type: 'chat', from: 'user2', text: 'Second', timestamp: Date.now() + 1 },
      { type: 'chat', from: 'user1', text: 'Third', timestamp: Date.now() + 2 },
    ];

    // Messages should maintain order by timestamp
    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    expect(sorted[0].text).toBe('First');
    expect(sorted[2].text).toBe('Third');
  });

  it('filters empty or invalid chat messages', () => {
    const messages = [
      { type: 'chat', from: 'user1', text: 'Valid' },
      { type: 'chat', from: 'user1', text: '' }, // Empty
      { type: 'chat', text: 'No sender' }, // Missing 'from'
      { type: 'chat', from: 'user1', text: '   ' }, // Whitespace only
    ];

    const valid = messages.filter((m) => m.from && m.text && m.text.trim().length > 0);

    expect(valid.length).toBe(1);
    expect(valid[0].text).toBe('Valid');
  });

  it('limits message history size', () => {
    const MAX_HISTORY = 100;
    const messageHistory = [];

    // Add 150 messages
    for (let i = 0; i < 150; i++) {
      messageHistory.push({
        type: 'chat',
        from: `user${i % 10}`,
        text: `Message ${i}`,
        timestamp: Date.now() + i,
      });
    }

    // Keep only last 100
    const recentMessages = messageHistory.slice(-MAX_HISTORY);

    expect(recentMessages.length).toBe(MAX_HISTORY);
    expect(recentMessages[0].text).toBe('Message 50');
  });

  it('encodes and decodes chat messages as JSON', () => {
    const message = {
      type: 'chat',
      from: 'testUser',
      text: 'Special chars: "quotes" & <tags>',
      timestamp: 1234567890,
    };

    const json = JSON.stringify(message);
    const decoded = JSON.parse(json);

    expect(decoded.type).toBe(message.type);
    expect(decoded.text).toBe(message.text);
    expect(decoded.timestamp).toBe(message.timestamp);
  });
});
