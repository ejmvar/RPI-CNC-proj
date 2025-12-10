/**
 * Integration tests for gcode-convert.mjs
 * These tests import the ES module directly for coverage measurement
 */

import { convert, convertToTwoDigitGCodes } from '../../../modules/cli/gcode-convert.mjs';

describe('gcode-convert.mjs (integration)', () => {
  describe('convertToTwoDigitGCodes', () => {
    test('converts single-digit G-codes to two-digit format', () => {
      const input = 'G0 X10\nG1 Y20';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('preserves already two-digit G-codes', () => {
      const input = 'G00 X10\nG01 Y20';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('handles mixed case G-codes', () => {
      const input = 'g0 X10\nG1 Y20';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('handles empty input', () => {
      const result = convertToTwoDigitGCodes('');
      expect(result).toBe('');
    });

    test('handles null input', () => {
      const result = convertToTwoDigitGCodes(null);
      expect(result).toBe('');
    });

    test('preserves non-G-code content', () => {
      const input = '; Comment\nM3\nG0 X10';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('; Comment\nM3\nG00 X10');
    });
  });

  describe('convert', () => {
    test('converts with 2-digit format option', () => {
      const input = 'G0 X10\nG1 Y20';
      const result = convert(input, { format: '2-digit' });
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('returns original text when no format specified', () => {
      const input = 'G0 X10\nG1 Y20';
      const result = convert(input);
      expect(result).toBe('G0 X10\nG1 Y20');
    });

    test('handles empty input', () => {
      const result = convert('', { format: '2-digit' });
      expect(result).toBe('');
    });
  });
});
