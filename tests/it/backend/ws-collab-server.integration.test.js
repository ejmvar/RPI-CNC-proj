const http = require('http');
const WebSocket = require('ws');
const { createCollabServer } = require('../../../modules/backend/collab');
const { createWsCollabServer } = require('../../../modules/backend/collab/ws-server');

describe('WebSocket collab server integration', () => {
  let httpServer, wsServer, collabServer, wsUrl;

  beforeAll((done) => {
    collabServer = createCollabServer();
    httpServer = http.createServer();
    wsServer = createWsCollabServer(collabServer, { server: httpServer, path: '/collab' });

    httpServer.listen(0, () => {
      const port = httpServer.address().port;
      wsUrl = `ws://localhost:${port}/collab`;
      done();
    });
  });

  afterAll((done) => {
    if (httpServer) {
      httpServer.close(done);
    } else {
      done();
    }
  });

  test('creates WebSocket server successfully', () => {
    expect(wsServer).toBeDefined();
    expect(wsServer).not.toBeNull();
  });

  test('client can connect to server', (done) => {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });

    ws.on('error', done);
  });

  test('client can create session via WebSocket', (done) => {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          action: 'create',
          sessionId: 'ws-test-create',
          clientId: 'creator-1',
          initialState: { value: 'test' },
          permissions: { mode: 'open' },
        })
      );
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'created' || msg.type === 'sessionCreated') {
        ws.close();
        done();
      }
    });

    ws.on('error', done);
  });

  test('client can join session via WebSocket', (done) => {
    // Pre-create session
    collabServer.createSession('ws-test-join', { data: 'initial' });

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          action: 'join',
          sessionId: 'ws-test-join',
          clientId: 'joiner-1',
        })
      );
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'joined' || msg.type === 'clientJoined') {
        ws.close();
        done();
      }
    });

    ws.on('error', done);
  });

  test('client can update session via WebSocket', (done) => {
    // Pre-create session
    collabServer.createSession('ws-test-update', { count: 0 });

    const ws = new WebSocket(wsUrl);
    let joined = false;

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          action: 'join',
          sessionId: 'ws-test-update',
          clientId: 'updater-1',
        })
      );
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (!joined && (msg.type === 'joined' || msg.type === 'clientJoined')) {
        joined = true;
        ws.send(
          JSON.stringify({
            action: 'update',
            sessionId: 'ws-test-update',
            patch: { count: 42 },
          })
        );
      } else if (msg.type === 'sessionUpdated') {
        ws.close();
        done();
      }
    });

    ws.on('error', done);
  });

  test('client can set permissions via WebSocket', (done) => {
    // Pre-create session
    collabServer.createSession('ws-test-perms', {}, { owner: 'owner-1' });

    const ws = new WebSocket(wsUrl);
    let joined = false;

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          action: 'join',
          sessionId: 'ws-test-perms',
          clientId: 'owner-1',
        })
      );
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());

      if (!joined && (msg.type === 'joined' || msg.type === 'clientJoined')) {
        joined = true;
        ws.send(
          JSON.stringify({
            action: 'setPermissions',
            sessionId: 'ws-test-perms',
            permissions: { mode: 'read-only' },
            clientId: 'owner-1',
          })
        );
      } else if (msg.type === 'permissionsChanged') {
        ws.close();
        done();
      }
    });

    ws.on('error', done);
  });

  test('handles errors gracefully for nonexistent session', (done) => {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send(
        JSON.stringify({
          action: 'join',
          sessionId: 'nonexistent-session-xyz',
          clientId: 'test-client',
        })
      );
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.error) {
        ws.close();
        done();
      }
    });

    ws.on('error', done);
  });

  test('handles malformed JSON messages', (done) => {
    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      ws.send('invalid json {');

      setTimeout(() => {
        ws.close();
        done();
      }, 100);
    });

    ws.on('error', () => {
      done();
    });
  });
});
