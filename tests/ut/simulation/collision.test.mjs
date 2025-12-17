/**
 * Unit tests for collision detection module
 * Tests boundary checking and collision detection
 */

import { detectCollisions } from '../../../modules/simulation/collision.mjs';

describe('Collision Detection (modules/simulation)', () => {
  describe('detectCollisions', () => {
    test('handles empty points array', () => {
      const result = detectCollisions([], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toEqual([]);
    });

    test('detects X-axis violations (too low)', () => {
      const result = detectCollisions([{ x: -60, y: 0, z: 0 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].axis).toBe('X');
      expect(result[0].value).toBe(-60);
      expect(result[0].index).toBe(0);
    });

    test('detects X-axis violations (too high)', () => {
      const result = detectCollisions([{ x: 60, y: 0, z: 0 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].axis).toBe('X');
      expect(result[0].value).toBe(60);
    });

    test('detects Y-axis violations (too low)', () => {
      const result = detectCollisions([{ x: 0, y: -60, z: 0 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].axis).toBe('Y');
      expect(result[0].value).toBe(-60);
    });

    test('detects Y-axis violations (too high)', () => {
      const result = detectCollisions([{ x: 0, y: 60, z: 0 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].axis).toBe('Y');
      expect(result[0].value).toBe(60);
    });

    test('detects Z-axis violations (too low)', () => {
      const result = detectCollisions([{ x: 0, y: 0, z: -15 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].axis).toBe('Z');
      expect(result[0].value).toBe(-15);
    });

    test('detects Z-axis violations (too high)', () => {
      const result = detectCollisions([{ x: 0, y: 0, z: 15 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].axis).toBe('Z');
      expect(result[0].value).toBe(15);
    });

    test('detects multiple axis violations simultaneously', () => {
      const result = detectCollisions([{ x: 60, y: 60, z: 15 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(3);
      expect(result.some((r) => r.axis === 'X')).toBe(true);
      expect(result.some((r) => r.axis === 'Y')).toBe(true);
      expect(result.some((r) => r.axis === 'Z')).toBe(true);
    });

    test('detects violations in multiple points', () => {
      const result = detectCollisions(
        [
          { x: 0, y: 0, z: 0 },
          { x: 60, y: 0, z: 0 },
          { x: 0, y: 60, z: 0 },
        ],
        {
          minX: -50,
          maxX: 50,
          minY: -50,
          maxY: 50,
          minZ: -10,
          maxZ: 10,
        }
      );
      expect(result).toHaveLength(2);
      expect(result[0].index).toBe(1);
      expect(result[1].index).toBe(2);
    });

    test('passes points within bounds', () => {
      const result = detectCollisions(
        [
          { x: 0, y: 0, z: 0 },
          { x: 25, y: -25, z: 5 },
          { x: -40, y: 30, z: -8 },
        ],
        {
          minX: -50,
          maxX: 50,
          minY: -50,
          maxY: 50,
          minZ: -10,
          maxZ: 10,
        }
      );
      expect(result).toEqual([]);
    });

    test('handles default bounds (infinite)', () => {
      const result = detectCollisions([{ x: 1000, y: -1000, z: 500 }]);
      expect(result).toEqual([]);
    });

    test('handles points with missing coordinates (defaults to 0)', () => {
      const result = detectCollisions([{ x: 60 }, { y: 60 }, { z: 15 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      // Point 0: x=60 (violation), Point 1: y=60 (violation), Point 2: z=15 (violation)
      expect(result).toHaveLength(3);
    });

    test('handles exact boundary values (should pass)', () => {
      const result = detectCollisions(
        [
          { x: -50, y: 50, z: -10 },
          { x: 50, y: -50, z: 10 },
        ],
        {
          minX: -50,
          maxX: 50,
          minY: -50,
          maxY: 50,
          minZ: -10,
          maxZ: 10,
        }
      );
      expect(result).toEqual([]);
    });

    test('detects violations at boundary + 1', () => {
      const result = detectCollisions(
        [
          { x: -51, y: 51, z: -11 },
          { x: 51, y: -51, z: 11 },
        ],
        {
          minX: -50,
          maxX: 50,
          minY: -50,
          maxY: 50,
          minZ: -10,
          maxZ: 10,
        }
      );
      expect(result).toHaveLength(6);
    });

    test('handles large coordinate values', () => {
      const result = detectCollisions([{ x: 999999, y: -999999, z: 999999 }], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(3);
    });

    test('handles negative bounds', () => {
      const result = detectCollisions([{ x: 0, y: 0, z: 0 }], {
        minX: -100,
        maxX: -50,
        minY: -100,
        maxY: -50,
        minZ: -100,
        maxZ: -50,
      });
      expect(result).toHaveLength(3);
    });

    test('returns correct index mapping across multiple violations', () => {
      const result = detectCollisions(
        [
          { x: 0, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
          { x: 0, y: 100, z: 0 },
          { x: 0, y: 0, z: 100 },
        ],
        {
          minX: -50,
          maxX: 50,
          minY: -50,
          maxY: 50,
          minZ: -10,
          maxZ: 10,
        }
      );

      const indices = result.map((r) => r.index);
      expect(indices).toContain(1);
      expect(indices).toContain(2);
      expect(indices).toContain(3);
    });

    test('handles asymmetric bounds', () => {
      const result = detectCollisions(
        [
          { x: -100, y: 0, z: 0 },
          { x: 100, y: 0, z: 0 },
        ],
        {
          minX: -10,
          maxX: 200,
          minY: -50,
          maxY: 50,
          minZ: -10,
          maxZ: 10,
        }
      );
      expect(result).toHaveLength(1);
      expect(result[0].index).toBe(0);
    });

    test('handles zero-width bounds', () => {
      const result = detectCollisions([{ x: 0.001, y: 0, z: 0 }], {
        minX: 0,
        maxX: 0,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0].axis).toBe('X');
    });

    test('preserves point value in collision report', () => {
      const testPoint = { x: 123.456, y: 78.9, z: -42 };
      const result = detectCollisions([testPoint], {
        minX: -50,
        maxX: 50,
        minY: -50,
        maxY: 50,
        minZ: -10,
        maxZ: 10,
      });
      expect(result[0].value).toBe(123.456);
      expect(result[1].value).toBe(78.9);
      expect(result[2].value).toBe(-42);
    });
  });
});
