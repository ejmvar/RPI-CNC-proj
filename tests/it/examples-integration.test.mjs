/**
 * Integration tests for Example G-Code Files
 * Located in tests/it to avoid E2E ignore patterns
 */

import parser from '../../modules/gcode/parser.mjs';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const parseGCode = parser.parseGCode || parser.parse || parser;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EXAMPLES_DIR = join(__dirname, '../../examples');

describe('Example G-Code Files - Integration Tests', () => {
  describe('basic-square.gcode', () => {
    let parsed;
    let content;

    beforeAll(async () => {
      content = await fs.readFile(join(EXAMPLES_DIR, 'basic-square.gcode'), 'utf-8');
      parsed = parseGCode(content);
    });

    test('file exists and loads', () => {
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    test('parses all commands successfully', () => {
      expect(parsed).toBeDefined();
      expect(parsed.length).toBeGreaterThan(10);
    });

    test('contains essential CNC commands', () => {
      const commands = parsed.map((line) => line.codes).flat();
      expect(commands).toContain('G21'); // Metric
      expect(commands).toContain('G90'); // Absolute
      expect(commands).toContain('M3'); // Spindle on
      expect(commands).toContain('M5'); // Spindle off
      expect(commands).toContain('M2'); // Program end
    });

    test('creates square toolpath', () => {
      // Look for G1 moves (both at depth and on surface)
      const g1Moves = parsed.filter((line) => line.codes.includes('G1'));
      expect(g1Moves.length).toBeGreaterThanOrEqual(4);
    });

    test('has proper spindle control sequence', () => {
      const spindleOnIndex = parsed.findIndex((line) => line.codes.includes('M3'));
      const spindleOffIndex = parsed.findIndex((line) => line.codes.includes('M5'));
      expect(spindleOnIndex).toBeGreaterThanOrEqual(0);
      expect(spindleOffIndex).toBeGreaterThan(spindleOnIndex);
    });
  });

  describe('circle-test.gcode', () => {
    let parsed;

    beforeAll(async () => {
      const content = await fs.readFile(join(EXAMPLES_DIR, 'circle-test.gcode'), 'utf-8');
      parsed = parseGCode(content);
    });

    test('contains arc interpolation', () => {
      const arcs = parsed.filter((line) => line.codes.includes('G2') || line.codes.includes('G3'));
      expect(arcs.length).toBeGreaterThan(0);
    });

    test('arcs have correct parameters', () => {
      const arc = parsed.find((line) => line.codes.includes('G2'));
      expect(arc).toBeDefined();
      expect(arc.params.I !== undefined || arc.params.J !== undefined).toBe(true);
    });
  });

  describe('multi-tool-demo.gcode', () => {
    let parsed;

    beforeAll(async () => {
      const content = await fs.readFile(join(EXAMPLES_DIR, 'multi-tool-demo.gcode'), 'utf-8');
      parsed = parseGCode(content);
    });

    test('uses at least 3 different tools', () => {
      const tools = new Set(
        parsed
          .filter((line) => line.codes.some((c) => c.startsWith('T')))
          .map((line) => line.codes.find((c) => c.startsWith('T')))
      );
      expect(tools.size).toBeGreaterThanOrEqual(3);
    });

    test('applies tool offsets correctly', () => {
      const g43Commands = parsed.filter((line) => line.codes.includes('G43'));
      const g49Commands = parsed.filter((line) => line.codes.includes('G49'));
      expect(g43Commands.length).toBeGreaterThan(0);
      expect(g49Commands.length).toBeGreaterThan(0);
    });

    test('tool change workflow is correct', () => {
      // T1 M6 are on same line, find sequence properly
      const firstT = parsed.findIndex((line) => line.codes.some((c) => c === 'T1'));
      const firstM6 = parsed.findIndex((line) => line.codes.includes('M6'));
      const firstG43 = parsed.findIndex((line) => line.codes.includes('G43'));

      // All commands should exist
      expect(firstT).toBeGreaterThanOrEqual(0);
      expect(firstM6).toBeGreaterThanOrEqual(0);
      expect(firstG43).toBeGreaterThan(firstM6);
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

    test('has extruder movements', () => {
      const extruderMoves = parsed.filter((line) => line.params.E !== undefined);
      expect(extruderMoves.length).toBeGreaterThan(10);
    });

    test('sets temperatures', () => {
      const hotendTemp = parsed.find((line) => line.codes.includes('M104'));
      const bedTemp = parsed.find((line) => line.codes.includes('M140'));
      expect(hotendTemp).toBeDefined();
      expect(bedTemp).toBeDefined();
    });

    test('uses multiple materials', () => {
      const toolChanges = parsed.filter((line) => line.codes.some((c) => c.startsWith('T')));
      expect(toolChanges.length).toBeGreaterThanOrEqual(2);
    });

    test('builds in layers', () => {
      const zMoves = parsed
        .filter((line) => line.params.Z !== undefined && line.params.Z > 0)
        .map((line) => line.params.Z);
      const uniqueLayers = [...new Set(zMoves)];
      expect(uniqueLayers.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('All examples validation', () => {
    const exampleFiles = [
      'basic-square.gcode',
      'circle-test.gcode',
      'auto-leveling-demo.gcode',
      'multi-tool-demo.gcode',
      'complex-pocket.gcode',
      '3d-print-multi-material.gcode',
    ];

    test.each(exampleFiles)('%s uses metric units', async (filename) => {
      const content = await fs.readFile(join(EXAMPLES_DIR, filename), 'utf-8');
      const parsed = parseGCode(content);
      const hasG21 = parsed.some((line) => line.codes.includes('G21'));
      expect(hasG21).toBe(true);
    });

    test.each(exampleFiles)('%s ends with program end command', async (filename) => {
      const content = await fs.readFile(join(EXAMPLES_DIR, filename), 'utf-8');
      const parsed = parseGCode(content);
      const lastCommand = parsed[parsed.length - 1]?.codes || [];
      expect(lastCommand.some((c) => c === 'M2' || c === 'M30')).toBe(true);
    });

    test.each(exampleFiles)('%s has explanatory comments', async (filename) => {
      const content = await fs.readFile(join(EXAMPLES_DIR, filename), 'utf-8');
      const hasComments = content.includes(';') || content.includes('(');
      expect(hasComments).toBe(true);
    });

    test.each(exampleFiles)('%s parses without errors', async (filename) => {
      const content = await fs.readFile(join(EXAMPLES_DIR, filename), 'utf-8');
      expect(() => parseGCode(content)).not.toThrow();
    });
  });
});
