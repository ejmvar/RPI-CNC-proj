/**
 * E2E Tests for Example G-Code Files
 * Tests that all example files load and parse correctly
 */

import { parseGCode } from '../../modules/gcode/parser.mjs';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXAMPLES_DIR = join(__dirname, '../../examples');

describe('Example G-Code Files', () => {
  let exampleFiles;

  beforeAll(async () => {
    // Read all .gcode files from examples directory
    const files = await fs.readdir(EXAMPLES_DIR);
    exampleFiles = files.filter((f) => f.endsWith('.gcode'));
  });

  test('examples directory exists and contains files', () => {
    expect(exampleFiles.length).toBeGreaterThan(0);
  });

  test.each([
    'basic-square.gcode',
    'circle-test.gcode',
    'auto-leveling-demo.gcode',
    'multi-tool-demo.gcode',
    'complex-pocket.gcode',
    '3d-print-multi-material.gcode',
  ])('%s exists and is readable', async (filename) => {
    const filePath = join(EXAMPLES_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  describe('basic-square.gcode', () => {
    let parsed;

    beforeAll(async () => {
      const content = await fs.readFile(join(EXAMPLES_DIR, 'basic-square.gcode'), 'utf-8');
      parsed = parseGCode(content);
    });

    test('parses without errors', () => {
      expect(parsed).toBeDefined();
      expect(parsed.length).toBeGreaterThan(0);
    });

    test('contains expected commands', () => {
      const commands = parsed.map((line) => line.command);
      expect(commands).toContain('G0'); // Rapid move
      expect(commands).toContain('G1'); // Linear move
      expect(commands).toContain('M3'); // Spindle on
      expect(commands).toContain('M5'); // Spindle off
    });

    test('creates a square path', () => {
      const moves = parsed.filter((line) => line.command === 'G1' && line.z < 0);
      expect(moves.length).toBeGreaterThanOrEqual(4); // At least 4 sides
    });

    test('starts and ends spindle correctly', () => {
      const spindleOn = parsed.find((line) => line.command === 'M3');
      const spindleOff = parsed.find((line) => line.command === 'M5');
      expect(spindleOn).toBeDefined();
      expect(spindleOff).toBeDefined();
      expect(parsed.indexOf(spindleOff)).toBeGreaterThan(parsed.indexOf(spindleOn));
    });
  });

  describe('circle-test.gcode', () => {
    let parsed;

    beforeAll(async () => {
      const content = await fs.readFile(join(EXAMPLES_DIR, 'circle-test.gcode'), 'utf-8');
      parsed = parseGCode(content);
    });

    test('parses without errors', () => {
      expect(parsed).toBeDefined();
    });

    test('contains arc commands', () => {
      const arcs = parsed.filter((line) => line.command === 'G2' || line.command === 'G3');
      expect(arcs.length).toBeGreaterThan(0);
    });

    test('arc commands have I/J parameters', () => {
      const arc = parsed.find((line) => line.command === 'G2');
      expect(arc).toBeDefined();
      expect(arc.i !== undefined || arc.j !== undefined).toBe(true);
    });
  });

  describe('multi-tool-demo.gcode', () => {
    let parsed;

    beforeAll(async () => {
      const content = await fs.readFile(join(EXAMPLES_DIR, 'multi-tool-demo.gcode'), 'utf-8');
      parsed = parseGCode(content);
    });

    test('parses without errors', () => {
      expect(parsed).toBeDefined();
    });

    test('contains tool changes', () => {
      const toolChanges = parsed.filter((line) => line.command?.startsWith('T'));
      expect(toolChanges.length).toBeGreaterThanOrEqual(3);
    });

    test('contains tool offset commands', () => {
      const offsetOn = parsed.filter((line) => line.command === 'G43');
      const offsetOff = parsed.filter((line) => line.command === 'G49');
      expect(offsetOn.length).toBeGreaterThan(0);
      expect(offsetOff.length).toBeGreaterThan(0);
    });

    test('uses multiple tools (T1, T2, T3)', () => {
      const tools = parsed
        .filter((line) => line.command?.startsWith('T'))
        .map((line) => line.command);
      expect(tools).toContain('T1');
      expect(tools).toContain('T2');
      expect(tools).toContain('T3');
    });
  });

  describe('3d-print-multi-material.gcode', () => {
    let parsed;

    beforeAll(async () => {
      const content = await fs.readFile(
        join(EXAMPLES_DIR, '3d-print-multi-material.gcode'),
        'utf-8'
      );
      parsed = parseGCode(content);
    });

    test('parses without errors', () => {
      expect(parsed).toBeDefined();
    });

    test('contains extruder commands', () => {
      const extruderMoves = parsed.filter((line) => line.e !== undefined);
      expect(extruderMoves.length).toBeGreaterThan(0);
    });

    test('contains temperature commands', () => {
      const tempCommands = parsed.filter(
        (line) => line.command === 'M104' || line.command === 'M140'
      );
      expect(tempCommands.length).toBeGreaterThan(0);
    });

    test('uses multiple tools', () => {
      const tools = parsed
        .filter((line) => line.command?.startsWith('T'))
        .map((line) => line.command);
      expect(tools.length).toBeGreaterThanOrEqual(2);
    });

    test('has layered structure (increasing Z)', () => {
      const zMoves = parsed
        .filter((line) => line.z !== undefined && line.z > 0)
        .map((line) => line.z);

      // Check that Z values increase (layers)
      const uniqueZ = [...new Set(zMoves)].sort((a, b) => a - b);
      expect(uniqueZ.length).toBeGreaterThanOrEqual(3); // At least 3 layers
    });
  });

  describe('auto-leveling-demo.gcode', () => {
    let parsed;

    beforeAll(async () => {
      const content = await fs.readFile(join(EXAMPLES_DIR, 'auto-leveling-demo.gcode'), 'utf-8');
      parsed = parseGCode(content);
    });

    test('parses without errors', () => {
      expect(parsed).toBeDefined();
    });

    test('covers a grid pattern', () => {
      const moves = parsed.filter(
        (line) =>
          (line.command === 'G1' || line.command === 'G0') &&
          line.x !== undefined &&
          line.y !== undefined
      );
      expect(moves.length).toBeGreaterThan(10); // Multiple grid lines
    });

    test('has consistent cutting depth', () => {
      const cuttingMoves = parsed.filter((line) => line.command === 'G1' && line.z < 0);
      const depths = [...new Set(cuttingMoves.map((m) => m.z))];
      expect(depths.length).toBeLessThanOrEqual(3); // Should be relatively consistent depth
    });
  });

  describe('complex-pocket.gcode', () => {
    let parsed;

    beforeAll(async () => {
      const content = await fs.readFile(join(EXAMPLES_DIR, 'complex-pocket.gcode'), 'utf-8');
      parsed = parseGCode(content);
    });

    test('parses without errors', () => {
      expect(parsed).toBeDefined();
    });

    test('has multiple depth passes', () => {
      const depthChanges = parsed
        .filter((line) => line.command === 'G1' && line.z !== undefined && line.z < 0)
        .map((line) => line.z);

      const uniqueDepths = [...new Set(depthChanges)].sort((a, b) => b - a);
      expect(uniqueDepths.length).toBeGreaterThanOrEqual(4); // At least 4 passes
    });

    test('uses spiral strategy', () => {
      const xyMoves = parsed.filter(
        (line) => line.command === 'G1' && (line.x !== undefined || line.y !== undefined)
      );
      expect(xyMoves.length).toBeGreaterThan(20); // Many moves for spiral
    });
  });

  describe('All examples - General validation', () => {
    test('all examples end with M2 or M30', async () => {
      for (const filename of exampleFiles) {
        const content = await fs.readFile(join(EXAMPLES_DIR, filename), 'utf-8');
        const parsed = parseGCode(content);
        const lastCommand = parsed[parsed.length - 1]?.command;
        expect(['M2', 'M30']).toContain(lastCommand);
      }
    });

    test('all examples have comments', async () => {
      for (const filename of exampleFiles) {
        const content = await fs.readFile(join(EXAMPLES_DIR, filename), 'utf-8');
        const hasComments = content.includes(';') || content.includes('(');
        expect(hasComments).toBe(true);
      }
    });

    test('all examples use metric units (G21)', async () => {
      for (const filename of exampleFiles) {
        const content = await fs.readFile(join(EXAMPLES_DIR, filename), 'utf-8');
        const parsed = parseGCode(content);
        const hasG21 = parsed.some((line) => line.command === 'G21');
        expect(hasG21).toBe(true);
      }
    });
  });
});
