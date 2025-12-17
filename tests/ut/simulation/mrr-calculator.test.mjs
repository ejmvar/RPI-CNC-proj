/**
 * MRR Calculator Unit Tests
 * Tests for material removal rate calculations and optimization
 */

/* eslint-disable no-undef */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { MRRCalculator } from '../../../modules/simulation/mrr-calculator.mjs';

describe('MRRCalculator', () => {
  let calculator;

  beforeEach(() => {
    calculator = new MRRCalculator({
      unitSystem: 'metric',
      targetMRR: 10,
      safetyFactor: 0.85,
    });
  });

  describe('initialization', () => {
    test('should initialize with default options', () => {
      const c = new MRRCalculator();
      expect(c.options.unitSystem).toBe('metric');
      expect(c.options.targetMRR).toBe(10);
      expect(c.options.safetyFactor).toBe(0.85);
    });

    test('should set custom options', () => {
      const c = new MRRCalculator({
        unitSystem: 'imperial',
        targetMRR: 5,
        safetyFactor: 0.9,
      });
      expect(c.options.unitSystem).toBe('imperial');
      expect(c.options.targetMRR).toBe(5);
    });
  });

  describe('MRR calculation', () => {
    test('should calculate basic MRR', () => {
      const result = calculator.calculateMRR({
        feedRate: 100,
        depth: 2,
        width: 5,
      });

      expect(result).toHaveProperty('mrr');
      expect(result.mrr).toBeGreaterThan(0);
      expect(result.unit).toBe('cm³/min');
    });

    test('should calculate MRR with tool diameter as default width', () => {
      const result = calculator.calculateMRR({
        feedRate: 100,
        depth: 2,
        toolDiameter: 3.175,
      });

      expect(result.mrr).toBeGreaterThan(0);
      expect(result.width).toBe(3.175);
    });

    test('should require feedRate and depth', () => {
      expect(() => {
        calculator.calculateMRR({ feedRate: 100 });
      }).toThrow('requires feedRate and depth');
    });

    test('should calculate correct MRR value', () => {
      // MRR = (100 × 2 × 5) / 1000 = 1 cm³/min
      const result = calculator.calculateMRR({
        feedRate: 100,
        depth: 2,
        width: 5,
      });

      expect(result.mrr).toBeCloseTo(1.0, 1);
    });

    test('should increase MRR with higher feed rate', () => {
      const low = calculator.calculateMRR({
        feedRate: 50,
        depth: 2,
        width: 5,
      });

      const high = calculator.calculateMRR({
        feedRate: 100,
        depth: 2,
        width: 5,
      });

      expect(high.mrr).toBeGreaterThan(low.mrr);
    });
  });

  describe('feed rate optimization', () => {
    test('should optimize feed rate for target MRR', () => {
      const result = calculator.optimizeForTargetMRR({
        depth: 2,
        targetMRR: 10,
        width: 5,
      });

      expect(result).toHaveProperty('recommendedFeedRate');
      expect(result.recommendedFeedRate).toBeGreaterThan(0);
    });

    test('should apply safety factor', () => {
      const result = calculator.optimizeForTargetMRR({
        depth: 2,
        targetMRR: 10,
        width: 5,
      });

      // calculatedFeedRate = (10 × 1000) / (2 × 5) = 1000
      // recommendedFeedRate = 1000 × 0.85 = 850
      expect(result.calculatedFeedRate).toBeCloseTo(1000, 0);
      expect(result.recommendedFeedRate).toBeCloseTo(850, 0);
    });

    test('should respect maximum feed rate', () => {
      const result = calculator.optimizeForTargetMRR({
        depth: 2,
        targetMRR: 10,
        width: 5,
        maxFeedRate: 200,
      });

      expect(result.recommendedFeedRate).toBeLessThanOrEqual(200);
    });

    test('should add to history', () => {
      calculator.optimizeForTargetMRR({
        depth: 2,
        targetMRR: 10,
        width: 5,
      });

      expect(calculator.mrrHistory.length).toBe(1);
    });

    test('should emit event', () => {
      const callback = jest.fn();
      calculator.on('mrr:optimized', callback);

      calculator.optimizeForTargetMRR({
        depth: 2,
        targetMRR: 10,
        width: 5,
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('time estimation', () => {
    test('should estimate time per part', () => {
      const result = calculator.estimateTimePerPart({
        totalVolume: 100,
        feedRate: 100,
        depth: 2,
        width: 5,
      });

      expect(result).toHaveProperty('cuttingTime');
      expect(result).toHaveProperty('totalTime');
      expect(result.totalTime).toBeGreaterThan(0);
    });

    test('should include rapid movements estimate', () => {
      const result = calculator.estimateTimePerPart({
        totalVolume: 100,
        feedRate: 100,
        depth: 2,
        width: 5,
      });

      expect(result.rapidTime).toBeGreaterThan(0);
      expect(result.rapidTime).toBeCloseTo(result.cuttingTime * 0.2, 1);
    });

    test('should include tool change time', () => {
      const result = calculator.estimateTimePerPart({
        totalVolume: 100,
        feedRate: 100,
        depth: 2,
        width: 5,
        numberOfToolChanges: 2,
        toolChangeTime: 1,
      });

      expect(result.toolChangeTime).toBe(2);
      expect(result.totalTime).toBeGreaterThan(result.cuttingTime + result.rapidTime);
    });

    test('should require necessary parameters', () => {
      expect(() => {
        calculator.estimateTimePerPart({ feedRate: 100 });
      }).toThrow('requires totalVolume');
    });
  });

  describe('strategy comparison', () => {
    test('should compare multiple strategies', () => {
      const strategies = [
        { name: 'Fast', feedRate: 200, depth: 3, width: 5, totalVolume: 100 },
        { name: 'Conservative', feedRate: 100, depth: 2, width: 5, totalVolume: 100 },
        { name: 'Balanced', feedRate: 150, depth: 2.5, width: 5, totalVolume: 100 },
      ];

      const comparison = calculator.compareStrategies(strategies);

      expect(Array.isArray(comparison)).toBe(true);
      expect(comparison.length).toBe(3);
    });

    test('should sort by MRR descending', () => {
      const strategies = [
        { feedRate: 50, depth: 1, width: 5, totalVolume: 100 },
        { feedRate: 200, depth: 3, width: 5, totalVolume: 100 },
        { feedRate: 100, depth: 2, width: 5, totalVolume: 100 },
      ];

      const comparison = calculator.compareStrategies(strategies);

      for (let i = 0; i < comparison.length - 1; i++) {
        expect(comparison[i].mrr).toBeGreaterThanOrEqual(comparison[i + 1].mrr);
      }
    });

    test('should include efficiency metric', () => {
      const strategies = [{ feedRate: 100, depth: 2, width: 5, totalVolume: 100 }];

      const comparison = calculator.compareStrategies(strategies);

      expect(comparison[0]).toHaveProperty('efficiency');
      expect(comparison[0].efficiency).toBeGreaterThan(0);
    });

    test('should require array input', () => {
      expect(() => {
        calculator.compareStrategies({ feedRate: 100 });
      }).toThrow('must be an array');
    });
  });

  describe('maximum MRR calculation', () => {
    test('should calculate maximum possible MRR', () => {
      const result = calculator.getMaximumMRR({
        maxFeedRate: 300,
        maxDepth: 5,
        maxWidth: 10,
      });

      expect(result).toHaveProperty('theoreticalMaximum');
      expect(result).toHaveProperty('conservativeMaximum');
    });

    test('should apply safety factor', () => {
      const result = calculator.getMaximumMRR({
        maxFeedRate: 300,
        maxDepth: 5,
        maxWidth: 10,
      });

      expect(result.conservativeMaximum).toBeLessThan(result.theoreticalMaximum);
      expect(result.conservativeMaximum).toBeCloseTo(result.theoreticalMaximum * 0.85, 1);
    });

    test('should use tool diameter as default width', () => {
      const result = calculator.getMaximumMRR({
        maxFeedRate: 300,
        maxDepth: 5,
        toolDiameter: 3.175,
      });

      expect(result.constraints.maxWidth).toBe(3.175);
    });
  });

  describe('parameter recommendations', () => {
    test('should recommend parameters for target MRR and time', () => {
      const result = calculator.recommendParameters({
        targetMRR: 10,
        targetTime: 60,
        availableTools: [
          { id: '1', type: 'endmill', diameter: 3.175, maxDepth: 5, maxFeedRate: 300 },
          { id: '2', type: 'ball-nose', diameter: 6.35, maxDepth: 3, maxFeedRate: 250 },
        ],
      });

      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should require targetMRR and targetTime', () => {
      expect(() => {
        calculator.recommendParameters({ targetMRR: 10 });
      }).toThrow();
    });

    test('should filter feasible recommendations', () => {
      const result = calculator.recommendParameters({
        targetMRR: 100, // Very high target
        targetTime: 60,
        availableTools: [{ id: '1', type: 'endmill', diameter: 3.175, maxFeedRate: 100 }],
      });

      // High MRR target may be infeasible with small tool
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should include all recommendation properties', () => {
      const result = calculator.recommendParameters({
        targetMRR: 10,
        targetTime: 60,
        availableTools: [{ id: '1', type: 'endmill', diameter: 3.175, maxFeedRate: 300 }],
      });

      if (result.recommendations.length > 0) {
        const rec = result.recommendations[0];
        expect(rec).toHaveProperty('toolId');
        expect(rec).toHaveProperty('recommendedFeedRate');
        expect(rec).toHaveProperty('recommendedDepth');
        expect(rec).toHaveProperty('feasible');
      }
    });
  });

  describe('productivity calculation', () => {
    test('should calculate productivity metrics', () => {
      const result = calculator.calculateProductivity({
        timePerPart: 5,
      });

      expect(result).toHaveProperty('partsPerHour');
      expect(result).toHaveProperty('partsPerShift');
      expect(result).toHaveProperty('partsPerDay');
    });

    test('should include setup and cooldown time', () => {
      const result = calculator.calculateProductivity({
        timePerPart: 5,
        setupTime: 1,
        cooldownTime: 0.5,
      });

      expect(result.totalTimePerPart).toBeCloseTo(6.5, 1);
    });

    test('should calculate correct parts per hour', () => {
      const result = calculator.calculateProductivity({
        timePerPart: 6, // 6 minutes per part = 10 parts per hour
      });

      expect(result.partsPerHour).toBeCloseTo(10, 0);
    });

    test('should calculate shift and day productivity', () => {
      const result = calculator.calculateProductivity({
        timePerPart: 6,
      });

      expect(result.partsPerShift).toBeCloseTo(result.partsPerHour * 8, 0);
      expect(result.partsPerDay).toBeCloseTo(result.partsPerHour * 16, 0);
    });
  });

  describe('history and statistics', () => {
    test('should maintain optimization history', () => {
      calculator.optimizeForTargetMRR({
        depth: 2,
        targetMRR: 10,
        width: 5,
      });

      calculator.optimizeForTargetMRR({
        depth: 3,
        targetMRR: 12,
        width: 5,
      });

      expect(calculator.mrrHistory.length).toBe(2);
    });

    test('should return limited history', () => {
      for (let i = 0; i < 10; i++) {
        calculator.optimizeForTargetMRR({
          depth: 2,
          targetMRR: 10 + i,
          width: 5,
        });
      }

      const history = calculator.getHistory(5);
      expect(history.length).toBe(5);
    });

    test('should calculate statistics', () => {
      for (let i = 0; i < 5; i++) {
        calculator.optimizeForTargetMRR({
          depth: 2,
          targetMRR: 10 + i,
          width: 5,
        });
      }

      const stats = calculator.getStatistics();
      expect(stats.totalOptimizations).toBe(5);
      expect(stats).toHaveProperty('averageMRR');
      expect(stats).toHaveProperty('maxMRR');
      expect(stats).toHaveProperty('minMRR');
    });

    test('should clear history', () => {
      calculator.optimizeForTargetMRR({
        depth: 2,
        targetMRR: 10,
        width: 5,
      });

      calculator.clearHistory();
      expect(calculator.mrrHistory.length).toBe(0);
    });

    test('should return message when no history', () => {
      calculator.clearHistory();
      const stats = calculator.getStatistics();
      expect(stats.message).toBeDefined();
    });
  });

  describe('event handling', () => {
    test('should register event listeners', () => {
      const callback = jest.fn();
      calculator.on('mrr:test', callback);
      expect(calculator.listeners['mrr:test']).toContain(callback);
    });

    test('should emit events to listeners', () => {
      const callback = jest.fn();
      calculator.on('mrr:test', callback);
      calculator.emit('mrr:test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});
