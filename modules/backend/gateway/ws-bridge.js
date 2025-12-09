// Optional WebSocket bridge for the firmware gateway.
// This file tries to require('ws') lazily so the project has no hard dependency.
// If 'ws' is not installed, createWsBridge returns null so consumers can fallback.

function createWsBridge(gateway, opts = {}) {
  // gateway should be an EventEmitter-like object exposing sendCommand and 'data' events
  let WsServer;
  try {
    // require lazily — if not installed, return null
    // eslint-disable-next-line global-require
    WsServer = require('ws').Server;
  } catch (e) {
    return null;
  }

  const { server, path = '/gateway' } = opts;
  if (!server) throw new Error('http server required');

  const wss = new WsServer({ server, path });

  // forward incoming messages from clients to the gateway as commands
  wss.on('connection', (socket) => {
    // when a client sends a message, forward to gateway
    socket.on('message', async (msg) => {
      try {
        // preserve async behavior
        await gateway.sendCommand(msg.toString());
      } catch (e) {
        // if gateway not ready, send an error back to the client
        if (socket && typeof socket.send === 'function') socket.send(JSON.stringify({ error: e.message }));
      }
    });

    // when gateway emits data, send it back to this socket
    const onData = (d) => {
      if (socket && typeof socket.send === 'function') socket.send(String(d));
    };

    gateway.on('data', onData);

    // cleanup listeners when socket closes
    socket.on('close', () => gateway.removeListener('data', onData));
  });

  return wss;
}

module.exports = { createWsBridge };
