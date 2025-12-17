/**
 * Feed Hold & Acceleration Analyzer - Unit Tests
 * Phase 16.5: Enhanced Analysis Modules
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import FeedHoldAccelerationAnalyzer from '../../../modules/simulation/feed-hold-acceleration-analyzer.mjs';

describe('FeedHoldAccelerationAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new FeedHoldAccelerationAnalyzer();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      expect(analyzer.options.maxAccelerationX).toBe(1.0);
      expect(analyzer.options.updateFrequency).toBe(1000);
    });

    it('should accept custom options', () => {
      const custom = new FeedHoldAccelerationAnalyzer({
        maxAccelerationX: 2.0,
        servoGain: 2.0,
      });
      expect(custom.options.maxAccelerationX).toBe(2.0);
      expect(custom.options.servoGain).toBe(2.0);
    });
  });

  describe('analyzeFeedHold', () => {
    it('should require currentVelocity and axis', () => {
      expect(() => analyzer.analyzeFeedHold({})).toThrow();
    });

    it('should analyze feed hold event', () => {
      const result = analyzer.analyzeFeedHold({
        currentVelocity: 100,
        axis: 'X',
      });

      expect(result.timeToStopMs).toBeGreaterThan(0);
      expect(result.decelerationDistanceMm).toBeGreaterThan(0);
    });

    it('should calculate deceleration distance', () => {
      const result = analyzer.analyzeFeedHold({
        currentVelocity: 200,
        axis: 'X',
      });

      expect(result.decelerationDistanceMm).toBeGreaterThan(0);
    });

    it('should account for axis friction', () => {
      const x = analyzer.analyzeFeedHold({ currentVelocity: 100, axis: 'X' });
      const z = analyzer.analyzeFeedHold({ currentVelocity: 100, axis: 'Z' });

      // Z-axis has more friction, so deceleration is different
      expect(z.maxDecelerationMsec2).toBeDefined();
      expect(x.maxDecelerationMsec2).toBeDefined();
      expect(z.maxDecelerationMsec2).not.toBe(x.maxDecelerationMsec2);
    });

    it('should calculate servo lag during hold', () => {
      const result = analyzer.analyzeFeedHold({
        currentVelocity: 150,
        axis: 'X',
      });

      expect(result.servoLagMm).toBeGreaterThan(0);
      expect(result.trackingErrorMm).toBeGreaterThanOrEqual(result.servoLagMm);
    });

    it('should calculate position overshoot', () => {
      const result = analyzer.analyzeFeedHold({
        currentVelocity: 100,
        axis: 'X',
      });

      expect(result.overshootPercent).toBeGreaterThanOrEqual(0);
    });

    it('should recommend hold time', () => {
      const result = analyzer.analyzeFeedHold({
        currentVelocity: 100,
        axis: 'X',
      });

      expect(result.recommendedHoldTime).toBeGreaterThan(result.timeToStopMs / 1000);
    });

    it('should emit hold:analyzed event', (done) => {
      analyzer.on('hold:analyzed', (result) => {
        expect(result.timeToStopMs).toBeDefined();
        done();
      });

      analyzer.analyzeFeedHold({
        currentVelocity: 100,
        axis: 'X',
      });
    });
  });

  describe('calculateAccelerationProfile', () => {
    it('should require startVelocity and endVelocity', () => {
      expect(() => analyzer.calculateAccelerationProfile({})).toThrow();
    });

    it('should calculate trapezoidal profile', () => {
      const result = analyzer.calculateAccelerationProfile({
        startVelocity: 0,
        endVelocity: 100,
        distance: 50,
      });

      expect(result.profiles.length).toBe(2);
      expect(result.recommendedProfile).toBeDefined();
    });

    it('should include acceleration and deceleration phases', () => {
      const result = analyzer.calculateAccelerationProfile({
        startVelocity: 50,
        endVelocity: 150,
        distance: 100,
      });

      const trapezoid = result.profiles[0];
      expect(trapezoid.accelTime).toBeGreaterThan(0);
      expect(trapezoid.decelTime).toBeGreaterThan(0);
    });

    it('should analyze jerk limits', () => {
      const result = analyzer.calculateAccelerationProfile({
        startVelocity: 0,
        endVelocity: 200,
        distance: 100,
      });

      expect(result.isJerkLimited).toEqual(expect.any(Boolean));
    });

    it('should recommend S-curve for high jerk', () => {
      const result = analyzer.calculateAccelerationProfile({
        startVelocity: 0,
        endVelocity: 300,
        distance: 50,
      });

      if (result.isJerkLimited) {
        expect(result.recommendedProfile).toBe('S-Curve (Reduced Jerk)');
      }
    });
  });

  describe('analyzeServoLag', () => {
    it('should require velocity', () => {
      expect(() => analyzer.analyzeServoLag({})).toThrow();
    });

    it('should analyze servo lag', () => {
      const result = analyzer.analyzeServoLag({
        velocity: 100,
      });

      expect(result.positionLagMm).toBeGreaterThanOrEqual(0);
      expect(result.totalTrackingErrorMm).toBeGreaterThanOrEqual(0);
    });

    it('should increase error with velocity', () => {
      const slow = analyzer.analyzeServoLag({ velocity: 50 });
      const fast = analyzer.analyzeServoLag({ velocity: 200 });

      expect(fast.positionLagMm).toBeGreaterThan(slow.positionLagMm);
    });

    it('should account for acceleration effects', () => {
      const noAccel = analyzer.analyzeServoLag({ velocity: 100, acceleration: 0 });
      const withAccel = analyzer.analyzeServoLag({ velocity: 100, acceleration: 1 });

      expect(withAccel.velocityLagMmMin).toBeGreaterThan(noAccel.velocityLagMmMin);
    });

    it('should analyze stability', () => {
      const result = analyzer.analyzeServoLag({
        velocity: 100,
        acceleration: 0.5,
      });

      expect(result.stable).toEqual(expect.any(Boolean));
      expect(result.phaseMarginDegrees).toBeGreaterThanOrEqual(0);
    });

    it('should recommend servo gain', () => {
      const result = analyzer.analyzeServoLag({
        velocity: 100,
      });

      expect(result.recommendedServoGain).toBeGreaterThan(0);
    });

    it('should emit servo:analyzed event', (done) => {
      analyzer.on('servo:analyzed', (result) => {
        expect(result.totalTrackingErrorMm).toBeDefined();
        done();
      });

      analyzer.analyzeServoLag({ velocity: 100 });
    });
  });

  describe('assessPathAccuracyUnderAcceleration', () => {
    it('should require pathType', () => {
      expect(() => analyzer.assessPathAccuracyUnderAcceleration({})).toThrow();
    });

    it('should assess linear path accuracy', () => {
      const result = analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'LINEAR',
        velocity: 100,
      });

      expect(result.totalPathErrorMm).toBeGreaterThan(0);
      expect(result.accuracyClass).toBeDefined();
    });

    it('should assess circular path accuracy', () => {
      const result = analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'CIRCULAR',
        velocity: 100,
        pathRadius: 10,
      });

      expect(result.totalPathErrorMm).toBeGreaterThan(0);
    });

    it('should assess spline path accuracy', () => {
      const result = analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'SPLINE',
        velocity: 100,
      });

      expect(result.totalPathErrorMm).toBeGreaterThan(0);
    });

    it('should classify accuracy', () => {
      const result = analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'LINEAR',
        velocity: 50,
        acceleration: 0.1,
      });

      expect(['EXCELLENT', 'GOOD', 'ACCEPTABLE', 'POOR']).toContain(result.accuracyClass);
    });

    it('should increase error with acceleration', () => {
      const noAccel = analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'LINEAR',
        velocity: 100,
        acceleration: 0,
      });

      const withAccel = analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'LINEAR',
        velocity: 100,
        acceleration: 1,
      });

      expect(withAccel.dynamicErrorMm).toBeGreaterThan(noAccel.dynamicErrorMm);
    });

    it('should emit accuracy:assessed event', (done) => {
      analyzer.on('accuracy:assessed', (result) => {
        expect(result.totalPathErrorMm).toBeDefined();
        done();
      });

      analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'LINEAR',
      });
    });
  });

  describe('recommendOptimalFeedHoldStrategy', () => {
    it('should require currentVelocity', () => {
      expect(() => analyzer.recommendOptimalFeedHoldStrategy({})).toThrow();
    });

    it('should recommend strategy', () => {
      const result = analyzer.recommendOptimalFeedHoldStrategy({
        currentVelocity: 100,
      });

      expect(result.recommendedStrategy).toBeDefined();
      expect(result.strategies.length).toBeGreaterThan(0);
    });

    it('should recommend soft stop for finishing', () => {
      const result = analyzer.recommendOptimalFeedHoldStrategy({
        currentVelocity: 100,
        taskType: 'finishing',
      });

      expect(result.recommendedStrategy).toBe('Soft Stop');
    });

    it('should recommend hard stop for roughing', () => {
      const result = analyzer.recommendOptimalFeedHoldStrategy({
        currentVelocity: 100,
        taskType: 'roughing',
      });

      expect(result.recommendedStrategy).toBe('Hard Stop');
    });

    it('should provide settling time', () => {
      const result = analyzer.recommendOptimalFeedHoldStrategy({
        currentVelocity: 100,
      });

      expect(result.expectedSettlingTimeMs).toBeGreaterThan(0);
    });

    it('should provide expected accuracy', () => {
      const result = analyzer.recommendOptimalFeedHoldStrategy({
        currentVelocity: 100,
      });

      expect(result.expectedAccuracyMm).toBeGreaterThan(0);
    });
  });

  describe('History Management', () => {
    it('should store motion analysis', () => {
      analyzer.analyzeFeedHold({
        currentVelocity: 100,
        axis: 'X',
      });

      expect(analyzer.getHistory().length).toBe(1);
    });

    it('should limit history', () => {
      for (let i = 0; i < 10; i++) {
        analyzer.analyzeFeedHold({
          currentVelocity: 50 + i * 10,
          axis: 'X',
        });
      }

      const limited = analyzer.getHistory(5);
      expect(limited.length).toBe(5);
    });

    it('should clear history', () => {
      analyzer.analyzeFeedHold({
        currentVelocity: 100,
        axis: 'X',
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
      analyzer.analyzeFeedHold({ currentVelocity: 80, axis: 'X' });
      analyzer.analyzeFeedHold({ currentVelocity: 120, axis: 'X' });

      const stats = analyzer.getStatistics();

      expect(stats.totalMeasurements).toBe(2);
      expect(stats.averageErrorMm).toBeGreaterThan(0);
      expect(stats.maxErrorMm).toBeGreaterThanOrEqual(stats.averageErrorMm);
    });

    it('should include standard deviation', () => {
      analyzer.analyzeFeedHold({ currentVelocity: 100, axis: 'X' });
      analyzer.analyzeFeedHold({ currentVelocity: 150, axis: 'X' });

      const stats = analyzer.getStatistics();

      expect(stats.standardDeviation).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero velocity', () => {
      const result = analyzer.analyzeFeedHold({
        currentVelocity: 0,
        axis: 'X',
      });

      expect(result.timeToStopMs).toBe(0);
    });

    it('should handle very high velocity', () => {
      const result = analyzer.analyzeFeedHold({
        currentVelocity: 500,
        axis: 'X',
      });

      expect(result.timeToStopMs).toBeGreaterThan(0);
    });

    it('should handle all axes', () => {
      const axes = ['X', 'Y', 'Z'];
      axes.forEach((axis) => {
        const result = analyzer.analyzeFeedHold({
          currentVelocity: 100,
          axis,
        });
        expect(result.axis).toBe(axis);
      });
    });

    it('should handle zero acceleration profile distance', () => {
      const result = analyzer.calculateAccelerationProfile({
        startVelocity: 100,
        endVelocity: 100,
        distance: 0,
      });

      expect(result.profiles[0].totalTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should perform complete motion analysis', () => {
      const hold = analyzer.analyzeFeedHold({
        currentVelocity: 150,
        axis: 'X',
      });

      const servo = analyzer.analyzeServoLag({
        velocity: 150,
        acceleration: 0.5,
      });

      const path = analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'LINEAR',
        velocity: 150,
        acceleration: 0.5,
      });

      expect(hold.timeToStopMs).toBeGreaterThan(0);
      expect(servo.totalTrackingErrorMm).toBeGreaterThan(0);
      expect(path.totalPathErrorMm).toBeGreaterThan(0);
    });

    it('should compare feed hold strategies', () => {
      const soft = analyzer.recommendOptimalFeedHoldStrategy({
        currentVelocity: 150,
        taskType: 'finishing',
      });

      const hard = analyzer.recommendOptimalFeedHoldStrategy({
        currentVelocity: 150,
        taskType: 'roughing',
      });

      expect(soft.recommendedStrategy).not.toBe(hard.recommendedStrategy);
      expect(soft.strategies.length).toBeGreaterThan(0);
    });

    it('should optimize acceleration for circular paths', () => {
      const accel = analyzer.calculateAccelerationProfile({
        startVelocity: 50,
        endVelocity: 150,
        distance: 100,
        axis: 'X',
      });

      const accuracy = analyzer.assessPathAccuracyUnderAcceleration({
        pathType: 'CIRCULAR',
        velocity: 100,
        acceleration: 0.5,
        pathRadius: 10,
      });

      expect(accel.recommendedProfile).toBeDefined();
      expect(accuracy.accuracyClass).toBeDefined();
    });

    it('should track motion history across multiple operations', () => {
      // Roughing pass
      analyzer.analyzeFeedHold({ currentVelocity: 200, axis: 'X' });
      analyzer.analyzeServoLag({ velocity: 200, acceleration: 1 });

      // Finishing pass
      analyzer.analyzeFeedHold({ currentVelocity: 50, axis: 'X' });
      analyzer.analyzeServoLag({ velocity: 50, acceleration: 0.2 });

      const history = analyzer.getHistory();
      expect(history.length).toBe(4);

      const stats = analyzer.getStatistics();
      expect(stats.totalMeasurements).toBe(4);
    });
  });
});
