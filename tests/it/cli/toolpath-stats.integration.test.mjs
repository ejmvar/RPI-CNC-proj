/**
 * Integration tests for toolpath-stats.mjs
 */

import { distance, computeToolpathStats } from '../../../modules/cli/toolpath-stats.mjs';

describe('toolpath-stats.mjs (integration)', () => {
  describe('distance', () => {
    test('calculates distance between two 3D points', () => {
      const result = distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
      expect(result).toBe(5);
    });

    test('handles missing coordinates', () => {
      const result = distance({ x: 3 }, { y: 4 });
      expect(result).toBe(5);
    });
  });

  describe('computeToolpathStats', () => {
    test('computes stats for simple path', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
      ];
      const result = computeToolpathStats(points);

      expect(result.totalDistance).toBe(10);
      expect(result.segments).toHaveLength(1);
    });

    test('returns empty stats for empty array', () => {
      const result = computeToolpathStats([]);
      expect(result.totalDistance).toBe(0);
    });
  });
});
