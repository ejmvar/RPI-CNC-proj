/**
 * Runout & TIR Simulator - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import RunoutTIRSimulator from '../../../modules/simulation/runout-tir-simulator.mjs';

describe('RunoutTIRSimulator', () => {
  let simulator;

  beforeEach(() => {
    simulator = new RunoutTIRSimulator();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(simulator.options.spindleRunout).toBe(0.015);
      expect(simulator.options.toolRunout).toBe(0.02);
    });

    it('should accept custom options', () => {
      const custom = new RunoutTIRSimulator({
        spindleRunout: 0.01,
        toolRunout: 0.015,
      });
      expect(custom.options.spindleRunout).toBe(0.01);
      expect(custom.options.toolRunout).toBe(0.015);
    });
  });

  describe('calculateCombinedTIR', () => {
    it('should calculate combined TIR', () => {
      const result = simulator.calculateCombinedTIR({
        toolLength: 50,
        spindleSpeed: 12000,
      });

      expect(result.radialRunout).toBeGreaterThan(0);
      expect(result.effectiveTIR).toBeGreaterThanOrEqual(result.radialRunout);
    });

    it('should use RSS for combining runout sources', () => {
      const result = simulator.calculateCombinedTIR({
        toolLength: 50,
      });

      const expected = Math.sqrt(
        simulator.options.spindleRunout ** 2 +
          simulator.options.toolHolderRunout ** 2 +
          simulator.options.toolRunout ** 2
      );

      expect(result.radialRunout).toBeCloseTo(expected, 4);
    });

    it('should apply tool length factor', () => {
      const short = simulator.calculateCombinedTIR({ toolLength: 30 });
      const long = simulator.calculateCombinedTIR({ toolLength: 100 });

      expect(long.lengthFactor).toBeGreaterThan(short.lengthFactor);
      expect(long.effectiveTIR).toBeGreaterThan(short.effectiveTIR);
    });

    it('should apply speed factor', () => {
      const slow = simulator.calculateCombinedTIR({ spindleSpeed: 3000 });
      const fast = simulator.calculateCombinedTIR({ spindleSpeed: 20000 });

      expect(fast.speedFactor).toBeGreaterThan(slow.speedFactor);
      expect(fast.effectiveTIR).toBeGreaterThan(slow.effectiveTIR);
    });

    it('should include source breakdown', () => {
      const result = simulator.calculateCombinedTIR({});

      expect(result.sourceBreakdown.spindle).toBeGreaterThan(0);
      expect(result.sourceBreakdown.toolHolder).toBeGreaterThan(0);
      expect(result.sourceBreakdown.tool).toBeGreaterThan(0);
    });
  });

  describe('simulateRunoutVibration', () => {
    it('should require spindleSpeed and toolDiameter', () => {
      expect(() => simulator.simulateRunoutVibration({})).toThrow();
    });

    it('should simulate vibration from runout', () => {
      const result = simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
      });

      expect(result.vibrationAmplitude).toBeGreaterThan(0);
      expect(result.spinFrequencyHz).toBeGreaterThan(0);
    });

    it('should calculate spindle frequency', () => {
      const result = simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
      });

      expect(result.spinFrequencyHz).toBeCloseTo(200, -1);
    });

    it('should classify vibration severity', () => {
      const result = simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
      });

      expect(['NEGLIGIBLE', 'MINOR', 'MODERATE', 'SEVERE', 'CRITICAL']).toContain(
        result.vibrationSeverity
      );
    });

    it('should assess risk level', () => {
      const result = simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
      });

      expect(['LOW', 'MODERATE', 'HIGH']).toContain(result.riskLevel);
    });

    it('should increase vibration with cutting depth', () => {
      const shallow = simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
        depth: 1,
      });

      const deep = simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
        depth: 5,
      });

      expect(deep.vibrationAmplitude).toBeGreaterThan(shallow.vibrationAmplitude);
    });

    it('should add to history', () => {
      simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
      });

      expect(simulator.getHistory().length).toBe(1);
    });

    it('should emit vibration:simulated event', (done) => {
      simulator.on('vibration:simulated', (result) => {
        expect(result.vibrationAmplitude).toBeDefined();
        done();
      });

      simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
      });
    });
  });

  describe('classifyVibrationSeverity', () => {
    it('should classify negligible vibration', () => {
      expect(simulator.classifyVibrationSeverity(0.005)).toBe('NEGLIGIBLE');
    });

    it('should classify minor vibration', () => {
      expect(simulator.classifyVibrationSeverity(0.015)).toBe('MINOR');
    });

    it('should classify moderate vibration', () => {
      expect(simulator.classifyVibrationSeverity(0.03)).toBe('MODERATE');
    });

    it('should classify severe vibration', () => {
      expect(simulator.classifyVibrationSeverity(0.07)).toBe('SEVERE');
    });

    it('should classify critical vibration', () => {
      expect(simulator.classifyVibrationSeverity(0.15)).toBe('CRITICAL');
    });
  });

  describe('calculateFinishImpact', () => {
    it('should require feedRate', () => {
      expect(() => simulator.calculateFinishImpact({})).toThrow();
    });

    it('should calculate finish impact from runout', () => {
      const result = simulator.calculateFinishImpact({
        feedRate: 100,
        spindleSpeed: 6000,
        toolDiameter: 3,
      });

      expect(result.baseRoughness).toBeGreaterThan(0);
      expect(result.runoutContribution).toBeGreaterThan(0);
      expect(result.totalRoughness).toBeGreaterThan(result.baseRoughness);
    });

    it('should calculate degradation percentage', () => {
      const result = simulator.calculateFinishImpact({
        feedRate: 100,
        spindleSpeed: 6000,
        toolDiameter: 3,
      });

      expect(result.degradationPercent).toBeGreaterThan(0);
      expect(result.degradationPercent).toBeLessThanOrEqual(100);
    });

    it('should provide recommendation', () => {
      const result = simulator.calculateFinishImpact({
        feedRate: 100,
        spindleSpeed: 6000,
        toolDiameter: 3,
      });

      expect(result.recommendation).toBeDefined();
    });
  });

  describe('analyzeRunoutProgression', () => {
    it('should require toolLifeHours', () => {
      expect(() => simulator.analyzeRunoutProgression({})).toThrow();
    });

    it('should analyze runout over tool life', () => {
      const result = simulator.analyzeRunoutProgression({
        toolLifeHours: 100,
      });

      expect(result.progression.length).toBe(5);
      expect(result.progression[0].toolLifeHours).toBeLessThanOrEqual(
        result.progression[4].toolLifeHours
      );
    });

    it('should show runout increases over time', () => {
      const result = simulator.analyzeRunoutProgression({
        toolLifeHours: 100,
      });

      for (let i = 0; i < result.progression.length - 1; i++) {
        expect(result.progression[i].estimatedRunout).toBeLessThanOrEqual(
          result.progression[i + 1].estimatedRunout
        );
      }
    });

    it('should track wear percentage', () => {
      const result = simulator.analyzeRunoutProgression({
        toolLifeHours: 100,
      });

      result.progression.forEach((point) => {
        expect(point.wearPercent).toBeGreaterThanOrEqual(0);
        expect(point.wearPercent).toBeLessThanOrEqual(100);
      });
    });

    it('should provide recommendation', () => {
      const result = simulator.analyzeRunoutProgression({
        toolLifeHours: 100,
      });

      expect(result.recommendation).toBeDefined();
    });
  });

  describe('compareSpindleSetups', () => {
    it('should require setups array', () => {
      expect(() => simulator.compareSpindleSetups({})).toThrow();
    });

    it('should compare multiple spindle setups', () => {
      const result = simulator.compareSpindleSetups({
        setups: [
          { name: 'ER16', spindleRunout: 0.02, spindleType: 'ER16' },
          { name: 'ER32', spindleRunout: 0.015, spindleType: 'ER32' },
          { name: 'ISO30', spindleRunout: 0.01, spindleType: 'ISO30' },
        ],
      });

      expect(result.length).toBe(3);
      expect(result[0].effectiveTIR).toBeLessThanOrEqual(result[result.length - 1].effectiveTIR);
    });

    it('should include TIR class for each setup', () => {
      const result = simulator.compareSpindleSetups({
        setups: [
          { name: 'Setup A', spindleRunout: 0.015 },
          { name: 'Setup B', spindleRunout: 0.03 },
        ],
      });

      result.forEach((setup) => {
        expect(setup.tirClass).toBeDefined();
        expect(setup.recommendation).toBeDefined();
      });
    });
  });

  describe('classifyTIRClass', () => {
    it('should classify precision class', () => {
      expect(simulator.classifyTIRClass(0.008)).toBe('PRECISION_CLASS');
    });

    it('should classify high class', () => {
      expect(simulator.classifyTIRClass(0.015)).toBe('HIGH_CLASS');
    });

    it('should classify standard class', () => {
      expect(simulator.classifyTIRClass(0.035)).toBe('STANDARD_CLASS');
    });

    it('should classify industrial class', () => {
      expect(simulator.classifyTIRClass(0.07)).toBe('INDUSTRIAL_CLASS');
    });

    it('should classify coarse class', () => {
      expect(simulator.classifyTIRClass(0.15)).toBe('COARSE_CLASS');
    });
  });

  describe('recommendRunoutReduction', () => {
    it('should require currentTIR', () => {
      expect(() => simulator.recommendRunoutReduction({})).toThrow();
    });

    it('should recommend runout reduction strategies', () => {
      const result = simulator.recommendRunoutReduction({
        currentTIR: 0.08,
        budget: 500,
      });

      expect(result.affordableStrategies.length).toBeGreaterThan(0);
      expect(result.recommendedSequence.length).toBeGreaterThan(0);
    });

    it('should estimate projected TIR after strategy', () => {
      const result = simulator.recommendRunoutReduction({
        currentTIR: 0.05,
      });

      result.affordableStrategies.forEach((strategy) => {
        expect(strategy.projectedTIR).toBeLessThan(result.currentTIR);
      });
    });

    it('should respect budget constraint', () => {
      const result = simulator.recommendRunoutReduction({
        currentTIR: 0.05,
        budget: 100,
      });

      result.affordableStrategies.forEach((strategy) => {
        expect(strategy.cost).toBeLessThanOrEqual(100);
      });
    });

    it('should prioritize strategies', () => {
      const result = simulator.recommendRunoutReduction({
        currentTIR: 0.05,
      });

      expect(result.recommendedSequence.length).toBeGreaterThan(0);
      expect(result.recommendedSequence[0].priority).toBeLessThanOrEqual(
        result.recommendedSequence[result.recommendedSequence.length - 1].priority
      );
    });
  });

  describe('History Management', () => {
    it('should store simulations', () => {
      simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
      });

      expect(simulator.getHistory().length).toBe(1);
    });

    it('should limit history', () => {
      for (let i = 0; i < 10; i++) {
        simulator.simulateRunoutVibration({
          spindleSpeed: 5000 + i * 1000,
          toolDiameter: 3,
        });
      }

      const limited = simulator.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
      });
      simulator.clearHistory();

      expect(simulator.getHistory()).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should return message for empty history', () => {
      const stats = simulator.getStatistics();
      expect(stats.message).toBeDefined();
    });

    it('should calculate statistics', () => {
      simulator.simulateRunoutVibration({ spindleSpeed: 10000, toolDiameter: 3 });
      simulator.simulateRunoutVibration({ spindleSpeed: 15000, toolDiameter: 3 });

      const stats = simulator.getStatistics();

      expect(stats.totalSimulations).toBe(2);
      expect(stats.averageVibration).toBeGreaterThan(0);
      expect(stats.maxVibration).toBeGreaterThanOrEqual(stats.averageVibration);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero tool length', () => {
      const result = simulator.calculateCombinedTIR({
        toolLength: 0,
        spindleSpeed: 12000,
      });

      expect(result.effectiveTIR).toBeGreaterThan(0);
    });

    it('should handle high spindle speed', () => {
      const result = simulator.calculateCombinedTIR({
        spindleSpeed: 50000,
      });

      expect(result.speedFactor).toBeGreaterThan(1);
    });

    it('should handle very long tool', () => {
      const result = simulator.calculateCombinedTIR({
        toolLength: 200,
      });

      expect(result.effectiveTIR).toBeGreaterThan(0);
    });

    it('should handle zero MRR', () => {
      const result = simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
        depth: 0,
      });

      expect(result.vibrationAmplitude).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should perform complete runout analysis', () => {
      const tir = simulator.calculateCombinedTIR({
        toolLength: 60,
        spindleSpeed: 12000,
      });

      const vibration = simulator.simulateRunoutVibration({
        spindleSpeed: 12000,
        toolDiameter: 3,
        toolLength: 60,
      });

      const finish = simulator.calculateFinishImpact({
        feedRate: 100,
        spindleSpeed: 12000,
        toolDiameter: 3,
      });

      expect(tir.effectiveTIR).toBeGreaterThan(0);
      expect(vibration.vibrationAmplitude).toBeGreaterThan(0);
      expect(finish.degradationPercent).toBeGreaterThan(0);
    });

    it('should track runout over tool life', () => {
      const progression = simulator.analyzeRunoutProgression({
        toolLifeHours: 100,
      });

      const reduction = simulator.recommendRunoutReduction({
        currentTIR: progression.progression[progression.progression.length - 1].estimatedRunout,
      });

      expect(progression.progression.length).toBe(5);
      expect(reduction.affordableStrategies.length).toBeGreaterThan(0);
    });

    it('should compare and recommend best setup', () => {
      const comparison = simulator.compareSpindleSetups({
        setups: [
          { name: 'ER16', spindleRunout: 0.02 },
          { name: 'ER32', spindleRunout: 0.015 },
          { name: 'ISO30', spindleRunout: 0.01 },
        ],
      });

      expect(comparison[0].effectiveTIR).toBeLessThan(
        comparison[comparison.length - 1].effectiveTIR
      );
      expect(comparison[0].recommendation).toBeDefined();
    });
  });
});
