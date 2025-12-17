/**
 * Advanced Toolpath Optimizer Unit Tests
 * Tests for toolpath optimization strategies and metrics
 */

/* eslint-disable no-undef */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { AdvancedToolpathOptimizer } from '../../../modules/simulation/toolpath-optimizer.mjs';

describe('AdvancedToolpathOptimizer', () => {
  let optimizer;
  let sampleToolpath;

  beforeEach(() => {
    optimizer = new AdvancedToolpathOptimizer({
      optimizeForTime: true,
      optimizeForFinish: true,
      optimizeForWear: true,
      enableCollisionAvoidance: true,
    });

    sampleToolpath = {
      commands: [
        { type: 'rapid', position: { x: 0, y: 0, z: 10 } },
        { type: 'cut', position: { x: 10, y: 10, z: -5 }, feedRate: 100, spindleSpeed: 6000 },
        { type: 'cut', position: { x: 20, y: 20, z: -5 }, feedRate: 100, spindleSpeed: 6000 },
        { type: 'cut', position: { x: 30, y: 30, z: -5 }, feedRate: 100, spindleSpeed: 6000 },
        { type: 'rapid', position: { x: 0, y: 0, z: 10 } },
      ],
    };
  });

  describe('initialization', () => {
    test('should initialize with default options', () => {
      const o = new AdvancedToolpathOptimizer();
      expect(o.options.enabled).toBe(true);
      expect(o.options.optimizeForTime).toBe(true);
    });

    test('should initialize optimization strategies', () => {
      expect(optimizer.optimizationStrategies).toHaveProperty('time');
      expect(optimizer.optimizationStrategies).toHaveProperty('finish');
      expect(optimizer.optimizationStrategies).toHaveProperty('wear');
      expect(optimizer.optimizationStrategies).toHaveProperty('safety');
    });

    test('should have strategy weights', () => {
      const strategies = optimizer.getStrategies();
      let totalWeight = 0;
      Object.values(strategies).forEach((s) => {
        expect(s.weight).toBeGreaterThan(0);
        expect(s.weight).toBeLessThanOrEqual(1);
        totalWeight += s.weight;
      });
      expect(totalWeight).toBeCloseTo(1.0, 1);
    });
  });

  describe('toolpath optimization', () => {
    test('should optimize complete toolpath', () => {
      const result = optimizer.optimizeToolpath(sampleToolpath);

      expect(result).toHaveProperty('originalPath');
      expect(result).toHaveProperty('optimizedPath');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('improvements');
    });

    test('should require commands array', () => {
      expect(() => {
        optimizer.optimizeToolpath({});
      }).toThrow('Toolpath requires commands array');
    });

    test('should return optimized commands array', () => {
      const result = optimizer.optimizeToolpath(sampleToolpath);
      expect(Array.isArray(result.optimizedPath)).toBe(true);
      expect(result.optimizedPath.length).toBeGreaterThan(0);
    });

    test('should add to optimization history', () => {
      optimizer.optimizeToolpath(sampleToolpath);
      expect(optimizer.optimizationHistory.length).toBe(1);
    });

    test('should emit optimization event', () => {
      const callback = jest.fn();
      optimizer.on('toolpath:optimized', callback);
      optimizer.optimizeToolpath(sampleToolpath);
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('time optimization', () => {
    test('should optimize for minimum time', () => {
      const optimized = optimizer.optimizeForMinimumTime(sampleToolpath.commands);
      expect(Array.isArray(optimized)).toBe(true);
      expect(optimized.length).toBeGreaterThan(0);
    });

    test('should increase feed rate', () => {
      const original = sampleToolpath.commands.find((c) => c.type === 'cut');
      const optimized = optimizer.optimizeForMinimumTime(sampleToolpath.commands);
      const optimizedCut = optimized.find((c) => c.type === 'cut' && c.feedRate);

      if (original && optimizedCut && original.feedRate) {
        expect(optimizedCut.feedRate).toBeGreaterThan(original.feedRate);
      }
    });
  });

  describe('surface finish optimization', () => {
    test('should optimize for surface finish', () => {
      const optimized = optimizer.optimizeForSurfaceFinish(sampleToolpath.commands);
      expect(Array.isArray(optimized)).toBe(true);
      expect(optimized.length).toEqual(sampleToolpath.commands.length);
    });

    test('should apply finishing pass optimization', () => {
      const finishingPath = [
        ...sampleToolpath.commands,
        {
          type: 'cut',
          position: { x: 35, y: 35, z: -5 },
          feedRate: 100,
          spindleSpeed: 6000,
          description: 'Finishing pass',
        },
      ];

      const optimized = optimizer.optimizeForSurfaceFinish(finishingPath);
      const finishingCmd = optimized.find((c) => c.description?.includes('Finishing'));

      if (finishingCmd && finishingCmd.feedRate) {
        expect(finishingCmd.feedRate).toBeLessThan(100);
        expect(finishingCmd.spindleSpeed).toBeGreaterThan(6000);
      }
    });
  });

  describe('tool wear optimization', () => {
    test('should optimize for tool wear', () => {
      const optimized = optimizer.optimizeForToolWear(sampleToolpath.commands);
      expect(Array.isArray(optimized)).toBe(true);
    });

    test('should reduce feed and speed for wear reduction', () => {
      const original = sampleToolpath.commands.find((c) => c.type === 'cut');
      const optimized = optimizer.optimizeForToolWear(sampleToolpath.commands);
      const optimizedCut = optimized.find(
        (c) => c.type === 'cut' && c.optimizationApplied === 'wear-reduction'
      );

      if (original && optimizedCut) {
        if (original.feedRate && optimizedCut.feedRate) {
          expect(optimizedCut.feedRate).toBeLessThan(original.feedRate);
        }
        if (original.spindleSpeed && optimizedCut.spindleSpeed) {
          expect(optimizedCut.spindleSpeed).toBeLessThan(original.spindleSpeed);
        }
      }
    });

    test('should maintain minimum spindle speed', () => {
      const optimized = optimizer.optimizeForToolWear(sampleToolpath.commands);
      const cuts = optimized.filter((c) => c.type === 'cut');

      cuts.forEach((cut) => {
        if (cut.spindleSpeed) {
          expect(cut.spindleSpeed).toBeGreaterThanOrEqual(2000);
        }
      });
    });
  });

  describe('collision avoidance', () => {
    test('should avoid collisions', () => {
      const pathWithCollision = {
        commands: [
          { type: 'rapid', position: { x: 0, y: 0, z: 10 } },
          { type: 'cut', position: { x: 300, y: 0, z: 0 } }, // Out of bounds
        ],
      };

      const optimized = optimizer.avoidCollisions(pathWithCollision.commands);
      expect(optimized.length).toBeGreaterThan(pathWithCollision.commands.length);
    });

    test('should detect collision risk', () => {
      const workArea = {
        minX: -250,
        maxX: 250,
        minY: -250,
        maxY: 250,
        minZ: -100,
        maxZ: 100,
      };

      const safePos = { x: 0, y: 0, z: 0 };
      const riskPos = { x: 300, y: 0, z: 0 };

      expect(optimizer.isCollisionRisk(safePos, workArea)).toBe(false);
      expect(optimizer.isCollisionRisk(riskPos, workArea)).toBe(true);
    });

    test('should generate safe paths', () => {
      const startPos = { x: 0, y: 0, z: 5 };
      const endPos = { x: 100, y: 100, z: 10 };
      const workArea = {
        minX: -250,
        maxX: 250,
        minY: -250,
        maxY: 250,
        minZ: -100,
        maxZ: 100,
      };

      const safePath = optimizer.generateSafePath(startPos, endPos, workArea);
      expect(Array.isArray(safePath)).toBe(true);
      expect(safePath.length).toBeGreaterThan(0);
    });
  });

  describe('tool change consolidation', () => {
    test('should consolidate tool changes', () => {
      const pathWithDuplicates = [
        { type: 'tool-change', toolId: '1' },
        { type: 'cut', position: { x: 10, y: 10, z: 0 } },
        { type: 'tool-change', toolId: '1' }, // Duplicate
        { type: 'cut', position: { x: 20, y: 20, z: 0 } },
        { type: 'tool-change', toolId: '2' },
        { type: 'cut', position: { x: 30, y: 30, z: 0 } },
      ];

      const consolidated = optimizer.consolidateToolChanges(pathWithDuplicates);
      const toolChanges = consolidated.filter((c) => c.type === 'tool-change');

      expect(toolChanges.length).toBeLessThan(
        pathWithDuplicates.filter((c) => c.type === 'tool-change').length
      );
    });
  });

  describe('metrics calculation', () => {
    test('should calculate metrics', () => {
      const result = optimizer.optimizeToolpath(sampleToolpath);
      const metrics = result.metrics;

      expect(metrics).toHaveProperty('originalExecutionTime');
      expect(metrics).toHaveProperty('optimizedExecutionTime');
      expect(metrics).toHaveProperty('originalDistance');
      expect(metrics).toHaveProperty('optimizedDistance');
      expect(metrics).toHaveProperty('commandCount');
    });

    test('should calculate improvements', () => {
      const result = optimizer.optimizeToolpath(sampleToolpath);
      const improvements = result.improvements;

      expect(improvements).toHaveProperty('timeReduction');
      expect(improvements).toHaveProperty('distanceReduction');
      expect(improvements).toHaveProperty('commandsReduced');

      expect(improvements.timeReduction).toHaveProperty('absolute');
      expect(improvements.timeReduction).toHaveProperty('percentage');
      expect(improvements.timeReduction).toHaveProperty('unit');
    });

    test('should estimate execution time', () => {
      const time = optimizer.estimateExecutionTime(sampleToolpath.commands);
      expect(typeof time).toBe('number');
      expect(time).toBeGreaterThanOrEqual(0);
    });

    test('should calculate total distance', () => {
      const distance = optimizer.calculateTotalDistance(sampleToolpath.commands);
      expect(typeof distance).toBe('number');
      expect(distance).toBeGreaterThanOrEqual(0);
    });

    test('should calculate distance between points', () => {
      const p1 = { x: 0, y: 0, z: 0 };
      const p2 = { x: 3, y: 4, z: 0 };

      const distance = optimizer.distanceBetween(p1, p2);
      expect(distance).toBeCloseTo(5, 0); // 3-4-5 triangle
    });
  });

  describe('history and statistics', () => {
    test('should maintain optimization history', () => {
      optimizer.optimizeToolpath(sampleToolpath);
      optimizer.optimizeToolpath(sampleToolpath);

      expect(optimizer.optimizationHistory.length).toBe(2);
    });

    test('should return limited history', () => {
      for (let i = 0; i < 10; i++) {
        optimizer.optimizeToolpath(sampleToolpath);
      }

      const history = optimizer.getHistory(5);
      expect(history.length).toBe(5);
    });

    test('should calculate statistics', () => {
      optimizer.optimizeToolpath(sampleToolpath);
      optimizer.optimizeToolpath(sampleToolpath);

      const stats = optimizer.getStatistics();
      expect(stats.totalOptimizations).toBe(2);
      expect(stats).toHaveProperty('totalTimeSaved');
      expect(stats).toHaveProperty('totalDistanceSaved');
      expect(stats).toHaveProperty('averageTimeSavingsPerJob');
    });

    test('should clear history', () => {
      optimizer.optimizeToolpath(sampleToolpath);
      optimizer.clearHistory();
      expect(optimizer.optimizationHistory.length).toBe(0);
    });

    test('should return message when no history', () => {
      optimizer.clearHistory();
      const stats = optimizer.getStatistics();
      expect(stats.message).toBeDefined();
    });
  });

  describe('strategy management', () => {
    test('should return strategies', () => {
      const strategies = optimizer.getStrategies();
      expect(strategies).toHaveProperty('time');
      expect(strategies).toHaveProperty('finish');
      expect(strategies).toHaveProperty('wear');
      expect(strategies).toHaveProperty('safety');
    });

    test('should update strategies', () => {
      optimizer.updateStrategies({
        time: { weight: 0.5 },
      });

      expect(optimizer.optimizationStrategies.time.weight).toBe(0.5);
    });

    test('should return updated strategies', () => {
      const updated = optimizer.updateStrategies({
        time: { weight: 0.6 },
      });

      expect(updated.time.weight).toBe(0.6);
    });
  });

  describe('event handling', () => {
    test('should register event listeners', () => {
      const callback = jest.fn();
      optimizer.on('toolpath:test', callback);
      expect(optimizer.listeners['toolpath:test']).toContain(callback);
    });

    test('should emit events', () => {
      const callback = jest.fn();
      optimizer.on('toolpath:test', callback);
      optimizer.emit('toolpath:test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should emit multiple events to multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      optimizer.on('toolpath:test', callback1);
      optimizer.on('toolpath:test', callback2);
      optimizer.emit('toolpath:test', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle empty toolpath', () => {
      const emptyPath = { commands: [] };
      expect(() => {
        optimizer.optimizeToolpath(emptyPath);
      }).not.toThrow();
    });

    test('should handle null position', () => {
      const pathWithNull = {
        commands: [{ type: 'rapid', position: null }],
      };

      expect(() => {
        optimizer.optimizeToolpath(pathWithNull);
      }).not.toThrow();
    });

    test('should handle mixed command types', () => {
      const mixedPath = {
        commands: [
          { type: 'rapid', position: { x: 0, y: 0, z: 10 } },
          { type: 'cut', position: { x: 10, y: 10, z: 0 }, feedRate: 100 },
          { type: 'tool-change', toolId: '1' },
          { type: 'cut', position: { x: 20, y: 20, z: 0 }, feedRate: 100 },
          { type: 'pause' },
          { type: 'rapid', position: { x: 0, y: 0, z: 10 } },
        ],
      };

      const result = optimizer.optimizeToolpath(mixedPath);
      expect(result.optimizedPath.length).toBeGreaterThan(0);
    });

    test('should handle commands without position', () => {
      const pathWithoutPos = {
        commands: [
          { type: 'rapid', position: { x: 0, y: 0, z: 10 } },
          { type: 'spindle-on', spindleSpeed: 6000 },
          { type: 'cut', position: { x: 10, y: 10, z: 0 }, feedRate: 100 },
        ],
      };

      expect(() => {
        optimizer.optimizeToolpath(pathWithoutPos);
      }).not.toThrow();
    });
  });

  describe('distance calculations', () => {
    test('should calculate distance from origin', () => {
      const pos = { x: 3, y: 4, z: 0 };
      const distance = optimizer.calculateDistance(pos);
      expect(distance).toBeCloseTo(5, 0);
    });

    test('should handle null position', () => {
      const distance = optimizer.calculateDistance(null);
      expect(distance).toBe(0);
    });

    test('should handle partial coordinates', () => {
      const pos = { x: 3, y: 4 }; // No z
      const distance = optimizer.calculateDistance(pos);
      expect(distance).toBeCloseTo(5, 0);
    });
  });
});
