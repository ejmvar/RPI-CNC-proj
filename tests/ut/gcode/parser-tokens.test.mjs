import { parseLine } from '../../../modules/gcode/parser.mjs';

describe('G-Code parser token handling', () => {
  test("handles tokens that don't match letter-value pattern", () => {
    // This should trigger the else branch on line 22
    // Tokens like standalone numbers or special characters
    const result = parseLine('G1 X10 123');

    expect(result).toBeTruthy();
    expect(result.params.G).toBe(1);
    expect(result.params.X).toBe(10);
    expect(result.codes).toContain('123'); // Non-matching token added to codes
  });

  test('handles multiple non-matching tokens', () => {
    const result = parseLine('G0 ABC DEF X5');

    expect(result.params.G).toBe(0);
    expect(result.params.X).toBe(5);
    expect(result.codes).toContain('ABC');
    expect(result.codes).toContain('DEF');
  });

  test('handles special characters as tokens', () => {
    const result = parseLine('G1 X10 * Y20');

    expect(result.params.G).toBe(1);
    expect(result.params.X).toBe(10);
    expect(result.params.Y).toBe(20);
    expect(result.codes).toContain('*');
  });

  test('handles numeric-only tokens', () => {
    const result = parseLine('G90 100 200');

    expect(result.params.G).toBe(90);
    expect(result.codes).toContain('100');
    expect(result.codes).toContain('200');
  });

  test('handles empty tokens gracefully', () => {
    const result = parseLine('G1  X10   Y20');

    // Multiple spaces create empty tokens, should be filtered
    expect(result.params.G).toBe(1);
    expect(result.params.X).toBe(10);
    expect(result.params.Y).toBe(20);
  });

  test('preserves both matching and non-matching tokens in codes array', () => {
    const result = parseLine('G1 X10 Y20 ABC');

    expect(result.codes).toContain('G1');
    expect(result.codes).toContain('X10');
    expect(result.codes).toContain('Y20');
    expect(result.codes).toContain('ABC');
    expect(result.codes.length).toBe(4);
  });
});
