/**
 * Integration tests for transform.mjs (mesh compensation)
 */

import {
  bilinearInterpolate,
  applyMeshCompensationToGCode,
} from '../../../modules/gcode/transform.mjs';

describe('transform.mjs (integration)', () => {
  describe('bilinearInterpolate', () => {
    test('interpolates center of 2x2 mesh', () => {
      const mesh = {
        bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        size: 2,
        values: [
          [0, 0],
          [0, 0],
        ],
      };
      const result = bilinearInterpolate(mesh, 5, 5);
      expect(result).toBe(0);
    });

    test('interpolates corner values', () => {
      const mesh = {
        bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        size: 2,
        values: [
          [1, 2],
          [3, 4],
        ],
      };

      expect(bilinearInterpolate(mesh, 0, 0)).toBeCloseTo(1, 5);
      expect(bilinearInterpolate(mesh, 10, 0)).toBeCloseTo(2, 5);
      expect(bilinearInterpolate(mesh, 0, 10)).toBeCloseTo(3, 5);
      expect(bilinearInterpolate(mesh, 10, 10)).toBeCloseTo(4, 5);
    });

    test('interpolates between points', () => {
      const mesh = {
        bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        size: 2,
        values: [
          [0, 10],
          [0, 10],
        ],
      };

      const result = bilinearInterpolate(mesh, 5, 0); // Middle of top edge
      expect(result).toBeCloseTo(5, 1);
    });

    test('clamps out-of-bounds coordinates', () => {
      const mesh = {
        bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        size: 2,
        values: [
          [1, 2],
          [3, 4],
        ],
      };

      // Should clamp to bounds and return edge values
      const result = bilinearInterpolate(mesh, -5, -5);
      expect(result).toBeCloseTo(1, 5);
    });

    test('returns 0 for invalid mesh', () => {
      expect(bilinearInterpolate(null, 5, 5)).toBe(0);
      expect(bilinearInterpolate({}, 5, 5)).toBe(0);
      expect(bilinearInterpolate({ bounds: {} }, 5, 5)).toBe(0);
    });
  });

  describe('applyMeshCompensationToGCode', () => {
    test('applies compensation to G1 moves', () => {
      const gcode = `G0 Z5
G1 X5 Y5 Z0`;
      const mesh = {
        bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        size: 2,
        values: [
          [0, 0],
          [0, 2],
        ],
      };

      const result = applyMeshCompensationToGCode(gcode, mesh);
      // Should compensate Z value - result will have Z formatted to 4 decimals
      expect(result).toMatch(/Z-?\d+\.\d+/);
    });

    test('preserves lines without X/Y', () => {
      const gcode = `G0 Z5`;
      const mesh = {
        bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
        size: 2,
        values: [
          [0, 0],
          [0, 2],
        ],
      };

      const result = applyMeshCompensationToGCode(gcode, mesh);
      expect(result).toContain('G0 Z5');
    });

    test('handles empty gcode', () => {
      const result = applyMeshCompensationToGCode('', {});
      expect(result).toBe('');
    });

    test('handles null mesh', () => {
      const gcode = 'G1 X5 Y5 Z0';
      const result = applyMeshCompensationToGCode(gcode, null);
      expect(result).toContain('X5');
      expect(result).toContain('Y5');
    });
  });
});
