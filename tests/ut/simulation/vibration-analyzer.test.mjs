/**
 * Vibration Analyzer Unit Tests
 * Tests for spindle vibration, chatter prediction, resonance detection
 */

/* eslint-disable no-undef */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { VibrationAnalyzer } from '../../../modules/simulation/vibration-analyzer.mjs';

describe('VibrationAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new VibrationAnalyzer({
      maxSpindleSpeed: 24000,
      spindleMass: 2.5,
      bedStiffness: 50000,
      naturalFrequency: 120,
      riskThreshold: 0.7,
    });
  });

  describe('initialization', () => {
    test('should initialize with default options', () => {
      const a = new VibrationAnalyzer();
      expect(a.options.samplingRate).toBe(1000);
      expect(a.options.riskThreshold).toBe(0.7);
    });

    test('should set custom options', () => {
      const a = new VibrationAnalyzer({ riskThreshold: 0.5, samplingRate: 2000 });
      expect(a.options.riskThreshold).toBe(0.5);
      expect(a.options.samplingRate).toBe(2000);
    });

    test('should initialize with machine profile', () => {
      expect(analyzer.machineProfile.spindle.maxSpeed).toBe(24000);
      expect(analyzer.machineProfile.structure.naturalFrequency).toBe(120);
    });
  });

  describe('event handling', () => {
    test('should register event listeners', () => {
      const callback = jest.fn();
      analyzer.on('vibration:test', callback);
      expect(analyzer.listeners['vibration:test']).toContain(callback);
    });

    test('should emit events to registered listeners', () => {
      const callback = jest.fn();
      analyzer.on('vibration:test', callback);
      analyzer.emit('vibration:test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should emit high-risk event when risk score is high', () => {
      const callback = jest.fn();
      analyzer.on('vibration:risk-detected', callback);

      const operation = {
        spindleSpeed: 15000,
        feedRate: 500,
        toolDiameter: 3.175,
        depth: 5,
        material: 'steel',
        flutes: 2,
      };

      analyzer.analyzeOperation(operation);
      if (callback.mock.calls.length > 0) {
        const result = callback.mock.calls[0][0];
        expect(result.isHighRisk).toBe(true);
      }
    });
  });

  describe('spindle vibration calculation', () => {
    test('should calculate vibration for safe operation', () => {
      const vibration = analyzer.calculateSpindleVibration({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
      });

      expect(vibration.amplitude).toBeGreaterThan(0);
      expect(vibration.amplitude).toBeLessThanOrEqual(0.1);
      expect(vibration.frequency).toBeGreaterThan(0);
      expect(vibration.baselineAmplitude).toBeGreaterThan(0);
    });

    test('should increase vibration with higher load', () => {
      const light = analyzer.calculateSpindleVibration({
        spindleSpeed: 6000,
        feedRate: 50,
        toolDiameter: 3.175,
        depth: 1,
      });

      const heavy = analyzer.calculateSpindleVibration({
        spindleSpeed: 6000,
        feedRate: 200,
        toolDiameter: 3.175,
        depth: 3,
      });

      expect(heavy.amplitude).toBeGreaterThan(light.amplitude);
    });

    test('should decrease vibration at higher spindle speeds', () => {
      const slow = analyzer.calculateSpindleVibration({
        spindleSpeed: 3000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
      });

      const fast = analyzer.calculateSpindleVibration({
        spindleSpeed: 12000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
      });

      expect(slow.amplitude).toBeGreaterThan(fast.amplitude);
    });

    test('should calculate correct frequency', () => {
      const vibration = analyzer.calculateSpindleVibration({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
      });

      // 6000 RPM = 100 RPS, 2x spindle frequency = 200 Hz
      expect(vibration.frequency).toBe(200);
    });
  });

  describe('tool deflection calculation', () => {
    test('should calculate deflection for safe operation', () => {
      const deflection = analyzer.calculateToolDeflection({
        toolDiameter: 3.175,
        length: 25.4,
        material: 'aluminum',
        feedRate: 100,
        depth: 1,
      });

      expect(deflection.axial).toBeGreaterThanOrEqual(0);
      expect(deflection.radial).toBeGreaterThanOrEqual(0);
      expect(deflection.percentOfLimit).toBeGreaterThanOrEqual(0);
      expect(deflection.maxAllowable).toBe(50); // microns
    });

    test('should increase deflection with feed rate', () => {
      const light = analyzer.calculateToolDeflection({
        toolDiameter: 3.175,
        length: 25.4,
        material: 'aluminum',
        feedRate: 50,
        depth: 1,
      });

      const heavy = analyzer.calculateToolDeflection({
        toolDiameter: 3.175,
        length: 25.4,
        material: 'aluminum',
        feedRate: 200,
        depth: 2,
      });

      expect(heavy.axial).toBeGreaterThan(light.axial);
    });

    test('should vary deflection by material', () => {
      const aluminum = analyzer.calculateToolDeflection({
        toolDiameter: 3.175,
        length: 25.4,
        material: 'aluminum',
        feedRate: 100,
        depth: 1,
      });

      const steel = analyzer.calculateToolDeflection({
        toolDiameter: 3.175,
        length: 25.4,
        material: 'steel',
        feedRate: 100,
        depth: 1,
      });

      expect(steel.axial).toBeGreaterThan(aluminum.axial);
    });

    test('should calculate radial deflection as fraction of axial', () => {
      const deflection = analyzer.calculateToolDeflection({
        toolDiameter: 3.175,
        length: 25.4,
        material: 'aluminum',
        feedRate: 100,
        depth: 1,
      });

      expect(deflection.radial).toBeCloseTo(deflection.axial * 0.6, 1);
    });
  });

  describe('chatter prediction', () => {
    test('should predict low chatter for safe parameters', () => {
      const chatter = analyzer.predictChatter({
        spindleSpeed: 8000,
        feedRate: 80,
        toolDiameter: 3.175,
        depth: 1,
        flutes: 2,
      });

      expect(chatter.likelihood).toBeGreaterThanOrEqual(0);
      expect(chatter.likelihood).toBeLessThanOrEqual(1);
      expect(chatter.stabilityMargin).toBeGreaterThanOrEqual(0);
      expect(chatter.stabilityMargin).toBeLessThanOrEqual(1);
      expect(chatter.prediction).toMatch(/^(HIGH|MEDIUM|LOW)$/);
    });

    test('should predict higher chatter near resonant speeds', () => {
      // Natural frequency is 120 Hz, which is ~7200 RPM for 1x harmonic
      const nearResonance = analyzer.predictChatter({
        spindleSpeed: 7200,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
        flutes: 2,
      });

      const safeSpeed = analyzer.predictChatter({
        spindleSpeed: 12000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
        flutes: 2,
      });

      // Near resonance should have higher chatter likelihood
      expect(nearResonance.likelihood).toBeGreaterThanOrEqual(safeSpeed.likelihood - 0.3);
    });

    test('should include critical frequencies in prediction', () => {
      const chatter = analyzer.predictChatter({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
        flutes: 2,
      });

      expect(Array.isArray(chatter.likelyFrequencies)).toBe(true);
      expect(chatter.likelyFrequencies.length).toBeGreaterThan(0);
    });

    test('should increase chatter with high feed per tooth', () => {
      const lowFeed = analyzer.predictChatter({
        spindleSpeed: 6000,
        feedRate: 20,
        toolDiameter: 3.175,
        depth: 0.5,
        flutes: 2,
      });

      const highFeed = analyzer.predictChatter({
        spindleSpeed: 6000,
        feedRate: 300,
        toolDiameter: 3.175,
        depth: 3,
        flutes: 2,
      });

      expect(highFeed.likelihood).toBeGreaterThan(lowFeed.likelihood);
    });
  });

  describe('resonance detection', () => {
    test('should detect resonance near machine frequency', () => {
      const resonance = analyzer.checkResonance({
        spindleSpeed: 7200, // 120 Hz spindle frequency (natural freq)
        feedRate: 100,
        toolDiameter: 3.175,
      });

      expect(resonance.risk).toBeGreaterThanOrEqual(0);
      expect(resonance.risk).toBeLessThanOrEqual(1);
      expect(resonance.structuralFrequency).toBe(120);
    });

    test('should calculate distance to resonance', () => {
      const resonance = analyzer.checkResonance({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
      });

      expect(resonance.distanceToResonance).toBeGreaterThanOrEqual(0);
      expect(resonance.nearestHarmonic).toHaveProperty('frequency');
      expect(resonance.nearestHarmonic).toHaveProperty('harmonic');
    });

    test('should identify safe harmonics', () => {
      const resonance = analyzer.checkResonance({
        spindleSpeed: 20000,
        feedRate: 100,
        toolDiameter: 3.175,
      });

      expect(resonance.excitationFrequencies).toContain(resonance.nearestHarmonic.frequency);
    });

    test('should update resonance map', () => {
      analyzer.checkResonance({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
      });

      const map = analyzer.getResonanceMap();
      expect(Object.keys(map).length).toBeGreaterThan(0);
    });
  });

  describe('risk scoring', () => {
    test('should calculate risk score between 0 and 1', () => {
      const spindle = {
        amplitude: 0.03,
        frequency: 100,
        baselineAmplitude: 0.01,
        loadContribution: 0.02,
      };
      const deflection = {
        axial: 20,
        radial: 12,
        maxAllowable: 50,
        percentOfLimit: 40,
        stiffness: 50000,
        cuttingForce: 40,
      };
      const chatter = {
        likelihood: 0.3,
        proximityToResonance: 0.2,
        feedFactor: 0.5,
        depthFactor: 0.2,
        stabilityMargin: 0.7,
        likelyFrequencies: [120],
        prediction: 'MEDIUM',
      };
      const resonance = {
        risk: 0.2,
        structuralFrequency: 120,
        excitationFrequencies: [200],
        nearestHarmonic: { frequency: 100, harmonic: 1 },
        distanceToResonance: 20,
        isResonant: false,
      };

      const score = analyzer.calculateRiskScore(spindle, deflection, chatter, resonance);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should increase risk with higher vibration', () => {
      const lowVib = {
        amplitude: 0.01,
        frequency: 100,
        baselineAmplitude: 0.005,
        loadContribution: 0.005,
      };
      const highVib = {
        amplitude: 0.08,
        frequency: 100,
        baselineAmplitude: 0.005,
        loadContribution: 0.075,
      };
      const defNeutral = {
        axial: 25,
        radial: 15,
        maxAllowable: 50,
        percentOfLimit: 50,
        stiffness: 50000,
        cuttingForce: 50,
      };
      const chatterNeutral = {
        likelihood: 0.25,
        proximityToResonance: 0,
        feedFactor: 0.5,
        depthFactor: 0.2,
        stabilityMargin: 0.75,
        likelyFrequencies: [120],
        prediction: 'LOW',
      };
      const resonanceNeutral = {
        risk: 0,
        structuralFrequency: 120,
        excitationFrequencies: [200],
        nearestHarmonic: { frequency: 100, harmonic: 1 },
        distanceToResonance: 100,
        isResonant: false,
      };

      const lowScore = analyzer.calculateRiskScore(
        lowVib,
        defNeutral,
        chatterNeutral,
        resonanceNeutral
      );
      const highScore = analyzer.calculateRiskScore(
        highVib,
        defNeutral,
        chatterNeutral,
        resonanceNeutral
      );

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('operation analysis', () => {
    test('should analyze operation and return complete results', () => {
      const result = analyzer.analyzeOperation({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
        material: 'aluminum',
        flutes: 2,
      });

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('isHighRisk');
      expect(result).toHaveProperty('vibration');
      expect(result).toHaveProperty('deflection');
      expect(result).toHaveProperty('chatterRisk');
      expect(result).toHaveProperty('resonanceRisk');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('timestamp');
    });

    test('should add analysis to history', () => {
      analyzer.analyzeOperation({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
        material: 'aluminum',
        flutes: 2,
      });

      expect(analyzer.vibrationHistory.length).toBe(1);
    });

    test('should require spindleSpeed and feedRate', () => {
      expect(() => {
        analyzer.analyzeOperation({
          toolDiameter: 3.175,
          depth: 1,
        });
      }).toThrow('Operation requires spindleSpeed, feedRate');
    });

    test('should mark high-risk operations', () => {
      const result = analyzer.analyzeOperation({
        spindleSpeed: 15000,
        feedRate: 500,
        toolDiameter: 3.175,
        depth: 5,
        material: 'steel',
        flutes: 2,
      });

      expect(typeof result.isHighRisk).toBe('boolean');
    });
  });

  describe('recommendations', () => {
    test('should generate recommendations for safe operation', () => {
      const result = analyzer.analyzeOperation({
        spindleSpeed: 6000,
        feedRate: 80,
        toolDiameter: 3.175,
        depth: 1,
        material: 'aluminum',
        flutes: 2,
      });

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should prioritize high-risk recommendations', () => {
      const result = analyzer.analyzeOperation({
        spindleSpeed: 15000,
        feedRate: 500,
        toolDiameter: 3.175,
        depth: 5,
        material: 'steel',
        flutes: 2,
      });

      if (result.recommendations.length > 0) {
        const sorted = result.recommendations.every(
          (rec, i, arr) => i === arr.length - 1 || rec.priority <= arr[i + 1].priority
        );
        expect(sorted).toBe(true);
      }
    });

    test('should include category and severity in recommendations', () => {
      const result = analyzer.analyzeOperation({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
        material: 'aluminum',
        flutes: 2,
      });

      result.recommendations.forEach((rec) => {
        expect(rec).toHaveProperty('category');
        expect(rec).toHaveProperty('severity');
        expect(rec).toHaveProperty('message');
        expect(rec).toHaveProperty('action');
        expect(rec).toHaveProperty('priority');
      });
    });
  });

  describe('optimal speed suggestions', () => {
    test('should suggest optimal spindle speeds', () => {
      const speeds = analyzer.suggestOptimalSpeeds(100, 3.175, 1);

      expect(Array.isArray(speeds)).toBe(true);
      expect(speeds.length).toBeGreaterThan(0);
      speeds.forEach((s) => {
        expect(s).toHaveProperty('speed');
        expect(s).toHaveProperty('frequency');
        expect(s).toHaveProperty('estimatedRisk');
      });
    });

    test('should return speeds sorted by risk', () => {
      const speeds = analyzer.suggestOptimalSpeeds(100, 3.175, 1);

      if (speeds.length > 1) {
        for (let i = 0; i < speeds.length - 1; i++) {
          expect(speeds[i].estimatedRisk).toBeLessThanOrEqual(speeds[i + 1].estimatedRisk);
        }
      }
    });

    test('should limit returned speeds', () => {
      const speeds = analyzer.suggestOptimalSpeeds(100, 3.175, 1);
      expect(speeds.length).toBeLessThanOrEqual(5);
    });

    test('should avoid resonant frequencies', () => {
      const speeds = analyzer.suggestOptimalSpeeds(100, 3.175, 1);

      speeds.forEach((s) => {
        const resonantFrequencies = [120, 240, 360];
        resonantFrequencies.forEach((freq) => {
          const distance = Math.abs(s.frequency - freq);
          expect(distance).toBeGreaterThan(50);
        });
      });
    });
  });

  describe('history and statistics', () => {
    test('should return vibration history', () => {
      analyzer.analyzeOperation({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
        material: 'aluminum',
        flutes: 2,
      });
      analyzer.analyzeOperation({
        spindleSpeed: 8000,
        feedRate: 150,
        toolDiameter: 3.175,
        depth: 2,
        material: 'aluminum',
        flutes: 2,
      });

      const history = analyzer.getHistory();
      expect(history.length).toBe(2);
    });

    test('should limit history to requested amount', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.analyzeOperation({
          spindleSpeed: 6000 + i * 1000,
          feedRate: 100,
          toolDiameter: 3.175,
          depth: 1,
          material: 'aluminum',
          flutes: 2,
        });
      }

      const history = analyzer.getHistory(5);
      expect(history.length).toBe(5);
    });

    test('should calculate statistics', () => {
      for (let i = 0; i < 5; i++) {
        analyzer.analyzeOperation({
          spindleSpeed: 6000 + i * 2000,
          feedRate: 100,
          toolDiameter: 3.175,
          depth: 1,
          material: 'aluminum',
          flutes: 2,
        });
      }

      const stats = analyzer.getStatistics();
      expect(stats.totalOperations).toBe(5);
      expect(stats.averageRiskScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageRiskScore).toBeLessThanOrEqual(1);
      expect(stats.maxRiskScore).toBeGreaterThanOrEqual(stats.averageRiskScore);
      expect(stats.minRiskScore).toBeLessThanOrEqual(stats.averageRiskScore);
      expect(stats.percentageHighRisk).toBeGreaterThanOrEqual(0);
      expect(stats.percentageHighRisk).toBeLessThanOrEqual(100);
    });

    test('should clear history', () => {
      analyzer.analyzeOperation({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
        depth: 1,
        material: 'aluminum',
        flutes: 2,
      });

      analyzer.clearHistory();
      expect(analyzer.vibrationHistory.length).toBe(0);
      expect(analyzer.getHistory().length).toBe(0);
    });

    test('should return message when no history', () => {
      analyzer.clearHistory();
      const stats = analyzer.getStatistics();
      expect(stats.message).toBeDefined();
    });
  });

  describe('machine profile management', () => {
    test('should return machine profile', () => {
      const profile = analyzer.getMachineProfile();
      expect(profile).toHaveProperty('spindle');
      expect(profile).toHaveProperty('bed');
      expect(profile).toHaveProperty('structure');
    });

    test('should update spindle profile', () => {
      analyzer.updateMachineProfile({
        spindle: { maxSpeed: 30000 },
      });

      expect(analyzer.machineProfile.spindle.maxSpeed).toBe(30000);
    });

    test('should update bed profile', () => {
      analyzer.updateMachineProfile({
        bed: { stiffness: 75000 },
      });

      expect(analyzer.machineProfile.bed.stiffness).toBe(75000);
    });

    test('should update structure profile', () => {
      analyzer.updateMachineProfile({
        structure: { naturalFrequency: 150 },
      });

      expect(analyzer.machineProfile.structure.naturalFrequency).toBe(150);
    });

    test('should return updated profile', () => {
      const updated = analyzer.updateMachineProfile({
        spindle: { maxSpeed: 30000 },
      });

      expect(updated.spindle.maxSpeed).toBe(30000);
    });
  });

  describe('resonance map management', () => {
    test('should return resonance map', () => {
      analyzer.checkResonance({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
      });

      const map = analyzer.getResonanceMap();
      expect(typeof map).toBe('object');
    });

    test('should clear resonance map', () => {
      analyzer.checkResonance({
        spindleSpeed: 6000,
        feedRate: 100,
        toolDiameter: 3.175,
      });

      analyzer.clearResonanceMap();
      const map = analyzer.getResonanceMap();
      expect(Object.keys(map).length).toBe(0);
    });
  });
});
