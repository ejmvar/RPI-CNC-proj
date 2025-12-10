const { spawnSync } = require('child_process');
const path = require('path');

/**
 * Test gcode-convert.mjs using subprocess execution
 * (ES modules in Jest require subprocess pattern or experimental flags)
 */

function runConvert(code, format) {
  const script = `
    import { convert } from '${path.resolve(__dirname, '../../../modules/cli/gcode-convert.mjs')}';
    const input = ${JSON.stringify(code)};
    const result = convert(input, { format: ${JSON.stringify(format)} });
    console.log(JSON.stringify(result));
  `;

  const result = spawnSync('node', ['--input-type=module'], {
    input: script,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(`Convert failed: ${result.stderr}`);
  }

  return JSON.parse(result.stdout.trim());
}

function runConvertToTwoDigit(code) {
  const script = `
    import { convertToTwoDigitGCodes } from '${path.resolve(
      __dirname,
      '../../../modules/cli/gcode-convert.mjs'
    )}';
    const input = ${JSON.stringify(code)};
    const result = convertToTwoDigitGCodes(input);
    console.log(JSON.stringify(result));
  `;

  const result = spawnSync('node', ['--input-type=module'], {
    input: script,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(`ConvertToTwoDigit failed: ${result.stderr}`);
  }

  return JSON.parse(result.stdout.trim());
}

describe('gcode-convert.mjs', () => {
  describe('convertToTwoDigitGCodes', () => {
    test('converts single-digit G-codes to two-digit format', () => {
      const input = 'G0 X10\nG1 Y20';
      const result = runConvertToTwoDigit(input);
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('preserves already two-digit G-codes', () => {
      const input = 'G00 X10\nG01 Y20';
      const result = runConvertToTwoDigit(input);
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('handles mixed case G-codes', () => {
      const input = 'g0 X10\nG1 Y20';
      const result = runConvertToTwoDigit(input);
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('handles empty input', () => {
      const result = runConvertToTwoDigit('');
      expect(result).toBe('');
    });

    test('handles multiple single-digit codes on one line', () => {
      const input = 'G0 X10 G1 Y20';
      const result = runConvertToTwoDigit(input);
      expect(result).toBe('G00 X10 G01 Y20');
    });

    test('preserves non-G-code content', () => {
      const input = '; Comment\nM3\nG0 X10';
      const result = runConvertToTwoDigit(input);
      expect(result).toBe('; Comment\nM3\nG00 X10');
    });

    test('handles codes with different digits (0-9)', () => {
      const input = 'G0\nG1\nG2\nG3\nG9';
      const result = runConvertToTwoDigit(input);
      expect(result).toBe('G00\nG01\nG02\nG03\nG09');
    });
  });

  describe('convert', () => {
    test('converts with 2-digit format option', () => {
      const input = 'G0 X10\nG1 Y20';
      const result = runConvert(input, '2-digit');
      expect(result).toBe('G00 X10\nG01 Y20');
    });

    test('returns original text when no format specified', () => {
      const input = 'G0 X10\nG1 Y20';
      const result = runConvert(input, undefined);
      expect(result).toBe('G0 X10\nG1 Y20');
    });

    test('returns original text with unknown format', () => {
      const input = 'G0 X10\nG1 Y20';
      const result = runConvert(input, 'unknown-format');
      expect(result).toBe('G0 X10\nG1 Y20');
    });

    test('handles empty input', () => {
      const result = runConvert('', '2-digit');
      expect(result).toBe('');
    });

    test('handles null input', () => {
      const result = runConvert(null, '2-digit');
      expect(result).toBe('');
    });
  });
});
