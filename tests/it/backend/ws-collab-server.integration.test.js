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
