/**
 * Failure Predictor - Unit Tests
 * Phase 18: AI & Machine Learning
 */

import FailurePredictor from '../../../modules/ml/failure-predictor.mjs';

describe('FailurePredictor', () => {
  let predictor;

  beforeEach(() => {
    predictor = new FailurePredictor();
  });

  describe('Tool Breakage Prediction', () => {
    test('should predict tool breakage', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
      });

      const prediction = predictor.predictToolBreakage({
        toolId: 'tool_1',
        currentUsageHours: 50,
        vibrationLevel: 0.5,
      });

      expect(prediction.breakageProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.breakageProbability).toBeLessThanOrEqual(100);
    });

    test('should classify risk levels', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
      });

      const prediction = predictor.predictToolBreakage({
        toolId: 'tool_1',
        vibrationLevel: 0.9,
      });

      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(prediction.riskLevel);
    });

    test('should provide recommendations based on risk', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
      });

      const prediction = predictor.predictToolBreakage({
        toolId: 'tool_1',
        vibrationLevel: 0.95,
      });

      expect(prediction.recommendation).toBeDefined();
      expect(typeof prediction.recommendation).toBe('string');
    });

    test('should include risk factors breakdown', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
      });

      const prediction = predictor.predictToolBreakage({
        toolId: 'tool_1',
      });

      expect(prediction.riskFactors).toBeDefined();
      expect(prediction.riskFactors.vibration).toBeGreaterThanOrEqual(0);
      expect(prediction.riskFactors.thermal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Spindle Fatigue Prediction', () => {
    test('should predict spindle fatigue', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        duration: 100,
      });

      const prediction = predictor.predictSpindleFatigue({
        machineId: 'cnc_1',
        spindleRPM: 10000,
        operatingHours: 500,
      });

      expect(prediction.fatiguePercentage).toBeGreaterThanOrEqual(0);
      expect(prediction.fatiguePercentage).toBeLessThanOrEqual(100);
    });

    test('should classify fatigue levels', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        duration: 100,
      });

      const prediction = predictor.predictSpindleFatigue({
        machineId: 'cnc_1',
        operatingHours: 1500,
      });

      expect(['HEALTHY', 'AGING', 'FATIGUED', 'CRITICAL']).toContain(prediction.fatigueLevel);
    });

    test('should recommend maintenance schedule', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        duration: 100,
      });

      const prediction = predictor.predictSpindleFatigue({
        machineId: 'cnc_1',
      });

      expect(prediction.maintenanceSchedule).toBeDefined();
    });

    test('should estimate bearing life', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        duration: 100,
      });

      const prediction = predictor.predictSpindleFatigue({
        machineId: 'cnc_1',
      });

      expect(prediction.estimatedBearingLife).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Surface Degradation Prediction', () => {
    test('should predict surface finish degradation', () => {
      const prediction = predictor.predictSurfaceDegradation({
        material: 'aluminum',
        toolType: 'End Mill',
        currentUsagePercent: 50,
        lastSurfaceFinish: 1.6,
      });

      expect(prediction.estimatedSurfaceFinish).toBeGreaterThanOrEqual(
        prediction.currentSurfaceFinish
      );
    });

    test('should classify degradation levels', () => {
      const prediction = predictor.predictSurfaceDegradation({
        material: 'aluminum',
        toolType: 'End Mill',
        currentUsagePercent: 80,
        lastSurfaceFinish: 1.6,
      });

      expect(['MINIMAL', 'MODERATE', 'SIGNIFICANT', 'SEVERE']).toContain(
        prediction.degradationLevel
      );
    });

    test('should identify intervention need', () => {
      const prediction = predictor.predictSurfaceDegradation({
        material: 'aluminum',
        toolType: 'End Mill',
        currentUsagePercent: 90,
        lastSurfaceFinish: 1.6,
      });

      expect(typeof prediction.interventionNeeded).toBe('boolean');
    });

    test('should show contributing factors', () => {
      const prediction = predictor.predictSurfaceDegradation({
        material: 'aluminum',
        toolType: 'End Mill',
        currentUsagePercent: 50,
        feedRate: 100,
        depthOfCut: 2,
        lastSurfaceFinish: 1.6,
      });

      expect(prediction.contributingFactors).toBeDefined();
      expect(prediction.contributingFactors.toolWear).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Component Wear Prediction', () => {
    test('should predict component wear', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        component: 'SPINDLE_BEARING',
        duration: 100,
      });

      const prediction = predictor.predictComponentWear({
        machineId: 'cnc_1',
        component: 'SPINDLE_BEARING',
        operatingHours: 500,
      });

      expect(prediction.wearPercentage).toBeGreaterThanOrEqual(0);
      expect(prediction.wearPercentage).toBeLessThanOrEqual(100);
    });

    test('should classify wear levels', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        component: 'BALLSCREW',
        duration: 100,
      });

      const prediction = predictor.predictComponentWear({
        machineId: 'cnc_1',
        component: 'BALLSCREW',
        operatingHours: 1000,
      });

      expect(['GOOD', 'FAIR', 'WORN', 'CRITICAL']).toContain(prediction.wearLevel);
    });

    test('should estimate remaining life', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        component: 'SERVO_MOTOR',
        duration: 100,
      });

      const prediction = predictor.predictComponentWear({
        machineId: 'cnc_1',
        component: 'SERVO_MOTOR',
        operatingHours: 500,
      });

      expect(prediction.remainingLife).toBeGreaterThanOrEqual(0);
    });

    test('should recommend maintenance', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        component: 'LEADSCREW',
        duration: 100,
      });

      const prediction = predictor.predictComponentWear({
        machineId: 'cnc_1',
        component: 'LEADSCREW',
      });

      expect(prediction.maintenanceInterval).toBeDefined();
    });
  });

  describe('Operation Recording', () => {
    test('should record operation', () => {
      const result = predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
      });

      expect(result.status).toBe('RECORDED');
    });

    test('should record operation with metrics', () => {
      const result = predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
        metrics: { vibration: 0.5, temperature: 45 },
      });

      expect(result.status).toBe('RECORDED');
    });
  });

  describe('Failure Recording', () => {
    test('should record actual failure', () => {
      const failureId = predictor.recordFailure({
        failureType: 'TOOL_BREAKAGE',
        toolId: 'tool_1',
        description: 'Tool broke during cut',
      });

      expect(typeof failureId).toBe('string');
    });

    test('should classify failure severity', () => {
      predictor.recordFailure({
        failureType: 'SPINDLE_BEARING',
        severity: 'CRITICAL',
      });

      const summary = predictor.getFailureSummary();

      expect(summary.recordedFailures).toBeGreaterThan(0);
    });
  });

  describe('Failure Summary', () => {
    test('should generate failure summary', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
      });

      const summary = predictor.getFailureSummary();

      expect(summary.totalPredictions).toBeGreaterThanOrEqual(0);
      expect(summary.recordedFailures).toBeGreaterThanOrEqual(0);
    });

    test('should count failures by type', () => {
      predictor.recordFailure({
        failureType: 'TOOL_BREAKAGE',
        toolId: 'tool_1',
      });

      predictor.recordFailure({
        failureType: 'TOOL_BREAKAGE',
        toolId: 'tool_2',
      });

      predictor.recordFailure({
        failureType: 'SPINDLE_BEARING',
        machineId: 'cnc_1',
      });

      const summary = predictor.getFailureSummary();

      expect(summary.failuresByType.TOOL_BREAKAGE).toBe(2);
      expect(summary.failuresByType.SPINDLE_BEARING).toBe(1);
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics', () => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
      });

      const stats = predictor.getStatistics();

      expect(stats.totalPredictions).toBeGreaterThanOrEqual(0);
      expect(stats.operationRecords).toBe(1);
    });

    test('should track recorded failures', () => {
      predictor.recordFailure({
        failureType: 'TOOL_BREAKAGE',
        toolId: 'tool_1',
      });

      const stats = predictor.getStatistics();

      expect(stats.recordedFailures).toBe(1);
    });
  });

  describe('Event Emission', () => {
    test('should emit failure:predicted event', (done) => {
      predictor.recordOperation({
        machineId: 'cnc_1',
        toolId: 'tool_1',
        duration: 100,
      });

      predictor.on('failure:predicted', (data) => {
        expect(data.toolId).toBe('tool_1');
        done();
      });

      predictor.predictToolBreakage({
        toolId: 'tool_1',
      });
    });

    test('should emit failure:recorded event', (done) => {
      predictor.on('failure:recorded', (data) => {
        expect(data.failureType).toBe('TOOL_BREAKAGE');
        done();
      });

      predictor.recordFailure({
        failureType: 'TOOL_BREAKAGE',
        toolId: 'tool_1',
      });
    });
  });
});
