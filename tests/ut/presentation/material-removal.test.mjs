/**
 * Unit tests for material-removal.mjs
 */

import {
  VoxelGrid,
  MaterialRemovalSimulator,
  estimateWorkpieceBounds,
} from '../../../modules/presentation/material-removal.mjs';

describe('VoxelGrid', () => {
  test('constructor initializes grid with correct dimensions', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const resolution = 2.0;
    const grid = new VoxelGrid(bounds, resolution);

    expect(grid.bounds).toEqual(bounds);
    expect(grid.resolution).toBe(resolution);
    expect(grid.gridX).toBe(5); // 10 / 2.0
    expect(grid.gridY).toBe(5);
    expect(grid.gridZ).toBe(5);
    expect(grid.totalVoxels).toBe(125); // 5 * 5 * 5
    expect(grid.removedVoxels).toBe(0);
  });

  test('worldToGrid converts world coordinates to grid indices', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const grid = new VoxelGrid(bounds, 2.0);

    const [i, j, k] = grid.worldToGrid(2, 4, 6);
    expect(i).toBe(1); // floor(2 / 2.0)
    expect(j).toBe(2); // floor(4 / 2.0)
    expect(k).toBe(3); // floor(6 / 2.0)
  });

  test('worldToGrid handles bounds offset correctly', () => {
    const bounds = { min: { x: 5, y: 5, z: 5 }, max: { x: 15, y: 15, z: 15 } };
    const grid = new VoxelGrid(bounds, 2.0);

    const [i, j, k] = grid.worldToGrid(7, 9, 11);
    expect(i).toBe(1); // floor((7 - 5) / 2.0)
    expect(j).toBe(2); // floor((9 - 5) / 2.0)
    expect(k).toBe(3); // floor((11 - 5) / 2.0)
  });

  test('gridToIndex converts 3D grid coordinates to 1D array index', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const grid = new VoxelGrid(bounds, 2.0);

    const index = grid.gridToIndex(1, 2, 3);
    // index = i + j * gridX + k * gridX * gridY
    // = 1 + 2 * 5 + 3 * 5 * 5 = 1 + 10 + 75 = 86
    expect(index).toBe(86);
  });

  test('hasMaterial returns true for unmodified voxel', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const grid = new VoxelGrid(bounds, 2.0);

    expect(grid.hasMaterial(5, 5, 5)).toBe(true);
  });

  test('removeSphere removes voxels within radius', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const grid = new VoxelGrid(bounds, 1.0);

    // Remove sphere at center (5, 5, 5) with radius 2
    grid.removeSphere(5, 5, 5, 2);

    // Check that voxels within radius are removed
    expect(grid.hasMaterial(5, 5, 5)).toBe(false);
    expect(grid.removedVoxels).toBeGreaterThan(0);
  });

  test('removePath removes voxels along line segment', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const grid = new VoxelGrid(bounds, 1.0);

    // Remove path from (2, 2, 2) to (8, 8, 8) with radius 1
    grid.removePath(2, 2, 2, 8, 8, 8, 1);

    // Check that voxels along path are removed
    expect(grid.hasMaterial(5, 5, 5)).toBe(false);
    expect(grid.removedVoxels).toBeGreaterThan(0);
  });

  test('getStats returns correct volume statistics', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const grid = new VoxelGrid(bounds, 2.0);

    const initialStats = grid.getStats();
    expect(initialStats.totalVolume).toBe(1); // 1000 mm³ = 1 cm³
    expect(initialStats.removedVolume).toBe(0);
    expect(initialStats.remainingVolume).toBe(1);
    expect(initialStats.removedPercentage).toBe(0);

    // Remove some voxels (entire grid)
    for (let i = 0; i < grid.gridX; i++) {
      for (let j = 0; j < grid.gridY; j++) {
        for (let k = 0; k < grid.gridZ; k++) {
          const idx = grid.gridToIndex(i, j, k);
          grid.grid[idx] = 0;
        }
      }
    }
    grid.removedVoxels = grid.totalVoxels;

    const finalStats = grid.getStats();
    expect(finalStats.removedVolume).toBe(1);
    expect(finalStats.remainingVolume).toBe(0);
    expect(finalStats.removedPercentage).toBe(100);
  });

  test('reset restores all voxels to initial state', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const grid = new VoxelGrid(bounds, 2.0);

    // Remove some voxels
    grid.removeSphere(5, 5, 5, 2);
    expect(grid.removedVoxels).toBeGreaterThan(0);

    // Reset
    grid.reset();
    expect(grid.removedVoxels).toBe(0);
    expect(grid.hasMaterial(5, 5, 5)).toBe(true);
  });

  test('handles out-of-bounds coordinates gracefully', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const grid = new VoxelGrid(bounds, 2.0);

    // Should not throw
    expect(() => grid.hasMaterial(-5, -5, -5)).not.toThrow();
    expect(() => grid.hasMaterial(15, 15, 15)).not.toThrow();
    expect(() => grid.removeSphere(-5, -5, -5, 1)).not.toThrow();
    expect(() => grid.removeSphere(15, 15, 15, 1)).not.toThrow();
  });
});

