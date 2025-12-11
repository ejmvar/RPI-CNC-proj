const { createCollabServer } = require('../../../modules/backend/collab/index');

describe('collab/index.js - CollabServer', () => {
  let server;

  beforeEach(() => {
    server = createCollabServer();
  });

  describe('createSession', () => {
    test('creates new session with id and initial state', () => {
      const session = server.createSession('session-1', { code: 'G0 X0' });

      expect(session.id).toBe('session-1');
      expect(session.state.code).toBe('G0 X0');
      expect(session.clients).toEqual([]);
    });

    test('throws error when session already exists', () => {
      server.createSession('session-1');

      expect(() => {
        server.createSession('session-1');
      }).toThrow('session_exists');
    });

    test('sets default open permissions', () => {
      const session = server.createSession('session-1');

      expect(session.permissions.mode).toBe('open');
    });

    test('accepts custom permissions', () => {
      const session = server.createSession(
        'session-1',
        {},
        {
          permissions: { mode: 'read-only' },
        }
      );

      expect(session.permissions.mode).toBe('read-only');
    });

    test('sets owner from options', () => {
      const session = server.createSession(
        'session-1',
        {},
        {
          owner: 'user-123',
        }
      );

      expect(session.owner).toBe('user-123');
    });

    test('emits sessionCreated event', (done) => {
      server.on('sessionCreated', (s) => {
        expect(s.id).toBe('session-1');
        done();
      });

      server.createSession('session-1');
    });
  });

  describe('joinSession', () => {
    beforeEach(() => {
      server.createSession('session-1', { code: 'G0 X0' });
    });

    test('adds client to session', () => {
      const session = server.joinSession('session-1', 'client-1');

      expect(session.clients).toContain('client-1');
    });

    test('throws error for nonexistent session', () => {
      expect(() => {
        server.joinSession('nonexistent', 'client-1');
      }).toThrow('not_found');
    });

    test('enforces owner-only permissions', () => {
      server.createSession(
        'private-session',
        {},
        {
          owner: 'owner-123',
          permissions: { mode: 'owner-only' },
        }
      );

      expect(() => {
        server.joinSession('private-session', 'other-client');
      }).toThrow('permission_denied');
    });

    test('allows owner to join owner-only session', () => {
      server.createSession(
        'private-session',
        {},
        {
          owner: 'owner-123',
          permissions: { mode: 'owner-only' },
        }
      );

      const session = server.joinSession('private-session', 'owner-123');
      expect(session.clients).toContain('owner-123');
    });

    test('emits clientJoined event', (done) => {
      server.on('clientJoined', ({ sessionId, clientId }) => {
        expect(sessionId).toBe('session-1');
        expect(clientId).toBe('client-1');
        done();
      });

      server.joinSession('session-1', 'client-1');
    });
  });

  describe('updateSession', () => {
    beforeEach(() => {
      server.createSession('session-1', { code: 'G0 X0', position: { x: 0 } });
    });

    test('updates session state with patch', () => {
      server.updateSession('session-1', { position: { x: 10 } });
      const session = server.getSession('session-1');

      expect(session.state.position.x).toBe(10);
    });

    test('throws error for nonexistent session', () => {
      expect(() => {
        server.updateSession('nonexistent', { code: 'G1 X10' });
      }).toThrow('not_found');
    });

    test('throws error for read-only session', () => {
      server.createSession(
        'readonly',
        {},
        {
          permissions: { mode: 'read-only' },
        }
      );

      expect(() => {
        server.updateSession('readonly', { code: 'G1 X10' });
      }).toThrow('read_only');
    });

    test('allows owner to update owner-only session', () => {
      server.createSession(
        'owned',
        { code: 'G0' },
        {
          owner: 'owner-123',
          permissions: { mode: 'owner-only' },
        }
      );

      server.updateSession('owned', { code: 'G1 X10' }, 'owner-123');
      const session = server.getSession('owned');
      expect(session.state.code).toBe('G1 X10');
    });

    test('throws error when non-owner tries to update owner-only session', () => {
      server.createSession(
        'owned',
        {},
        {
          owner: 'owner-123',
          permissions: { mode: 'owner-only' },
        }
      );

      expect(() => {
        server.updateSession('owned', { code: 'G1' }, 'other-client');
      }).toThrow('not_owner');
    });
  });

  describe('getSession', () => {
    test('returns existing session', () => {
      server.createSession('session-1', { code: 'G0 X0' });
      const session = server.getSession('session-1');

      expect(session.id).toBe('session-1');
      expect(session.state.code).toBe('G0 X0');
    });

    test('returns undefined for nonexistent session', () => {
      const session = server.getSession('nonexistent');

      expect(session).toBeUndefined();
    });
  });

  describe('setPermissions', () => {
    beforeEach(() => {
      server.createSession('session-1', {}, { owner: 'owner-123' });
    });

    test('updates session permissions', () => {
      server.setPermissions('session-1', { mode: 'read-only' }, 'owner-123');
      const session = server.getSession('session-1');

      expect(session.permissions.mode).toBe('read-only');
    });

    test('throws error for nonexistent session', () => {
      expect(() => {
        server.setPermissions('nonexistent', { mode: 'open' });
      }).toThrow('not_found');
    });

    test('throws error when non-owner tries to change permissions', () => {
      expect(() => {
        server.setPermissions('session-1', { mode: 'open' }, 'other-client');
      }).toThrow('not_owner');
    });

    test('emits permissionsChanged event', (done) => {
      server.on('permissionsChanged', ({ sessionId, permissions }) => {
        expect(sessionId).toBe('session-1');
        expect(permissions.mode).toBe('read-only');
        done();
      });

      server.setPermissions('session-1', { mode: 'read-only' }, 'owner-123');
    });
  });
});
