/**
 * Cost Estimator Unit Tests
 * Tests for material cost, tool depreciation, power consumption, and profitability
 */

/* eslint-disable no-undef */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { CostEstimator } from '../../../modules/simulation/cost-estimator.mjs';

describe('CostEstimator', () => {
  let estimator;

  beforeEach(() => {
    estimator = new CostEstimator({
      aluminumCostPerKg: 15,
      steelCostPerKg: 10,
      electricityCost: 0.15,
      machineOverheadPerHour: 5,
      laborCostPerHour: 0,
      currencySymbol: '$',
    });
  });

  describe('initialization', () => {
    test('should initialize with default options', () => {
      const e = new CostEstimator();
      expect(e.options.currencySymbol).toBe('$');
    });

    test('should set custom currency symbol', () => {
      const e = new CostEstimator({ currencySymbol: '€' });
      expect(e.options.currencySymbol).toBe('€');
    });

    test('should initialize cost profiles', () => {
      expect(estimator.costProfiles).toHaveProperty('materials');
      expect(estimator.costProfiles).toHaveProperty('tools');
      expect(estimator.costProfiles).toHaveProperty('machine');
    });

    test('should have material cost data', () => {
      expect(estimator.costProfiles.materials.aluminum).toBeDefined();
      expect(estimator.costProfiles.materials.steel).toBeDefined();
      expect(estimator.costProfiles.materials.brass).toBeDefined();
    });
  });

  describe('material cost calculation', () => {
    test('should calculate material cost from weight', () => {
      const cost = estimator.calculateMaterialCost({
        material: 'aluminum',
        materialWeight: 1, // 1 kg
      });

      // 1 kg * 15 $/kg * (1 + 15% waste) = 17.25
      expect(cost).toBeCloseTo(1 * 15 * 1.15, 1);
    });

    test('should calculate material cost from dimensions', () => {
      const cost = estimator.calculateMaterialCost({
        material: 'aluminum',
        dimensions: {
          length: 100, // mm
          width: 100, // mm
          height: 10, // mm
        },
      });

      // Volume = 100 * 100 * 10 = 100,000 mm³ = 100 cm³
      // Weight = 100 * 2.7 / 1000 = 0.27 kg
      // Cost = 0.27 * 15 * 1.15 = 4.66...
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(10);
    });

    test('should apply waste factor', () => {
      const costNoWaste = 1 * 15; // 15
      const cost = estimator.calculateMaterialCost({
        material: 'aluminum',
        materialWeight: 1,
      });

      expect(cost).toBeGreaterThan(costNoWaste);
      expect(cost).toBeCloseTo(costNoWaste * 1.15, 1);
    });

    test('should handle different materials', () => {
      const aluminumCost = estimator.calculateMaterialCost({
        material: 'aluminum',
        materialWeight: 1,
      });

      const steelCost = estimator.calculateMaterialCost({
        material: 'steel',
        materialWeight: 1,
      });

      // Material cost = weight * costPerKg * (1 + waste)
      // Aluminum: 1 * 15 * 1.15 = 17.25
      // Steel: 1 * 10 * 1.15 = 11.5
      // So aluminum is actually more expensive per kg despite steel being denser
      expect(steelCost).toBeLessThan(aluminumCost);
    });

    test('should throw error for unknown material', () => {
      expect(() => {
        estimator.calculateMaterialCost({
          material: 'unknown',
          materialWeight: 1,
        });
      }).toThrow('Unknown material');
    });

    test('should throw error without weight or dimensions', () => {
      expect(() => {
        estimator.calculateMaterialCost({
          material: 'aluminum',
        });
      }).toThrow();
    });
  });

  describe('tool cost calculation', () => {
    test('should calculate tool depreciation from machine time', () => {
      const cost = estimator.calculateToolCost({
        machineTime: 100,
        tools: [{ type: 'endmill', machineTime: 100 }],
      });

      expect(cost).toBeGreaterThan(0);
    });

    test('should handle multiple tools', () => {
      const cost = estimator.calculateToolCost({
        machineTime: 100,
        tools: [
          { type: 'endmill', machineTime: 50 },
          { type: 'drill', machineTime: 50 },
        ],
      });

      expect(cost).toBeGreaterThan(0);
    });

    test('should handle empty tools array', () => {
      const cost = estimator.calculateToolCost({
        machineTime: 100,
        tools: [],
      });

      expect(cost).toBe(0);
    });

    test('should handle undefined tools', () => {
      const cost = estimator.calculateToolCost({
        machineTime: 100,
      });

      expect(cost).toBe(0);
    });

    test('should calculate based on tool lifespan', () => {
      const toolProfile = estimator.costProfiles.tools.endmill;
      const depreciationPerMinute = toolProfile.baseCost / toolProfile.lifespan;

      const cost = estimator.calculateToolCost({
        machineTime: 100,
        tools: [{ type: 'endmill', machineTime: 100 }],
      });

      expect(cost).toBeCloseTo(depreciationPerMinute * 100, 2);
    });
  });

  describe('power cost calculation', () => {
    test('should calculate power consumption cost', () => {
      const cost = estimator.calculatePowerCost({
        machineTime: 60, // 1 hour
        spindleLoadFactor: 1.0,
      });

      expect(cost).toBeGreaterThan(0);
    });

    test('should vary with spindle load factor', () => {
      const lightLoad = estimator.calculatePowerCost({
        machineTime: 60,
        spindleLoadFactor: 0.5,
      });

      const fullLoad = estimator.calculatePowerCost({
        machineTime: 60,
        spindleLoadFactor: 1.0,
      });

      expect(fullLoad).toBeGreaterThan(lightLoad);
    });

    test('should account for machine time', () => {
      const short = estimator.calculatePowerCost({
        machineTime: 30,
        spindleLoadFactor: 0.75,
      });

      const long = estimator.calculatePowerCost({
        machineTime: 60,
        spindleLoadFactor: 0.75,
      });

      expect(long).toBeGreaterThan(short);
      expect(long).toBeCloseTo(short * 2, 1);
    });
  });

  describe('machine overhead calculation', () => {
    test('should calculate overhead from machine time', () => {
      const cost = estimator.calculateMachineOverhead({
        machineTime: 60, // 1 hour
      });

      expect(cost).toBeCloseTo(5, 0); // 60 min / 60 * $5/hour = $5
    });

    test('should be proportional to machine time', () => {
      const short = estimator.calculateMachineOverhead({
        machineTime: 30,
      });

      const long = estimator.calculateMachineOverhead({
        machineTime: 60,
      });

      expect(long).toBeCloseTo(short * 2, 1);
    });
  });

  describe('labor cost calculation', () => {
    test('should calculate labor cost when set', () => {
      const e = new CostEstimator({ laborCostPerHour: 25 });
      const cost = e.calculateLaborCost({
        machineTime: 60, // 1 hour
      });

      expect(cost).toBeGreaterThan(0);
    });

    test('should be zero when labor cost not set', () => {
      const cost = estimator.calculateLaborCost({
        machineTime: 60,
      });

      expect(cost).toBe(0);
    });

    test('should include setup/cleanup time', () => {
      const e = new CostEstimator({ laborCostPerHour: 25 });
      const cost = e.calculateLaborCost({
        machineTime: 60,
        setupCleanupTime: 0.5, // 0.5 hours
      });

      expect(cost).toBeCloseTo((60 / 60 + 0.5) * 25, 0);
    });
  });

  describe('job cost estimation', () => {
    test('should estimate complete job cost', () => {
      const result = estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
        profitMargin: 0.25,
      });

      expect(result).toHaveProperty('estimatedMaterialCost');
      expect(result).toHaveProperty('estimatedToolCost');
      expect(result).toHaveProperty('estimatedPowerCost');
      expect(result).toHaveProperty('estimatedMachineOverhead');
      expect(result).toHaveProperty('estimatedLaborCost');
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('totalEstimatedCost');
      expect(result).toHaveProperty('breakdown');
    });

    test('should apply profit margin', () => {
      const result = estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
        profitMargin: 0.25,
      });

      expect(result.totalEstimatedCost).toBeGreaterThan(result.subtotal);
    });

    test('should require necessary parameters', () => {
      expect(() => {
        estimator.estimateJobCost({
          material: 'aluminum',
        });
      }).toThrow();
    });

    test('should use default profit margin', () => {
      const result = estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
      });

      expect(result.profitMargin).toBeDefined();
      expect(result.totalEstimatedCost).toBeGreaterThan(result.subtotal);
    });

    test('should add estimate to history', () => {
      estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
      });

      expect(estimator.jobHistory.length).toBe(1);
    });

    test('should emit cost:estimated event', () => {
      const callback = jest.fn();
      estimator.on('cost:estimated', callback);

      estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('material comparison', () => {
    test('should compare costs across materials', () => {
      const comparison = estimator.compareMaterials({
        materialWeight: 1,
      });

      expect(Array.isArray(comparison)).toBe(true);
      expect(comparison.length).toBeGreaterThan(0);
    });

    test('should sort by cost', () => {
      const comparison = estimator.compareMaterials({
        materialWeight: 1,
      });

      if (comparison.length > 1) {
        for (let i = 0; i < comparison.length - 1; i++) {
          expect(comparison[i].totalCost).toBeLessThanOrEqual(comparison[i + 1].totalCost);
        }
      }
    });

    test('should include all material properties', () => {
      const comparison = estimator.compareMaterials({
        materialWeight: 1,
      });

      comparison.forEach((mat) => {
        expect(mat).toHaveProperty('material');
        expect(mat).toHaveProperty('costPerKg');
        expect(mat).toHaveProperty('totalCost');
        expect(mat).toHaveProperty('density');
      });
    });
  });

  describe('break-even analysis', () => {
    test('should calculate break-even for profitable job', () => {
      const result = estimator.breakEvenAnalysis(
        {
          material: 'aluminum',
          materialWeight: 1,
          machineTime: 60,
          tools: [{ type: 'endmill', machineTime: 60 }],
          spindleLoadFactor: 0.75,
          toolingInvestment: 100,
        },
        50 // selling price
      );

      expect(result.profitable).toBe(true);
      expect(result.breakEvenUnits).toBeGreaterThan(0);
      expect(result.profitPerPart).toBeGreaterThan(0);
    });

    test('should identify unprofitable pricing', () => {
      const result = estimator.breakEvenAnalysis(
        {
          material: 'aluminum',
          materialWeight: 1,
          machineTime: 60,
          tools: [{ type: 'endmill', machineTime: 60 }],
          spindleLoadFactor: 0.75,
        },
        5 // too low
      );

      expect(result.profitable).toBe(false);
    });

    test('should require selling price', () => {
      expect(() => {
        estimator.breakEvenAnalysis({
          material: 'aluminum',
          materialWeight: 1,
          machineTime: 60,
          tools: [{ type: 'endmill', machineTime: 60 }],
          spindleLoadFactor: 0.75,
        });
      }).toThrow('Selling price required');
    });

    test('should calculate profit margin', () => {
      const result = estimator.breakEvenAnalysis(
        {
          material: 'aluminum',
          materialWeight: 1,
          machineTime: 60,
          tools: [{ type: 'endmill', machineTime: 60 }],
          spindleLoadFactor: 0.75,
        },
        50
      );

      if (result.profitable) {
        const margin = parseFloat(result.profitMargin);
        expect(margin).toBeGreaterThan(0);
        expect(margin).toBeLessThan(100);
      }
    });
  });

  describe('optimization suggestions', () => {
    test('should provide optimization suggestions', () => {
      const estimation = estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
      });

      const suggestions = estimator.optimizationSuggestions(
        {
          material: 'aluminum',
          materialWeight: 1,
          machineTime: 60,
          tools: [{ type: 'endmill', machineTime: 60 }],
          spindleLoadFactor: 0.75,
        },
        estimation.totalEstimatedCost
      );

      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should include optimization details', () => {
      const estimation = estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
      });

      const suggestions = estimator.optimizationSuggestions(
        {
          material: 'aluminum',
          materialWeight: 1,
          machineTime: 60,
          tools: [{ type: 'endmill', machineTime: 60 }],
          spindleLoadFactor: 0.75,
        },
        estimation.totalEstimatedCost
      );

      suggestions.forEach((sug) => {
        expect(sug).toHaveProperty('category');
        expect(sug).toHaveProperty('priority');
        expect(sug).toHaveProperty('message');
        expect(sug).toHaveProperty('action');
        expect(sug).toHaveProperty('estimatedSavings');
      });
    });
  });

  describe('history and statistics', () => {
    test('should maintain cost history', () => {
      estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
      });

      estimator.estimateJobCost({
        material: 'steel',
        materialWeight: 2,
        machineTime: 90,
        tools: [{ type: 'drill', machineTime: 90 }],
        spindleLoadFactor: 0.8,
      });

      expect(estimator.jobHistory.length).toBe(2);
    });

    test('should return limited history', () => {
      for (let i = 0; i < 10; i++) {
        estimator.estimateJobCost({
          material: 'aluminum',
          materialWeight: 1,
          machineTime: 60,
          tools: [{ type: 'endmill', machineTime: 60 }],
          spindleLoadFactor: 0.75,
        });
      }

      const history = estimator.getHistory(5);
      expect(history.length).toBe(5);
    });

    test('should calculate statistics', () => {
      for (let i = 0; i < 3; i++) {
        estimator.estimateJobCost({
          material: 'aluminum',
          materialWeight: 1 + i,
          machineTime: 60 + i * 30,
          tools: [{ type: 'endmill', machineTime: 60 + i * 30 }],
          spindleLoadFactor: 0.75,
        });
      }

      const stats = estimator.getStatistics();
      expect(stats.totalEstimates).toBe(3);
      expect(stats.averageJobCost).toBeGreaterThan(0);
      expect(stats.maxJobCost).toBeGreaterThanOrEqual(stats.averageJobCost);
      expect(stats.minJobCost).toBeLessThanOrEqual(stats.averageJobCost);
    });

    test('should clear history', () => {
      estimator.estimateJobCost({
        material: 'aluminum',
        materialWeight: 1,
        machineTime: 60,
        tools: [{ type: 'endmill', machineTime: 60 }],
        spindleLoadFactor: 0.75,
      });

      estimator.clearHistory();
      expect(estimator.jobHistory.length).toBe(0);
    });

    test('should return message when no history', () => {
      estimator.clearHistory();
      const stats = estimator.getStatistics();
      expect(stats.message).toBeDefined();
    });
  });

  describe('cost profile management', () => {
    test('should return cost profiles', () => {
      const profiles = estimator.getCostProfiles();
      expect(profiles).toHaveProperty('materials');
      expect(profiles).toHaveProperty('tools');
      expect(profiles).toHaveProperty('machine');
    });

    test('should update material costs', () => {
      estimator.updateCostProfiles({
        materials: { aluminum: { costPerKg: 20 } },
      });

      expect(estimator.costProfiles.materials.aluminum.costPerKg).toBe(20);
    });

    test('should update tool profiles', () => {
      estimator.updateCostProfiles({
        tools: { endmill: { baseCost: 15 } },
      });

      expect(estimator.costProfiles.tools.endmill.baseCost).toBe(15);
    });

    test('should update machine profiles', () => {
      estimator.updateCostProfiles({
        machine: { laborCostPerHour: 30 },
      });

      expect(estimator.costProfiles.machine.laborCostPerHour).toBe(30);
    });

    test('should return updated profiles', () => {
      const updated = estimator.updateCostProfiles({
        machine: { laborCostPerHour: 30 },
      });

      expect(updated.machine.laborCostPerHour).toBe(30);
    });
  });

  describe('event handling', () => {
    test('should register event listeners', () => {
      const callback = jest.fn();
      estimator.on('cost:test', callback);
      expect(estimator.listeners['cost:test']).toContain(callback);
    });

    test('should emit events', () => {
      const callback = jest.fn();
      estimator.on('cost:test', callback);
      estimator.emit('cost:test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});
