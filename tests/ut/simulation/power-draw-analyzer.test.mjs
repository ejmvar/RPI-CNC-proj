/**
 * Power Draw Analyzer - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import PowerDrawAnalyzer from '../../../modules/simulation/power-draw-analyzer.mjs';

describe('PowerDrawAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new PowerDrawAnalyzer();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(analyzer.options.spindleMotorPower).toBe(2.2);
      expect(analyzer.options.numberOfAxes).toBe(3);
    });

    it('should accept custom options', () => {
      const custom = new PowerDrawAnalyzer({
        spindleMotorPower: 5.5,
        numberOfAxes: 4,
      });
      expect(custom.options.spindleMotorPower).toBe(5.5);
      expect(custom.options.numberOfAxes).toBe(4);
    });
  });

  describe('calculateCuttingPower', () => {
    it('should require MRR parameter', () => {
      expect(() => analyzer.calculateCuttingPower({})).toThrow();
    });

    it('should calculate cutting power from MRR', () => {
      const result = analyzer.calculateCuttingPower({
        mrr: 100,
        material: 'aluminum',
      });

      expect(result.cuttingPowerRequired).toBeGreaterThan(0);
      expect(result.spindlePowerRequired).toBeGreaterThan(result.cuttingPowerRequired);
    });

    it('should apply material factors', () => {
      const aluminum = analyzer.calculateCuttingPower({
        mrr: 100,
        material: 'aluminum',
      });

      const titanium = analyzer.calculateCuttingPower({
        mrr: 100,
        material: 'titanium',
      });

      expect(titanium.spindlePowerRequired).toBeGreaterThan(aluminum.spindlePowerRequired);
    });

    it('should include specific power in result', () => {
      const result = analyzer.calculateCuttingPower({
        mrr: 100,
        material: 'steel',
      });

      expect(result.specificPower).toBeGreaterThan(0);
      expect(result.materialFactor).toBeGreaterThan(0);
    });
  });

  describe('calculateTotalPowerDraw', () => {
    it('should require MRR parameter', () => {
      expect(() => analyzer.calculateTotalPowerDraw({})).toThrow();
    });

    it('should calculate total machine power', () => {
      const result = analyzer.calculateTotalPowerDraw({
        mrr: 50,
        material: 'aluminum',
      });

      expect(result.totalPower).toBeGreaterThan(0);
      expect(result.spindleContribution).toBeGreaterThan(0);
    });

    it('should include all power components', () => {
      const result = analyzer.calculateTotalPowerDraw({
        mrr: 50,
        material: 'steel',
      });

      expect(result.spindleContribution).toBeDefined();
      expect(result.stepperContribution).toBeGreaterThanOrEqual(0);
      expect(result.idleContribution).toBeDefined();
    });

    it('should assess thermal status', () => {
      const result = analyzer.calculateTotalPowerDraw({
        mrr: 50,
        material: 'aluminum',
      });

      expect(['OK', 'WARNING']).toContain(result.thermalStatus);
    });

    it('should calculate utilization percentage', () => {
      const result = analyzer.calculateTotalPowerDraw({
        mrr: 50,
        material: 'aluminum',
      });

      expect(result.utilizationPercent).toBeGreaterThan(0);
      expect(result.utilizationPercent).toBeLessThanOrEqual(100);
    });

    it('should add to history', () => {
      analyzer.calculateTotalPowerDraw({ mrr: 50 });

      expect(analyzer.getHistory().length).toBe(1);
    });

    it('should emit power:calculated event', (done) => {
      analyzer.on('power:calculated', (result) => {
        expect(result.totalPower).toBeDefined();
        done();
      });

      analyzer.calculateTotalPowerDraw({ mrr: 50 });
    });
  });

  describe('estimateJobEnergy', () => {
    it('should require cycleTimeSeconds', () => {
      expect(() => analyzer.estimateJobEnergy({})).toThrow();
    });

    it('should estimate job energy', () => {
      const result = analyzer.estimateJobEnergy({
        cycleTimeSeconds: 600,
        averagePowerDraw: 1.5,
      });

      expect(result.totalEnergyKWh).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    it('should break down active vs idle time', () => {
      const result = analyzer.estimateJobEnergy({
        cycleTimeSeconds: 600,
        averagePowerDraw: 1.5,
        activeFraction: 0.8,
      });

      expect(result.activeTimeSeconds).toBeCloseTo(480, -1);
      expect(result.idleTimeSeconds).toBeCloseTo(120, -1);
    });

    it('should calculate cost from energy', () => {
      const result = analyzer.estimateJobEnergy({
        cycleTimeSeconds: 600,
        averagePowerDraw: 1.0,
        costPerKWh: 0.15,
      });

      expect(result.costPerKWh).toBe(0.15);
      expect(result.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('analyzePowerProfile', () => {
    it('should require operations array', () => {
      expect(() => analyzer.analyzePowerProfile({})).toThrow();
    });

    it('should analyze power profile over multiple operations', () => {
      const result = analyzer.analyzePowerProfile({
        operations: [
          { description: 'Roughing', mrr: 100, duration: 300 },
          { description: 'Finishing', mrr: 30, duration: 120 },
          { description: 'Drilling', mrr: 50, duration: 60 },
        ],
      });

      expect(result.numberOfOperations).toBe(3);
      expect(result.profile.length).toBe(3);
    });

    it('should track peak and average power', () => {
      const result = analyzer.analyzePowerProfile({
        operations: [
          { description: 'Op1', mrr: 50, duration: 100 },
          { description: 'Op2', mrr: 100, duration: 100 },
          { description: 'Op3', mrr: 75, duration: 100 },
        ],
      });

      expect(result.peakPower).toBeGreaterThanOrEqual(result.averagePower);
    });

    it('should count thermal warnings', () => {
      const result = analyzer.analyzePowerProfile({
        operations: [
          { description: 'Light', mrr: 20, duration: 100 },
          { description: 'Heavy', mrr: 200, duration: 100 },
        ],
      });

      expect(result.thermalWarnings).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recommendEfficientParams', () => {
    it('should require requiredMrr', () => {
      expect(() => analyzer.recommendEfficientParams({})).toThrow();
    });

    it('should recommend most efficient material', () => {
      const result = analyzer.recommendEfficientParams({
        requiredMrr: 50,
      });

      expect(result.recommendedMaterial).toBeDefined();
      expect(result.materialOptions).toBeDefined();
      expect(result.materialOptions[0].material).toBe(result.recommendedMaterial);
    });

    it('should assess feasibility', () => {
      const result = analyzer.recommendEfficientParams({
        requiredMrr: 10,
        maxThermalPower: 2.0,
      });

      expect(result.feasible).toBeDefined();
      expect(typeof result.feasible).toBe('boolean');
    });

    it('should provide recommendation text', () => {
      const result = analyzer.recommendEfficientParams({
        requiredMrr: 50,
      });

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('History Management', () => {
    it('should store power measurements', () => {
      analyzer.calculateTotalPowerDraw({ mrr: 50 });

      expect(analyzer.getHistory().length).toBe(1);
    });

    it('should limit history', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.calculateTotalPowerDraw({ mrr: 50 + i * 10 });
      }

      const limited = analyzer.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      analyzer.calculateTotalPowerDraw({ mrr: 50 });
      analyzer.clearHistory();

      expect(analyzer.getHistory()).toEqual([]);
    });
  });

  describe('getStatistics', () => {
    it('should return message for empty history', () => {
      const stats = analyzer.getStatistics();
      expect(stats.message).toBeDefined();
    });

    it('should calculate statistics', () => {
      analyzer.calculateTotalPowerDraw({ mrr: 50 });
      analyzer.calculateTotalPowerDraw({ mrr: 100 });

      const stats = analyzer.getStatistics();

      expect(stats.totalMeasurements).toBe(2);
      expect(stats.averagePower).toBeGreaterThan(0);
      expect(stats.peakPower).toBeGreaterThanOrEqual(stats.averagePower);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero MRR', () => {
      const result = analyzer.calculateCuttingPower({
        mrr: 0,
        material: 'aluminum',
      });

      expect(result.cuttingPowerRequired).toBe(0);
    });

    it('should handle high MRR', () => {
      const result = analyzer.calculateCuttingPower({
        mrr: 500,
        material: 'aluminum',
      });

      expect(result.spindlePowerRequired).toBeGreaterThan(0);
    });

    it('should handle unknown material', () => {
      const result = analyzer.calculateCuttingPower({
        mrr: 50,
        material: 'unknown',
      });

      expect(result.spindlePowerRequired).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should analyze complete job energy workflow', () => {
      const power = analyzer.calculateTotalPowerDraw({
        mrr: 50,
        material: 'aluminum',
      });

      const energy = analyzer.estimateJobEnergy({
        cycleTimeSeconds: 600,
        averagePowerDraw: power.totalPower,
      });

      expect(power.totalPower).toBeGreaterThan(0);
      expect(energy.totalEnergyKWh).toBeGreaterThan(0);
    });

    it('should profile complex job', () => {
      const profile = analyzer.analyzePowerProfile({
        operations: [
          { description: 'Roughing', mrr: 150, duration: 300 },
          { description: 'Finish Roughing', mrr: 75, duration: 180 },
          { description: 'Finishing', mrr: 30, duration: 120 },
        ],
      });

      expect(profile.numberOfOperations).toBe(3);
      expect(profile.totalEnergy).toBeGreaterThan(0);
      expect(profile.peakPower).toBeGreaterThan(profile.averagePower);
    });
  });
});
