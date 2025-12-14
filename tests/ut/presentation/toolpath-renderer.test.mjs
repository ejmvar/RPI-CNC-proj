// Unit tests for toolpath renderer

import {
  renderMultiToolToolpath,
  calculateToolpathStats,
} from '../../../modules/presentation/toolpath-renderer.mjs';

describe('calculateToolpathStats', () => {
  test('handles empty points array', () => {
    const stats = calculateToolpathStats([]);
    expect(stats.toolChanges).toBe(0);
    expect(stats.totalDistance).toBe(0);
    expect(stats.toolDistances.size).toBe(0);
  });

  test('handles single point', () => {
    const points = [{ x: 0, y: 0, z: 0, tool: 0, type: 'rapid' }];
    const stats = calculateToolpathStats(points);
    expect(stats.toolChanges).toBe(0);
    expect(stats.totalDistance).toBe(0);
    // Single point has no distance traveled
    expect(stats.toolDistances.size).toBe(0);
  });

  test('calculates distance for single tool', () => {
    const points = [
      { x: 0, y: 0, z: 0, tool: 0, type: 'rapid' },
      { x: 10, y: 0, z: 0, tool: 0, type: 'cut' },
      { x: 10, y: 10, z: 0, tool: 0, type: 'cut' },
    ];
    const stats = calculateToolpathStats(points);
    expect(stats.toolChanges).toBe(0);
    expect(stats.totalDistance).toBeCloseTo(20, 1);
    expect(stats.toolDistances.get(0)).toBeCloseTo(20, 1);
  });

  test('counts tool changes', () => {
    const points = [
      { x: 0, y: 0, z: 0, tool: 0, type: 'cut' },
      { x: 10, y: 0, z: 0, tool: 0, type: 'cut' },
      { x: 10, y: 0, z: 5, tool: 1, type: 'rapid' }, // tool change
      { x: 20, y: 0, z: 5, tool: 1, type: 'cut' },
      { x: 20, y: 0, z: 10, tool: 2, type: 'rapid' }, // tool change
      { x: 30, y: 0, z: 10, tool: 2, type: 'cut' },
    ];
    const stats = calculateToolpathStats(points);
    expect(stats.toolChanges).toBe(2);
  });

  test('calculates distance per tool separately', () => {
    const points = [
      { x: 0, y: 0, z: 0, tool: 0, type: 'cut' },
      { x: 10, y: 0, z: 0, tool: 0, type: 'cut' }, // 10mm
      { x: 10, y: 0, z: 0, tool: 1, type: 'cut' }, // tool change, no distance (same position)
      { x: 20, y: 0, z: 0, tool: 1, type: 'cut' }, // 10mm
      { x: 30, y: 0, z: 0, tool: 1, type: 'cut' }, // 10mm
    ];
    const stats = calculateToolpathStats(points);
    expect(stats.toolDistances.get(0)).toBeCloseTo(10, 1);
    expect(stats.toolDistances.get(1)).toBeCloseTo(20, 1);
    expect(stats.totalDistance).toBeCloseTo(30, 1);
    expect(stats.toolChanges).toBe(1); // one tool change (0->1)
  });

  test('handles 3D distances correctly', () => {
    const points = [
      { x: 0, y: 0, z: 0, tool: 0, type: 'cut' },
      { x: 3, y: 4, z: 0, tool: 0, type: 'cut' }, // 5mm (3-4-5 triangle)
      { x: 3, y: 4, z: 12, tool: 0, type: 'cut' }, // 12mm (vertical)
    ];
    const stats = calculateToolpathStats(points);
    expect(stats.totalDistance).toBeCloseTo(17, 1);
  });

  test('skips tool-change markers in distance calculation', () => {
    const points = [
      { x: 0, y: 0, z: 0, tool: 0, type: 'cut' },
      { x: 10, y: 0, z: 0, tool: 0, type: 'cut' }, // 10mm
      { x: 10, y: 0, z: 0, tool: 1, type: 'tool-change' }, // marker, skipped
      { x: 20, y: 0, z: 0, tool: 1, type: 'cut' }, // skipped (prev is tool-change)
      { x: 30, y: 0, z: 0, tool: 1, type: 'cut' }, // 10mm
    ];
    const stats = calculateToolpathStats(points);
    // Distance is 10mm (first segment) + 10mm (last segment) = 20mm
    // The tool-change breaks the distance calculation
    expect(stats.totalDistance).toBeCloseTo(20, 1);
  });
  test('handles multiple tools with varying distances', () => {
    const points = [
      { x: 0, y: 0, z: 0, tool: 0, type: 'cut' },
      { x: 100, y: 0, z: 0, tool: 0, type: 'cut' }, // 100mm tool 0
      { x: 100, y: 0, z: 0, tool: 1, type: 'cut' }, // tool change
      { x: 150, y: 0, z: 0, tool: 1, type: 'cut' }, // 50mm tool 1
      { x: 150, y: 0, z: 0, tool: 2, type: 'cut' }, // tool change
      { x: 175, y: 0, z: 0, tool: 2, type: 'cut' }, // 25mm tool 2
    ];
    const stats = calculateToolpathStats(points);
    expect(stats.toolDistances.get(0)).toBeCloseTo(100, 1);
    expect(stats.toolDistances.get(1)).toBeCloseTo(50, 1);
    expect(stats.toolDistances.get(2)).toBeCloseTo(25, 1);
    expect(stats.totalDistance).toBeCloseTo(175, 1);
    expect(stats.toolChanges).toBe(2); // 0->1, 1->2
  });

  test('handles rapid moves vs cutting moves', () => {
    const points = [
      { x: 0, y: 0, z: 0, tool: 0, type: 'rapid' },
      { x: 10, y: 0, z: 0, tool: 0, type: 'rapid' }, // 10mm rapid
      { x: 20, y: 0, z: 0, tool: 0, type: 'cut' }, // 10mm cut
    ];
    const stats = calculateToolpathStats(points);
    // Both rapid and cut count toward distance
    expect(stats.totalDistance).toBeCloseTo(20, 1);
  });

  test('handles points with missing tool field', () => {
    const points = [
      { x: 0, y: 0, z: 0, type: 'cut' }, // no tool field
      { x: 10, y: 0, z: 0, tool: 0, type: 'cut' },
    ];
    const stats = calculateToolpathStats(points);
    // Should not crash, treats undefined tool gracefully
    expect(stats.totalDistance).toBeGreaterThan(0);
  });

  test('handles negative coordinates', () => {
    const points = [
      { x: -10, y: -10, z: -5, tool: 0, type: 'cut' },
      { x: 10, y: 10, z: 5, tool: 0, type: 'cut' },
    ];
    const stats = calculateToolpathStats(points);
    // Distance from (-10,-10,-5) to (10,10,5) = sqrt(20^2 + 20^2 + 10^2) ≈ 30
    expect(stats.totalDistance).toBeCloseTo(30, 0);
  });
});

describe('renderMultiToolToolpath', () => {
  // Note: These tests require complex THREE.js mocking that doesn't work well with Jest.
  // Visual rendering is better tested with integration/E2E tests.
  // The stats calculation tests above provide good coverage of the logic.

  test.skip('rendering tests need proper THREE.js mock', () => {
    // All rendering tests are skipped - covered by integration tests instead
  });
});
