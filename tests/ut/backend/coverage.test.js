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

    it('exports handleCollabMessage', () => {
      expect(typeof collabIndex.handleCollabMessage).toBe('function');
    });

    it('handles collab message types', () => {
      const message = { type: 'gcode', data: 'G0 X10', clientId: 'test123' };
      const result = collabIndex.handleCollabMessage(message);
      expect(result).toBeDefined();
    });

    it('handles mesh broadcast', () => {
      const message = { type: 'mesh', data: { grid: [[0]] }, clientId: 'test123' };
      const result = collabIndex.handleCollabMessage(message);
      expect(result).toBeDefined();
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
