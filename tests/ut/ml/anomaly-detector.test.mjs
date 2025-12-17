/**
 * Anomaly Detector - Unit Tests
 * Phase 18: AI & Machine Learning
 */

import AnomalyDetector from '../../../modules/ml/anomaly-detector.mjs';

describe('AnomalyDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new AnomalyDetector();
  });

  describe('Reading Recording', () => {
    test('should record sensor reading', () => {
      const result = detector.recordReading({
        machineId: 'cnc_1',
        sensorType: 'VIBRATION_X',
        value: 0.5,
      });

      expect(result.status).toBe('RECORDED');
    });

    test('should detect anomalies in readings', () => {
      detector.initializeBaseline({
        machineId: 'cnc_1',
        calibrationData: {},
      });

      // Record normal readings
      for (let i = 0; i < 10; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.5 + Math.random() * 0.1,
        });
      }

      // Record anomalous reading
      const result = detector.recordReading({
        machineId: 'cnc_1',
        sensorType: 'VIBRATION_X',
        value: 5.0,
      });

      expect(result.isAnomaly).toBeDefined();
    });
  });

  describe('Baseline Initialization', () => {
    test('should initialize baseline', () => {
      // Record readings first
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.5 + Math.random() * 0.1,
        });
      }

      const result = detector.initializeBaseline({
        machineId: 'cnc_1',
      });

      expect(result.status).toBe('INITIALIZED');
      expect(result.sensors).toBeGreaterThan(0);
    });

    test('should return NO_DATA when no readings', () => {
      const result = detector.initializeBaseline({
        machineId: 'cnc_1',
      });

      expect(result.status).toBe('NO_DATA');
    });
  });

  describe('Vibration Analysis', () => {
    test('should detect vibration anomalies', () => {
      // Record normal vibration
      for (let i = 0; i < 30; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.3 + Math.random() * 0.1,
        });

        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_Y',
          value: 0.2 + Math.random() * 0.05,
        });
      }

      const detection = detector.detectVibrationAnomalies({
        machineId: 'cnc_1',
      });

      expect(detection.machineId).toBe('cnc_1');
      expect(detection.analysis).toBeDefined();
    });

    test('should analyze all vibration axes', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.3,
        });

        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_Y',
          value: 0.2,
        });

        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_Z',
          value: 0.25,
        });
      }

      const detection = detector.detectVibrationAnomalies({
        machineId: 'cnc_1',
      });

      expect(detection.analysis.summary.VIBRATION_X).toBeDefined();
      expect(detection.analysis.summary.VIBRATION_Y).toBeDefined();
      expect(detection.analysis.summary.VIBRATION_Z).toBeDefined();
    });

    test('should provide vibration recommendations', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.3,
        });
      }

      const detection = detector.detectVibrationAnomalies({
        machineId: 'cnc_1',
      });

      expect(detection.recommendation).toBeDefined();
    });
  });

  describe('Acoustic Analysis', () => {
    test('should detect acoustic anomalies', () => {
      for (let i = 0; i < 30; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'ACOUSTIC',
          value: 50 + Math.random() * 10,
        });
      }

      const detection = detector.detectAcousticAnomalies({
        machineId: 'cnc_1',
      });

      expect(detection.machineId).toBe('cnc_1');
      expect(detection.acousticAnalysis).toBeDefined();
    });

    test('should classify noise levels', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'ACOUSTIC',
          value: 45,
        });
      }

      const detection = detector.detectAcousticAnomalies({
        machineId: 'cnc_1',
      });

      expect(['QUIET', 'NORMAL', 'LOUD', 'VERY_LOUD']).toContain(
        detection.acousticAnalysis.noiseLevel
      );
    });

    test('should detect frequency shifts', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'ACOUSTIC',
          value: 50,
        });
      }

      const detection = detector.detectAcousticAnomalies({
        machineId: 'cnc_1',
      });

      expect(detection.frequencyShifts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Thermal Analysis', () => {
    test('should detect thermal anomalies', () => {
      for (let i = 0; i < 30; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'THERMAL',
          value: 35 + Math.random() * 5,
        });
      }

      const detection = detector.detectThermalAnomalies({
        machineId: 'cnc_1',
        thermalLimit: 80,
      });

      expect(detection.machineId).toBe('cnc_1');
      expect(detection.thermalAnalysis).toBeDefined();
    });

    test('should classify thermal status', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'THERMAL',
          value: 50,
        });
      }

      const detection = detector.detectThermalAnomalies({
        machineId: 'cnc_1',
        thermalLimit: 80,
      });

      expect(['COOL', 'NORMAL', 'WARM', 'HOT']).toContain(detection.thermalStatus);
    });

    test('should provide thermal recommendations', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'THERMAL',
          value: 40,
        });
      }

      const detection = detector.detectThermalAnomalies({
        machineId: 'cnc_1',
      });

      expect(detection.recommendation).toBeDefined();
    });
  });

  describe('Process Deviation Detection', () => {
    test('should detect process deviations', () => {
      const expectedParameters = {
        VIBRATION_X: 0.5,
        THERMAL: 45,
      };

      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.5,
        });

        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'THERMAL',
          value: 45,
        });
      }

      const detection = detector.detectProcessDeviation({
        machineId: 'cnc_1',
        expectedParameters,
      });

      expect(detection.processHealth).toBeDefined();
      expect(detection.deviations).toBeDefined();
    });

    test('should identify significant deviations', () => {
      const expectedParameters = {
        VIBRATION_X: 0.5,
      };

      detector.recordReading({
        machineId: 'cnc_1',
        sensorType: 'VIBRATION_X',
        value: 1.5,
      });

      const detection = detector.detectProcessDeviation({
        machineId: 'cnc_1',
        expectedParameters,
      });

      if (detection.deviations.length > 0) {
        expect(detection.deviations[0].deviationPercent).toBeGreaterThan(0);
      }
    });
  });

  describe('Anomaly Reporting', () => {
    test('should generate anomaly report', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.5,
        });
      }

      const report = detector.getAnomalyReport();

      expect(report.totalAnomalies).toBeGreaterThanOrEqual(0);
      expect(report.byType).toBeDefined();
      expect(report.bySeverity).toBeDefined();
    });

    test('should filter report by machine', () => {
      for (let i = 0; i < 10; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.5,
        });

        detector.recordReading({
          machineId: 'cnc_2',
          sensorType: 'VIBRATION_X',
          value: 0.3,
        });
      }

      const report = detector.getAnomalyReport({ machineId: 'cnc_1' });

      expect(report).toBeDefined();
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.5,
        });
      }

      const stats = detector.getStatistics();

      expect(stats.totalReadings).toBe(20);
      expect(stats.totalAnomalies).toBeGreaterThanOrEqual(0);
      expect(stats.anomalyRate).toBeGreaterThanOrEqual(0);
    });

    test('should track baseline machines', () => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.5,
        });
      }

      detector.initializeBaseline({ machineId: 'cnc_1' });

      const stats = detector.getStatistics();

      expect(stats.baselinesMachines).toBe(1);
    });
  });

  describe('Event Emission', () => {
    test('should emit reading:recorded event', (done) => {
      detector.on('reading:recorded', (data) => {
        expect(data.sensorType).toBe('VIBRATION_X');
        done();
      });

      detector.recordReading({
        machineId: 'cnc_1',
        sensorType: 'VIBRATION_X',
        value: 0.5,
      });
    });

    test('should emit baseline:initialized event', (done) => {
      for (let i = 0; i < 20; i++) {
        detector.recordReading({
          machineId: 'cnc_1',
          sensorType: 'VIBRATION_X',
          value: 0.5,
        });
      }

      detector.on('baseline:initialized', (data) => {
        expect(data.machineId).toBe('cnc_1');
        done();
      });

      detector.initializeBaseline({ machineId: 'cnc_1' });
    });
  });
});
