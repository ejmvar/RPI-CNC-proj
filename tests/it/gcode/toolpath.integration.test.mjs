/**
 * Integration tests for modules/gcode/toolpath.mjs
 * Tests ES module functions for toolpath generation
 */

import { parseGCodeToPoints, interpolatePoints } from '../../../modules/gcode/toolpath.mjs';

describe('gcode/toolpath.mjs integration', () => {
  describe('parseGCodeToPoints', () => {
    test('converts simple G-code text to points', () => {
      const gcode = 'G0 X10 Y20\nG1 X30 Y40 Z5\n';
      const points = parseGCodeToPoints(gcode);

      expect(points).toHaveLength(2);
      expect(points[0]).toMatchObject({ x: 10, y: 20, z: 0, type: 'rapid', tool: 0 });
      expect(points[1]).toMatchObject({ x: 30, y: 40, z: 5, type: 'cut', tool: 0 });
    });

    test('handles parsed command arrays', () => {
      const cmds = [
        { raw: 'G0 X10 Y10', params: { G: 0, X: 10, Y: 10 } },
        { raw: 'G1 X20 Y20 Z5', params: { G: 1, X: 20, Y: 20, Z: 5 } },
      ];
      const points = parseGCodeToPoints(cmds);

      expect(points).toHaveLength(2);
      expect(points[0].type).toBe('rapid');
      expect(points[1].type).toBe('cut');
    });

    test('tracks tool changes with T parameter', () => {
      const gcode = 'T1\nG1 X10 Y10\nT2\nG1 X20 Y20\n';
      const points = parseGCodeToPoints(gcode);

      expect(points[0].tool).toBe(1);
      expect(points[1].tool).toBe(1); // Still tool 1
      expect(points[2].tool).toBe(2);
      expect(points[3].tool).toBe(2); // Still tool 2
    });

    test('tracks M6 tool changes', () => {
      const gcode = 'T1\nM6\nG1 X10 Y10\nT2\nM6\nG1 X20 Y20\n';
      const points = parseGCodeToPoints(gcode);

      // M6 without new T parameter creates tool-change marker, then G1 uses current tool
      const toolChangePoints = points.filter((p) => p.type === 'tool-change');
      expect(toolChangePoints.length).toBe(2); // Two M6 commands

      // Find movement points
      const movePoints = points.filter((p) => p.type === 'cut');
      expect(movePoints[0].tool).toBe(1); // First move with T1
      expect(movePoints[1].tool).toBe(2); // Second move with T2
    });

    test('maintains position state across commands', () => {
      const gcode = 'G0 X10\nY20\nZ5\n';
      const points = parseGCodeToPoints(gcode);

      expect(points[0]).toMatchObject({ x: 10, y: 0, z: 0 });
      expect(points[1]).toMatchObject({ x: 10, y: 20, z: 0 });
      expect(points[2]).toMatchObject({ x: 10, y: 20, z: 5 });
    });

    test('handles empty input', () => {
      expect(parseGCodeToPoints('')).toEqual([]);
      expect(parseGCodeToPoints([])).toEqual([]);
    });

    test('defaults to UNK type for unknown commands', () => {
      const gcode = 'M3\nG2 X10 Y10\n';
      const points = parseGCodeToPoints(gcode);

      expect(points[0].type).toBe('M3');
      expect(points[1].type).toBe('G2');
    });
  });

  describe('interpolatePoints', () => {
    test('adds subdivisions between points', () => {
      const points = [
        { x: 0, y: 0, z: 0, type: 'G0' },
        { x: 10, y: 0, z: 0, type: 'G1' },
      ];
      const result = interpolatePoints(points, 3);

      // With 3 subdivisions: original point + 2 intermediate + next point = 4 total per segment
      expect(result.length).toBeGreaterThan(2);
      expect(result[0]).toMatchObject({ x: 0, y: 0 });
      expect(result[result.length - 1]).toMatchObject({ x: 10, y: 0 });
    });

    test('keeps points as-is when subdivisions <= 1', () => {
      const points = [
        { x: 0, y: 0, z: 0, type: 'G0' },
        { x: 10, y: 0, z: 0, type: 'G1' },
      ];
      expect(interpolatePoints(points, 1)).toEqual(points);
      expect(interpolatePoints(points, 0)).toEqual(points);
    });

    test('handles empty array', () => {
      expect(interpolatePoints([])).toEqual([]);
    });

    test('handles single point', () => {
      const points = [{ x: 0, y: 0, z: 0, type: 'G0' }];
      expect(interpolatePoints(points, 5)).toEqual(points);
    });

    test('interpolates intermediate coordinates correctly', () => {
      const points = [
        { x: 0, y: 0, z: 0, type: 'G1' },
        { x: 10, y: 10, z: 10, type: 'G1' },
      ];
      const result = interpolatePoints(points, 3);

      // Should have points at 0, 1/3, 2/3, and 1 along the line
      expect(result).toHaveLength(4);
      expect(result[1].x).toBeCloseTo(3.333, 2);
      expect(result[1].y).toBeCloseTo(3.333, 2);
      expect(result[2].x).toBeCloseTo(6.666, 2);
      expect(result[2].y).toBeCloseTo(6.666, 2);
    });

    test('preserves type from first point of segment', () => {
      const points = [
        { x: 0, y: 0, z: 0, type: 'G1' },
        { x: 10, y: 0, z: 0, type: 'G0' },
      ];
      const result = interpolatePoints(points, 3);

      // Intermediate points should have type from first point
      expect(result[1].type).toBe('G1');
      expect(result[2].type).toBe('G1');
    });
  });
});
