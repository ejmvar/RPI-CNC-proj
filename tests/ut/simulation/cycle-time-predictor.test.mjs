/**
 * Cycle Time Predictor - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import CycleTimePredictor from '../../../modules/simulation/cycle-time-predictor.mjs';

describe('CycleTimePredictor', () => {
  let predictor;

  beforeEach(() => {
    predictor = new CycleTimePredictor();
  });

  // ==================== Initialization Tests ====================

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(predictor).toBeDefined();
      expect(predictor.options.toolChangeTime).toBe(15);
      expect(predictor.options.spindleAccelTime).toBe(2);
      expect(predictor.options.rapidFeedrate).toBe(3000);
    });

    it('should accept custom options', () => {
      const custom = new CycleTimePredictor({
        toolChangeTime: 10,
        rapidFeedrate: 5000,
      });
      expect(custom.options.toolChangeTime).toBe(10);
      expect(custom.options.rapidFeedrate).toBe(5000);
    });

    it('should have material delay factors', () => {
      expect(predictor.materialDelays).toBeDefined();
      expect(predictor.materialDelays.aluminum).toBeLessThan(1);
      expect(predictor.materialDelays.titanium).toBeGreaterThan(1);
    });
  });

  // ==================== Cycle Time Prediction Tests ====================

  describe('predictCycleTime', () => {
    it('should require totalDistance parameter', () => {
      expect(() => predictor.predictCycleTime({})).toThrow();
    });

    it('should predict reasonable cycle time', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000, // mm
        feedRate: 100, // mm/min
        rapidDistance: 500,
        numberOfToolChanges: 2,
      });

      expect(result.totalSeconds).toBeGreaterThan(0);
      expect(result.totalMinutes).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
    });

    it('should include all time components in breakdown', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        rapidDistance: 500,
        numberOfToolChanges: 2,
      });

      expect(result.breakdown.cutting).toBeGreaterThan(0);
      expect(result.breakdown.rapid).toBeGreaterThanOrEqual(0);
      expect(result.breakdown.toolChange).toBeGreaterThan(0);
      expect(result.breakdown.spindleAccel).toBeGreaterThan(0);
      expect(result.breakdown.setup).toBeGreaterThanOrEqual(0);
    });

    it('should sum breakdown components to total', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        rapidDistance: 500,
        numberOfToolChanges: 1,
      });

      const sum =
        result.breakdown.cutting +
        result.breakdown.rapid +
        result.breakdown.toolChange +
        result.breakdown.spindleAccel +
        result.breakdown.setup;

      expect(Math.abs(sum - result.breakdown.total)).toBeLessThan(0.1);
    });

    it('should apply material delay factor', () => {
      const aluminumResult = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        material: 'aluminum',
      });

      const steelResult = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        material: 'steel',
      });

      expect(aluminumResult.totalSeconds).toBeLessThan(steelResult.totalSeconds);
    });

    it('should handle no tool changes', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });

      expect(result.breakdown.toolChange).toBe(15); // One tool change (initial)
    });

    it('should add prediction to history', () => {
      predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });

      expect(predictor.getHistory().length).toBe(1);
    });

    it('should emit cycle:predicted event', (done) => {
      predictor.on('cycle:predicted', (result) => {
        expect(result.totalSeconds).toBeDefined();
        done();
      });

      predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });

    it('should convert times to minutes and hours', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });

      expect(result.totalMinutes).toBeCloseTo(result.totalSeconds / 60, 1);
      expect(result.totalHours).toBeCloseTo(result.totalSeconds / 3600, 2);
    });
  });

  // ==================== Job Time Estimation Tests ====================

  describe('estimateJobTime', () => {
    it('should require partCount parameter', () => {
      expect(() => predictor.estimateJobTime({})).toThrow();
    });

    it('should estimate job time for multiple parts', () => {
      const result = predictor.estimateJobTime({
        partCount: 10,
        cycleTimePerPart: 300,
        toolChangesPerPart: 1,
      });

      expect(result.totalSeconds).toBeGreaterThan(0);
      expect(result.timePerPart).toBeGreaterThan(0);
    });

    it('should include one-time costs', () => {
      const result = predictor.estimateJobTime({
        partCount: 10,
        cycleTimePerPart: 300,
        setupTime: 120,
        layoutTime: 60,
        unloadTime: 30,
      });

      expect(result.breakdown.setup).toBe(120);
      expect(result.breakdown.layout).toBe(60);
      expect(result.breakdown.unload).toBe(30);
    });

    it('should scale per-part time by partCount', () => {
      const result = predictor.estimateJobTime({
        partCount: 10,
        cycleTimePerPart: 300,
      });

      // Account for tool changes that get distributed per part
      const expectedMinimum = 10 * 300;
      expect(result.breakdown.partsCycle).toBeGreaterThanOrEqual(expectedMinimum);
    });

    it('should handle zero tool changes', () => {
      const result = predictor.estimateJobTime({
        partCount: 10,
        cycleTimePerPart: 300,
        toolChangesPerPart: 0,
      });

      expect(result.totalSeconds).toBeGreaterThan(0);
    });
  });

  // ==================== Tool Sequence Optimization Tests ====================

  describe('optimizeToolSequence', () => {
    it('should require tools array', () => {
      expect(() => predictor.optimizeToolSequence({})).toThrow();
    });

    it('should compare current vs optimized sequence', () => {
      const result = predictor.optimizeToolSequence({
        tools: [
          { name: 'endmill', time: 100 },
          { name: 'ballnose', time: 50 },
          { name: 'tapered', time: 75 },
        ],
        operationCounts: [1, 1, 1],
      });

      expect(result.currentSequenceTime).toBeGreaterThan(0);
      expect(result.optimizedTime).toBeGreaterThan(0);
      expect(result.timeSaved).toBeDefined();
    });

    it('should show time savings percentage', () => {
      const result = predictor.optimizeToolSequence({
        tools: [
          { name: 'tool1', time: 100 },
          { name: 'tool2', time: 50 },
        ],
        operationCounts: [1, 1],
      });

      expect(result.percentSaved).toBeGreaterThanOrEqual(0);
      expect(result.percentSaved).toBeLessThanOrEqual(100);
    });

    it('should provide optimization recommendation', () => {
      const result = predictor.optimizeToolSequence({
        tools: [
          { name: 'tool1', time: 100 },
          { name: 'tool2', time: 50 },
        ],
        operationCounts: [1, 1],
      });

      expect(result.recommendation).toBeDefined();
    });
  });

  // ==================== Feed Rate Comparison Tests ====================

  describe('compareFeeds', () => {
    it('should require distance parameter', () => {
      expect(() => predictor.compareFeeds({})).toThrow();
    });

    it('should compare multiple feed rates', () => {
      const comparison = predictor.compareFeeds({
        distance: 1000,
      });

      expect(comparison.length).toBeGreaterThan(3);
      expect(comparison[0].feedRate).toBeLessThan(comparison[comparison.length - 1].feedRate);
    });

    it('should show time increases with lower feed rates', () => {
      const comparison = predictor.compareFeeds({
        distance: 1000,
      });

      for (let i = 0; i < comparison.length - 1; i++) {
        expect(comparison[i].timeSeconds).toBeGreaterThanOrEqual(comparison[i + 1].timeSeconds);
      }
    });

    it('should include time in minutes and percentage', () => {
      const comparison = predictor.compareFeeds({
        distance: 1000,
      });

      comparison.forEach((item) => {
        expect(item.feedRate).toBeGreaterThan(0);
        expect(item.timeSeconds).toBeGreaterThan(0);
        expect(item.timeMinutes).toBeGreaterThan(0);
        expect(item.timePercentage).toBeGreaterThan(0);
      });
    });

    it('should apply material delay factor', () => {
      const aluminumComparison = predictor.compareFeeds({
        distance: 1000,
        materialDelay: 'aluminum',
      });

      const steelComparison = predictor.compareFeeds({
        distance: 1000,
        materialDelay: 'steel',
      });

      // Aluminum should be faster
      expect(aluminumComparison[0].timeSeconds).toBeLessThan(steelComparison[0].timeSeconds);
    });
  });

  // ==================== Batch Processing Tests ====================

  describe('calculateBatchTime', () => {
    it('should require batchSize and timePerPart', () => {
      expect(() => predictor.calculateBatchTime({ batchSize: 10 })).toThrow();
    });

    it('should calculate total batch time', () => {
      const result = predictor.calculateBatchTime({
        batchSize: 10,
        timePerPart: 300,
        setupTime: 120,
      });

      expect(result.totalBatchTime).toBeGreaterThan(0);
      const expected = 120 + 10 * 300;
      expect(result.totalBatchTime).toBeCloseTo(expected, 0);
    });

    it('should calculate average time per part', () => {
      const result = predictor.calculateBatchTime({
        batchSize: 10,
        timePerPart: 300,
        setupTime: 120,
      });

      expect(result.averageTimePerPart).toBeGreaterThan(result.timePerPart);
    });

    it('should calculate setup overhead percentage', () => {
      const result = predictor.calculateBatchTime({
        batchSize: 10,
        timePerPart: 300,
        setupTime: 120,
      });

      expect(result.setupOverhead).toBeGreaterThan(0);
      expect(result.setupOverhead).toBeLessThan(100);
    });

    it('should calculate efficiency metric', () => {
      const result = predictor.calculateBatchTime({
        batchSize: 10,
        timePerPart: 300,
        setupTime: 120,
      });

      expect(result.efficiency).toBeGreaterThan(0);
      expect(result.efficiency).toBeLessThanOrEqual(100);
    });

    it('should recommend batch size adjustment', () => {
      const result = predictor.calculateBatchTime({
        batchSize: 10,
        timePerPart: 300,
        setupTime: 120,
      });

      expect(result.recommendation).toBeDefined();
    });

    it('should handle large batches with better efficiency', () => {
      const smallBatch = predictor.calculateBatchTime({
        batchSize: 5,
        timePerPart: 300,
        setupTime: 120,
      });

      const largeBatch = predictor.calculateBatchTime({
        batchSize: 50,
        timePerPart: 300,
        setupTime: 120,
      });

      expect(largeBatch.efficiency).toBeGreaterThan(smallBatch.efficiency);
    });
  });

  // ==================== Optimization Savings Tests ====================

  describe('predictOptimizationSavings', () => {
    it('should require currentTime parameter', () => {
      expect(() => predictor.predictOptimizationSavings({})).toThrow();
    });

    it('should calculate projected time after optimization', () => {
      const result = predictor.predictOptimizationSavings({
        currentTime: 300,
        optimizations: {
          combinedOperations: true,
          reduceToolChanges: true,
        },
      });

      expect(result.projectedTime).toBeLessThanOrEqual(result.currentTime);
    });

    it('should show savings in seconds and percentage', () => {
      const result = predictor.predictOptimizationSavings({
        currentTime: 300,
        optimizations: {
          combinedOperations: true,
          reduceToolChanges: true,
        },
      });

      expect(result.totalSavings).toBeGreaterThanOrEqual(0);
      expect(result.percentSavings).toBeGreaterThanOrEqual(0);
    });

    it('should provide optimization details', () => {
      const result = predictor.predictOptimizationSavings({
        currentTime: 300,
        optimizations: {
          combinedOperations: true,
          reduceToolChanges: true,
          optimizeRapids: true,
        },
      });

      expect(result.details.length).toBeGreaterThan(0);
      expect(result.details[0].strategy).toBeDefined();
      expect(result.details[0].savings).toBeDefined();
    });

    it('should apply multiple optimizations', () => {
      const result = predictor.predictOptimizationSavings({
        currentTime: 1000,
        optimizations: {
          combinedOperations: true,
          reduceToolChanges: true,
          optimizeRapids: true,
        },
      });

      expect(result.totalSavings).toBeGreaterThan(0);
    });

    it('should not exceed 50% savings floor', () => {
      const result = predictor.predictOptimizationSavings({
        currentTime: 100,
        optimizations: {
          combinedOperations: true,
          reduceToolChanges: true,
          optimizeRapids: true,
        },
      });

      expect(result.projectedTime).toBeGreaterThanOrEqual(result.currentTime * 0.5);
    });
  });

  // ==================== History Management Tests ====================

  describe('History Management', () => {
    it('should store cycle predictions', () => {
      predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });

      expect(predictor.getHistory().length).toBe(1);
    });

    it('should limit history with limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        predictor.predictCycleTime({
          totalDistance: 1000,
          feedRate: 100,
        });
      }

      const limited = predictor.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });

      predictor.clearHistory();
      expect(predictor.getHistory()).toEqual([]);
    });
  });

  // ==================== Statistics Tests ====================

  describe('getStatistics', () => {
    it('should return message for empty history', () => {
      const stats = predictor.getStatistics();
      expect(stats.message).toBeDefined();
    });

    it('should calculate statistics from history', () => {
      predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });
      predictor.predictCycleTime({
        totalDistance: 1500,
        feedRate: 150,
      });

      const stats = predictor.getStatistics();

      expect(stats.totalCycles).toBe(2);
      expect(stats.averageTimeSeconds).toBeGreaterThan(0);
      expect(stats.fastestTimeSeconds).toBeLessThanOrEqual(stats.slowestTimeSeconds);
    });

    it('should identify fastest and slowest cycles', () => {
      predictor.predictCycleTime({
        totalDistance: 500,
        feedRate: 500, // Fast
      });
      predictor.predictCycleTime({
        totalDistance: 5000,
        feedRate: 50, // Slow
      });

      const stats = predictor.getStatistics();

      expect(stats.fastestTimeSeconds).toBeLessThan(stats.slowestTimeSeconds);
    });

    it('should include unit in statistics', () => {
      predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });

      const stats = predictor.getStatistics();

      expect(stats.unit).toBe('Time (seconds)');
    });
  });

  // ==================== Material Handling Tests ====================

  describe('Material Handling', () => {
    it('should apply aluminum delay factor', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        material: 'aluminum',
      });

      expect(result.materialDelay).toBe(0.9);
    });

    it('should apply steel delay factor', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        material: 'steel',
      });

      expect(result.materialDelay).toBe(1.0);
    });

    it('should apply titanium delay factor', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        material: 'titanium',
      });

      expect(result.materialDelay).toBe(1.3);
    });

    it('should handle case-insensitive material names', () => {
      const result1 = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        material: 'ALUMINUM',
      });

      const result2 = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        material: 'aluminum',
      });

      expect(result1.materialDelay).toBe(result2.materialDelay);
    });

    it('should default to 1.0 for unknown material', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        material: 'unknown_material',
      });

      expect(result.materialDelay).toBe(1.0);
    });
  });

  // ==================== Edge Case Tests ====================

  describe('Edge Cases', () => {
    it('should handle zero rapid distance', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        rapidDistance: 0,
      });

      expect(result.breakdown.rapid).toBeGreaterThanOrEqual(0);
    });

    it('should handle very small distances', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 10,
        feedRate: 100,
      });

      expect(result.totalSeconds).toBeGreaterThan(0);
    });

    it('should handle very slow feed rates', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 5,
      });

      expect(result.totalSeconds).toBeGreaterThan(0);
    });

    it('should handle high number of tool changes', () => {
      const result = predictor.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
        numberOfToolChanges: 20,
      });

      expect(result.breakdown.toolChange).toBeGreaterThan(0);
    });

    it('should disable setup time when requested', () => {
      const custom = new CycleTimePredictor({ includeSetupTime: false });
      const result = custom.predictCycleTime({
        totalDistance: 1000,
        feedRate: 100,
      });

      expect(result.breakdown.setup).toBe(0);
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration Scenarios', () => {
    it('should handle complete job planning workflow', () => {
      // Estimate individual job time
      const singleJob = predictor.predictCycleTime({
        totalDistance: 2000,
        feedRate: 100,
        rapidDistance: 500,
        numberOfToolChanges: 2,
      });

      // Estimate batch of 10
      const batch = predictor.estimateJobTime({
        partCount: 10,
        cycleTimePerPart: singleJob.totalSeconds,
      });

      // Check optimization opportunities
      const optimization = predictor.predictOptimizationSavings({
        currentTime: batch.totalSeconds,
        optimizations: {
          combinedOperations: true,
          reduceToolChanges: true,
        },
      });

      expect(singleJob.totalSeconds).toBeGreaterThan(0);
      expect(batch.totalSeconds).toBeGreaterThan(singleJob.totalSeconds);
      expect(optimization.projectedTime).toBeLessThanOrEqual(batch.totalSeconds);
    });

    it('should track improvements through history', () => {
      // Initial slow cycle
      predictor.predictCycleTime({
        totalDistance: 2000,
        feedRate: 50,
        numberOfToolChanges: 3,
      });

      // Optimized cycle
      predictor.predictCycleTime({
        totalDistance: 2000,
        feedRate: 100,
        numberOfToolChanges: 2,
      });

      // Further optimized
      predictor.predictCycleTime({
        totalDistance: 2000,
        feedRate: 120,
        numberOfToolChanges: 1,
      });

      const stats = predictor.getStatistics();

      expect(stats.totalCycles).toBe(3);
      expect(stats.fastestTimeSeconds).toBeLessThan(stats.slowestTimeSeconds);
    });

    it('should generate complete job time report', () => {
      const cycleTime = predictor.predictCycleTime({
        totalDistance: 1500,
        feedRate: 100,
        rapidDistance: 400,
        numberOfToolChanges: 1,
        material: 'aluminum',
      });

      const jobEstimate = predictor.estimateJobTime({
        partCount: 5,
        cycleTimePerPart: cycleTime.totalSeconds,
      });

      const batchCalc = predictor.calculateBatchTime({
        batchSize: 5,
        timePerPart: cycleTime.totalSeconds,
        setupTime: 60,
      });

      expect(cycleTime.totalSeconds).toBeGreaterThan(0);
      expect(jobEstimate.totalSeconds).toBeGreaterThan(cycleTime.totalSeconds);
      expect(batchCalc.efficiency).toBeGreaterThan(0);
    });
  });
});
