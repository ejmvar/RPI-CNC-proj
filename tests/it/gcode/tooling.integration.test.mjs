/**
 * Integration tests for tooling.mjs
 */

import { scanToolChanges } from '../../../modules/gcode/tooling.mjs';
import { parse } from '../../../modules/gcode/parser.mjs';

describe('tooling.mjs (integration)', () => {
  test('detects T parameter tool changes', () => {
    const gcode = `G0 X0
T1
G1 X10
T2`;
    const cmds = parse(gcode);
    const changes = scanToolChanges(cmds);

    expect(changes).toHaveLength(2);
    expect(changes[0].tool).toBe(1);
    expect(changes[1].tool).toBe(2);
  });

  test('detects M6 tool change command', () => {
    const gcode = `G0 X0
M6
G1 X10`;
    const cmds = parse(gcode);
    const changes = scanToolChanges(cmds);

    expect(changes).toHaveLength(1);
    expect(changes[0].raw).toContain('M6');
  });

  test('handles M6 with T parameter', () => {
    const gcode = `T1 M6
G0 X0`;
    const cmds = parse(gcode);
    const changes = scanToolChanges(cmds);

    expect(changes).toHaveLength(2); // Both T1 and M6 detected
    expect(changes[0].tool).toBe(1);
  });

  test('returns empty array for non-array input', () => {
    expect(scanToolChanges(null)).toEqual([]);
    expect(scanToolChanges(undefined)).toEqual([]);
  });

  test('returns empty array when no tool changes', () => {
    const gcode = `G0 X0 Y0
G1 X10 Y10`;
    const cmds = parse(gcode);
    const changes = scanToolChanges(cmds);

    expect(changes).toEqual([]);
  });
});
