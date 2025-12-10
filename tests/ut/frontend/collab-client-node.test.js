/**
 * Node.js-compatible tests for collab-client module
 * Tests core logic without browser globals
 */

describe('CollabClient core logic (Node.js)', () => {
  let CollabClient;

  beforeAll(async () => {
    // Mock browser globals for Node.js environment
    global.WebSocket = class MockWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 0; // CONNECTING
        setTimeout(() => {
          this.readyState = 1; // OPEN
          if (this.onopen) this.onopen();
        }, 10);
      }

      send(data) {
        this.lastSent = data;
      }

      close() {
        this.readyState = 3; // CLOSED
        if (this.onclose) this.onclose();
      }
    };

    // Import after mocking globals (use dynamic import for ES modules)
    const module = await import('../../../Simulator/web/js/collab-client.mjs');
    CollabClient = module.CollabClient || module.default;
  });

  afterAll(() => {
    delete global.WebSocket;
  });

  it('exports CollabClient class or function', () => {
    expect(CollabClient).toBeDefined();
    expect(typeof CollabClient).toBe('function');
  });

  it('creates client with URL', () => {
    const client = new CollabClient('ws://localhost:3000/collab');
    expect(client).toBeDefined();
    expect(client.url || client._url).toContain('localhost:3000');
  });

  it('handles connection lifecycle', (done) => {
    const client = new CollabClient('ws://localhost:3000/collab');

    client.on('connected', () => {
      expect(client.isConnected || client.connected).toBe(true);
      client.disconnect();
    });

    client.on('disconnected', () => {
      expect(client.isConnected || client.connected).toBe(false);
      done();
    });
  }, 1000);

  it('queues messages before connection', () => {
    const client = new CollabClient('ws://localhost:3000/collab');

    // Send before connection completes
    client.send({ type: 'test', data: 'value' });

    // Should queue or handle gracefully
    expect(client._messageQueue || client.queue).toBeDefined();
  });

  it('formats messages with type and clientId', (done) => {
    const client = new CollabClient('ws://localhost:3000/collab');

    client.on('connected', () => {
      const message = { type: 'gcode', data: 'G0 X10' };
      client.send(message);

      const ws = client._ws || client.ws;
      const sent = JSON.parse(ws.lastSent);

      expect(sent.type).toBe('gcode');
      expect(sent.clientId).toBeDefined();

      client.disconnect();
      done();
    });
  }, 1000);
});
