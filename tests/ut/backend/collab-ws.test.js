const http = require('http');

describe('Collab WebSocket server (optional)', () => {
  test('returns null when ws module missing', () => {
    const { createWsCollabServer } = require('../../../modules/backend/collab/ws-server');
    const s = createWsCollabServer({});
    expect(s).toBeNull();
  });

  test('wires a mock ws.Server and relays collab messages', async () => {
    jest.resetModules();
    jest.doMock('ws', () => {
      class MockSocket {
        constructor() { this._handlers = {}; this.sent = []; }
        on(ev, cb) { this._handlers[ev] = cb; }
        send(msg) { this.sent.push(msg); }
        _trigger(ev, ...args) { if (this._handlers[ev]) this._handlers[ev](...args); }
      }

      class MockServer {
        constructor(opts) { this.opts = opts; this._handlers = {}; }
        on(ev, cb) { this._handlers[ev] = cb; }
        // helper for tests
        _simulateConnection(socket) { if (this._handlers.connection) this._handlers.connection(socket); }
      }

      return { Server: MockServer, MockSocket };
    }, { virtual: true });

    const { createWsCollabServer } = require('../../../modules/backend/collab/ws-server');
    const { createCollabServer } = require('../../../modules/backend/collab/index.js');

    const collab = createCollabServer();
    // fake http server object (not used by mock server but kept for API parity)
    const fakeHttp = http.createServer();

    const wss = createWsCollabServer(collab, { server: fakeHttp, path: '/c' });
    expect(wss).toBeTruthy();

    // create a mock socket that will act like a client
    const clientSocket = new (function () {
      this._handlers = {};
      this.sent = [];
      this.on = (ev, cb) => { this._handlers[ev] = cb; };
      this.send = (m) => { this.sent.push(m); };
      this._trigger = (ev, ...args) => { if (this._handlers[ev]) this._handlers[ev](...args); };
    })();

    // the wss instance is our MockServer; use its helper to simulate connection
    expect(typeof wss._simulateConnection === 'function').toBe(true);
    wss._simulateConnection(clientSocket);

    // simulate create action
    clientSocket._trigger('message', JSON.stringify({ action: 'create', sessionId: 's1', initialState: { a: 1 } }));
    await new Promise(r => setTimeout(r, 5));

    // session should be created on the collab server
    const s = collab.getSession('s1');
    expect(s).toBeTruthy();
    expect(s.state).toEqual({ a: 1 });

    // client should have received a created ack
    expect(clientSocket.sent.some(m => String(m).includes('created'))).toBe(true);

    // simulate update from client
    clientSocket._trigger('message', JSON.stringify({ action: 'update', sessionId: 's1', patch: { b: 2 } }));
    await new Promise(r => setTimeout(r, 5));

    // collab server state updated
    const updated = collab.getSession('s1').state;
    expect(updated.b).toBe(2);

    // the client should have gotten a sessionUpdated broadcast
    expect(clientSocket.sent.some(m => String(m).includes('sessionUpdated'))).toBe(true);

    jest.dontMock('ws');
  });
});
