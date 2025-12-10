/**
 * Integration tests for parser.mjs (ES module version)
 */

import { parse, parseLine } from '../../../modules/gcode/parser.mjs';

describe('parser.mjs (integration)', () => {
  describe('parseLine', () => {
    test('parses simple G-code command', () => {
      const result = parseLine('G0 X10 Y20');
      expect(result.params.G).toBe(0);
      expect(result.params.X).toBe(10);
      expect(result.params.Y).toBe(20);
    });

    test('returns null for comments', () => {
      expect(parseLine('; comment')).toBeNull();
      expect(parseLine('(comment)')).toBeNull();
    });

    test('returns null for empty lines', () => {
      expect(parseLine('')).toBeNull();
      expect(parseLine('  ')).toBeNull();
    });

    test('handles mixed case', () => {
      const result = parseLine('g0 x10');
      expect(result.params.G).toBe(0);
      expect(result.params.X).toBe(10);
    });

    test('preserves raw line', () => {
      const result = parseLine('G0 X10');
      expect(result.raw).toBe('G0 X10');
    });
  });

  describe('parse', () => {
    test('parses multi-line G-code', () => {
      const gcode = `G0 X0 Y0
G1 X10 Y10
; comment
G0 Z5`;
      const result = parse(gcode);
      expect(result).toHaveLength(3);
    });

    test('returns empty array for null input', () => {
      expect(parse(null)).toEqual([]);
    });

    test('returns empty array for empty string', () => {
      expect(parse('')).toEqual([]);
    });

    test('handles Windows line endings', () => {
      const gcode = 'G0 X0\r\nG1 Y10';
      const result = parse(gcode);
      expect(result).toHaveLength(2);
    });
  });
});
