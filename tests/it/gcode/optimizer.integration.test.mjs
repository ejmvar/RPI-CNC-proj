/**
 * Integration tests for optimizer.mjs
 */

import { optimizeGCode } from '../../../modules/gcode/optimizer.mjs';

describe('optimizer.mjs (integration)', () => {
  test('removes redundant moves', () => {
    const input = `G0 X0 Y0
G0 X0 Y0
G1 X10 Y10`;
    const result = optimizeGCode(input);
    const lines = result.gcode.split('\n').filter((line) => line.trim());

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(2);
    expect(result.stats.redundantMovesRemoved).toBeGreaterThan(0);
  });

  test('keeps moves with different positions', () => {
    const input = `G0 X1 Y1
G0 X5 Y5
G1 X10 Y10`;
    const result = optimizeGCode(input);
    const lines = result.gcode.split('\n').filter((line) => line.trim());

    expect(lines.length).toBeGreaterThan(0);
    expect(result.stats.redundantMovesRemoved).toBe(0);
  });

  test('handles empty input', () => {
    const result = optimizeGCode('');
    expect(result.gcode).toBe('');
    expect(result.stats.redundantMovesRemoved).toBe(0);
  });

  test('handles null input', () => {
    const result = optimizeGCode(null);
    expect(result.gcode).toBe('');
    expect(result.stats.redundantMovesRemoved).toBe(0);
  });
});
