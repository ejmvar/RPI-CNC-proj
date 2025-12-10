const { EventEmitter } = require('events');

class CollabServer extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  createSession(sessionId, initialState = {}, options = {}) {
    if (this.sessions.has(sessionId)) throw new Error('session_exists');
    const s = {
      id: sessionId,
      state: initialState,
      clients: [],
      permissions: options.permissions || { mode: 'open' }, // 'open', 'read-only', 'owner-only'
      owner: options.owner || null,
    };
    this.sessions.set(sessionId, s);
    this.emit('sessionCreated', s);
    return s;
  }

  joinSession(sessionId, clientId) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('not_found');
    if (s.permissions.mode === 'owner-only' && clientId !== s.owner) {
      throw new Error('permission_denied');
    }
    s.clients.push(clientId);
    this.emit('clientJoined', { sessionId, clientId });
    return s;
  }

  updateSession(sessionId, patch, clientId = null) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('not_found');

    // check permissions
    if (s.permissions.mode === 'read-only') {
      throw new Error('read_only');
    }
    if (s.permissions.mode === 'owner-only' && clientId !== s.owner) {
      throw new Error('not_owner');
    }

    s.state = Object.assign({}, s.state, patch);
    this.emit('sessionUpdated', { sessionId, state: s.state });
    return s.state;
  }

  setPermissions(sessionId, permissions, clientId = null) {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error('not_found');
    if (s.owner && clientId !== s.owner) {
      throw new Error('not_owner');
    }
    s.permissions = permissions;
    this.emit('permissionsChanged', { sessionId, permissions });
    return s;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }
}

function createCollabServer() {
  return new CollabServer();
}

module.exports = { createCollabServer };
