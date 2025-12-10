/**
 * Integration tests for gcode optimizer.mjs
 */

describe('optimizer.mjs (integration)', () => {
  let optimizeGCode;

  beforeAll(async () => {
    const module = await import('../../../modules/gcode/optimizer.mjs');
    optimizeGCode = module.optimizeGCode;
  });

  test('removes redundant moves with same position', () => {
    const input = `G0 X0 Y0
G0 X0 Y0
G1 X10 Y10`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('X0 Y0');
    expect(lines[1]).toContain('X10 Y10');
  });

  test('keeps moves with different positions', () => {
    const input = `G0 X0 Y0
G0 X5 Y5
G1 X10 Y10`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

    expect(lines).toHaveLength(3);
  });

  test('handles Z-axis redundancy', () => {
    const input = `G0 Z5
G0 Z5
G1 Z10`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

    expect(lines).toHaveLength(2);
  });

  test('tracks last position correctly', () => {
    const input = `G0 X0 Y0 Z0
G1 X10
G1 X10
G1 Y20`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

    // Should remove second "G1 X10" since X is already at 10
    expect(lines).toHaveLength(3);
  });

  test('handles empty input', () => {
    const result = optimizeGCode('');
    expect(result).toBe('');
  });

  test('handles null input', () => {
    const result = optimizeGCode(null);
    expect(result).toBe('');
  });

  test('handles undefined input', () => {
    const result = optimizeGCode(undefined);
    expect(result).toBe('');
  });

  test('preserves non-movement commands', () => {
    const input = `M3 S1000
G0 X0 Y0
M5`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('M3 S1000');
    expect(lines[2]).toBe('M5');
  });

  test('handles partial coordinate updates', () => {
    const input = `G0 X0 Y0 Z0
G1 X10
G1 Y20
G1 Z5`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

    // All moves should be kept since each changes a different axis
    expect(lines).toHaveLength(4);
  });

  test('removes move to same position after non-movement command', () => {
    const input = `G0 X10 Y10
M3
G0 X10 Y10`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('X10 Y10');
    expect(lines[1]).toBe('M3');
  });

  test('handles comments in input', () => {
    const input = `; Start
G0 X0 Y0
; Move
G0 X10 Y10`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

    expect(lines.length).toBeGreaterThan(0);
  });

  test('uses default export', async () => {
    const module = await import('../../../modules/gcode/optimizer.mjs');
    expect(module.default).toBeDefined();
    expect(module.default.optimizeGCode).toBe(optimizeGCode);
  });
});
