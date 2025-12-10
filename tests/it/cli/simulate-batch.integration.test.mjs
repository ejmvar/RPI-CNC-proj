/**
 * Integration tests for simulate-batch.mjs
 */

import { simulateBatchFromText } from '../../../modules/cli/simulate-batch.mjs';

describe('simulate-batch.mjs (integration)', () => {
  test('simulates simple G-code', () => {
    const gcode = `G0 X10 Y10
G1 X20 Y20`;
    const result = simulateBatchFromText(gcode);

    expect(result.cmds).toHaveLength(2);
    expect(result.points).toHaveLength(2);
    expect(result.summary.commands).toBe(2);
    expect(result.summary.lastPosition).toEqual({ x: 20, y: 20, z: 0 });
  });

  test('tracks position correctly', () => {
    const gcode = `G0 X5
G1 Y10
G1 Z3`;
    const result = simulateBatchFromText(gcode);

    expect(result.summary.lastPosition).toEqual({ x: 5, y: 10, z: 3 });
  });

  test('calculates bounds', () => {
    const gcode = `G0 X0 Y0
G1 X10 Y20
G1 X-5 Y15`;
    const result = simulateBatchFromText(gcode);

    expect(result.summary.bounds.minX).toBe(-5);
    expect(result.summary.bounds.maxX).toBe(10);
    expect(result.summary.bounds.minY).toBe(0);
    expect(result.summary.bounds.maxY).toBe(20);
  });

  test('identifies G0 vs G1 moves', () => {
    const gcode = `G0 X10
G1 Y20`;
    const result = simulateBatchFromText(gcode);

    expect(result.points[0].type).toBe('G0');
    expect(result.points[1].type).toBe('G1');
  });
});
