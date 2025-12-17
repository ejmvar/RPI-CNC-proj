/**
 * Precision & Tolerance Analyzer - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import PrecisionToleranceAnalyzer from '../../../modules/simulation/precision-tolerance-analyzer.mjs';

describe('PrecisionToleranceAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new PrecisionToleranceAnalyzer();
  });

  // ==================== Initialization Tests ====================

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer.options.machineBacklash).toBe(0.01);
      expect(analyzer.options.toolRunout).toBe(0.02);
      expect(analyzer.options.positioningAccuracy).toBe(0.05);
    });

    it('should accept custom options', () => {
      const custom = new PrecisionToleranceAnalyzer({
        machineBacklash: 0.005,
        toolRunout: 0.015,
      });
      expect(custom.options.machineBacklash).toBe(0.005);
      expect(custom.options.toolRunout).toBe(0.015);
    });

    it('should have tolerance standards', () => {
      expect(analyzer.toleranceStandards).toBeDefined();
      expect(analyzer.toleranceStandards.iso).toBeDefined();
    });
  });

  // ==================== Tolerance Calculation Tests ====================

  describe('calculateAchievableTolerance', () => {
    it('should require parameters', () => {
      expect(() => analyzer.calculateAchievableTolerance()).toThrow();
    });

    it('should calculate achievable tolerance', () => {
      const result = analyzer.calculateAchievableTolerance({});

      expect(result.achievableTolerance).toBeGreaterThan(0);
      expect(result.toleranceClass).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include error breakdown', () => {
      const result = analyzer.calculateAchievableTolerance({});

      expect(result.errorBreakdown).toBeDefined();
      expect(result.errorBreakdown.backlash).toBeGreaterThan(0);
      expect(result.errorBreakdown.toolRunout).toBeGreaterThan(0);
    });

    it('should use RSS (root sum of squares) for error combination', () => {
      const result = analyzer.calculateAchievableTolerance({});

      const rssCalculated = Math.sqrt(
        result.errorBreakdown.backlash ** 2 +
          result.errorBreakdown.toolRunout ** 2 +
          result.errorBreakdown.positioning ** 2 +
          result.errorBreakdown.spindle ** 2 +
          result.errorBreakdown.vibration ** 2
      );

      expect(result.rssTotal).toBeCloseTo(rssCalculated, 3);
    });

    it('should reduce confidence with higher vibration', () => {
      const lowVib = analyzer.calculateAchievableTolerance({ vibrationLevel: 0.01 });
      const highVib = analyzer.calculateAchievableTolerance({ vibrationLevel: 0.1 });

      expect(highVib.confidence).toBeLessThan(lowVib.confidence);
    });

    it('should add to history', () => {
      analyzer.calculateAchievableTolerance({});

      expect(analyzer.getHistory().length).toBe(1);
    });

    it('should emit tolerance:calculated event', (done) => {
      analyzer.on('tolerance:calculated', (result) => {
        expect(result.achievableTolerance).toBeDefined();
        done();
      });

      analyzer.calculateAchievableTolerance({});
    });
  });

  // ==================== Tolerance Classification Tests ====================

  describe('classifyTolerance', () => {
    it('should classify ultra-precision tolerance', () => {
      expect(analyzer.classifyTolerance(0.005)).toBe('ULTRA_PRECISION');
    });

    it('should classify precision tolerance', () => {
      expect(analyzer.classifyTolerance(0.015)).toBe('PRECISION');
    });

    it('should classify standard tolerance', () => {
      expect(analyzer.classifyTolerance(0.03)).toBe('STANDARD');
    });

    it('should classify coarse tolerance', () => {
      expect(analyzer.classifyTolerance(0.075)).toBe('COARSE');
    });

    it('should classify very coarse tolerance', () => {
      expect(analyzer.classifyTolerance(0.2)).toBe('VERY_COARSE');
    });
  });

  // ==================== Tolerance Achievement Tests ====================

  describe('canAchieveTolerance', () => {
    it('should require requiredTolerance', () => {
      expect(() => analyzer.canAchieveTolerance({})).toThrow();
    });

    it('should determine if tolerance is achievable', () => {
      const result = analyzer.canAchieveTolerance({
        requiredTolerance: 0.1,
      });

      expect(result.canAchieve).toBeDefined();
      expect(typeof result.canAchieve).toBe('boolean');
    });

    it('should calculate margin', () => {
      const result = analyzer.canAchieveTolerance({
        requiredTolerance: 0.1,
      });

      expect(result.margin).toBeDefined();
      expect(result.marginPercent).toBeDefined();
    });

    it('should provide recommendation', () => {
      const result = analyzer.canAchieveTolerance({
        requiredTolerance: 0.1,
      });

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    it('should show margin for tight tolerances', () => {
      const result = analyzer.canAchieveTolerance({
        requiredTolerance: 0.01,
      });

      if (result.canAchieve) {
        expect(result.margin).toBeGreaterThan(0);
      }
    });
  });

  // ==================== Surface Position Tolerance Tests ====================

  describe('analyzeSurfacePositionTolerance', () => {
    it('should require nominalDimension', () => {
      expect(() => analyzer.analyzeSurfacePositionTolerance({})).toThrow();
    });

    it('should analyze position tolerance', () => {
      const result = analyzer.analyzeSurfacePositionTolerance({
        nominalDimension: 50,
        positionalTolerance: 0.05,
      });

      expect(result.nominalDimension).toBe(50);
      expect(result.allowedPositionalError).toBeGreaterThan(0);
    });

    it('should determine if position can be maintained', () => {
      const result = analyzer.analyzeSurfacePositionTolerance({
        nominalDimension: 50,
        positionalTolerance: 0.1,
      });

      expect(result.canMaintainPosition).toBeDefined();
      expect(result.stability).toBeDefined();
    });

    it('should include datum references', () => {
      const result = analyzer.analyzeSurfacePositionTolerance({
        nominalDimension: 50,
        datumReferences: ['A', 'B', 'C'],
      });

      expect(result.datumReferences).toEqual(['A', 'B', 'C']);
    });

    it('should include confidence level', () => {
      const result = analyzer.analyzeSurfacePositionTolerance({
        nominalDimension: 50,
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ==================== Tolerance Stack-Up Tests ====================

  describe('analyzeToleranceStackUp', () => {
    it('should require dimensions array', () => {
      expect(() => analyzer.analyzeToleranceStackUp({})).toThrow();
    });

    it('should analyze stack-up for multiple dimensions', () => {
      const result = analyzer.analyzeToleranceStackUp({
        dimensions: [
          { name: 'Dim 1', tolerance: 0.05 },
          { name: 'Dim 2', tolerance: 0.05 },
          { name: 'Dim 3', tolerance: 0.05 },
        ],
      });

      expect(result.numberOfDimensions).toBe(3);
      expect(result.worstCaseStackUp).toBeGreaterThan(0);
      expect(result.rmsStackUp).toBeGreaterThan(0);
    });

    it('should show RMS is less than worst case', () => {
      const result = analyzer.analyzeToleranceStackUp({
        dimensions: [
          { name: 'Dim 1', tolerance: 0.05 },
          { name: 'Dim 2', tolerance: 0.05 },
          { name: 'Dim 3', tolerance: 0.05 },
        ],
      });

      expect(result.rmsStackUp).toBeLessThan(result.worstCaseStackUp);
    });

    it('should calculate tolerance per dimension', () => {
      const result = analyzer.analyzeToleranceStackUp({
        dimensions: [
          { name: 'Dim 1', tolerance: 0.04 },
          { name: 'Dim 2', tolerance: 0.03 },
          { name: 'Dim 3', tolerance: 0.02 },
        ],
      });

      expect(result.tolerancePerDimension).toBeGreaterThan(0);
    });

    it('should provide recommendation', () => {
      const result = analyzer.analyzeToleranceStackUp({
        dimensions: [
          { name: 'Dim 1', tolerance: 0.05 },
          { name: 'Dim 2', tolerance: 0.05 },
        ],
      });

      expect(result.recommendation).toBeDefined();
    });

    it('should show percentage distribution', () => {
      const result = analyzer.analyzeToleranceStackUp({
        dimensions: [
          { name: 'Dim 1', tolerance: 0.05 },
          { name: 'Dim 2', tolerance: 0.05 },
        ],
      });

      result.dimensions.forEach((dim) => {
        expect(dim.percentDistribution).toBeGreaterThan(0);
        expect(dim.percentDistribution).toBeLessThanOrEqual(100);
      });
    });
  });

  // ==================== Runout Prediction Tests ====================

  describe('predictRunout', () => {
    it('should require toolLength', () => {
      expect(() => analyzer.predictRunout({})).toThrow();
    });

    it('should predict runout', () => {
      const result = analyzer.predictRunout({
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(result.predictedRunout).toBeGreaterThan(0);
      expect(result.toolLength).toBe(50);
    });

    it('should show runout increases with tool length', () => {
      const shortTool = analyzer.predictRunout({
        toolLength: 30,
        toolDiameter: 3,
      });

      const longTool = analyzer.predictRunout({
        toolLength: 80,
        toolDiameter: 3,
      });

      expect(longTool.predictedRunout).toBeGreaterThan(shortTool.predictedRunout);
    });

    it('should apply spindle type factor', () => {
      const iso30 = analyzer.predictRunout({
        toolLength: 50,
        toolDiameter: 3,
        spindleType: 'ISO30',
      });

      const er16 = analyzer.predictRunout({
        toolLength: 50,
        toolDiameter: 3,
        spindleType: 'ER16',
      });

      expect(iso30.predictedRunout).toBeLessThan(er16.predictedRunout);
    });

    it('should include recommendation', () => {
      const result = analyzer.predictRunout({
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(result.recommendation).toBeDefined();
    });
  });

  // ==================== Precision Setup Recommendation Tests ====================

  describe('recommendPrecisionSetup', () => {
    it('should require requiredTolerance', () => {
      expect(() => analyzer.recommendPrecisionSetup({})).toThrow();
    });

    it('should recommend setup for tolerance', () => {
      const result = analyzer.recommendPrecisionSetup({
        requiredTolerance: 0.05,
      });

      expect(result.requiredTolerance).toBe(0.05);
      expect(result.recommendedSetup).toBeDefined();
    });

    it('should adjust spindle type for tight tolerance', () => {
      const tight = analyzer.recommendPrecisionSetup({
        requiredTolerance: 0.01,
      });

      const loose = analyzer.recommendPrecisionSetup({
        requiredTolerance: 0.1,
      });

      expect(tight.recommendedSetup.rigidity).toBe('EXTREME');
      expect(loose.recommendedSetup.rigidity).toBe('HIGH');
    });

    it('should reduce feed rate for tight tolerance', () => {
      const tight = analyzer.recommendPrecisionSetup({
        requiredTolerance: 0.01,
      });

      const loose = analyzer.recommendPrecisionSetup({
        requiredTolerance: 0.1,
      });

      expect(tight.recommendedSetup.feedRate).toBeLessThan(loose.recommendedSetup.feedRate);
    });

    it('should include expected achievable and margin', () => {
      const result = analyzer.recommendPrecisionSetup({
        requiredTolerance: 0.05,
      });

      expect(result.expectedAchievable).toBeGreaterThan(0);
      expect(result.margin).toBeGreaterThan(0);
    });
  });

  // ==================== Multi-Pass Tolerance Tests ====================

  describe('analyzeMultiPassTolerance', () => {
    it('should require numberOfPasses', () => {
      expect(() => analyzer.analyzeMultiPassTolerance({})).toThrow();
    });

    it('should analyze multi-pass tolerance buildup', () => {
      const result = analyzer.analyzeMultiPassTolerance({
        numberOfPasses: 3,
        tolerancePerPass: 0.02,
      });

      expect(result.numberOfPasses).toBe(3);
      expect(result.passes.length).toBe(3);
    });

    it('should show cumulative tolerance increases with passes', () => {
      const result = analyzer.analyzeMultiPassTolerance({
        numberOfPasses: 5,
        tolerancePerPass: 0.02,
      });

      for (let i = 0; i < result.passes.length - 1; i++) {
        expect(result.passes[i].cumulativeTolerance).toBeLessThanOrEqual(
          result.passes[i + 1].cumulativeTolerance
        );
      }
    });

    it('should calculate added tolerance per pass', () => {
      const result = analyzer.analyzeMultiPassTolerance({
        numberOfPasses: 3,
        tolerancePerPass: 0.02,
      });

      result.passes.forEach((pass, idx) => {
        if (idx > 0) {
          expect(pass.addedTolerance).toBeGreaterThan(0);
        }
      });
    });

    it('should provide recommendation based on pass count', () => {
      const result = analyzer.analyzeMultiPassTolerance({
        numberOfPasses: 5,
        tolerancePerPass: 0.02,
      });

      expect(result.recommendation).toBeDefined();
    });
  });

  // ==================== History Management Tests ====================

  describe('History Management', () => {
    it('should store analysis results', () => {
      analyzer.calculateAchievableTolerance({});

      expect(analyzer.getHistory().length).toBe(1);
    });

    it('should limit history', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.calculateAchievableTolerance({});
      }

      const limited = analyzer.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      analyzer.calculateAchievableTolerance({});
      analyzer.clearHistory();

      expect(analyzer.getHistory()).toEqual([]);
    });
  });

  // ==================== Statistics Tests ====================

  describe('getStatistics', () => {
    it('should return message for empty history', () => {
      const stats = analyzer.getStatistics();
      expect(stats.message).toBeDefined();
    });

    it('should calculate statistics', () => {
      analyzer.calculateAchievableTolerance({});
      analyzer.calculateAchievableTolerance({ vibrationLevel: 0.05 });

      const stats = analyzer.getStatistics();

      expect(stats.totalAnalyses).toBe(2);
      expect(stats.averageTolerance).toBeGreaterThan(0);
      expect(stats.bestTolerance).toBeLessThanOrEqual(stats.worstTolerance);
    });

    it('should include unit', () => {
      analyzer.calculateAchievableTolerance({});

      const stats = analyzer.getStatistics();

      expect(stats.unit).toBe('Tolerance (mm)');
    });
  });

  // ==================== Edge Case Tests ====================

  describe('Edge Cases', () => {
    it('should handle zero vibration', () => {
      const result = analyzer.calculateAchievableTolerance({
        vibrationLevel: 0,
      });

      expect(result.achievableTolerance).toBeGreaterThan(0);
      expect(result.confidence).toBe(1);
    });

    it('should handle high vibration', () => {
      const result = analyzer.calculateAchievableTolerance({
        vibrationLevel: 0.2,
      });

      expect(result.achievableTolerance).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(1);
    });

    it('should handle very tight tolerance requirement', () => {
      const result = analyzer.canAchieveTolerance({
        requiredTolerance: 0.001,
      });

      expect(result).toBeDefined();
    });

    it('should handle many passes', () => {
      const result = analyzer.analyzeMultiPassTolerance({
        numberOfPasses: 20,
        tolerancePerPass: 0.02,
      });

      expect(result.passes.length).toBe(20);
    });

    it('should handle very long tool', () => {
      const result = analyzer.predictRunout({
        toolLength: 200,
        toolDiameter: 3,
      });

      expect(result.predictedRunout).toBeGreaterThan(0);
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration Scenarios', () => {
    it('should perform complete tolerance analysis workflow', () => {
      // Calculate achievable tolerance
      const achievable = analyzer.calculateAchievableTolerance({
        vibrationLevel: 0.01,
      });

      // Check if specific tolerance is achievable
      const check = analyzer.canAchieveTolerance({
        requiredTolerance: 0.05,
      });

      // Get precision setup recommendation
      const setup = analyzer.recommendPrecisionSetup({
        requiredTolerance: 0.05,
      });

      expect(achievable.achievableTolerance).toBeGreaterThan(0);
      expect(check.canAchieve).toBeDefined();
      expect(setup.recommendedSetup).toBeDefined();
    });

    it('should analyze complete GD&T workflow', () => {
      // Position tolerance analysis
      const position = analyzer.analyzeSurfacePositionTolerance({
        nominalDimension: 50,
        positionalTolerance: 0.05,
        datumReferences: ['A', 'B', 'C'],
      });

      // Stack-up analysis
      const stackUp = analyzer.analyzeToleranceStackUp({
        dimensions: [
          { name: 'Feature 1', tolerance: 0.03 },
          { name: 'Feature 2', tolerance: 0.02 },
        ],
      });

      // Runout prediction
      const runout = analyzer.predictRunout({
        toolLength: 60,
        toolDiameter: 3,
        spindleType: 'ER20',
      });

      expect(position.nominalDimension).toBe(50);
      expect(stackUp.numberOfDimensions).toBe(2);
      expect(runout.predictedRunout).toBeGreaterThan(0);
    });

    it('should track tolerance improvements through history', () => {
      // Initial analysis
      analyzer.calculateAchievableTolerance({ vibrationLevel: 0.1 });

      // Improved setup
      analyzer.calculateAchievableTolerance({ vibrationLevel: 0.05 });

      // Further improved
      analyzer.calculateAchievableTolerance({ vibrationLevel: 0.01 });

      const stats = analyzer.getStatistics();

      expect(stats.totalAnalyses).toBe(3);
      expect(stats.bestTolerance).toBeLessThan(stats.worstTolerance);
    });
  });
});
