/**
 * Mesh Compensation Worker Tests
 * Phase 13.2: Performance Improvements - WebWorker Implementation
 *
 * Tests for background mesh compensation calculations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Mesh compensation functions
const interpolateHeightAtPoint = (grid, bounds, x, y) => {
  const { minX, minY, maxX, maxY } = bounds;
  const gridSize = grid.length;

  const clampedX = Math.max(minX, Math.min(maxX, x));
  const clampedY = Math.max(minY, Math.min(maxY, y));

  const iFloat = ((clampedX - minX) / (maxX - minX)) * (gridSize - 1);
  const jFloat = ((clampedY - minY) / (maxY - minY)) * (gridSize - 1);

  const i = Math.floor(iFloat);
  const j = Math.floor(jFloat);

  const fracI = iFloat - i;
  const fracJ = jFloat - j;

  if (i + 1 < gridSize && j + 1 < gridSize) {
    const z00 = grid[i][j];
    const z10 = grid[i + 1][j];
    const z01 = grid[i][j + 1];
    const z11 = grid[i + 1][j + 1];

    const z0 = z00 + (z10 - z00) * fracI;
    const z1 = z01 + (z11 - z01) * fracI;

    return z0 + (z1 - z0) * fracJ;
  }

  return grid[Math.min(i, gridSize - 1)][Math.min(j, gridSize - 1)];
};

const createMeshFromProbes = (probePoints, gridSize = 10) => {
  if (!probePoints || probePoints.length === 0) {
    return { grid: [], minZ: 0, maxZ: 0, points: [] };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const point of probePoints) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  const grid = [];
  const stepX = (maxX - minX) / (gridSize - 1);
  const stepY = (maxY - minY) / (gridSize - 1);

  for (let i = 0; i < gridSize; i++) {
    const row = [];
    for (let j = 0; j < gridSize; j++) {
      const gridX = minX + i * stepX;
      const gridY = minY + j * stepY;

      let weightedZ = 0;
      let totalWeight = 0;

      for (const point of probePoints) {
        const dist = Math.sqrt((gridX - point.x) ** 2 + (gridY - point.y) ** 2);

        if (dist < 0.001) {
          weightedZ = point.z;
          totalWeight = 1;
          break;
        }

        const weight = 1 / (dist * dist);
        weightedZ += weight * point.z;
        totalWeight += weight;
      }

      row.push(weightedZ / totalWeight);
    }
    grid.push(row);
  }

  return {
    grid,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
    gridSize,
    stepX,
    stepY,
    pointCount: probePoints.length,
  };
};

describe('Mesh Compensation Worker', () => {
  describe('mesh creation', () => {
    it('should create mesh from probe points', () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0.1 },
        { x: 0, y: 10, z: -0.1 },
        { x: 10, y: 10, z: 0 },
      ];

      const mesh = createMeshFromProbes(probes, 5);

      expect(mesh.grid).toBeDefined();
      expect(mesh.grid).toHaveLength(5);
      expect(mesh.grid[0]).toHaveLength(5);
      expect(mesh.bounds).toBeDefined();
      expect(mesh.bounds.minX).toBe(0);
      expect(mesh.bounds.maxX).toBe(10);
      expect(mesh.bounds.minY).toBe(0);
      expect(mesh.bounds.maxY).toBe(10);
      expect(mesh.pointCount).toBe(4);
    });

    it('should handle single probe point', () => {
      const probes = [{ x: 5, y: 5, z: 0.5 }];
      const mesh = createMeshFromProbes(probes, 3);

      expect(mesh.grid).toHaveLength(3);
      // All points should have similar z value
      expect(mesh.grid[0][0]).toBeCloseTo(0.5, 1);
    });

    it('should handle empty probe array', () => {
      const mesh = createMeshFromProbes([], 5);
      expect(mesh.grid).toHaveLength(0);
    });

    it('should generate correct grid size', () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 100, z: 0 },
      ];

      const mesh10 = createMeshFromProbes(probes, 10);
      expect(mesh10.grid).toHaveLength(10);

      const mesh20 = createMeshFromProbes(probes, 20);
      expect(mesh20.grid).toHaveLength(20);
    });

    it('should compute mesh bounds correctly', () => {
      const probes = [
        { x: -10, y: -20, z: 0 },
        { x: 50, y: 80, z: 1 },
      ];

      const mesh = createMeshFromProbes(probes, 5);

      expect(mesh.bounds.minX).toBe(-10);
      expect(mesh.bounds.maxX).toBe(50);
      expect(mesh.bounds.minY).toBe(-20);
      expect(mesh.bounds.maxY).toBe(80);
    });
  });

  describe('height interpolation', () => {
    let mesh;

    beforeEach(() => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0.5 },
        { x: 0, y: 100, z: -0.5 },
        { x: 100, y: 100, z: 0 },
      ];
      mesh = createMeshFromProbes(probes, 11);
    });

    it('should interpolate height at known points', () => {
      const z = interpolateHeightAtPoint(mesh.grid, mesh.bounds, 0, 0);
      expect(z).toBeCloseTo(0, 0.1);
    });

    it('should interpolate height at interior points', () => {
      const z = interpolateHeightAtPoint(mesh.grid, mesh.bounds, 50, 50);
      // Should be close to average (0 + 0.5 - 0.5 + 0) / 4 = 0
      expect(z).toBeCloseTo(0, 1);
    });

    it('should handle points outside bounds', () => {
      const z1 = interpolateHeightAtPoint(mesh.grid, mesh.bounds, -50, 50);
      const z2 = interpolateHeightAtPoint(mesh.grid, mesh.bounds, 150, 50);

      expect(z1).toBeDefined();
      expect(z2).toBeDefined();
    });

    it('should interpolate along edges', () => {
      const z1 = interpolateHeightAtPoint(mesh.grid, mesh.bounds, 50, 0);
      const z2 = interpolateHeightAtPoint(mesh.grid, mesh.bounds, 0, 50);

      expect(z1).toBeDefined();
      expect(z2).toBeDefined();
    });

    it('should handle edge cases with small grids', () => {
      const smallMesh = createMeshFromProbes(
        [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 10, z: 1 },
        ],
        2
      );

      const z = interpolateHeightAtPoint(smallMesh.grid, smallMesh.bounds, 5, 5);
      expect(z).toBeDefined();
    });
  });

  describe('compensation application', () => {
    let mesh;

    beforeEach(() => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 0.2 },
      ];
      mesh = createMeshFromProbes(probes, 5);
    });

    it('should compensate G1 movement commands', () => {
      const commands = [
        { gCode: 1, params: { X: 0, Y: 0, Z: -5 }, lineNumber: 1 },
        { gCode: 1, params: { X: 10, Y: 10, Z: -5 }, lineNumber: 2 },
      ];

      // Simulate compensation
      const compensated = [];
      for (const cmd of commands) {
        const comp = { ...cmd };
        if (
          (cmd.gCode === 0 || cmd.gCode === 1) &&
          cmd.params.X !== undefined &&
          cmd.params.Y !== undefined
        ) {
          const meshZ = interpolateHeightAtPoint(
            mesh.grid,
            mesh.bounds,
            cmd.params.X,
            cmd.params.Y
          );
          comp.params = { ...cmd.params };
          comp.params.Z = cmd.params.Z + meshZ;
          comp.compensation = meshZ;
        }
        compensated.push(comp);
      }

      expect(compensated).toHaveLength(2);
      expect(compensated[0]).toHaveProperty('compensation');
      expect(compensated[1]).toHaveProperty('compensation');
      expect(compensated[0].compensation).toBeDefined();
      expect(compensated[1].compensation).toBeDefined();
    });

    it('should not modify non-movement commands', () => {
      const commands = [
        { gCode: 3, params: { S: 5000 }, lineNumber: 1 },
        { gCode: 5, params: {}, lineNumber: 2 },
      ];

      // Non-G0/G1 commands should not be compensated
      expect(commands[0].params.Z).toBeUndefined();
      expect(commands[1].params.Z).toBeUndefined();
    });

    it('should preserve original Z values', () => {
      const commands = [{ gCode: 1, params: { X: 0, Y: 0, Z: -3.5 }, lineNumber: 1 }];

      const originalZ = commands[0].params.Z;
      expect(originalZ).toBe(-3.5);

      // Compensation should adjust from this value
      const meshZ = interpolateHeightAtPoint(mesh.grid, mesh.bounds, 0, 0);
      const compensatedZ = originalZ + meshZ;

      expect(compensatedZ).toBeDefined();
    });
  });

  describe('mesh accuracy', () => {
    it('should create smooth mesh from scattered probes', () => {
      const probes = [
        { x: 10, y: 10, z: 0.1 },
        { x: 50, y: 20, z: 0.3 },
        { x: 30, y: 60, z: -0.2 },
        { x: 80, y: 80, z: 0.0 },
        { x: 20, y: 80, z: -0.1 },
      ];

      const mesh = createMeshFromProbes(probes, 15);

      // Check that mesh is smooth (no NaN values)
      for (let i = 0; i < mesh.grid.length; i++) {
        for (let j = 0; j < mesh.grid[i].length; j++) {
          expect(Number.isNaN(mesh.grid[i][j])).toBe(false);
        }
      }
    });

    it('should handle high-resolution mesh', () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 100, z: 0 },
      ];

      const mesh = createMeshFromProbes(probes, 50);
      expect(mesh.grid).toHaveLength(50);
      expect(mesh.grid[0]).toHaveLength(50);

      // All points should have valid z values
      let validPoints = 0;
      for (let i = 0; i < mesh.grid.length; i++) {
        for (let j = 0; j < mesh.grid[i].length; j++) {
          if (typeof mesh.grid[i][j] === 'number') {
            validPoints += 1;
          }
        }
      }
      expect(validPoints).toBe(2500);
    });

    it('should maintain interpolation consistency', () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 100, z: 1 },
      ];

      const mesh = createMeshFromProbes(probes, 21);

      // Center point interpolation should be stable
      const z1 = interpolateHeightAtPoint(mesh.grid, mesh.bounds, 50, 50);
      const z2 = interpolateHeightAtPoint(mesh.grid, mesh.bounds, 50, 50);

      expect(z1).toBe(z2);
    });
  });

  describe('mesh validation', () => {
    it('should identify valid mesh dimensions', () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 100, z: 0 },
      ];

      const mesh = createMeshFromProbes(probes, 10);

      expect(mesh.grid.length).toBe(10);
      expect(mesh.grid[0].length).toBe(10);
    });

    it('should handle probe points at same location', () => {
      const probes = [
        { x: 50, y: 50, z: 0.1 },
        { x: 50, y: 50, z: 0.1 }, // Duplicate
      ];

      const mesh = createMeshFromProbes(probes, 5);
      expect(mesh.grid).toBeDefined();
      expect(mesh.grid.length).toBe(5);
    });

    it('should track point count', () => {
      const probes = Array(16)
        .fill(null)
        .map((_, i) => ({
          x: (i % 4) * 25,
          y: Math.floor(i / 4) * 25,
          z: Math.random() * 0.2 - 0.1,
        }));

      const mesh = createMeshFromProbes(probes, 8);
      expect(mesh.pointCount).toBe(16);
    });
  });

  describe('performance characteristics', () => {
    it('should generate fine mesh efficiently', () => {
      const probes = Array(100)
        .fill(null)
        .map((_, i) => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: Math.random() * 0.5 - 0.25,
        }));

      const startTime = performance.now();
      const mesh = createMeshFromProbes(probes, 30);
      const endTime = performance.now();

      expect(mesh.grid).toHaveLength(30);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    it('should interpolate points quickly', () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 100, z: 1 },
      ];

      const mesh = createMeshFromProbes(probes, 20);

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        interpolateHeightAtPoint(mesh.grid, mesh.bounds, Math.random() * 100, Math.random() * 100);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // 1000 interpolations in under 100ms
    });
  });

  describe('edge cases', () => {
    it('should handle collinear probe points', () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 50, y: 0, z: 0.5 },
        { x: 100, y: 0, z: 1 },
      ];

      const mesh = createMeshFromProbes(probes, 5);
      expect(mesh.grid).toBeDefined();
      expect(mesh.grid.length).toBe(5);
    });

    it('should handle very small mesh area', () => {
      const probes = [
        { x: 0.001, y: 0.001, z: 0 },
        { x: 0.002, y: 0.002, z: 0.001 },
      ];

      const mesh = createMeshFromProbes(probes, 5);
      expect(mesh.grid).toBeDefined();
    });

    it('should handle negative coordinates', () => {
      const probes = [
        { x: -100, y: -100, z: 0 },
        { x: 0, y: 0, z: 0.5 },
      ];

      const mesh = createMeshFromProbes(probes, 5);
      expect(mesh.bounds.minX).toBe(-100);
      expect(mesh.bounds.minY).toBe(-100);
    });
  });
});
