/**
 * Deflection Compensation Advisor - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import DeflectionCompensationAdvisor from '../../../modules/simulation/deflection-compensation-advisor.mjs';

describe('DeflectionCompensationAdvisor', () => {
  let advisor;

  beforeEach(() => {
    advisor = new DeflectionCompensationAdvisor();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(advisor.options.toolStiffnessYZ).toBe(45000);
      expect(advisor.options.spindalStiffnessYZ).toBe(85000);
    });

    it('should accept custom options', () => {
      const custom = new DeflectionCompensationAdvisor({
        toolStiffnessYZ: 50000,
        spindalStiffnessYZ: 90000,
      });
      expect(custom.options.toolStiffnessYZ).toBe(50000);
      expect(custom.options.spindalStiffnessYZ).toBe(90000);
    });
  });

  describe('calculateToolDeflection', () => {
    it('should require cuttingForce', () => {
      expect(() => advisor.calculateToolDeflection({})).toThrow();
    });

    it('should calculate tool deflection', () => {
      const result = advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(result.toolDeflectionMm).toBeGreaterThan(0);
      expect(result.totalDeflectionMm).toBeGreaterThan(0);
    });

    it('should include component breakdown', () => {
      const result = advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(result.toolDeflectionMm).toBeDefined();
      expect(result.spindalDeflectionMm).toBeDefined();
      expect(result.workpieceDeflectionMm).toBeDefined();
    });

    it('should increase deflection with cutting force', () => {
      const light = advisor.calculateToolDeflection({
        cuttingForce: 100,
        toolLength: 50,
        toolDiameter: 3,
      });

      const heavy = advisor.calculateToolDeflection({
        cuttingForce: 1000,
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(heavy.totalDeflectionMm).toBeGreaterThan(light.totalDeflectionMm);
    });

    it('should increase deflection with tool length', () => {
      const short = advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 30,
        toolDiameter: 3,
      });

      const long = advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 80,
        toolDiameter: 3,
      });

      expect(long.totalDeflectionMm).toBeGreaterThan(short.totalDeflectionMm);
    });

    it('should apply material stiffness factors', () => {
      const aluminum = advisor.calculateToolDeflection({
        cuttingForce: 500,
        material: 'aluminum',
        toolLength: 50,
        toolDiameter: 3,
      });

      const steel = advisor.calculateToolDeflection({
        cuttingForce: 500,
        material: 'steel',
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(steel.workpieceDeflectionMm).toBeLessThan(aluminum.workpieceDeflectionMm);
    });

    it('should identify dominant deflection source', () => {
      const result = advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(['TOOL', 'SPINDLE', 'WORKPIECE']).toContain(result.dominantSource);
    });

    it('should emit deflection:calculated event', (done) => {
      advisor.on('deflection:calculated', (result) => {
        expect(result.totalDeflectionMm).toBeDefined();
        done();
      });

      advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 50,
        toolDiameter: 3,
      });
    });
  });

  describe('calculateCompensationOffset', () => {
    it('should require targetDimension', () => {
      expect(() => advisor.calculateCompensationOffset({})).toThrow();
    });

    it('should calculate compensation offset', () => {
      const result = advisor.calculateCompensationOffset({
        targetDimension: 25,
        cuttingForce: 500,
        material: 'aluminum',
      });

      expect(result.requiredCompensationMm).toBeGreaterThan(0);
      expect(result.feasible).toEqual(expect.any(Boolean));
    });

    it('should predict dimension without compensation', () => {
      const result = advisor.calculateCompensationOffset({
        targetDimension: 25,
        cuttingForce: 500,
      });

      expect(result.predictedDimensionWithoutCompensation).toBeLessThan(result.targetDimensionMm);
    });

    it('should assess compensation feasibility', () => {
      const result = advisor.calculateCompensationOffset({
        targetDimension: 25,
        cuttingForce: 500,
      });

      expect(result.feasible).toEqual(expect.any(Boolean));
      expect(result.compensationQuality).toBeGreaterThan(0);
    });

    it('should estimate dimensional accuracy after compensation', () => {
      const result = advisor.calculateCompensationOffset({
        targetDimension: 25,
        cuttingForce: 500,
      });

      expect(result.dimensionalAccuracyAfterCompensationMm).toBeGreaterThanOrEqual(0);
    });

    it('should provide recommendation', () => {
      const result = advisor.calculateCompensationOffset({
        targetDimension: 25,
        cuttingForce: 500,
      });

      expect(result.recommendation).toBeDefined();
    });
  });

  describe('analyzeRealTimeCompensation', () => {
    it('should require passes array', () => {
      expect(() => advisor.analyzeRealTimeCompensation({})).toThrow();
    });

    it('should analyze multi-pass compensation', () => {
      const result = advisor.analyzeRealTimeCompensation({
        passes: [
          { depth: 1, cuttingForce: 300 },
          { depth: 2, cuttingForce: 500 },
          { depth: 3, cuttingForce: 700 },
        ],
        targetDimension: 25,
      });

      expect(result.numberOfPasses).toBe(3);
      expect(result.analysis.length).toBe(3);
    });

    it('should track residual errors', () => {
      const result = advisor.analyzeRealTimeCompensation({
        passes: [{ cuttingForce: 300 }, { cuttingForce: 500 }, { cuttingForce: 700 }],
        targetDimension: 25,
      });

      expect(result.averageResidualErrorMm).toBeGreaterThanOrEqual(0);
      expect(result.maxResidualErrorMm).toBeGreaterThanOrEqual(result.averageResidualErrorMm);
    });

    it('should assess consistency across passes', () => {
      const result = advisor.analyzeRealTimeCompensation({
        passes: [{ cuttingForce: 500 }, { cuttingForce: 500 }, { cuttingForce: 500 }],
        targetDimension: 25,
      });

      expect(result.consistency).toBeGreaterThanOrEqual(0);
      expect(result.consistency).toBeLessThanOrEqual(100);
    });

    it('should provide pass-by-pass analysis', () => {
      const result = advisor.analyzeRealTimeCompensation({
        passes: [{ cuttingForce: 400 }, { cuttingForce: 500 }],
      });

      result.analysis.forEach((pass, idx) => {
        expect(pass.passNumber).toBe(idx + 1);
        expect(pass.actualDeflectionMm).toBeDefined();
        expect(pass.compensationApplied).toBeDefined();
        expect(pass.achievedDimension).toBeDefined();
      });
    });
  });

  describe('recommendCompensationStrategy', () => {
    it('should require predictedDeflection', () => {
      expect(() => advisor.recommendCompensationStrategy({})).toThrow();
    });

    it('should recommend strategy', () => {
      const result = advisor.recommendCompensationStrategy({
        predictedDeflection: 0.1,
      });

      expect(result.recommendedStrategy).toBeDefined();
      expect(result.fullRecommendation).toBeDefined();
    });

    it('should respect budget constraint', () => {
      const result = advisor.recommendCompensationStrategy({
        predictedDeflection: 0.1,
        budget: 100,
      });

      expect(result.fullRecommendation.cost).toBeLessThanOrEqual(100);
    });

    it('should consider accuracy requirements', () => {
      const result = advisor.recommendCompensationStrategy({
        predictedDeflection: 0.1,
        accuracy_requirement: 0.02,
      });

      expect(result.fullRecommendation.accuracy).toBeLessThanOrEqual(0.02);
    });

    it('should provide alternative strategies', () => {
      const result = advisor.recommendCompensationStrategy({
        predictedDeflection: 0.1,
        budget: 1000,
      });

      expect(result.alternativeStrategies.length).toBeGreaterThan(0);
    });

    it('should suggest combined strategies when beneficial', () => {
      const result = advisor.recommendCompensationStrategy({
        predictedDeflection: 0.2,
        budget: 1000,
      });

      expect(result.combinedStrategy).toBeDefined();
      expect(result.combinedStrategy.length).toBeGreaterThan(0);
    });

    it('should calculate expected improvement', () => {
      const result = advisor.recommendCompensationStrategy({
        predictedDeflection: 0.1,
      });

      expect(result.expectedImprovement).toBeGreaterThan(0);
    });
  });

  describe('History Management', () => {
    it('should store deflection data', () => {
      advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(advisor.getHistory().length).toBe(1);
    });

    it('should limit history', () => {
      for (let i = 0; i < 10; i++) {
        advisor.calculateToolDeflection({
          cuttingForce: 300 + i * 50,
          toolLength: 50,
          toolDiameter: 3,
        });
      }

      const limited = advisor.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 50,
        toolDiameter: 3,
      });
      advisor.clearHistory();

      expect(advisor.getHistory()).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should return message for empty history', () => {
      const stats = advisor.getStatistics();
      expect(stats.message).toBeDefined();
    });

    it('should calculate statistics', () => {
      advisor.calculateToolDeflection({ cuttingForce: 300, toolLength: 50, toolDiameter: 3 });
      advisor.calculateToolDeflection({ cuttingForce: 500, toolLength: 50, toolDiameter: 3 });

      const stats = advisor.getStatistics();

      expect(stats.totalMeasurements).toBe(2);
      expect(stats.averageDeflectionMm).toBeGreaterThan(0);
      expect(stats.maxDeflectionMm).toBeGreaterThanOrEqual(stats.averageDeflectionMm);
    });

    it('should include standard deviation', () => {
      advisor.calculateToolDeflection({ cuttingForce: 300, toolLength: 50, toolDiameter: 3 });
      advisor.calculateToolDeflection({ cuttingForce: 500, toolLength: 50, toolDiameter: 3 });

      const stats = advisor.getStatistics();

      expect(stats.standardDeviation).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero cutting force', () => {
      const result = advisor.calculateToolDeflection({
        cuttingForce: 0,
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(result.totalDeflectionMm).toBe(0);
    });

    it('should handle very high cutting force', () => {
      const result = advisor.calculateToolDeflection({
        cuttingForce: 5000,
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(result.totalDeflectionMm).toBeGreaterThan(0);
    });

    it('should handle very short tool', () => {
      const result = advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 10,
        toolDiameter: 3,
      });

      expect(result.totalDeflectionMm).toBeGreaterThan(0);
    });

    it('should handle very long tool', () => {
      const result = advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 150,
        toolDiameter: 3,
      });

      expect(result.totalDeflectionMm).toBeGreaterThan(0);
    });

    it('should handle unknown material', () => {
      const result = advisor.calculateToolDeflection({
        cuttingForce: 500,
        material: 'unknown',
        toolLength: 50,
        toolDiameter: 3,
      });

      expect(result.totalDeflectionMm).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should perform complete deflection analysis', () => {
      const deflection = advisor.calculateToolDeflection({
        cuttingForce: 500,
        toolLength: 50,
        toolDiameter: 3,
        material: 'aluminum',
      });

      const compensation = advisor.calculateCompensationOffset({
        targetDimension: 25,
        cuttingForce: 500,
        material: 'aluminum',
      });

      expect(deflection.totalDeflectionMm).toBeGreaterThan(0);
      expect(compensation.requiredCompensationMm).toBeGreaterThan(0);
    });

    it('should track compensation over multi-pass job', () => {
      const analysis = advisor.analyzeRealTimeCompensation({
        passes: [
          { depth: 1, cuttingForce: 300 },
          { depth: 2, cuttingForce: 400 },
          { depth: 3, cuttingForce: 500 },
        ],
        targetDimension: 25,
      });

      const strategy = advisor.recommendCompensationStrategy({
        predictedDeflection: analysis.maxResidualErrorMm,
        budget: 500,
      });

      expect(analysis.numberOfPasses).toBe(3);
      expect(strategy.recommendedStrategy).toBeDefined();
    });

    it('should optimize compensation for accuracy target', () => {
      const recommendation = advisor.recommendCompensationStrategy({
        predictedDeflection: 0.15,
        accuracy_requirement: 0.01,
        budget: 1000,
      });

      expect(recommendation.fullRecommendation.accuracy).toBeLessThanOrEqual(0.01);
      expect(recommendation.expectedImprovement).toBeGreaterThan(0);
    });
  });
});
