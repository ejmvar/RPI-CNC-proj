import { validateGCode } from '../../../modules/cli/gcode-validate.mjs';

describe('gcode-validate.mjs', () => {
  test('validates empty text as ok', () => {
    const result = validateGCode('');
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validates null/undefined as ok', () => {
    expect(validateGCode(null).ok).toBe(true);
    expect(validateGCode(undefined).ok).toBe(true);
  });

  test('validates simple G-code commands', () => {
    const gcode = 'G0 X10 Y20\nG1 Z5 F1000';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validates M commands', () => {
    const gcode = 'M3 S1000\nM5';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('ignores comments starting with semicolon', () => {
    const gcode = '; This is a comment\nG0 X10';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('ignores comments starting with parenthesis', () => {
    const gcode = '(This is a comment)\nG1 Y5';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('accepts line numbers with N', () => {
    const gcode = 'N10 G0 X0\nN20 G1 X10';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('accepts negative coordinates', () => {
    const gcode = 'G1 X-10.5 Y-20.3';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('accepts decimal coordinates', () => {
    const gcode = 'G1 X1.5 Y2.75 Z0.125';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('detects invalid tokens', () => {
    const gcode = 'G0 X10 @invalid';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].token).toBe('@invalid');
    expect(result.errors[0].message).toBe('invalid token');
  });

  test('detects unknown command letters', () => {
    const gcode = 'G0 X10\nQ5 Y20';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].token).toBe('Q5');
    expect(result.errors[0].message).toContain('unknown code Q');
  });

  test('reports correct line numbers for errors', () => {
    const gcode = 'G0 X10\nG1 Y20\n@bad\nG2 Z5';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(false);
    expect(result.errors[0].line).toBe(3);
  });

  test('handles multiple errors in one line', () => {
    const gcode = '@bad1 @bad2';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  test('handles whitespace variations', () => {
    const gcode = '  G0   X10    Y20  \n\nG1 Z5\n';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('accepts S parameter for spindle speed', () => {
    const gcode = 'M3 S12000';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('accepts F parameter for feed rate', () => {
    const gcode = 'G1 X10 F500';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });

  test('handles mixed case input', () => {
    const gcode = 'g0 X10\nG1 y20';
    const result = validateGCode(gcode);
    expect(result.ok).toBe(true);
  });
});
