/**
 * Advanced Visualization Tests
 * Phase 14.5: Advanced Visualization
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  VoxelGrid,
  ToolEngagement,
  ChipLoadCalculator,
  HeatMapData,
  MoveStatistics,
  AdvancedVisualizationManager,
} from '../../../modules/presentation/advanced-visualization.mjs';

describe('VoxelGrid', () => {
  let grid;

  beforeEach(() => {
    grid = new VoxelGrid({ width: 100, height: 100, depth: 100 }, 1);
  });

  test('should create voxel grid with dimensions', () => {
    expect(grid.width).toBe(100);
    expect(grid.height).toBe(100);
    expect(grid.depth).toBe(100);
  });

  test('should set and get voxel values', () => {
    grid.setVoxel(10, 10, 10, 1);
    expect(grid.getVoxel(10, 10, 10)).toBe(1);
  });

  test('should return 0 for out-of-bounds voxels', () => {
    expect(grid.getVoxel(-1, 10, 10)).toBe(0);
    expect(grid.getVoxel(1000, 10, 10)).toBe(0);
  });

  test('should track material removal', () => {
    grid.setVoxel(10, 10, 10, 1);
    grid.setVoxel(10, 10, 10, 0);

    expect(grid.materialRemoved).toBe(1);
  });

  test('should remove material along path', () => {
    const startPos = { x: 10, y: 10, z: 10 };
    const endPos = { x: 20, y: 10, z: 10 };

    grid.removeAlongPath(startPos, endPos, 2);

    expect(grid.materialRemoved).toBeGreaterThan(0);
  });

  test('should remove spherical material', () => {
    const center = { x: 50, y: 50, z: 50 };
    grid.removeSphere(center, 5);

    expect(grid.materialRemoved).toBeGreaterThan(0);
  });

  test('should calculate removal percentage', () => {
    grid.removeSphere({ x: 50, y: 50, z: 50 }, 10);
    const percentage = grid.getRemovalPercentage();

    expect(percentage).toBeGreaterThan(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });

  test('should get density map', () => {
    grid.removeSphere({ x: 50, y: 50, z: 50 }, 5);
    const map = grid.getDensityMap('z');

    expect(map).toBeDefined();
    expect(map.length).toBe(grid.width * grid.height);
  });

  test('should reset grid', () => {
    grid.removeSphere({ x: 50, y: 50, z: 50 }, 5);
    grid.reset();

    expect(grid.materialRemoved).toBe(0);
  });
});

describe('ToolEngagement', () => {
  let engagement;

  beforeEach(() => {
    engagement = new ToolEngagement();
  });

  test('should record tool engagement', () => {
    engagement.recordEngagement(45, 1.0);

    expect(engagement.engagements).toBe(1);
    expect(engagement.totalEngagementTime).toBe(1.0);
  });

  test('should track angle extremes', () => {
    engagement.recordEngagement(30, 0.5);
    engagement.recordEngagement(60, 0.5);
    engagement.recordEngagement(45, 0.5);

    expect(engagement.minEngagementAngle).toBe(30);
    expect(engagement.maxEngagementAngle).toBe(60);
  });

  test('should calculate average engagement angle', () => {
    engagement.recordEngagement(30, 1.0);
    engagement.recordEngagement(60, 1.0);

    expect(engagement.averageEngagementAngle).toBeCloseTo(45, 1);
  });

  test('should reject invalid angles', () => {
    expect(() => engagement.recordEngagement(-10, 1.0)).toThrow();
    expect(() => engagement.recordEngagement(200, 1.0)).toThrow();
  });

  test('should get engagement summary', () => {
    engagement.recordEngagement(45, 2.0);
    const summary = engagement.getSummary();

    expect(summary.totalEngagementTime).toBe('2.000');
    expect(summary.engagements).toBe(1);
  });
});

describe('ChipLoadCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new ChipLoadCalculator(2, 2.5);
  });

  test('should calculate chip load', () => {
    const chipLoad = calculator.calculateChipLoad(100, 1000, 10);

    expect(chipLoad).toBeGreaterThan(0);
  });

  test('should return 0 for invalid inputs', () => {
    expect(calculator.calculateChipLoad(100, 0, 10)).toBe(0);
    expect(calculator.calculateChipLoad(0, 1000, 10)).toBe(0);
  });

  test('should track min/max chip loads', () => {
    calculator.calculateChipLoad(50, 1000, 10);
    calculator.calculateChipLoad(150, 1000, 10);

    expect(calculator.minChipLoad).toBeLessThan(calculator.maxChipLoad);
  });

  test('should get average chip load', () => {
    calculator.calculateChipLoad(100, 1000, 10);
    calculator.calculateChipLoad(100, 1000, 10);

    const avg = calculator.getAverageChipLoad();
    expect(avg).toBeGreaterThan(0);
  });

  test('should get chip load summary', () => {
    calculator.calculateChipLoad(100, 1000, 10);
    const summary = calculator.getSummary();

    expect(summary.averageChipLoad).toBeDefined();
    expect(summary.maxChipLoad).toBeDefined();
    expect(summary.minChipLoad).toBeDefined();
    expect(summary.measurements).toBe(1);
  });
});

describe('HeatMapData', () => {
  let heatmap;

  beforeEach(() => {
    heatmap = new HeatMapData(100, 100);
  });

  test('should create heat map', () => {
    expect(heatmap.width).toBe(100);
    expect(heatmap.height).toBe(100);
  });

  test('should add values to cells', () => {
    heatmap.addValue(50, 50, 100);

    expect(heatmap.maxValue).toBe(100);
  });

  test('should track min/max values', () => {
    heatmap.addValue(10, 10, 50);
    heatmap.addValue(20, 20, 150);

    expect(heatmap.minValue).toBe(50);
    expect(heatmap.maxValue).toBe(150);
  });

  test('should get normalized data', () => {
    heatmap.addValue(50, 50, 100);
    const normalized = heatmap.getNormalizedData();

    expect(normalized).toBeDefined();
    expect(normalized.length).toBe(100 * 100);
  });

  test('should get color for value', () => {
    heatmap.addValue(50, 50, 100);
    const color = heatmap.getColorForValue(100);

    expect(color).toMatch(/hsl\(/);
  });
});

describe('MoveStatistics', () => {
  let stats;

  beforeEach(() => {
    stats = new MoveStatistics();
  });

  test('should record rapid moves', () => {
    stats.recordRapidMove(50, 2);

    expect(stats.rapidMoves.count).toBe(1);
    expect(stats.rapidMoves.distance).toBe(50);
  });

  test('should record cutting moves', () => {
    stats.recordCuttingMove(30, 3);

    expect(stats.cuttingMoves.count).toBe(1);
    expect(stats.cuttingMoves.distance).toBe(30);
  });

  test('should track mixed moves', () => {
    stats.recordRapidMove(50, 2);
    stats.recordCuttingMove(30, 3);

    expect(stats.rapidMoves.count).toBe(1);
    expect(stats.cuttingMoves.count).toBe(1);
  });

  test('should calculate move statistics', () => {
    stats.recordRapidMove(100, 1);
    stats.recordCuttingMove(100, 2);

    const stats_result = stats.getStatistics();

    expect(stats_result.rapid.count).toBe(1);
    expect(stats_result.cutting.count).toBe(1);
    expect(parseFloat(stats_result.total.distance)).toBe(200);
  });

  test('should calculate percentage', () => {
    stats.recordRapidMove(200, 1);
    stats.recordCuttingMove(200, 1);

    const stats_result = stats.getStatistics();

    expect(stats_result.rapid.percentDistance).toBe('50.0');
    expect(stats_result.cutting.percentDistance).toBe('50.0');
  });
});

describe('AdvancedVisualizationManager', () => {
  let manager;

  beforeEach(() => {
    manager = new AdvancedVisualizationManager();
  });

  test('should create manager', () => {
    expect(manager.voxelGrid).toBeDefined();
    expect(manager.toolEngagement).toBeDefined();
    expect(manager.chipLoadCalculator).toBeDefined();
    expect(manager.feedRateHeatMap).toBeDefined();
    expect(manager.moveStatistics).toBeDefined();
  });

  test('should process toolpath', () => {
    const segments = [
      {
        code: 'G1',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
        time: 1,
        isCutting: true,
      },
      {
        code: 'G0',
        start: { x: 10, y: 0, z: 0 },
        end: { x: 20, y: 0, z: 0 },
        feedRate: 200,
        spindleSpeed: 1000,
        time: 0.5,
        isCutting: false,
      },
    ];

    manager.processToolpath(segments);

    expect(manager.moveStatistics.cuttingMoves.count).toBe(1);
    expect(manager.moveStatistics.rapidMoves.count).toBe(1);
  });

  test('should reject non-array segments', () => {
    expect(() => manager.processToolpath('not-array')).toThrow();
  });

  test('should get material removal data', () => {
    const segments = [
      {
        code: 'G1',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
        isCutting: true,
      },
    ];

    manager.processToolpath(segments);
    const data = manager.getMaterialRemovalData();

    expect(data.totalVoxels).toBeGreaterThan(0);
    expect(data.removalPercentage).toBeDefined();
  });

  test('should get tool engagement data', () => {
    const data = manager.getToolEngagementData();

    expect(data.totalEngagementTime).toBeDefined();
    expect(data.averageEngagementAngle).toBeDefined();
  });

  test('should get chip load data', () => {
    const data = manager.getChipLoadData();

    expect(data.averageChipLoad).toBeDefined();
    expect(data.maxChipLoad).toBeDefined();
  });

  test('should get feed rate heat map', () => {
    const data = manager.getFeedRateHeatMap();

    expect(data.normalized).toBeDefined();
    expect(data.width).toBeGreaterThan(0);
    expect(data.height).toBeGreaterThan(0);
  });

  test('should get move statistics', () => {
    const segments = [
      {
        code: 'G1',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
        time: 1,
      },
    ];

    manager.processToolpath(segments);
    const stats = manager.getMoveStatistics();

    expect(stats.rapid).toBeDefined();
    expect(stats.cutting).toBeDefined();
    expect(stats.total).toBeDefined();
  });

  test('should get complete visualization report', () => {
    const segments = [
      {
        code: 'G1',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
        time: 1,
      },
    ];

    manager.processToolpath(segments);
    const report = manager.getVisualizationReport();

    expect(report.timestamp).toBeDefined();
    expect(report.materialRemoval).toBeDefined();
    expect(report.toolEngagement).toBeDefined();
    expect(report.chipLoad).toBeDefined();
    expect(report.feedRateHeatMap).toBeDefined();
    expect(report.moveStatistics).toBeDefined();
  });

  test('should reset all visualizations', () => {
    const segments = [
      {
        code: 'G1',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
        time: 1,
      },
    ];

    manager.processToolpath(segments);
    manager.reset();

    expect(manager.voxelGrid.materialRemoved).toBe(0);
    expect(manager.moveStatistics.cuttingMoves.count).toBe(0);
  });

  test('should emit toolpath processed event', () => {
    const callback = jest.fn();
    manager.addEventListener('toolpathProcessed', callback);

    const segments = [
      {
        code: 'G1',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
        time: 1,
      },
    ];

    manager.processToolpath(segments);

    expect(callback).toHaveBeenCalled();
  });

  test('should emit reset event', () => {
    const callback = jest.fn();
    manager.addEventListener('visualizationReset', callback);

    manager.reset();

    expect(callback).toHaveBeenCalled();
  });

  test('should support event listeners', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    manager.addEventListener('toolpathProcessed', callback1);
    manager.addEventListener('toolpathProcessed', callback2);

    const segments = [
      {
        code: 'G1',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
      },
    ];
    manager.processToolpath(segments);

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  test('should remove event listeners', () => {
    const callback = jest.fn();
    manager.addEventListener('toolpathProcessed', callback);
    manager.removeEventListener('toolpathProcessed', callback);

    const segments = [
      {
        code: 'G1',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
      },
    ];
    manager.processToolpath(segments);

    expect(callback).not.toHaveBeenCalled();
  });
});
