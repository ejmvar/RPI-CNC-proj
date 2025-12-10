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
    const lines = result.split('\n');

    expect(lines).toHaveLength(2);
  });

  test('keeps moves with different positions', () => {
    const input = `G0 X0 Y0
G0 X5 Y5
G1 X10 Y10`;
    const result = optimizeGCode(input);
    const lines = result.split('\n');

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
});
