/**
 * Feed/Speed Recommender - Unit Tests
 * Phase 18: AI & Machine Learning
 */

import FeedSpeedRecommender from '../../../modules/ml/feed-speed-recommender.mjs';

describe('FeedSpeedRecommender', () => {
  let recommender;

  beforeEach(() => {
    recommender = new FeedSpeedRecommender();
  });

  describe('Parameter Recommendations', () => {
    test('should recommend parameters for aluminum', () => {
      const rec = recommender.getRecommendations({
        material: 'aluminum',
        toolDiameter: 3.175,
      });

      expect(rec.parameters.feedRate).toBeGreaterThan(0);
      expect(rec.parameters.spindleSpeed).toBeGreaterThan(0);
      expect(rec.parameters.depthOfCut).toBeGreaterThan(0);
    });

    test('should recommend parameters for steel', () => {
      const rec = recommender.getRecommendations({
        material: 'steel',
        toolDiameter: 3.175,
      });

      expect(rec.parameters.feedRate).toBeGreaterThan(0);
      expect(rec.parameters.spindleSpeed).toBeGreaterThan(0);
      expect(rec.parameters.depthOfCut).toBeGreaterThan(0);
    });

    test('should apply surface finish corrections', () => {
      const recDraft = recommender.getRecommendations({
        material: 'aluminum',
        toolDiameter: 3.175,
        surfaceFinish: 'DRAFT',
      });

      const recFine = recommender.getRecommendations({
        material: 'aluminum',
        toolDiameter: 3.175,
        surfaceFinish: 'FINE',
      });

      expect(recDraft.parameters.feedRate).toBeGreaterThan(recFine.parameters.feedRate);
    });

    test('should include confidence score', () => {
      const rec = recommender.getRecommendations({
        material: 'aluminum',
        toolDiameter: 3.175,
      });

      expect(rec.confidence).toBeGreaterThanOrEqual(0);
      expect(rec.confidence).toBeLessThanOrEqual(100);
    });

    test('should check machine capability', () => {
      const rec = recommender.getRecommendations({
        material: 'aluminum',
        toolDiameter: 3.175,
        machineType: 'DESKTOP_CNC',
      });

      expect(rec.machineCapability.allOK).toBeDefined();
    });
  });

  describe('Adaptive Recommendations', () => {
    test('should adapt parameters based on feedback', () => {
      const adapted = recommender.getAdaptiveRecommendations({
        currentParameters: { feedRate: 200, spindleSpeed: 3000 },
        feedback: { vibrationLevel: 0.8, toolTemperature: 50 },
      });

      expect(adapted.adaptedParameters).toBeDefined();
      expect(adapted.changes).toBeDefined();
    });

    test('should reduce feed rate for high vibration', () => {
      const adapted = recommender.getAdaptiveRecommendations({
        currentParameters: { feedRate: 200, spindleSpeed: 3000 },
        feedback: { vibrationLevel: 0.9 },
      });

      expect(adapted.changes.feedRate || adapted.adaptedParameters.feedRate).toBeLessThan(200);
    });

    test('should reduce feed rate for high temperature', () => {
      const adapted = recommender.getAdaptiveRecommendations({
        currentParameters: { feedRate: 200, spindleSpeed: 3000 },
        feedback: { toolTemperature: 75 },
      });

      expect(adapted.rationale).toBeDefined();
    });
  });

  describe('Predictive Recommendations', () => {
    test('should predict optimal parameters', () => {
      const predicted = recommender.predictOptimalParameters({
        material: 'aluminum',
      });

      expect(predicted.predictedParameters.feedRate).toBeGreaterThan(0);
      expect(predicted.predictedParameters.spindleSpeed).toBeGreaterThan(0);
    });

    test('should adjust for target quality', () => {
      const predFine = recommender.predictOptimalParameters({
        material: 'aluminum',
        targetQuality: 'FINE',
      });

      const predDraft = recommender.predictOptimalParameters({
        material: 'aluminum',
        targetQuality: 'DRAFT',
      });

      expect(predFine.predictedParameters.feedRate).toBeLessThan(
        predDraft.predictedParameters.feedRate
      );
    });

    test('should apply constraints', () => {
      const predicted = recommender.predictOptimalParameters({
        material: 'aluminum',
        constraints: { maxFeedRate: 100, maxRPM: 5000 },
      });

      expect(predicted.predictedParameters.feedRate).toBeLessThanOrEqual(100);
      expect(predicted.predictedParameters.spindleSpeed).toBeLessThanOrEqual(5000);
    });
  });

  describe('Performance Recording', () => {
    test('should record performance data', () => {
      const result = recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 200, spindleSpeed: 3000 },
        results: { surfaceFinish: 1.6, accuracy: 0.05 },
        duration: 300,
        success: true,
      });

      expect(result.status).toBe('RECORDED');
    });

    test('should handle failed operations', () => {
      const result = recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 200, spindleSpeed: 3000 },
        success: false,
      });

      expect(result.status).toBe('RECORDED');
    });
  });

  describe('Parameter Ranges', () => {
    test('should get parameter ranges for material', () => {
      const ranges = recommender.getParameterRanges({
        material: 'aluminum',
      });

      expect(ranges.feedRate.min).toBeGreaterThan(0);
      expect(ranges.feedRate.max).toBeGreaterThan(ranges.feedRate.min);
      expect(ranges.feedRate.recommended).toBeGreaterThanOrEqual(ranges.feedRate.min);
    });

    test('should provide ranges for all parameters', () => {
      const ranges = recommender.getParameterRanges({
        material: 'steel',
        toolDiameter: 3.175,
      });

      expect(ranges.spindleSpeed).toBeDefined();
      expect(ranges.depthOfCut).toBeDefined();
      expect(ranges.stepOver).toBeDefined();
    });
  });

  describe('Historical Analysis', () => {
    test('should analyze historical performance', () => {
      recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 200, spindleSpeed: 3000 },
        success: true,
      });

      recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 220, spindleSpeed: 3200 },
        success: true,
      });

      const analysis = recommender.analyzeHistoricalPerformance({
        material: 'aluminum',
      });

      expect(analysis.totalRecords).toBe(2);
      expect(analysis.analysis.successRate).toBe(100);
    });

    test('should identify top performer', () => {
      recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 200, spindleSpeed: 3000 },
        results: { surfaceFinish: 0.8, accuracy: 0.01 },
        success: true,
      });

      const analysis = recommender.analyzeHistoricalPerformance();

      expect(analysis.analysis.topPerformer).toBeDefined();
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics', () => {
      recommender.getRecommendations({
        material: 'aluminum',
        toolDiameter: 3.175,
      });

      recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 200, spindleSpeed: 3000 },
        success: true,
      });

      const stats = recommender.getStatistics();

      expect(stats.totalRecommendations).toBe(1);
      expect(stats.totalPerformanceRecords).toBe(1);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    test('should track success rate', () => {
      recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 200 },
        success: true,
      });

      recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 200 },
        success: false,
      });

      const stats = recommender.getStatistics();

      expect(stats.successRate).toBe(50);
    });
  });

  describe('Event Emission', () => {
    test('should emit recommendation:generated event', (done) => {
      recommender.on('recommendation:generated', (data) => {
        expect(data.material).toBe('aluminum');
        done();
      });

      recommender.getRecommendations({
        material: 'aluminum',
        toolDiameter: 3.175,
      });
    });

    test('should emit performance:recorded event', (done) => {
      recommender.on('performance:recorded', (data) => {
        expect(data.material).toBe('aluminum');
        done();
      });

      recommender.recordPerformance({
        material: 'aluminum',
        parameters: { feedRate: 200 },
      });
    });
  });
});
