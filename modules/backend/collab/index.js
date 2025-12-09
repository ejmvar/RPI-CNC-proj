const { EventEmitter } = require('events');

class CollabServer extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  createSession(sessionId, initialState = {}) {
    if (this.sessions.has(sessionId)) throw new Error('session_exists');
    const s = { id: sessionId, state: initialState, clients: [] };
    this.sessions.set(sessionId, s);
    this.emit('sessionCreated', s);
    return s;
  }

  joinSession(sessionId, clientId) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('not_found');
    s.clients.push(clientId);
    this.emit('clientJoined', { sessionId, clientId });
    return s;
  }

  updateSession(sessionId, patch) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('not_found');
    s.state = Object.assign({}, s.state, patch);
    this.emit('sessionUpdated', { sessionId, state: s.state });
    return s.state;
  }

  getSession(sessionId) { return this.sessions.get(sessionId); }
}

function createCollabServer() { return new CollabServer(); }

module.exports = { createCollabServer };
