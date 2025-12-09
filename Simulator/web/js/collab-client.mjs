// Lightweight browser-side WebSocket client for collaborative sessions.
// Designed to be small, testable and dependency free.

export function createCollabClient(url) {
  let ws = null;
  const handlers = { open: [], close: [], error: [], sessionUpdated: [], message: [] };

  function emit(name, payload) {
    const arr = handlers[name] || [];
    arr.forEach(cb => { try { cb(payload); } catch (e) { /* swallow */ } });
  }

  function connect() {
    if (ws) return ws;
    if (typeof WebSocket === 'undefined') throw new Error('WebSocket not available');

    ws = new WebSocket(url);
    ws.addEventListener('open', () => emit('open'));
    ws.addEventListener('close', () => emit('close'));
    ws.addEventListener('error', (e) => emit('error', e));
    ws.addEventListener('message', (ev) => {
      const raw = ev.data;
      let msg = raw;
      try { msg = JSON.parse(raw); } catch (e) { /* not JSON */ }
      emit('message', msg);
      if (msg && msg.type === 'sessionUpdated') emit('sessionUpdated', msg);
    });

    return ws;
  }

  function send(obj) {
    if (!ws) connect();
    const data = (typeof obj === 'string') ? obj : JSON.stringify(obj);
    ws.send(data);
  }

  function createSession(sessionId, initialState) { send({ action: 'create', sessionId, initialState }); }
  function joinSession(sessionId, clientId) { send({ action: 'join', sessionId, clientId }); }
  function updateSession(sessionId, patch) { send({ action: 'update', sessionId, patch }); }
  function close() { if (ws) { ws.close(); ws = null; } }

  function on(event, cb) { if (!handlers[event]) handlers[event] = []; handlers[event].push(cb); }

  return { connect, createSession, joinSession, updateSession, close, on, _getSocket: () => ws };
}

export default { createCollabClient };
