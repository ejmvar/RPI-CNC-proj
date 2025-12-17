/**
 * Critical Speed Analyzer - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import CriticalSpeedAnalyzer from '../../../modules/simulation/critical-speed-analyzer.mjs';

describe('CriticalSpeedAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new CriticalSpeedAnalyzer();
  });

  // ==================== Initialization Tests ====================

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer.options.spindleStiffness).toBe(1000);
      expect(analyzer.options.massArmatureRotor).toBe(0.5);
      expect(analyzer.options.massToolHolder).toBe(0.2);
    });

    it('should accept custom options', () => {
      const custom = new CriticalSpeedAnalyzer({
        spindleStiffness: 2000,
        massArmatureRotor: 1.0,
      });
      expect(custom.options.spindleStiffness).toBe(2000);
      expect(custom.options.massArmatureRotor).toBe(1.0);
    });
  });

  // ==================== Natural Frequency Calculation Tests ====================

  describe('calculateNaturalFrequency', () => {
    it('should require stiffness parameter', () => {
      expect(() => analyzer.calculateNaturalFrequency({ mass: 1 })).toThrow();
    });

    it('should require mass parameter', () => {
      expect(() => analyzer.calculateNaturalFrequency({ stiffness: 1000 })).toThrow();
    });

    it('should calculate natural frequency in Hz and RPM', () => {
      const result = analyzer.calculateNaturalFrequency({
        stiffness: 1000,
        mass: 0.7,
      });

      expect(result.frequencyHz).toBeGreaterThan(0);
      expect(result.frequencyRPM).toBeGreaterThan(0);
      expect(result.omegaRadPerSec).toBeGreaterThan(0);
    });

    it('should show inverse relationship with mass', () => {
      const light = analyzer.calculateNaturalFrequency({
        stiffness: 1000,
        mass: 0.5,
      });

      const heavy = analyzer.calculateNaturalFrequency({
        stiffness: 1000,
        mass: 1.0,
      });

      expect(light.frequencyHz).toBeGreaterThan(heavy.frequencyHz);
    });

    it('should show direct relationship with stiffness', () => {
      const soft = analyzer.calculateNaturalFrequency({
        stiffness: 500,
        mass: 0.7,
      });

      const stiff = analyzer.calculateNaturalFrequency({
        stiffness: 1000,
        mass: 0.7,
      });

      expect(stiff.frequencyHz).toBeGreaterThan(soft.frequencyHz);
    });

    it('should convert frequency correctly to RPM', () => {
      const result = analyzer.calculateNaturalFrequency({
        stiffness: 1000,
        mass: 0.7,
      });

      const expectedRPM = result.frequencyHz * 60;
      expect(result.frequencyRPM).toBeCloseTo(expectedRPM, 0);
    });
  });

  // ==================== Critical Speed Finding Tests ====================

  describe('findCriticalSpeeds', () => {
    it('should require maxRPM parameter', () => {
      expect(() => analyzer.findCriticalSpeeds({})).toThrow();
    });

    it('should find critical speeds up to maxRPM', () => {
      const result = analyzer.findCriticalSpeeds({
        maxRPM: 24000,
        harmonics: 3,
      });

      expect(result.criticalSpeeds).toBeDefined();
      expect(Array.isArray(result.criticalSpeeds)).toBe(true);
    });

    it('should identify multiple harmonics', () => {
      const result = analyzer.findCriticalSpeeds({
        maxRPM: 30000,
        harmonics: 5,
      });

      if (result.criticalSpeeds.length > 0) {
        // Check harmonics are in order
        for (let i = 0; i < result.criticalSpeeds.length - 1; i++) {
          expect(result.criticalSpeeds[i].frequencyRPM).toBeLessThan(
            result.criticalSpeeds[i + 1].frequencyRPM
          );
        }
      }
    });

    it('should assign harmonic numbers correctly', () => {
      const result = analyzer.findCriticalSpeeds({
        maxRPM: 30000,
        harmonics: 3,
      });

      for (let i = 0; i < result.criticalSpeeds.length; i++) {
        expect(result.criticalSpeeds[i].harmonic).toBe(i + 1);
      }
    });

    it('should rate severity appropriately', () => {
      const result = analyzer.findCriticalSpeeds({
        maxRPM: 30000,
        harmonics: 4,
      });

      if (result.criticalSpeeds.length >= 4) {
        expect(result.criticalSpeeds[0].severity).toBe('CRITICAL');
        expect(result.criticalSpeeds[1].severity).toBe('HIGH');
      }
    });

    it('should return natural frequency', () => {
      const result = analyzer.findCriticalSpeeds({
        maxRPM: 24000,
      });

      expect(result.naturalFrequencyRPM).toBeGreaterThan(0);
    });
  });

  // ==================== Severity Estimation Tests ====================

  describe('estimateSeverity', () => {
    it('should rate first harmonic as CRITICAL', () => {
      expect(analyzer.estimateSeverity(1)).toBe('CRITICAL');
    });

    it('should rate second harmonic as HIGH', () => {
      expect(analyzer.estimateSeverity(2)).toBe('HIGH');
    });

    it('should rate third/fourth harmonic as MODERATE', () => {
      expect(analyzer.estimateSeverity(3)).toBe('MODERATE');
      expect(analyzer.estimateSeverity(4)).toBe('MODERATE');
    });

    it('should rate higher harmonics as LOW', () => {
      expect(analyzer.estimateSeverity(5)).toBe('LOW');
      expect(analyzer.estimateSeverity(10)).toBe('LOW');
    });
  });

  // ==================== Safe Range Identification Tests ====================

  describe('identifySafeRanges', () => {
    it('should require maxRPM parameter', () => {
      expect(() => analyzer.identifySafeRanges({})).toThrow();
    });

    it('should identify safe operating ranges', () => {
      const result = analyzer.identifySafeRanges({
        maxRPM: 24000,
        minRPM: 100,
      });

      expect(result.safeRanges).toBeDefined();
      expect(Array.isArray(result.safeRanges)).toBe(true);
    });

    it('should identify unsafe zones', () => {
      const result = analyzer.identifySafeRanges({
        maxRPM: 24000,
        minRPM: 100,
      });

      expect(result.unsafeZones).toBeDefined();
      expect(Array.isArray(result.unsafeZones)).toBe(true);
    });

    it('should mark zones with adequate width as recommended', () => {
      const result = analyzer.identifySafeRanges({
        maxRPM: 24000,
        minRPM: 100,
      });

      const recommendedZones = result.safeRanges.filter((z) => z.recommended);
      expect(recommendedZones.length).toBeGreaterThan(0);
    });

    it('should apply unsafe margin correctly', () => {
      const result = analyzer.identifySafeRanges({
        maxRPM: 24000,
        minRPM: 100,
        unsafeMargin: 0.2,
      });

      // All ranges should have positive width
      result.safeRanges.forEach((range) => {
        expect(range.width).toBeGreaterThan(0);
      });
    });
  });

  // ==================== Speed Recommendation Tests ====================

  describe('recommendSpeeds', () => {
    it('should require maxRPM parameter', () => {
      expect(() => analyzer.recommendSpeeds({})).toThrow();
    });

    it('should provide speed recommendations', () => {
      const result = analyzer.recommendSpeeds({
        maxRPM: 24000,
      });

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should recommend speeds in safe zones', () => {
      const result = analyzer.recommendSpeeds({
        maxRPM: 24000,
      });

      const safeData = analyzer.identifySafeRanges({ maxRPM: 24000 });

      result.recommendations.forEach((rec) => {
        let inSafeZone = false;
        for (const zone of safeData.safeRanges) {
          if (rec.recommendedRPM >= zone.lowerBound && rec.recommendedRPM <= zone.upperBound) {
            inSafeZone = true;
            break;
          }
        }
        expect(inSafeZone).toBe(true);
      });
    });

    it('should provide at most 3 recommendations', () => {
      const result = analyzer.recommendSpeeds({
        maxRPM: 24000,
      });

      expect(result.recommendations.length).toBeLessThanOrEqual(3);
    });

    it('should include zone information in recommendations', () => {
      const result = analyzer.recommendSpeeds({
        maxRPM: 24000,
      });

      result.recommendations.forEach((rec) => {
        expect(rec.recommendedRPM).toBeGreaterThan(0);
        expect(rec.safeRangeLower).toBeGreaterThan(0);
        expect(rec.safeRangeUpper).toBeGreaterThan(0);
        expect(rec.safeRangeLower).toBeLessThanOrEqual(rec.recommendedRPM);
        expect(rec.recommendedRPM).toBeLessThanOrEqual(rec.safeRangeUpper);
      });
    });

    it('should prioritize largest safe zones', () => {
      const result = analyzer.recommendSpeeds({
        maxRPM: 24000,
      });

      for (let i = 0; i < result.recommendations.length - 1; i++) {
        expect(result.recommendations[i].zoneWidth).toBeGreaterThanOrEqual(
          result.recommendations[i + 1].zoneWidth
        );
      }
    });
  });

  // ==================== Vibration Risk Analysis Tests ====================

  describe('analyzeVibrationRisk', () => {
    it('should require currentRPM parameter', () => {
      expect(() => analyzer.analyzeVibrationRisk({ maxRPM: 24000 })).toThrow();
    });

    it('should assess vibration risk at speed', () => {
      const result = analyzer.analyzeVibrationRisk({
        currentRPM: 10000,
        maxRPM: 24000,
      });

      expect(result.riskLevel).toBeDefined();
      expect(['LOW', 'CAUTION', 'MODERATE', 'HIGH', 'CRITICAL']).toContain(result.riskLevel);
    });

    it('should flag unsafe zones as HIGH or CRITICAL risk', () => {
      const safeData = analyzer.identifySafeRanges({ maxRPM: 24000 });

      if (safeData.unsafeZones.length > 0) {
        const unsafe = safeData.unsafeZones[0];
        const midpoint = (unsafe.lowerBound + unsafe.upperBound) / 2;

        const result = analyzer.analyzeVibrationRisk({
          currentRPM: midpoint,
          maxRPM: 24000,
        });

        expect(result.inUnsafeZone).toBe(true);
        expect(['HIGH', 'MODERATE', 'CRITICAL']).toContain(result.riskLevel);
      }
    });

    it('should provide recommended action', () => {
      const result = analyzer.analyzeVibrationRisk({
        currentRPM: 10000,
        maxRPM: 24000,
      });

      expect(result.recommendedAction).toBeDefined();
    });

    it('should calculate distance to nearest critical speed', () => {
      const result = analyzer.analyzeVibrationRisk({
        currentRPM: 10000,
        maxRPM: 24000,
      });

      expect(result.distanceToNearestCritical).toBeGreaterThanOrEqual(0);
    });
  });

  // ==================== Setup Comparison Tests ====================

  describe('compareSetups', () => {
    it('should require setups array', () => {
      expect(() => analyzer.compareSetups({ maxRPM: 24000 })).toThrow();
    });

    it('should compare multiple setups', () => {
      const result = analyzer.compareSetups({
        setups: [
          { name: 'Setup A', massArmatureRotor: 0.5 },
          { name: 'Setup B', massArmatureRotor: 0.7 },
          { name: 'Setup C', massArmatureRotor: 0.3 },
        ],
        maxRPM: 24000,
      });

      expect(result.length).toBe(3);
    });

    it('should rank by first critical speed', () => {
      const result = analyzer.compareSetups({
        setups: [
          { name: 'Light', massArmatureRotor: 0.2 },
          { name: 'Heavy', massArmatureRotor: 1.0 },
        ],
        maxRPM: 24000,
      });

      // Light setup should have higher or equal critical speeds
      expect(result[0].firstCritical).toBeGreaterThanOrEqual(result[1].firstCritical);
    });

    it('should include stability rating', () => {
      const result = analyzer.compareSetups({
        setups: [{ name: 'Setup A', massArmatureRotor: 0.5 }],
        maxRPM: 24000,
      });

      expect(['EXCELLENT', 'GOOD', 'FAIR', 'POOR']).toContain(result[0].stabilityRating);
    });

    it('should include natural frequency for each setup', () => {
      const result = analyzer.compareSetups({
        setups: [
          { name: 'Setup A', massArmatureRotor: 0.5 },
          { name: 'Setup B', massArmatureRotor: 0.7 },
        ],
        maxRPM: 24000,
      });

      result.forEach((setup) => {
        expect(setup.naturalFrequencyRPM).toBeGreaterThan(0);
      });
    });
  });

  // ==================== Stability Rating Tests ====================

  describe('rateStability', () => {
    it('should rate excellent stability for high natural frequency', () => {
      expect(analyzer.rateStability(12000, 24000)).toBe('EXCELLENT');
    });

    it('should rate good stability', () => {
      expect(analyzer.rateStability(8000, 24000)).toBe('GOOD');
    });

    it('should rate fair stability', () => {
      expect(analyzer.rateStability(5000, 24000)).toBe('FAIR');
    });

    it('should rate poor stability for low natural frequency', () => {
      expect(analyzer.rateStability(3000, 24000)).toBe('POOR');
    });
  });

  // ==================== History Management Tests ====================

  describe('History Management', () => {
    it('should store analysis results', () => {
      analyzer.analysisHistory.push({
        naturalFrequencyRPM: 5000,
      });

      expect(analyzer.getHistory().length).toBe(1);
    });

    it('should limit history with limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.analysisHistory.push({ naturalFrequencyRPM: 5000 + i * 100 });
      }

      const limited = analyzer.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      analyzer.analysisHistory.push({ naturalFrequencyRPM: 5000 });
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

    it('should calculate statistics from history', () => {
      analyzer.analysisHistory = [
        { naturalFrequencyRPM: 5000 },
        { naturalFrequencyRPM: 6000 },
        { naturalFrequencyRPM: 4000 },
      ];

      const stats = analyzer.getStatistics();

      expect(stats.totalAnalyses).toBe(3);
      expect(stats.averageNaturalFrequencyRPM).toBeDefined();
      expect(stats.lowestFrequencyRPM).toBe(4000);
      expect(stats.highestFrequencyRPM).toBe(6000);
    });

    it('should include unit in statistics', () => {
      analyzer.analysisHistory = [{ naturalFrequencyRPM: 5000 }];

      const stats = analyzer.getStatistics();

      expect(stats.unit).toBe('Frequency (RPM)');
    });
  });

  // ==================== Edge Case Tests ====================

  describe('Edge Cases', () => {
    it('should handle very stiff spindle', () => {
      const result = analyzer.calculateNaturalFrequency({
        stiffness: 5000,
        mass: 0.7,
      });

      expect(result.frequencyHz).toBeGreaterThan(0);
    });

    it('should handle soft spindle', () => {
      const result = analyzer.calculateNaturalFrequency({
        stiffness: 100,
        mass: 0.7,
      });

      expect(result.frequencyHz).toBeGreaterThan(0);
    });

    it('should handle high maxRPM', () => {
      const result = analyzer.recommendSpeeds({
        maxRPM: 50000,
      });

      expect(result.recommendations).toBeDefined();
    });

    it('should handle low maxRPM', () => {
      const result = analyzer.recommendSpeeds({
        maxRPM: 5000,
      });

      expect(result.recommendations).toBeDefined();
    });
  });

  // ==================== Integration Tests ====================

  describe('Integration Scenarios', () => {
    it('should provide complete safety analysis workflow', () => {
      // Calculate natural frequency
      const frequency = analyzer.calculateNaturalFrequency({
        stiffness: 1000,
        mass: 0.7,
      });

      // Find critical speeds
      const critical = analyzer.findCriticalSpeeds({
        maxRPM: 24000,
      });

      // Identify safe ranges
      const safeData = analyzer.identifySafeRanges({
        maxRPM: 24000,
      });

      // Get recommendations
      const recommendations = analyzer.recommendSpeeds({
        maxRPM: 24000,
      });

      expect(frequency.frequencyRPM).toBeGreaterThan(0);
      expect(critical.criticalSpeeds.length).toBeGreaterThan(0);
      expect(safeData.safeRanges.length).toBeGreaterThan(0);
      expect(recommendations.recommendations.length).toBeGreaterThan(0);
    });

    it('should analyze risk at recommended speeds', () => {
      const recommendations = analyzer.recommendSpeeds({
        maxRPM: 24000,
      });

      if (recommendations.recommendations.length > 0) {
        const recommendedSpeed = recommendations.recommendations[0].recommendedRPM;
        const risk = analyzer.analyzeVibrationRisk({
          currentRPM: recommendedSpeed,
          maxRPM: 24000,
        });

        expect(risk.riskLevel).toBe('LOW');
      }
    });

    it('should compare spindle setups comprehensively', () => {
      const comparison = analyzer.compareSetups({
        setups: [
          { name: 'Standard ER16', massArmatureRotor: 0.5, spindleStiffness: 1000 },
          { name: 'Heavy ER32', massArmatureRotor: 0.8, spindleStiffness: 800 },
          { name: 'Light ER8', massArmatureRotor: 0.3, spindleStiffness: 1200 },
        ],
        maxRPM: 24000,
      });

      expect(comparison.length).toBe(3);
      comparison.forEach((setup) => {
        expect(setup.setupName).toBeDefined();
        expect(setup.naturalFrequencyRPM).toBeGreaterThan(0);
        expect(setup.stabilityRating).toBeDefined();
      });
    });
  });
});
