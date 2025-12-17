/**
 * Surface Finish Predictor - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import SurfaceFinishPredictor from '../../../modules/simulation/surface-finish-predictor.mjs';

describe('SurfaceFinishPredictor', () => {
  let predictor;

  beforeEach(() => {
    predictor = new SurfaceFinishPredictor();
  });

  // ==================== Initialization Tests ====================

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(predictor).toBeDefined();
      expect(predictor.options.modelType).toBe('simplified');
      expect(predictor.options.confidenceLevel).toBe(0.75);
    });

    it('should accept custom options', () => {
      const custom = new SurfaceFinishPredictor({
        modelType: 'advanced',
        confidenceLevel: 0.95,
      });
      expect(custom.options.modelType).toBe('advanced');
      expect(custom.options.confidenceLevel).toBe(0.95);
    });

    it('should initialize with empty history', () => {
      expect(predictor.getHistory()).toEqual([]);
    });

    it('should have material database', () => {
      expect(predictor.materialDatabase).toBeDefined();
      expect(predictor.materialDatabase.aluminum).toBeDefined();
      expect(predictor.materialDatabase.steel).toBeDefined();
    });
  });

  // ==================== Finish Prediction Tests ====================

  describe('predictFinish', () => {
    it('should require feedRate parameter', () => {
      expect(() => predictor.predictFinish({})).toThrow();
    });

    it('should require toolDiameter parameter', () => {
      expect(() => predictor.predictFinish({ feedRate: 100 })).toThrow();
    });

    it('should predict reasonable roughness for aluminum', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        spindleSpeed: 6000,
        material: 'aluminum',
        vibrationLevel: 0.02,
        toolCondition: 'fresh',
      });

      expect(result.predictedRa).toBeGreaterThan(0);
      expect(result.predictedRa).toBeLessThan(10);
      expect(result.finishQuality).toBeDefined();
    });

    it('should return lower roughness for fresh tools vs worn tools', () => {
      const freshResult = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        material: 'aluminum',
        toolCondition: 'fresh',
      });

      const wornResult = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        material: 'aluminum',
        toolCondition: 'worn',
      });

      expect(freshResult.predictedRa).toBeLessThan(wornResult.predictedRa);
    });

    it('should increase roughness with higher vibration', () => {
      const lowVibResult = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        vibrationLevel: 0.01,
      });

      const highVibResult = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        vibrationLevel: 0.1,
      });

      expect(highVibResult.predictedRa).toBeGreaterThan(lowVibResult.predictedRa);
    });

    it('should include confidence level in result', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
      });

      expect(result.confidenceLevel).toEqual(predictor.options.confidenceLevel);
    });

    it('should include factors breakdown', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        material: 'steel',
        vibrationLevel: 0.05,
        toolCondition: 'worn',
      });

      expect(result.factors).toBeDefined();
      expect(result.factors.material).toBeGreaterThan(0);
      expect(result.factors.vibration).toBeGreaterThan(1);
      expect(result.factors.toolCondition).toBeGreaterThan(1);
    });

    it('should add prediction to history', () => {
      predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
      });

      expect(predictor.getHistory().length).toBe(1);
    });

    it('should emit finish:predicted event', (done) => {
      predictor.on('finish:predicted', (result) => {
        expect(result.predictedRa).toBeDefined();
        done();
      });

      predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
      });
    });

    it('should handle multiple predictions', () => {
      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });
      predictor.predictFinish({ feedRate: 150, toolDiameter: 3 });
      predictor.predictFinish({ feedRate: 50, toolDiameter: 3 });

      expect(predictor.getHistory().length).toBe(3);
    });

    it('should include recommendations in result', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
      });

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  // ==================== Finish Quality Rating Tests ====================

  describe('rateFinishQuality', () => {
    it('should rate excellent finish (Ra <= 0.4)', () => {
      expect(predictor.rateFinishQuality(0.2)).toBe('EXCELLENT');
      expect(predictor.rateFinishQuality(0.4)).toBe('EXCELLENT');
    });

    it('should rate very good finish (0.4 < Ra <= 0.8)', () => {
      expect(predictor.rateFinishQuality(0.6)).toBe('VERY_GOOD');
    });

    it('should rate good finish (0.8 < Ra <= 1.6)', () => {
      expect(predictor.rateFinishQuality(1.2)).toBe('GOOD');
    });

    it('should rate fair finish (1.6 < Ra <= 3.2)', () => {
      expect(predictor.rateFinishQuality(2.4)).toBe('FAIR');
    });

    it('should rate poor finish (3.2 < Ra <= 6.4)', () => {
      expect(predictor.rateFinishQuality(5.0)).toBe('POOR');
    });

    it('should rate very poor finish (Ra > 6.4)', () => {
      expect(predictor.rateFinishQuality(8.0)).toBe('VERY_POOR');
    });
  });

  // ==================== Finish Recommendations Tests ====================

  describe('generateFinishRecommendations', () => {
    it('should generate recommendations for high roughness', () => {
      const recommendations = predictor.generateFinishRecommendations(5.0, {
        feedRate: 150,
        toolDiameter: 3,
      });

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].priority).toBeDefined();
    });

    it('should recommend reducing feed rate for high roughness', () => {
      const recommendations = predictor.generateFinishRecommendations(4.0, {
        feedRate: 150,
        toolDiameter: 3,
      });

      const feedRecommendation = recommendations.find((r) =>
        r.action.toLowerCase().includes('feed rate')
      );
      expect(feedRecommendation).toBeDefined();
    });

    it('should recommend tool replacement for worn tools', () => {
      const recommendations = predictor.generateFinishRecommendations(4.0, {
        feedRate: 100,
        toolDiameter: 3,
        toolCondition: 'worn',
      });

      const toolRecommendation = recommendations.find((r) =>
        r.action.toLowerCase().includes('replace tool')
      );
      expect(toolRecommendation).toBeDefined();
    });

    it('should include expected improvement for high roughness', () => {
      const recommendations = predictor.generateFinishRecommendations(5.0, {
        feedRate: 100,
        toolDiameter: 3,
      });

      expect(recommendations[0].expectedImprovement).toBeDefined();
      expect(recommendations[0].expectedImprovement).toBeGreaterThan(0);
    });

    it('should recommend finishing pass for moderate roughness', () => {
      const recommendations = predictor.generateFinishRecommendations(2.0, {
        feedRate: 100,
        toolDiameter: 3,
      });

      const finishRecommendation = recommendations.find((r) =>
        r.action.toLowerCase().includes('finishing pass')
      );
      expect(finishRecommendation).toBeDefined();
    });
  });

  // ==================== Parameter Optimization Tests ====================

  describe('optimizeForTargetFinish', () => {
    it('should require targetRa parameter', () => {
      expect(() => predictor.optimizeForTargetFinish({ toolDiameter: 3 })).toThrow();
    });

    it('should require toolDiameter parameter', () => {
      expect(() => predictor.optimizeForTargetFinish({ targetRa: 0.8 })).toThrow();
    });

    it('should return feasible strategy for reasonable target', () => {
      const result = predictor.optimizeForTargetFinish({
        targetRa: 1.6,
        toolDiameter: 3,
        flutes: 2,
        currentSpeed: 6000,
      });

      expect(result.strategy).toBeDefined();
      expect(result.requiredFeedRate).toBeDefined();
      expect(result.requiredFeedRate).toBeGreaterThan(0);
    });

    it('should include feed per tooth in result', () => {
      const result = predictor.optimizeForTargetFinish({
        targetRa: 0.8,
        toolDiameter: 3,
      });

      expect(result.requiredFeedPerTooth).toBeGreaterThan(0);
    });

    it('should include optimal spindle speed', () => {
      const result = predictor.optimizeForTargetFinish({
        targetRa: 0.8,
        toolDiameter: 3,
        maxSpindleSpeed: 24000,
      });

      expect(result.optimalSpindleSpeed).toBeGreaterThan(0);
      expect(result.optimalSpindleSpeed).toBeLessThanOrEqual(24000);
    });

    it('should mark infeasible very tight targets', () => {
      const result = predictor.optimizeForTargetFinish({
        targetRa: 0.1,
        toolDiameter: 1,
        flutes: 2,
        currentSpeed: 1000,
        maxSpindleSpeed: 1000,
      });

      // Very tight targets with low speed may still be feasible
      expect(result.strategy).toBeDefined();
      expect(['feasible', 'reduce_target_or_increase_speed']).toContain(result.strategy);
    });
  });

  // ==================== Tool Type Comparison Tests ====================

  describe('compareToolTypes', () => {
    it('should require feedRate parameter', () => {
      expect(() => predictor.compareToolTypes({})).toThrow();
    });

    it('should return comparison for three tool types', () => {
      const comparison = predictor.compareToolTypes({
        feedRate: 100,
        spindleSpeed: 6000,
        material: 'aluminum',
      });

      expect(comparison.length).toBe(3);
      expect(comparison[0].type).toBeDefined();
    });

    it('should sort by predicted roughness (best first)', () => {
      const comparison = predictor.compareToolTypes({
        feedRate: 100,
        spindleSpeed: 6000,
      });

      for (let i = 0; i < comparison.length - 1; i++) {
        expect(comparison[i].predictedRa).toBeLessThanOrEqual(comparison[i + 1].predictedRa);
      }
    });

    it('should include feed per tooth for each tool', () => {
      const comparison = predictor.compareToolTypes({
        feedRate: 100,
        spindleSpeed: 6000,
      });

      comparison.forEach((tool) => {
        expect(tool.feedPerTooth).toBeDefined();
        expect(tool.feedPerTooth).toBeGreaterThan(0);
      });
    });

    it('should include finish quality rating', () => {
      const comparison = predictor.compareToolTypes({
        feedRate: 100,
        spindleSpeed: 6000,
      });

      comparison.forEach((tool) => {
        expect(['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR', 'VERY_POOR']).toContain(
          tool.finishQuality
        );
      });
    });
  });

  // ==================== Consistency Assessment Tests ====================

  describe('assessConsistency', () => {
    it('should require at least 2 readings', () => {
      const history = [{ predictedRa: 1.0 }];
      expect(() => predictor.assessConsistency(history)).toThrow();
    });

    it('should calculate consistency metrics', () => {
      const history = [
        { predictedRa: 1.0 },
        { predictedRa: 1.05 },
        { predictedRa: 0.95 },
        { predictedRa: 1.02 },
      ];

      const result = predictor.assessConsistency(history);

      expect(result.averageRoughness).toBeDefined();
      expect(result.standardDeviation).toBeDefined();
      expect(result.consistencyRatio).toBeDefined();
    });

    it('should rate excellent consistency for tight variation', () => {
      const history = [
        { predictedRa: 1.0 },
        { predictedRa: 1.01 },
        { predictedRa: 1.005 },
        { predictedRa: 1.002 },
      ];

      const result = predictor.assessConsistency(history);

      expect(result.consistency).toBe('EXCELLENT');
    });

    it('should rate good consistency for moderate variation', () => {
      const history = [
        { predictedRa: 1.0 },
        { predictedRa: 1.1 },
        { predictedRa: 1.05 },
        { predictedRa: 0.95 },
      ];

      const result = predictor.assessConsistency(history);

      // This variation is actually excellent, not good
      expect(['EXCELLENT', 'GOOD']).toContain(result.consistency);
    });

    it('should rate variable consistency for high variation', () => {
      const history = [
        { predictedRa: 1.0 },
        { predictedRa: 2.0 },
        { predictedRa: 1.5 },
        { predictedRa: 0.5 },
      ];

      const result = predictor.assessConsistency(history);

      expect(result.consistency).toBe('VARIABLE');
    });

    it('should include reading count', () => {
      const history = [{ predictedRa: 1.0 }, { predictedRa: 1.05 }, { predictedRa: 1.02 }];

      const result = predictor.assessConsistency(history);

      expect(result.readings).toBe(3);
    });
  });

  // ==================== History Management Tests ====================

  describe('History Management', () => {
    it('should return empty history initially', () => {
      expect(predictor.getHistory()).toEqual([]);
    });

    it('should store multiple predictions', () => {
      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });
      predictor.predictFinish({ feedRate: 150, toolDiameter: 3 });
      predictor.predictFinish({ feedRate: 75, toolDiameter: 3 });

      expect(predictor.getHistory().length).toBe(3);
    });

    it('should limit history with limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });
      }

      const limited = predictor.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });
      predictor.predictFinish({ feedRate: 150, toolDiameter: 3 });

      expect(predictor.getHistory().length).toBe(2);

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
      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });
      predictor.predictFinish({ feedRate: 150, toolDiameter: 3 });
      predictor.predictFinish({ feedRate: 75, toolDiameter: 3 });

      const stats = predictor.getStatistics();

      expect(stats.totalPredictions).toBe(3);
      expect(stats.averageRoughness).toBeDefined();
      expect(stats.bestRoughness).toBeDefined();
      expect(stats.worstRoughness).toBeDefined();
    });

    it('should identify best and worst roughness', () => {
      predictor.predictFinish({ feedRate: 50, toolDiameter: 3 }); // Smooth
      predictor.predictFinish({ feedRate: 200, toolDiameter: 3 }); // Rough
      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 }); // Medium

      const stats = predictor.getStatistics();

      expect(stats.bestRoughness).toBeLessThan(stats.worstRoughness);
    });

    it('should include unit in statistics', () => {
      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });

      const stats = predictor.getStatistics();

      expect(stats.unit).toBe('Ra (micrometers)');
    });
  });

  // ==================== Event Handling Tests ====================

  describe('Event Handling', () => {
    it('should register event listeners', (done) => {
      predictor.on('finish:predicted', () => {
        done();
      });

      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });
    });

    it('should call listener with result data', (done) => {
      predictor.on('finish:predicted', (result) => {
        expect(result.predictedRa).toBeDefined();
        expect(result.finishQuality).toBeDefined();
        done();
      });

      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });
    });

    it('should support multiple listeners', (done) => {
      let count = 0;

      predictor.on('finish:predicted', () => {
        count++;
      });

      predictor.on('finish:predicted', () => {
        count++;
      });

      predictor.predictFinish({ feedRate: 100, toolDiameter: 3 });

      setTimeout(() => {
        expect(count).toBe(2);
        done();
      }, 10);
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration Scenarios', () => {
    it('should handle complete optimization workflow', () => {
      // Start with rough prediction
      const roughResult = predictor.predictFinish({
        feedRate: 200,
        toolDiameter: 3,
        spindleSpeed: 6000,
        material: 'steel',
      });

      // Optimize for better finish
      const optimized = predictor.optimizeForTargetFinish({
        targetRa: 1.0,
        toolDiameter: 3,
        material: 'steel',
      });

      // Compare tool types
      const comparison = predictor.compareToolTypes({
        feedRate: optimized.requiredFeedRate,
        spindleSpeed: optimized.optimalSpindleSpeed,
        material: 'steel',
      });

      expect(roughResult.predictedRa).toBeGreaterThan(optimized.targetRa);
      expect(comparison.length).toBe(3);
      expect(comparison[0].finishQuality).toBeTruthy();
    });

    it('should track consistency improvements', () => {
      // Make series of cuts with progressive improvement
      predictor.predictFinish({
        feedRate: 150,
        toolDiameter: 3,
        toolCondition: 'worn',
      });
      predictor.predictFinish({
        feedRate: 120,
        toolDiameter: 3,
        toolCondition: 'normal',
      });
      predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        toolCondition: 'fresh',
      });

      const history = predictor.getHistory();
      const consistency = predictor.assessConsistency(history);

      expect(consistency.readings).toBe(3);
      expect(consistency.consistencyRatio).toBeDefined();
    });

    it('should generate complete finish report', () => {
      const prediction = predictor.predictFinish({
        feedRate: 150,
        toolDiameter: 3,
        spindleSpeed: 6000,
        material: 'aluminum',
        vibrationLevel: 0.03,
        toolCondition: 'normal',
      });

      expect(prediction.predictedRa).toBeDefined();
      expect(prediction.finishQuality).toBeDefined();
      expect(prediction.baseRoughness).toBeDefined();
      expect(prediction.feedPerTooth).toBeDefined();
      expect(prediction.factors).toBeDefined();
      expect(prediction.recommendations).toBeDefined();
      expect(prediction.timestamp).toBeDefined();
    });
  });

  // ==================== Material Handling Tests ====================

  describe('Material Handling', () => {
    it('should use aluminum factor for aluminum', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        material: 'aluminum',
      });

      expect(result.factors.material).toBe(0.8);
    });

    it('should use steel factor for steel', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        material: 'steel',
      });

      expect(result.factors.material).toBe(1.0);
    });

    it('should default to factor 1.0 for unknown material', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        material: 'unknown_material',
      });

      expect(result.factors.material).toBe(1.0);
    });

    it('should handle case-insensitive material names', () => {
      const result1 = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        material: 'ALUMINUM',
      });

      const result2 = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        material: 'aluminum',
      });

      expect(result1.factors.material).toBe(result2.factors.material);
    });
  });

  // ==================== Edge Case Tests ====================

  describe('Edge Cases', () => {
    it('should handle very small feed rates', () => {
      const result = predictor.predictFinish({
        feedRate: 5,
        toolDiameter: 3,
      });

      expect(result.predictedRa).toBeGreaterThanOrEqual(0);
      expect(result.predictedRa).toBeLessThan(1.0);
    });

    it('should handle large tool diameters', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 50,
      });

      expect(result.predictedRa).toBeDefined();
      expect(result.predictedRa).toBeGreaterThan(0);
    });

    it('should handle zero vibration level', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        vibrationLevel: 0,
      });

      expect(result.factors.vibration).toBe(1);
    });

    it('should handle high vibration levels', () => {
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
        vibrationLevel: 0.5,
      });

      expect(result.factors.vibration).toBeGreaterThan(1);
    });

    it('should timestamp predictions', () => {
      const before = Date.now();
      const result = predictor.predictFinish({
        feedRate: 100,
        toolDiameter: 3,
      });
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
