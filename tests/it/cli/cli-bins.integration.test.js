const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('CLI bin wrappers', () => {
  let tempDir;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'));
  });
  
  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('gcode-convert.js', () => {
    test('shows usage when no arguments provided', () => {
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/gcode-convert.js');
      const result = spawnSync('node', [binPath], { encoding: 'utf8' });
      
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Usage');
    });

    test('errors when file not found', () => {
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/gcode-convert.js');
      const result = spawnSync('node', [binPath, 'nonexistent.nc'], { encoding: 'utf8' });
      
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('not found');
    });

    test('converts gcode file', () => {
      const testFile = path.join(tempDir, 'test.nc');
      fs.writeFileSync(testFile, 'G0 X10 Y20\nG1 Z5', 'utf8');
      
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/gcode-convert.js');
      const result = spawnSync('node', [binPath, testFile], { encoding: 'utf8' });
      
      expect(result.status).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test('accepts format option', () => {
      const testFile = path.join(tempDir, 'test.nc');
      fs.writeFileSync(testFile, 'G0 X10', 'utf8');
      
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/gcode-convert.js');
      const result = spawnSync('node', [binPath, testFile, '--format', 'compact'], { encoding: 'utf8' });
      
      expect(result.status).toBe(0);
    });
  });

  describe('toolpath-stats.js', () => {
    test('shows usage when no arguments provided', () => {
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/toolpath-stats.js');
      const result = spawnSync('node', [binPath], { encoding: 'utf8' });
      
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Usage');
    });

    test('errors when file not found', () => {
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/toolpath-stats.js');
      const result = spawnSync('node', [binPath, 'nonexistent.json'], { encoding: 'utf8' });
      
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('not found');
    });

    test('computes stats for valid points file', () => {
      const testFile = path.join(tempDir, 'points.json');
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 10, y: 10, z: 0 }
      ];
      fs.writeFileSync(testFile, JSON.stringify(points), 'utf8');
      
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/toolpath-stats.js');
      const result = spawnSync('node', [binPath, testFile], { encoding: 'utf8' });
      
      expect(result.status).toBe(0);
      const stats = JSON.parse(result.stdout);
      expect(stats).toHaveProperty('totalDistance');
    });

    test('accepts feed rate option', () => {
      const testFile = path.join(tempDir, 'points.json');
      fs.writeFileSync(testFile, JSON.stringify([{x:0,y:0,z:0},{x:10,y:0,z:0}]), 'utf8');
      
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/toolpath-stats.js');
      const result = spawnSync('node', [binPath, testFile, '--feed', '1000'], { encoding: 'utf8' });
      
      expect(result.status).toBe(0);
      const stats = JSON.parse(result.stdout);
      expect(stats).toHaveProperty('estimatedTimeSec');
    });
  });

  describe('gcode-validate.js', () => {
    test('shows usage when no arguments provided', () => {
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/gcode-validate.js');
      const result = spawnSync('node', [binPath], { encoding: 'utf8' });
      
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Usage');
    });

    test('errors when file not found', () => {
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/gcode-validate.js');
      const result = spawnSync('node', [binPath, 'nonexistent.nc'], { encoding: 'utf8' });
      
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('not found');
    });

    test('validates valid gcode file', () => {
      const testFile = path.join(tempDir, 'valid.nc');
      fs.writeFileSync(testFile, 'G0 X10 Y20\nG1 Z5 F500', 'utf8');
      
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/gcode-validate.js');
      const result = spawnSync('node', [binPath, testFile], { encoding: 'utf8' });
      
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('OK');
    });

    test('reports errors for invalid gcode', () => {
      const testFile = path.join(tempDir, 'invalid.nc');
      fs.writeFileSync(testFile, 'INVALID @#$ COMMAND', 'utf8');
      
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/gcode-validate.js');
      const result = spawnSync('node', [binPath, testFile], { encoding: 'utf8' });
      
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Errors found');
    });
  });

  describe('simulate-batch.js', () => {
    test('shows usage when no arguments provided', () => {
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/simulate-batch.js');
      const result = spawnSync('node', [binPath], { encoding: 'utf8' });
      
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('Usage');
    });

    test('errors when file not found', () => {
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/simulate-batch.js');
      const result = spawnSync('node', [binPath, 'nonexistent.nc'], { encoding: 'utf8' });
      
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('not found');
    });

    test('simulates gcode file', () => {
      const testFile = path.join(tempDir, 'sim.nc');
      fs.writeFileSync(testFile, 'G0 X0 Y0\nG1 X10 Y10 Z-1', 'utf8');
      
      const binPath = path.resolve(__dirname, '../../../modules/cli/bin/simulate-batch.js');
      const result = spawnSync('node', [binPath, testFile], { encoding: 'utf8' });
      
      expect(result.status).toBe(0);
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });
});
