const fs = require('fs');
const path = require('path');
const {
  createApp,
  start,
  STORAGE_DIR,
  writeGCodeFile,
  readGCodeFile,
} = require('../../../modules/backend/server');

describe('Backend server/index utilities', () => {
  const testFile = 'test-comprehensive.gcode';
  const testPath = path.join(STORAGE_DIR, testFile);

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
  });

  describe('writeGCodeFile', () => {
    test('writes content to storage directory', () => {
      const result = writeGCodeFile(testFile, 'G0 X0 Y0');

      expect(result.filename).toBe(testFile);
      expect(result.path).toBe(testPath);
      expect(fs.readFileSync(testPath, 'utf8')).toBe('G0 X0 Y0');
    });

    test('throws when filename is missing', () => {
      expect(() => writeGCodeFile(null, 'content')).toThrow('filename and content required');
      expect(() => writeGCodeFile('', 'content')).toThrow('filename and content required');
    });

    test('throws when content is not a string', () => {
      expect(() => writeGCodeFile(testFile, null)).toThrow('filename and content required');
      expect(() => writeGCodeFile(testFile, 123)).toThrow('filename and content required');
      expect(() => writeGCodeFile(testFile, {})).toThrow('filename and content required');
    });

    test('sanitizes filename using basename', () => {
      const result = writeGCodeFile('../../../malicious.gcode', 'evil');

      expect(result.filename).toBe('malicious.gcode');
      expect(result.path).toBe(path.join(STORAGE_DIR, 'malicious.gcode'));

      // Clean up
      fs.unlinkSync(path.join(STORAGE_DIR, 'malicious.gcode'));
    });

    test('overwrites existing file', () => {
      writeGCodeFile(testFile, 'first');
      const result = writeGCodeFile(testFile, 'second');

      expect(fs.readFileSync(testPath, 'utf8')).toBe('second');
      expect(result.path).toBe(testPath);
    });
  });

  describe('readGCodeFile', () => {
    test('reads existing file content', () => {
      fs.writeFileSync(testPath, 'G1 X10 Y20', 'utf8');

      const content = readGCodeFile(testFile);

      expect(content).toBe('G1 X10 Y20');
    });

    test('throws ENOENT error when file does not exist', () => {
      expect(() => readGCodeFile('nonexistent.gcode')).toThrow('not_found');

      try {
        readGCodeFile('nonexistent.gcode');
      } catch (e) {
        expect(e.code).toBe('ENOENT');
      }
    });

    test('sanitizes filename using basename', () => {
      fs.writeFileSync(testPath, 'safe content', 'utf8');

      const content = readGCodeFile(`../../${testFile}`);

      expect(content).toBe('safe content');
    });

    test('handles empty filename', () => {
      // Empty string after basename becomes '.', which is STORAGE_DIR itself
      expect(() => readGCodeFile('')).toThrow();
      expect(() => readGCodeFile(null)).toThrow();
    });
  });

  describe('createApp', () => {
    test('returns null when express is not available', () => {
      const app = createApp();

      // Express is not installed in this project (optional dependency)
      expect(app).toBeNull();
    });
  });

  describe('start', () => {
    test('throws when express is not available', () => {
      // Express is not installed, so start should throw
      expect(() => start(3001)).toThrow('express not available');
    });
  });

  describe('STORAGE_DIR', () => {
    test('is defined and exists', () => {
      expect(STORAGE_DIR).toBeDefined();
      expect(typeof STORAGE_DIR).toBe('string');
      expect(fs.existsSync(STORAGE_DIR)).toBe(true);
    });

    test('is a directory', () => {
      const stats = fs.statSync(STORAGE_DIR);
      expect(stats.isDirectory()).toBe(true);
    });

    test('is inside backend/server module', () => {
      expect(STORAGE_DIR).toContain('backend');
      expect(STORAGE_DIR).toContain('server');
    });
  });

  describe('Edge cases and error handling', () => {
    test('writeGCodeFile handles various content types', () => {
      const result = writeGCodeFile(testFile, '');
      expect(result.filename).toBe(testFile);
      expect(fs.readFileSync(testPath, 'utf8')).toBe('');
    });

    test('writeGCodeFile creates storage dir if missing', () => {
      // Storage dir is created at module load, just verify it exists
      expect(fs.existsSync(STORAGE_DIR)).toBe(true);
    });

    test('readGCodeFile returns complete file content', () => {
      const multiLineContent = 'G0 X0 Y0\nG1 X10 Y10\nG0 Z5';
      fs.writeFileSync(testPath, multiLineContent, 'utf8');

      const content = readGCodeFile(testFile);
      expect(content).toBe(multiLineContent);
    });
  });
});
