/**
 * Chip Evacuation Analyzer - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import ChipEvacuationAnalyzer from '../../../modules/simulation/chip-evacuation-analyzer.mjs';

describe('ChipEvacuationAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ChipEvacuationAnalyzer();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(analyzer.options.fluteCrossSection).toBe(5);
      expect(analyzer.options.numberOfFlutes).toBe(2);
    });

    it('should accept custom options', () => {
      const custom = new ChipEvacuationAnalyzer({
        fluteCrossSection: 6,
        numberOfFlutes: 3,
      });
      expect(custom.options.fluteCrossSection).toBe(6);
      expect(custom.options.numberOfFlutes).toBe(3);
    });
  });

  describe('calculateChipCharacteristics', () => {
    it('should require feedRate and depth', () => {
      expect(() => analyzer.calculateChipCharacteristics({})).toThrow();
    });

    it('should calculate chip characteristics', () => {
      const result = analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
      });

      expect(result.chipThicknessMm).toBeGreaterThan(0);
      expect(result.chipWidthMm).toBe(2);
      expect(result.chipVolumeMm3).toBeGreaterThan(0);
    });

    it('should classify chip type', () => {
      const result = analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
      });

      expect(['CONTINUOUS', 'TIGHTLY_CURLED', 'MODERATE_CURL', 'LONG_STRINGY']).toContain(
        result.chipType
      );
    });

    it('should calculate curling radius', () => {
      const result = analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
      });

      expect(result.curlingRadiusMm).toBeGreaterThan(0);
    });

    it('should calculate adhesion risk', () => {
      const result = analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
      });

      expect(result.adhesionRisk).toBeGreaterThanOrEqual(0);
    });

    it('should apply material factors', () => {
      const aluminum = analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
        material: 'aluminum',
      });

      const titanium = analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
        material: 'titanium',
      });

      expect(aluminum.curlingRadiusMm).not.toBe(titanium.curlingRadiusMm);
    });

    it('should emit chip:calculated event', (done) => {
      analyzer.on('chip:calculated', (result) => {
        expect(result.chipVolumeMm3).toBeDefined();
        done();
      });

      analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
      });
    });
  });

  describe('analyzeEvacuation', () => {
    it('should require chipVolumePerSecond', () => {
      expect(() => analyzer.analyzeEvacuation({})).toThrow();
    });

    it('should analyze evacuation adequacy', () => {
      const result = analyzer.analyzeEvacuation({
        chipVolumePerSecond: 5,
      });

      expect(result.evacuationStatus).toBeDefined();
      expect(result.evacuationRatio).toBeGreaterThanOrEqual(0);
    });

    it('should classify risk levels', () => {
      const result = analyzer.analyzeEvacuation({
        chipVolumePerSecond: 5,
      });

      expect(['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(result.riskLevel);
    });

    it('should calculate clogging probability', () => {
      const result = analyzer.analyzeEvacuation({
        chipVolumePerSecond: 5,
      });

      expect(result.cloggingProbabilityPercent).toBeGreaterThanOrEqual(0);
      expect(result.cloggingProbabilityPercent).toBeLessThanOrEqual(100);
    });

    it('should provide recommendation', () => {
      const result = analyzer.analyzeEvacuation({
        chipVolumePerSecond: 5,
      });

      expect(result.recommendation).toBeDefined();
    });

    it('should handle varying chip volumes', () => {
      const low = analyzer.analyzeEvacuation({ chipVolumePerSecond: 1 });
      const high = analyzer.analyzeEvacuation({ chipVolumePerSecond: 100 });

      expect(low.evacuationStatus).toBeDefined();
      expect(high.evacuationStatus).toBeDefined();
    });
  });

  describe('predictToolWearFromChips', () => {
    it('should require chipVolumeTotal', () => {
      expect(() => analyzer.predictToolWearFromChips({})).toThrow();
    });

    it('should predict tool wear', () => {
      const result = analyzer.predictToolWearFromChips({
        chipVolumeTotal: 1000,
        material: 'steel',
      });

      expect(result.adhesionWearMm).toBeGreaterThanOrEqual(0);
      expect(result.totalFlankWearMm).toBeGreaterThan(0);
    });

    it('should classify tool condition', () => {
      const result = analyzer.predictToolWearFromChips({
        chipVolumeTotal: 1000,
        material: 'steel',
      });

      expect(['EXCELLENT', 'GOOD', 'WORN']).toContain(result.toolCondition);
    });

    it('should predict tool life remaining', () => {
      const result = analyzer.predictToolWearFromChips({
        chipVolumeTotal: 1000,
        material: 'steel',
        operatingHours: 10,
      });

      expect(result.toolLifeRemainingHours).toBeGreaterThanOrEqual(0);
    });

    it('should apply temperature effects', () => {
      const cool = analyzer.predictToolWearFromChips({
        chipVolumeTotal: 1000,
        material: 'steel',
        temperature: 200,
      });

      const hot = analyzer.predictToolWearFromChips({
        chipVolumeTotal: 1000,
        material: 'steel',
        temperature: 400,
      });

      expect(hot.totalFlankWearMm).toBeGreaterThan(cool.totalFlankWearMm);
    });

    it('should apply material factors', () => {
      const aluminum = analyzer.predictToolWearFromChips({
        chipVolumeTotal: 1000,
        material: 'aluminum',
      });

      const titanium = analyzer.predictToolWearFromChips({
        chipVolumeTotal: 1000,
        material: 'titanium',
      });

      expect(aluminum.totalFlankWearMm).not.toBe(titanium.totalFlankWearMm);
    });
  });

  describe('recommendOptimalChipParameters', () => {
    it('should require depth', () => {
      expect(() => analyzer.recommendOptimalChipParameters({})).toThrow();
    });

    it('should recommend parameters', () => {
      const result = analyzer.recommendOptimalChipParameters({
        depth: 3,
      });

      expect(result.recommendedFeedPerToothMm).toBeGreaterThan(0);
      expect(result.recommendedSpindleSpeedRPM).toBeGreaterThan(0);
    });

    it('should include multiple strategies', () => {
      const result = analyzer.recommendOptimalChipParameters({
        depth: 3,
      });

      expect(result.strategies.length).toBeGreaterThan(0);
      expect(result.strategies[0].name).toBeDefined();
    });

    it('should apply material-specific recommendations', () => {
      const aluminum = analyzer.recommendOptimalChipParameters({
        depth: 3,
        material: 'aluminum',
      });

      const steel = analyzer.recommendOptimalChipParameters({
        depth: 3,
        material: 'steel',
      });

      expect(aluminum.recommendedSpindleSpeedRPM).toBeGreaterThan(steel.recommendedSpindleSpeedRPM);
    });

    it('should predict chip type', () => {
      const result = analyzer.recommendOptimalChipParameters({
        depth: 3,
      });

      expect(['CONTINUOUS', 'BROKEN']).toContain(result.expectedChipType);
    });

    it('should provide best strategy', () => {
      const result = analyzer.recommendOptimalChipParameters({
        depth: 3,
      });

      expect(result.bestStrategy).toBeDefined();
    });
  });

  describe('History Management', () => {
    it('should store chip data', () => {
      analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
      });

      expect(analyzer.getHistory().length).toBe(1);
    });

    it('should limit history', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.calculateChipCharacteristics({
          feedRate: 80 + i * 10,
          depth: 2,
        });
      }

      const limited = analyzer.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 2,
      });
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
      analyzer.calculateChipCharacteristics({ feedRate: 100, depth: 1 });
      analyzer.calculateChipCharacteristics({ feedRate: 100, depth: 3 });

      const stats = analyzer.getStatistics();

      expect(stats.totalMeasurements).toBe(2);
      expect(stats.averageChipVolumeMm3).toBeGreaterThan(0);
      expect(stats.maxChipVolumeMm3).toBeGreaterThanOrEqual(stats.averageChipVolumeMm3);
    });

    it('should track total chips processed', () => {
      analyzer.calculateChipCharacteristics({ feedRate: 100, depth: 2 });
      analyzer.calculateChipCharacteristics({ feedRate: 100, depth: 2 });

      const stats = analyzer.getStatistics();

      expect(stats.totalChipsProcessedMm3).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero depth', () => {
      const result = analyzer.calculateChipCharacteristics({
        feedRate: 100,
        depth: 0,
      });

      expect(result.chipVolumeMm3).toBe(0);
    });

    it('should handle very high feed rate', () => {
      const result = analyzer.calculateChipCharacteristics({
        feedRate: 500,
        depth: 5,
      });

      expect(result.chipVolumeMm3).toBeGreaterThan(0);
    });

    it('should handle very low feed rate', () => {
      const result = analyzer.calculateChipCharacteristics({
        feedRate: 10,
        depth: 2,
      });

      expect(result.chipVolumeMm3).toBeGreaterThan(0);
    });

    it('should handle zero chip volume evacuation', () => {
      const result = analyzer.analyzeEvacuation({
        chipVolumePerSecond: 0,
      });

      expect(result.evacuationStatus).toBe('EXCELLENT');
    });

    it('should handle very high temperature wear prediction', () => {
      const result = analyzer.predictToolWearFromChips({
        chipVolumeTotal: 1000,
        material: 'steel',
        temperature: 1000,
      });

      expect(result.totalFlankWearMm).toBeGreaterThan(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should analyze complete chip workflow', () => {
      const chips = analyzer.calculateChipCharacteristics({
        feedRate: 150,
        depth: 3,
        material: 'aluminum',
      });

      const evacuation = analyzer.analyzeEvacuation({
        chipVolumePerSecond: chips.chipVolumeMm3,
      });

      const wear = analyzer.predictToolWearFromChips({
        chipVolumeTotal: chips.chipVolumeMm3 * 100,
        material: 'aluminum',
      });

      expect(chips.chipVolumeMm3).toBeGreaterThan(0);
      expect(evacuation.riskLevel).toBeDefined();
      expect(wear.totalFlankWearMm).toBeGreaterThan(0);
    });

    it('should recommend optimal parameters for given depth', () => {
      const recommendation = analyzer.recommendOptimalChipParameters({
        depth: 5,
        material: 'steel',
        fluteDiameter: 4,
      });

      const chipResult = analyzer.calculateChipCharacteristics({
        feedRate: recommendation.recommendedFeedRateMmMin,
        depth: 5,
        material: 'steel',
      });

      expect(recommendation.strategies.length).toBeGreaterThan(0);
      expect(chipResult.chipVolumeMm3).toBeGreaterThan(0);
    });

    it('should handle varying material chip behavior', () => {
      const materials = ['aluminum', 'steel', 'brass', 'titanium'];
      const results = materials.map((mat) =>
        analyzer.calculateChipCharacteristics({
          feedRate: 100,
          depth: 2,
          material: mat,
        })
      );

      results.forEach((result) => {
        expect(result.chipType).toBeDefined();
        expect(result.adhesionRisk).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
