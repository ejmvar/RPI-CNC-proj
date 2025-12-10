const http = require('http');

describe('WebSocket bridge (optional)', () => {
  test.skip('returns null when ws module is unavailable', () => {
    // ensure we use the real module loading environment (no 'ws' available)
    const { createWsBridge } = require('../../../modules/backend/gateway/ws-bridge');
    // no server configured -> should throw when server omitted, but if ws is missing, should return null
    const r = createWsBridge({});
    expect(r).toBeNull();
  });

  test.skip('wires a mock ws.Server to the gateway and relays messages', async () => {
    // provide a virtual 'ws' module so createWsBridge finds it
    jest.resetModules();
    jest.doMock(
      'ws',
      () => {
        class MockSocket {
          constructor() {
            this._handlers = {};
            this.sent = [];
          }
          on(ev, cb) {
            this._handlers[ev] = cb;
          }
          send(msg) {
            this.sent.push(msg);
          }
          _trigger(ev, ...args) {
            if (this._handlers[ev]) this._handlers[ev](...args);
          }
        }

        class MockServer {
          constructor(opts) {
            this.opts = opts;
            this._handlers = {};
          }
          on(ev, cb) {
            this._handlers[ev] = cb;
          }
          // test helper: simulate an incoming connection
          _simulateConnection(socket) {
            if (this._handlers.connection) this._handlers.connection(socket);
          }
        }

        return { Server: MockServer };
      },
      { virtual: true }
    );

    const { createWsBridge } = require('../../../modules/backend/gateway/ws-bridge');
    const { createGateway } = require('../../../modules/backend/firmware-gateway');

    const gw = createGateway({ simulate: true });
    await gw.connect();

    // create a fake http server (not used by mock Server but kept for API parity)
    const fakeHttp = http.createServer();

    const wss = createWsBridge(gw, { server: fakeHttp, path: '/gw' });
    expect(wss).toBeTruthy();

    // create a mock client socket implementation and simulate a client
    const clientSocket = new (function () {
      this._handlers = {};
      this.sent = [];
      this.on = (ev, cb) => {
        this._handlers[ev] = cb;
      };
      this.send = (m) => {
        this.sent.push(m);
      };
      this._trigger = (ev, ...args) => {
        if (this._handlers[ev]) this._handlers[ev](...args);
      };
    })();

    // createWsBridge returns the server instance created by our virtual 'ws' module
    expect(typeof wss._simulateConnection === 'function').toBe(true);

    // simulate connection
    wss._simulateConnection(clientSocket);

    // client sends a command
    clientSocket._trigger('message', 'G1 X0 Y0');

    // allow async pipeline to run and gateway to emit
    await new Promise((r) => setTimeout(r, 25));

    // gateway should have sent a response back to the client socket
    expect(clientSocket.sent.length).toBeGreaterThan(0);
    expect(String(clientSocket.sent[0])).toMatch(/ok:/);

    // cleanup
    await gw.disconnect();
    jest.dontMock('ws');
  });
});
