// Optional WebSocket server layer for the collab server.
// Uses optional 'ws' module if available; returns null when 'ws' isn't installed.

function createWsCollabServer(collabServer, opts = {}) {
  let WSServer;
  try {
    // lazy require to keep no hard dependency
    // eslint-disable-next-line global-require
    WSServer = require('ws').Server;
  } catch (e) {
    return null;
  }

  const { server, path = '/collab' } = opts;
  if (!server) throw new Error('http server required');

  const wss = new WSServer({ server, path });

  // map of sessionId -> Set of sockets for broadcast
  const sessionClients = new Map();

  function addClientToSession(sessionId, socket, clientId) {
    const set = sessionClients.get(sessionId) || new Set();
    set.add(socket);
    sessionClients.set(sessionId, set);
    // attach socket.sessionId for later cleanup
    socket._sessionId = sessionId;
    socket._clientId = clientId;
  }

  function removeClient(socket) {
    const sid = socket._sessionId;
    if (!sid) return;
    const set = sessionClients.get(sid);
    if (set) {
      set.delete(socket);
      if (set.size === 0) sessionClients.delete(sid);
    }
  }

  // broadcast helper
  function broadcastToSession(sessionId, message) {
    const set = sessionClients.get(sessionId);
    if (!set) return;
    const data = typeof message === 'string' ? message : JSON.stringify(message);
    for (const s of set) {
      if (s && typeof s.send === 'function') s.send(data);
    }
  }

  wss.on('connection', (socket) => {
    // listen for client messages
    socket.on('message', (raw) => {
      let msg = raw;
      try { msg = (typeof raw === 'string') ? JSON.parse(raw) : raw; } catch (e) { /* ignore */ }
      const action = (msg && msg.action) || null;

      try {
        if (action === 'create') {
          const { sessionId, initialState } = msg;
          collabServer.createSession(sessionId, initialState || {});
          addClientToSession(sessionId, socket, msg.clientId || null);
          // echo created
          socket.send(JSON.stringify({ type: 'created', sessionId }));
        } else if (action === 'join') {
          const { sessionId, clientId } = msg;
          collabServer.joinSession(sessionId, clientId || null);
          addClientToSession(sessionId, socket, clientId || null);
          socket.send(JSON.stringify({ type: 'joined', sessionId }));
        } else if (action === 'update') {
          const { sessionId, patch } = msg;
          collabServer.updateSession(sessionId, patch || {});
          // broadcast the update to all clients in session
          broadcastToSession(sessionId, { type: 'sessionUpdated', sessionId, state: collabServer.getSession(sessionId).state });
        }
      } catch (err) {
        if (socket && typeof socket.send === 'function') socket.send(JSON.stringify({ error: err.message }));
      }
    });

    socket.on('close', () => {
      removeClient(socket);
    });
  });

  // when server-side collab updates happen, broadcast to clients
  collabServer.on('sessionUpdated', ({ sessionId, state }) => {
    broadcastToSession(sessionId, { type: 'sessionUpdated', sessionId, state });
  });

  return wss;
}

module.exports = { createWsCollabServer };
