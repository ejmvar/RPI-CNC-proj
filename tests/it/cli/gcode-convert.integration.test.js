/**
 * Integration tests for gcode-convert.mjs
 * These tests import the module directly to get code coverage
 */

// Note: Using dynamic import for ES modules in Jest
describe('gcode-convert.mjs (integration)', () => {
  let convert, convertToTwoDigitGCodes;

  beforeAll(async () => {
    const module = await import('../../../modules/cli/gcode-convert.mjs');
    convert = module.convert;
    convertToTwoDigitGCodes = module.convertToTwoDigitGCodes;
  });

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

    test('handles multiple single-digit codes on one line', () => {
      const input = 'G0 X10 G1 Y20';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('G00 X10 G01 Y20');
    });

    test('preserves non-G-code content', () => {
      const input = '; Comment\nM3\nG0 X10';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('; Comment\nM3\nG00 X10');
    });

    test('handles codes with different digits (0-9)', () => {
      const input = 'G0\nG1\nG2\nG3\nG9';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('G00\nG01\nG02\nG03\nG09');
    });

    test('handles carriage returns', () => {
      const input = 'G0 X10\r\nG1 Y20';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('does not modify two-digit codes like G10', () => {
      const input = 'G10 L2 P1 X0';
      const result = convertToTwoDigitGCodes(input);
      expect(result).toBe('G10 L2 P1 X0');
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

    test('returns original text with unknown format', () => {
      const input = 'G0 X10\nG1 Y20';
      const result = convert(input, { format: 'unknown-format' });
      expect(result).toBe('G0 X10\nG1 Y20');
    });

    test('handles empty input', () => {
      const result = convert('', { format: '2-digit' });
      expect(result).toBe('');
    });

    test('handles null input', () => {
      const result = convert(null, { format: '2-digit' });
      expect(result).toBe('');
    });

    test('handles undefined input', () => {
      const result = convert(undefined, { format: '2-digit' });
      expect(result).toBe('');
    });

    test('uses default export', async () => {
      const module = await import('../../../modules/cli/gcode-convert.mjs');
      expect(module.default).toBeDefined();
      expect(module.default.convert).toBe(convert);
      expect(module.default.convertToTwoDigitGCodes).toBe(convertToTwoDigitGCodes);
    });
  });
});
