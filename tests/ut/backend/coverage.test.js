/**
 * Additional coverage tests for backend modules
 */

const collabIndex = require('../../../modules/backend/collab/index.js');
const sessionIndex = require('../../../modules/backend/session/index.js');
const fs = require('fs');
const path = require('path');

describe('Backend module coverage', () => {
  describe('Collab module', () => {
    it('exports createCollabServer', () => {
      expect(typeof collabIndex.createCollabServer).toBe('function');
    });

    it('creates collab server instance', () => {
      const server = collabIndex.createCollabServer();
      expect(server).toBeDefined();
      expect(typeof server.createSession).toBe('function');
    });

    it('creates and manages sessions', () => {
      const server = collabIndex.createCollabServer();
      const session = server.createSession('test123', { gcode: 'G0 X10' });
      expect(session.id).toBe('test123');
      expect(session.state.gcode).toBe('G0 X10');
    });

    it('handles session updates', () => {
      const server = collabIndex.createCollabServer();
      server.createSession('test123', { gcode: 'G0 X10' });
      const updated = server.updateSession('test123', { mesh: { grid: [[0]] } });
      expect(updated.mesh).toBeDefined();
    });
  });

  describe('Session module', () => {
    const testFile = 'test-session.json';
    const testData = { gcode: 'G0 X10', mesh: { grid: [[0]] }, timestamp: Date.now() };

    afterEach(() => {
      // Cleanup test file
      const fp = path.join(sessionIndex.SESSIONS_DIR, testFile);
      if (fs.existsSync(fp)) {
        fs.unlinkSync(fp);
      }
    });

    it('exports saveSession', () => {
      expect(typeof sessionIndex.saveSession).toBe('function');
    });

    it('exports loadSession', () => {
      expect(typeof sessionIndex.loadSession).toBe('function');
    });

    it('exports listSessions', () => {
      expect(typeof sessionIndex.listSessions).toBe('function');
    });

    it('saves session to file', () => {
      const filepath = sessionIndex.saveSession(testFile, testData);
      expect(filepath).toBeDefined();
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('loads saved session', () => {
      sessionIndex.saveSession(testFile, testData);
      const loaded = sessionIndex.loadSession(testFile);
      expect(loaded.gcode).toBe(testData.gcode);
      expect(loaded.mesh).toEqual(testData.mesh);
    });

    it('lists sessions', () => {
      sessionIndex.saveSession(testFile, testData);
      const sessions = sessionIndex.listSessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions).toContain(testFile);
    });

    it('throws error for non-existent session', () => {
      expect(() => {
        sessionIndex.loadSession('nonexistent.json');
      }).toThrow();
    });
  });
});
