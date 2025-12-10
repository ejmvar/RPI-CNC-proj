/**
 * Integration tests for toolpath-stats.mjs
 * These tests import the module directly to get code coverage
 */

describe('toolpath-stats.mjs (integration)', () => {
  let distance, computeToolpathStats;

  beforeAll(async () => {
    const module = await import('../../../modules/cli/toolpath-stats.mjs');
    distance = module.distance;
    computeToolpathStats = module.computeToolpathStats;
  });

  describe('distance', () => {
    test('calculates distance between two 3D points', () => {
      const result = distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
      expect(result).toBe(5); // 3-4-5 triangle
    });

    test('calculates distance with Z component', () => {
      const result = distance({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
      expect(result).toBe(1);
    });

    test('handles missing coordinates (defaults to 0)', () => {
      const result = distance({ x: 3 }, { y: 4 });
      expect(result).toBe(5);
    });

    test('calculates zero distance for same point', () => {
      const result = distance({ x: 5, y: 10, z: 15 }, { x: 5, y: 10, z: 15 });
      expect(result).toBe(0);
    });

    test('handles negative coordinates', () => {
      const result = distance({ x: -3, y: 0, z: 0 }, { x: 3, y: 0, z: 0 });
      expect(result).toBe(6);
    });

    test('handles all-zero coordinates', () => {
      const result = distance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
      expect(result).toBe(0);
    });

    test('handles large distances', () => {
      const result = distance({ x: 0, y: 0, z: 0 }, { x: 300, y: 400, z: 0 });
      expect(result).toBe(500);
    });
  });

  describe('computeToolpathStats', () => {
    test('computes stats for simple two-point path', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      ];
      const result = computeToolpathStats(points);

      expect(result.totalDistance).toBe(10);
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].dist).toBe(10);
      expect(result.segments[0].i).toBe(0);
      expect(result.segments[0].from).toEqual({ x: 0, y: 0, z: 0 });
      expect(result.segments[0].to).toEqual({ x: 10, y: 0, z: 0 });
    });

    test('computes stats for multi-segment path', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 0, z: 0 },
        { x: 3, y: 4, z: 0 },
      ];
      const result = computeToolpathStats(points);

      expect(result.totalDistance).toBe(7); // 3 + 4
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].dist).toBe(3);
      expect(result.segments[1].dist).toBe(4);
    });

    test('calculates estimated time with default feed rate', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 1000, y: 0, z: 0 }, // 1000mm
      ];
      const result = computeToolpathStats(points);

      // Default feed is 1000 mm/min = 16.67 mm/sec
      // 1000mm / 16.67 mm/sec = 60 seconds
      expect(result.estimatedTimeSec).toBeCloseTo(60, 1);
    });

    test('calculates estimated time with custom feed rate', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 600, y: 0, z: 0 },
      ];
      const result = computeToolpathStats(points, { feed: 600 }); // 600 mm/min

      // 600mm / (600/60) mm/sec = 60 seconds
      expect(result.estimatedTimeSec).toBeCloseTo(60, 1);
    });

    test('handles zero feed rate', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 },
      ];
      const result = computeToolpathStats(points, { feed: 0 });

      expect(result.estimatedTimeSec).toBe(0);
    });

    test('returns empty stats for empty points array', () => {
      const result = computeToolpathStats([]);

      expect(result.totalDistance).toBe(0);
      expect(result.segments).toEqual([]);
      expect(result.estimatedTimeSec).toBe(0);
    });

    test('returns empty stats for single point', () => {
      const result = computeToolpathStats([{ x: 0, y: 0, z: 0 }]);

      expect(result.totalDistance).toBe(0);
      expect(result.segments).toEqual([]);
      expect(result.estimatedTimeSec).toBe(0);
    });

    test('includes segment type information', () => {
      const points = [
        { x: 0, y: 0, z: 0, type: 'rapid' },
        { x: 10, y: 0, z: 0, type: 'feed' },
      ];
      const result = computeToolpathStats(points);

      expect(result.segments[0].type).toBe('feed');
    });

    test('handles points with varying Z coordinates', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 4, z: 12 }, // 3-4-12 right triangle, distance = 13
      ];
      const result = computeToolpathStats(points);

      expect(result.totalDistance).toBe(13);
    });

    test('handles non-array input gracefully', () => {
      const result = computeToolpathStats(null);

      expect(result.totalDistance).toBe(0);
      expect(result.segments).toEqual([]);
    });

    test('handles undefined input', () => {
      const result = computeToolpathStats(undefined);

      expect(result.totalDistance).toBe(0);
      expect(result.segments).toEqual([]);
    });

    test('handles missing opts parameter', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      ];
      const result = computeToolpathStats(points);

      expect(result.totalDistance).toBe(10);
      // Should use default feed rate
      expect(result.estimatedTimeSec).toBeGreaterThan(0);
    });

    test('computes complex 3D toolpath', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 5 },
        { x: 10, y: 10, z: 5 },
        { x: 0, y: 10, z: 0 },
      ];
      const result = computeToolpathStats(points);

      expect(result.segments).toHaveLength(3);
      expect(result.totalDistance).toBeGreaterThan(0);
      // First segment: sqrt(10^2 + 5^2) = sqrt(125) ≈ 11.18
      expect(result.segments[0].dist).toBeCloseTo(11.18, 1);
    });

    test('uses default export', async () => {
      const module = await import('../../../modules/cli/toolpath-stats.mjs');
      expect(module.default).toBeDefined();
      expect(module.default.distance).toBe(distance);
      expect(module.default.computeToolpathStats).toBe(computeToolpathStats);
    });
  });
});
