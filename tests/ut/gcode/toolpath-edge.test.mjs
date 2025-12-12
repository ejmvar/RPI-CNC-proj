import { parseGCodeToPoints } from '../../../modules/gcode/toolpath.mjs';

describe('toolpath edge cases', () => {
  test('handles M6 tool change without T parameter', () => {
    // Line 26: currentTool = currentTool (self-assignment)
    const gcode = 'T1\nM6\nG1 X10';
    const points = parseGCodeToPoints(gcode);

    // After T1, tool should be 1
    // After M6 without T, tool should remain 1
    expect(points.length).toBeGreaterThan(0);
    const lastPoint = points[points.length - 1];
    expect(lastPoint.tool).toBe(1);
  });

  test('handles M6 with T parameter', () => {
    const gcode = 'T1\nM6 T2\nG1 X10';
    const points = parseGCodeToPoints(gcode);

    expect(points.length).toBeGreaterThan(0);
    const lastPoint = points[points.length - 1];
    expect(lastPoint.tool).toBe(2);
  });

  test('handles tool change in mixed case', () => {
    const gcode = 't2\nm6\nG1 X10';
    const points = parseGCodeToPoints(gcode);

    expect(points.length).toBeGreaterThan(0);
    const lastPoint = points[points.length - 1];
    expect(lastPoint.tool).toBe(2);
  });

  test('handles M6 with spaces', () => {
    const gcode = 'T3\n  M6  \nG1 X10';
    const points = parseGCodeToPoints(gcode);

    const lastPoint = points[points.length - 1];
    expect(lastPoint.tool).toBe(3);
  });

  test('classifies G0 commands as rapid movements', () => {
    const gcode = 'G0 X100 Y50';
    const points = parseGCodeToPoints(gcode);

    expect(points.length).toBe(1);
    expect(points[0].type).toBe('G0');
  });

  test('classifies G1 commands as feed movements', () => {
    const gcode = 'G1 X100 Y50';
    const points = parseGCodeToPoints(gcode);

    expect(points.length).toBe(1);
    expect(points[0].type).toBe('G1');
  });

  test('classifies other commands correctly', () => {
    const gcode = 'G2 X100 Y50 I10';
    const points = parseGCodeToPoints(gcode);

    expect(points.length).toBe(1);
    expect(points[0].type).toBe('G2');
  });

  test('handles commands without explicit G code', () => {
    const gcode = 'X10 Y20';
    const points = parseGCodeToPoints(gcode);

    expect(points.length).toBe(1);
    // Should default to last mode or UNK
    expect(points[0].type).toBeDefined();
  });
});
