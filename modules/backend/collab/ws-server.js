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
          // if clientId present, store owner info in initial state
          const owner = msg.clientId || null;
          const state = Object.assign({}, initialState || {}, owner ? { owner } : {});
          collabServer.createSession(sessionId, state);
          addClientToSession(sessionId, socket, msg.clientId || null);
          // echo created
          socket.send(JSON.stringify({ type: 'created', sessionId }));
          // broadcast creation to session members (if any) and emit event
          const s = collabServer.getSession(sessionId);
          broadcastToSession(sessionId, { type: 'sessionCreated', sessionId, state: s.state, clients: s.clients });
        } else if (action === 'join') {
          const { sessionId, clientId } = msg;
          collabServer.joinSession(sessionId, clientId || null);
          addClientToSession(sessionId, socket, clientId || null);
          socket.send(JSON.stringify({ type: 'joined', sessionId }));
          // inform other clients in session that a client joined
          broadcastToSession(sessionId, { type: 'clientJoined', sessionId, clientId: clientId || null });
        } else if (action === 'update') {
          const { sessionId, patch } = msg;
          collabServer.updateSession(sessionId, patch || {});
          // broadcast the update to all clients in session
          const s2 = collabServer.getSession(sessionId) || {};
          broadcastToSession(sessionId, { type: 'sessionUpdated', sessionId, state: s2.state, clients: s2.clients });
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
  // when server-side collab updates happen, broadcast to clients
  collabServer.on('sessionUpdated', ({ sessionId, state }) => {
    const s3 = collabServer.getSession(sessionId) || {};
    broadcastToSession(sessionId, { type: 'sessionUpdated', sessionId, state: s3.state, clients: s3.clients });
  });

  // when sessions are created in the collab server, broadcast
  collabServer.on('sessionCreated', (s) => {
    broadcastToSession(s.id, { type: 'sessionCreated', sessionId: s.id, state: s.state, clients: s.clients });
  });

  // when a client joins, broadcast the join to session clients
  collabServer.on('clientJoined', ({ sessionId, clientId }) => {
    const s4 = collabServer.getSession(sessionId) || {};
    broadcastToSession(sessionId, { type: 'clientJoined', sessionId, clientId, clients: s4.clients });
  });

  return wss;
}

module.exports = { createWsCollabServer };