describe('MaterialRemovalSimulator (mocked Three.js)', () => {
  let mockScene;
  let mockMesh;

  beforeEach(() => {
    // Mock Three.js
    mockMesh = {
      material: { opacity: 1, color: { r: 0, g: 0, b: 0 } },
      visible: true,
    };
    mockScene = {
      add: () => {},
      remove: () => {},
    };

    // Mock THREE global
    global.window = global.window || {};
    global.window.THREE = {
      BoxGeometry: class {
        constructor() {}
      },
      MeshPhongMaterial: class {
        constructor(opts) {
          this.transparent = opts.transparent;
          this.opacity = opts.opacity;
          this.color = { r: 0, g: 0, b: 0 };
        }
      },
      Mesh: class {
        constructor() {
          return mockMesh;
        }
      },
    };
  });

  afterEach(() => {
    delete global.window.THREE;
  });

  test('constructor initializes simulator with default options', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const simulator = new MaterialRemovalSimulator(mockScene, bounds);

    expect(simulator.scene).toBe(mockScene);
    expect(simulator.bounds).toEqual(bounds);
    expect(simulator.grid).toBeDefined();
    expect(simulator.enabled).toBe(true);
    expect(simulator.operationCount).toBe(0);
  });

  test('constructor applies custom options', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const options = {
      resolution: 1.0,
      materialColor: 0xff0000,
      materialOpacity: 0.5,
      updateInterval: 5,
    };
    const simulator = new MaterialRemovalSimulator(mockScene, bounds, options);

    expect(simulator.grid.resolution).toBe(1.0);
    expect(simulator.updateInterval).toBe(5);
  });

  test('setEnabled toggles simulator state', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const simulator = new MaterialRemovalSimulator(mockScene, bounds);

    simulator.setEnabled(false);
    expect(simulator.enabled).toBe(false);
    if (simulator.materialBlock) {
      expect(simulator.materialBlock.visible).toBe(false);
    }

    simulator.setEnabled(true);
    expect(simulator.enabled).toBe(true);
    if (simulator.materialBlock) {
      expect(simulator.materialBlock.visible).toBe(true);
    }
  });

  test('processCut increments operation count', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const simulator = new MaterialRemovalSimulator(mockScene, bounds);

    const startPos = { x: 2, y: 2, z: 2 };
    const endPos = { x: 8, y: 8, z: 8 };
    const toolRadius = 1;

    simulator.processCut(startPos, endPos, toolRadius);
    expect(simulator.operationCount).toBe(1);
  });

  test('processCut updates visualization at interval', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const simulator = new MaterialRemovalSimulator(mockScene, bounds, { updateInterval: 2 });

    const startPos = { x: 2, y: 2, z: 2 };
    const endPos = { x: 8, y: 8, z: 8 };
    const toolRadius = 1;

    simulator.processCut(startPos, endPos, toolRadius);
    expect(simulator.operationCount).toBe(1);

    simulator.processCut(startPos, endPos, toolRadius);
    expect(simulator.operationCount).toBe(2);
  });

  test('getStats returns statistics', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const simulator = new MaterialRemovalSimulator(mockScene, bounds);

    const stats = simulator.getStats();
    expect(stats).toHaveProperty('totalVolume');
    expect(stats).toHaveProperty('removedVolume');
    expect(stats).toHaveProperty('remainingVolume');
    expect(stats).toHaveProperty('removedPercentage');
  });

  test('reset clears simulation state', () => {
    const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
    const simulator = new MaterialRemovalSimulator(mockScene, bounds);

    const startPos = { x: 2, y: 2, z: 2 };
    const endPos = { x: 8, y: 8, z: 8 };
    const toolRadius = 1;

    simulator.processCut(startPos, endPos, toolRadius);
    expect(simulator.operationCount).toBe(1);

    simulator.reset();
    expect(simulator.operationCount).toBe(0);
  });
});

describe('estimateWorkpieceBounds', () => {
  test('calculates bounds from toolpath points', () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 5 },
      { x: -5, y: -5, z: -2 },
    ];

    const bounds = estimateWorkpieceBounds(points, 0);
    expect(bounds.min.x).toBe(-5);
    expect(bounds.min.y).toBe(-5);
    expect(bounds.min.z).toBe(-2);
    expect(bounds.max.x).toBe(10);
    expect(bounds.max.y).toBe(10);
    expect(bounds.max.z).toBe(10); // Min 10mm height
  });

  test('applies padding to bounds', () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 5 },
    ];

    const bounds = estimateWorkpieceBounds(points, 5);
    expect(bounds.min.x).toBe(-5);
    expect(bounds.min.y).toBe(-5);
    expect(bounds.min.z).toBe(-5);
    expect(bounds.max.x).toBe(15);
    expect(bounds.max.y).toBe(15);
    expect(bounds.max.z).toBe(10);
  });

  test('handles empty points array', () => {
    const bounds = estimateWorkpieceBounds([], 5);
    expect(bounds.min.x).toBe(-5);
    expect(bounds.min.y).toBe(-5);
    expect(bounds.min.z).toBe(-5);
    expect(bounds.max.x).toBe(5);
    expect(bounds.max.y).toBe(5);
    expect(bounds.max.z).toBe(5);
  });

  test('handles single point', () => {
    const points = [{ x: 10, y: 20, z: 30 }];
    const bounds = estimateWorkpieceBounds(points, 5);
    expect(bounds.min.x).toBe(5);
    expect(bounds.min.y).toBe(15);
    expect(bounds.min.z).toBe(0); // Clamped to 0 minimum
    expect(bounds.max.x).toBe(15);
    expect(bounds.max.y).toBe(25);
    expect(bounds.max.z).toBe(35);
  });
});
