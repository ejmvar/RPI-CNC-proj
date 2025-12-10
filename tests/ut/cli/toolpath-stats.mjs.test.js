const { spawnSync } = require('child_process');
const path = require('path');

/**
 * Test toolpath-stats.mjs using subprocess execution
 */

function runDistance(a, b) {
  const script = `
    import { distance } from '${path.resolve(
      __dirname,
      '../../../modules/cli/toolpath-stats.mjs'
    )}';
    const result = distance(${JSON.stringify(a)}, ${JSON.stringify(b)});
    console.log(JSON.stringify(result));
  `;

  const result = spawnSync('node', ['--input-type=module'], {
    input: script,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(`Distance failed: ${result.stderr}`);
  }

  return JSON.parse(result.stdout.trim());
}

function runComputeToolpathStats(points, opts = {}) {
  const script = `
    import { computeToolpathStats } from '${path.resolve(
      __dirname,
      '../../../modules/cli/toolpath-stats.mjs'
    )}';
    const result = computeToolpathStats(${JSON.stringify(points)}, ${JSON.stringify(opts)});
    console.log(JSON.stringify(result));
  `;

  const result = spawnSync('node', ['--input-type=module'], {
    input: script,
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(`ComputeToolpathStats failed: ${result.stderr}`);
  }

  return JSON.parse(result.stdout.trim());
}

describe('toolpath-stats.mjs', () => {
  describe('distance', () => {
    test('calculates distance between two 3D points', () => {
      const result = runDistance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
      expect(result).toBe(5); // 3-4-5 triangle
    });

    test('calculates distance with Z component', () => {
      const result = runDistance({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
      expect(result).toBe(1);
    });

    test('handles missing coordinates (defaults to 0)', () => {
      const result = runDistance({ x: 3 }, { y: 4 });
      expect(result).toBe(5);
    });

    test('calculates zero distance for same point', () => {
      const result = runDistance({ x: 5, y: 10, z: 15 }, { x: 5, y: 10, z: 15 });
      expect(result).toBe(0);
    });

    test('handles negative coordinates', () => {
      const result = runDistance({ x: -3, y: 0, z: 0 }, { x: 3, y: 0, z: 0 });
      expect(result).toBe(6);
    });
  });

  describe('computeToolpathStats', () => {
    test('computes stats for simple two-point path', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      ];
      const result = runComputeToolpathStats(points);

      expect(result.totalDistance).toBe(10);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].dist).toBe(10);
    });

    test('computes stats for multi-segment path', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 3, y: 4, z: 0 },
      ];
      const result = runComputeToolpathStats(points);

      expect(result.totalDistance).toBe(7); // 3 + 4
      expect(result.segments).toHaveLength(2);
    });

    test('calculates estimated time with default feed rate', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 }, // 1000mm
      ];
      const result = runComputeToolpathStats(points);

      // Default feed is 1000 mm/min = 16.67 mm/sec
      // 1000mm / 16.67 mm/sec = 60 seconds
      expect(result.estimatedTimeSec).toBeCloseTo(60, 1);
    });

    test('calculates estimated time with custom feed rate', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 600, y: 0, z: 0 },
      ];
      const result = runComputeToolpathStats(points, { feed: 600 }); // 600 mm/min

      // 600mm / (600/60) mm/sec = 60 seconds
      expect(result.estimatedTimeSec).toBeCloseTo(60, 1);
    });

    test('returns empty stats for empty points array', () => {
      const result = runComputeToolpathStats([]);

      expect(result.totalDistance).toBe(0);
      expect(result.segments).toEqual([]);
      expect(result.estimatedTimeSec).toBe(0);
    });

    test('returns empty stats for single point', () => {
      const result = runComputeToolpathStats([{ x: 0, y: 0, z: 0 }]);

      expect(result.totalDistance).toBe(0);
      expect(result.segments).toEqual([]);
      expect(result.estimatedTimeSec).toBe(0);
    });

    test('includes segment type information', () => {
      const points = [
        { x: 0, y: 0, z: 0, type: 'rapid' },
        { x: 10, y: 0, z: 0, type: 'feed' },
      ];
      const result = runComputeToolpathStats(points);

      expect(result.segments[0].type).toBe('feed');
    });

    test('handles points with varying Z coordinates', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 4, z: 12 }, // 3-4-12 right triangle, distance = 13
      ];
      const result = runComputeToolpathStats(points);

      expect(result.totalDistance).toBe(13);
    });

    test('handles non-array input gracefully', () => {
      const result = runComputeToolpathStats(null);

      expect(result.totalDistance).toBe(0);
      expect(result.segments).toEqual([]);
    });
  });
});
