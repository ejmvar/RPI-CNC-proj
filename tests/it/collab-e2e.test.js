const http = require('http');
const { createCollabServer } = require('../../modules/backend/collab/index.js');
const { createWsCollabServer } = require('../../modules/backend/collab/ws-server');

describe('collab e2e (http + ws bridge)', () => {
  jest.setTimeout(10000);

  test('two clients create/join/update and both receive sessionUpdated', async () => {
    const server = http.createServer((req, res) => res.end('ok'));
    await new Promise((res) => server.listen(0, res));
    const port = server.address().port;

    // We'll mock the 'ws' module so this test doesn't require network or the
    // external 'ws' package. The fake server will allow us to create in-process
    // client sockets which mimic the minimal WebSocket API used by the bridge.

    const { EventEmitter } = require('events');

    // Fake socket used by both server and client sides in-process
    class FakeSocket extends EventEmitter {
      constructor() {
        super();
        this._sent = [];
        this._closed = false;
      }
      send(data) { this._sent.push(data); this.emit('message', data); }
      close() { this._closed = true; this.emit('close'); }
      // allow tests to simulate client -> server messages
      _clientSend(obj) { const raw = typeof obj === 'string' ? obj : JSON.stringify(obj); this.emit('message', raw); }
    }

    // Fake Server class compatible with ws.Server API used by createWsCollabServer
    class FakeServer extends EventEmitter {
      constructor(opts) { super(); this.opts = opts; this._clients = []; }
      // helper to create a new client connection
      connectClient() {
        const s = new FakeSocket();
        this._clients.push(s);
        // server emits a 'connection' event like ws.Server
        this.emit('connection', s);
        return s;
      }
      close() { this.emit('close'); }
      on() { return super.on.apply(this, arguments); }
    }

    // mock 'ws' for this test scope using jest — mark as virtual so
    // jest doesn't attempt to resolve a real 'ws' package
    jest.resetModules();
    jest.doMock('ws', () => ({ Server: FakeServer }), { virtual: true });
    // require AFTER mocking so createWsCollabServer picks up the fake
    const collab2 = createCollabServer();
    const wss2 = createWsCollabServer(collab2, { server, path: '/c' });
    expect(wss2).not.toBeNull();

    // create two in-process socket clients
    const client1 = wss2.connectClient();
    const client2 = wss2.connectClient();

    // when client1 sends a create message, server should echo created
    client1._clientSend({ action: 'create', sessionId: 's1', initialState: { a: 1 } });
    // the server side will have sent a 'created' message to client1
    const createdMsg = JSON.parse(client1._sent.find(s => s.includes('created')));
    expect(createdMsg).toMatchObject({ type: 'created', sessionId: 's1' });

    // have client2 join
    client2._clientSend({ action: 'join', sessionId: 's1', clientId: 'c2' });
    const joinedMsg = JSON.parse(client2._sent.find(s => s.includes('joined')));
    expect(joinedMsg).toMatchObject({ type: 'joined', sessionId: 's1' });

    // set up arrays to collect updates pushed to both clients
    const updates = [];
    const pushToUpdates = (s) => (msg) => { try { updates.push(JSON.parse(msg)); } catch (e) { updates.push(msg); } };
    client1.on('message', pushToUpdates(client1));
    client2.on('message', pushToUpdates(client2));

    // client2 triggers an update
    client2._clientSend({ action: 'update', sessionId: 's1', patch: { a: 2 } });

    // allow the event loop to process
    await new Promise((r) => setTimeout(r, 20));

    const updated = updates.find(u => u && u.type === 'sessionUpdated');
    expect(updated).toBeDefined();
    expect(updated.state).toMatchObject({ a: 2 });

    // cleanup
    client1.close();
    client2.close();
    wss2.close();
    await new Promise((res) => server.close(res));
  });
});
