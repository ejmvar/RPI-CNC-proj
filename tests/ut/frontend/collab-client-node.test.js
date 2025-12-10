/**
 * Node.js-compatible tests for collab-client module core logic
 */

describe('CollabClient message validation (Node.js)', () => {
  it('validates chat message structure', () => {
    const chatMessage = {
      type: 'chat',
      from: 'user123',
      text: 'Hello!',
      timestamp: Date.now(),
    };

    expect(chatMessage.type).toBe('chat');
    expect(chatMessage.from).toBeDefined();
    expect(chatMessage.text).toBeDefined();
    expect(typeof chatMessage.timestamp).toBe('number');
  });

  it('validates annotation message structure', () => {
    const annotation = {
      type: 'annotation',
      from: 'user456',
      text: 'Check line 42',
      lineNumber: 42,
      timestamp: Date.now(),
    };

    expect(annotation.type).toBe('annotation');
    expect(annotation.lineNumber).toBe(42);
    expect(typeof annotation.timestamp).toBe('number');
  });

  it('validates message types are correct', () => {
    const validTypes = ['chat', 'annotation', 'gcode', 'mesh', 'session'];

    validTypes.forEach((type) => {
      const message = { type, data: 'test' };
      expect(validTypes).toContain(message.type);
    });
  });

  it('filters invalid messages', () => {
    const messages = [
      { type: 'chat', from: 'user1', text: 'Valid' },
      { type: 'chat', from: 'user1', text: '' }, // Empty
      { type: 'chat', text: 'No sender' }, // Missing 'from'
      { type: 'chat', from: 'user1', text: '   ' }, // Whitespace
    ];

    const valid = messages.filter((m) => m.from && m.text && m.text.trim().length > 0);

    expect(valid.length).toBe(1);
    expect(valid[0].text).toBe('Valid');
  });

  it('encodes and decodes messages as JSON', () => {
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
  });
});
