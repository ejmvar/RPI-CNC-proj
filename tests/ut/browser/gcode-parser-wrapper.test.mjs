/**
 * Tests for Simulator/web/js/gcode-parser.mjs browser wrapper
 * Tests the browser-safe G-Code parsing functions
 */

import { parseLine, parse, normalizeLine } from '../../../Simulator/web/js/gcode-parser.mjs';

describe('gcode-parser.mjs browser wrapper', () => {
  describe('normalizeLine', () => {
    test('converts line to uppercase and trims whitespace', () => {
      expect(normalizeLine('  g1 x10  ')).toBe('G1 X10');
    });

    test('handles null and undefined', () => {
      expect(normalizeLine(null)).toBe('');
      expect(normalizeLine(undefined)).toBe('');
    });

    test('converts numbers to strings', () => {
      expect(normalizeLine(123)).toBe('123');
    });

    test('handles empty string', () => {
      expect(normalizeLine('')).toBe('');
    });

    test('handles whitespace-only input', () => {
      expect(normalizeLine('   \t  ')).toBe('');
    });
  });

  describe('parseLine', () => {
    test('parses G-code commands correctly', () => {
      const result = parseLine('G1 X10 Y20 Z5');
      expect(result).toBeDefined();
      expect(result.codes).toContain('G1');
      expect(result.params.X).toBe(10);
      expect(result.params.Y).toBe(20);
      expect(result.params.Z).toBe(5);
    });

    test('handles semicolon comments', () => {
      const result = parseLine('; this is a comment');
      expect(result).toBeNull();
    });

    test('handles parenthetical comments', () => {
      const result = parseLine('(header comment)');
      expect(result).toBeNull();
    });

    test('handles mixed case commands', () => {
      const result = parseLine('g1 x10 y20');
      expect(result.codes).toContain('X10');
      expect(result.codes).toContain('Y20');
    });

    test('handles commands without parameters', () => {
      const result = parseLine('M5');
      expect(result.codes).toContain('M5');
      expect(Object.keys(result.params).length).toBe(1);
    });

    test('handles empty lines', () => {
      expect(parseLine('')).toBeNull();
      expect(parseLine('   ')).toBeNull();
    });

    test('handles letter-only commands (no value)', () => {
      const result = parseLine('G M');
      expect(result.codes).toContain('G');
      expect(result.codes).toContain('M');
    });

    test('preserves raw line in result', () => {
      const input = 'G1 X10';
      const result = parseLine(input);
      expect(result.raw).toBe(input);
    });
  });

  describe('parse', () => {
    test('processes multi-line G-code', () => {
      const gcode = 'G0 X0 Y0\nG1 X10 Y10\nG1 Z5';
      const result = parse(gcode);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0].codes).toContain('G0');
    });

    test('skips empty lines', () => {
      const gcode = 'G0 X0\n\n\nG1 Y10';
      const result = parse(gcode);
      expect(result.length).toBe(2);
    });

    test('handles files with only comments', () => {
      const gcode = '; comment 1\n; comment 2\n; comment 3';
      const result = parse(gcode);
      expect(result.length).toBe(0);
    });

    test('handles empty input', () => {
      expect(parse('')).toEqual([]);
      expect(parse(null)).toEqual([]);
      expect(parse(undefined)).toEqual([]);
    });

    test('handles Windows line endings (CRLF)', () => {
      const gcode = 'G0 X0\r\nG1 Y10\r\n';
      const result = parse(gcode);
      expect(result.length).toBe(2);
    });

    test('filters out comment-only lines', () => {
      const gcode = 'G0 X0\n; comment\nG1 Y10\n(another comment)';
      const result = parse(gcode);
      expect(result.length).toBe(2);
      expect(result[0].codes).toContain('G0');
      expect(result[1].codes).toContain('G1');
    });
  });
});
