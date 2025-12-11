/**
 * Integration tests for CLI bin wrappers (apply-leveling.js)
 * Tests the actual CLI scripts through subprocess execution
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const applyLevelingBin = path.join(__dirname, '../../../modules/cli/bin/apply-leveling.js');

describe('CLI bin/apply-leveling.js integration', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-leveling-test-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('applies mesh compensation and writes to output file', () => {
    const gcodeFile = path.join(tmpDir, 'input.gcode');
    const meshFile = path.join(tmpDir, 'mesh.json');
    const outFile = path.join(tmpDir, 'output.gcode');

    fs.writeFileSync(gcodeFile, 'G1 X10 Y10 Z5\nG1 X20 Y20 Z5\n', 'utf8');
    fs.writeFileSync(meshFile, JSON.stringify({
      points: [
        [{ x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 0 }],
        [{ x: 0, y: 50, z: 0 }, { x: 50, y: 50, z: 0.5 }]
      ]
    }), 'utf8');

    const result = spawnSync('node', [applyLevelingBin, gcodeFile, meshFile, '--out', outFile], {
      encoding: 'utf8'
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(outFile)).toBe(true);
    const output = fs.readFileSync(outFile, 'utf8');
    expect(output).toContain('G1');
    expect(output).toContain('Z');
  });

  test('outputs to stdout when no --out flag', () => {
    const gcodeFile = path.join(tmpDir, 'input.gcode');
    const meshFile = path.join(tmpDir, 'mesh.json');

    fs.writeFileSync(gcodeFile, 'G1 X10 Y10 Z5\n', 'utf8');
    fs.writeFileSync(meshFile, JSON.stringify({
      points: [
        [{ x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 0 }],
        [{ x: 0, y: 50, z: 0 }, { x: 50, y: 50, z: 0 }]
      ]
    }), 'utf8');

    const result = spawnSync('node', [applyLevelingBin, gcodeFile, meshFile], {
      encoding: 'utf8'
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('G1');
  });

  test('exits with code 2 when gcode file not found', () => {
    const meshFile = path.join(tmpDir, 'mesh.json');
    fs.writeFileSync(meshFile, JSON.stringify({ points: [[{ x: 0, y: 0, z: 0 }]] }), 'utf8');

    const result = spawnSync('node', [applyLevelingBin, 'nonexistent.gcode', meshFile], {
      encoding: 'utf8'
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('gcode file not found');
  });

  test('exits with code 2 when mesh file not found', () => {
    const gcodeFile = path.join(tmpDir, 'input.gcode');
    fs.writeFileSync(gcodeFile, 'G1 X10 Y10 Z5\n', 'utf8');

    const result = spawnSync('node', [applyLevelingBin, gcodeFile, 'nonexistent.json'], {
      encoding: 'utf8'
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('mesh file not found');
  });

  test('exits with code 2 when insufficient arguments', () => {
    const result = spawnSync('node', [applyLevelingBin], {
      encoding: 'utf8'
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('Usage');
  });

  test('exits with code 1 on invalid JSON mesh', () => {
    const gcodeFile = path.join(tmpDir, 'input.gcode');
    const meshFile = path.join(tmpDir, 'bad-mesh.json');

    fs.writeFileSync(gcodeFile, 'G1 X10 Y10 Z5\n', 'utf8');
    fs.writeFileSync(meshFile, 'invalid json', 'utf8');

    const result = spawnSync('node', [applyLevelingBin, gcodeFile, meshFile], {
      encoding: 'utf8'
    });

    expect(result.status).toBe(1);
  });
});
