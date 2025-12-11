/**
 * Unit tests for backend server index.js
 * Tests writeGCodeFile, readGCodeFile, and createApp functions.
 */

const fs = require('fs');
const path = require('path');
const { writeGCodeFile, readGCodeFile, createApp, STORAGE_DIR } = require('../../../modules/backend/server/index.js');

describe('backend/server/index.js', () => {
  beforeEach(() => {
    // Clean storage directory before each test
    if (fs.existsSync(STORAGE_DIR)) {
      fs.readdirSync(STORAGE_DIR).forEach(f => {
        fs.unlinkSync(path.join(STORAGE_DIR, f));
      });
    }
  });

  afterAll(() => {
    // Clean up storage directory after all tests
    if (fs.existsSync(STORAGE_DIR)) {
      fs.readdirSync(STORAGE_DIR).forEach(f => {
        fs.unlinkSync(path.join(STORAGE_DIR, f));
      });
    }
  });

  describe('writeGCodeFile', () => {
    test('writes valid G-code file', () => {
      const result = writeGCodeFile('test.gcode', 'G0 X10 Y20');
      expect(result.filename).toBe('test.gcode');
      expect(result.path).toContain('test.gcode');
      expect(fs.existsSync(result.path)).toBe(true);
    });

    test('sanitizes filename with path traversal', () => {
      const result = writeGCodeFile('../../../etc/passwd', 'G0 X10');
      expect(result.filename).toBe('passwd');
      expect(result.path).toContain(STORAGE_DIR);
      expect(result.path).not.toContain('..');
    });

    test('throws error when filename is missing', () => {
      expect(() => writeGCodeFile('', 'G0 X10')).toThrow('filename and content required');
      expect(() => writeGCodeFile(null, 'G0 X10')).toThrow('filename and content required');
    });

    test('throws error when content is not a string', () => {
      expect(() => writeGCodeFile('test.gcode', null)).toThrow('filename and content required');
      expect(() => writeGCodeFile('test.gcode', 123)).toThrow('filename and content required');
      expect(() => writeGCodeFile('test.gcode', {})).toThrow('filename and content required');
    });

    test('writes empty content', () => {
      const result = writeGCodeFile('empty.gcode', '');
      expect(fs.readFileSync(result.path, 'utf8')).toBe('');
    });

    test('overwrites existing file', () => {
      writeGCodeFile('overwrite.gcode', 'first');
      const result = writeGCodeFile('overwrite.gcode', 'second');
      expect(fs.readFileSync(result.path, 'utf8')).toBe('second');
    });
  });

  describe('readGCodeFile', () => {
    test('reads existing file', () => {
      writeGCodeFile('read-test.gcode', 'G0 X10\nG1 Y20');
      const content = readGCodeFile('read-test.gcode');
      expect(content).toBe('G0 X10\nG1 Y20');
    });

    test('sanitizes filename with path traversal', () => {
      writeGCodeFile('safe.gcode', 'G0 X10');
      const content = readGCodeFile('../storage/safe.gcode');
      expect(content).toBe('G0 X10');
    });

    test('throws error with code ENOENT for non-existent file', () => {
      expect(() => readGCodeFile('nonexistent.gcode')).toThrow();
      try {
        readGCodeFile('nonexistent.gcode');
      } catch (e) {
        expect(e.message).toBe('not_found');
        expect(e.code).toBe('ENOENT');
      }
    });

    test('throws error for empty filename', () => {
      expect(() => readGCodeFile('')).toThrow();
      try {
        readGCodeFile('');
      } catch (e) {
        // Empty string results in reading the storage directory itself (EISDIR)
        expect(['ENOENT', 'EISDIR']).toContain(e.code);
      }
    });

    test('throws error for null filename', () => {
      expect(() => readGCodeFile(null)).toThrow();
      try {
        readGCodeFile(null);
      } catch (e) {
        // Null becomes '' which reads the storage directory (EISDIR)
        expect(['ENOENT', 'EISDIR']).toContain(e.code);
      }
    });

    test('reads file with special characters', () => {
      writeGCodeFile('special-chars.gcode', 'G0 X10.5 Y-20.3 Z0.001');
      const content = readGCodeFile('special-chars.gcode');
      expect(content).toContain('X10.5');
      expect(content).toContain('Y-20.3');
    });
  });

  describe('STORAGE_DIR', () => {
    test('is created if it does not exist', () => {
      expect(fs.existsSync(STORAGE_DIR)).toBe(true);
    });

    test('is a valid path', () => {
      expect(path.isAbsolute(STORAGE_DIR)).toBe(true);
      expect(STORAGE_DIR).toContain('storage');
    });
  });

  describe('createApp', () => {
    test('returns express app when express is available, or null otherwise', () => {
      const app = createApp();
      // Express may or may not be installed
      if (app) {
        expect(app._router).toBeDefined(); // Express apps have _router property
      } else {
        expect(app).toBeNull(); // Returns null when express not available
      }
    });

    test('app has health endpoint when available', () => {
      const app = createApp();
      if (!app) {
        expect(app).toBeNull();
        return;
      }

      const routes = app._router.stack.filter(r => r.route).map(r => r.route);
      const healthRoute = routes.find(r => r.path === '/health' && r.methods.get);
      expect(healthRoute).toBeDefined();
    });

    test('app has upload endpoint when available', () => {
      const app = createApp();
      if (!app) {
        expect(app).toBeNull();
        return;
      }

      const routes = app._router.stack.filter(r => r.route).map(r => r.route);
      const uploadRoute = routes.find(r => r.path === '/upload' && r.methods.post);
      expect(uploadRoute).toBeDefined();
    });

    test('app has download endpoint when available', () => {
      const app = createApp();
      if (!app) {
        expect(app).toBeNull();
        return;
      }

      const routes = app._router.stack.filter(r => r.route).map(r => r.route);
      const downloadRoute = routes.find(r => r.path === '/download/:filename' && r.methods.get);
      expect(downloadRoute).toBeDefined();
    });
  });
});
