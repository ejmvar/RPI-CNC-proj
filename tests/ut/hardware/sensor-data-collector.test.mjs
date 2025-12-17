import { SensorDataCollector } from '../../../modules/hardware/sensor-data-collector.mjs';

describe('SensorDataCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new SensorDataCollector();
  });

  // ===== Sensor Registration Tests =====
  describe('Sensor Registration', () => {
    test('should register a sensor', () => {
      const result = collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });
      expect(result).toBe(true);
      expect(collector.sensors.size).toBe(1);
    });

    test('should throw on invalid registration', () => {
      expect(() => collector.registerSensor('', {})).toThrow();
    });

    test('should throw on duplicate sensor', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
      });
      expect(() =>
        collector.registerSensor('temp-1', {
          type: 'temperature',
          unit: '°C',
        })
      ).toThrow();
    });

    test('should register multiple sensors', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
      });
      collector.registerSensor('pressure-1', {
        type: 'pressure',
        unit: 'PSI',
      });
      expect(collector.sensors.size).toBe(2);
    });
  });

  // ===== Calibration Tests =====
  describe('Sensor Calibration', () => {
    beforeEach(() => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: 0,
        maxValue: 100,
      });
    });

    test('should calibrate sensor', () => {
      collector.calibrateSensor('temp-1', 2.5, 1.1);
      const calib = collector.calibrations.get('temp-1');
      expect(calib.offset).toBe(2.5);
      expect(calib.scale).toBe(1.1);
    });

    test('should throw on invalid calibration params', () => {
      expect(() => collector.calibrateSensor('temp-1', 'invalid', 1.0)).toThrow();
    });

    test('should emit calibration event', (done) => {
      collector.on('sensorCalibrated', (data) => {
        expect(data.sensorId).toBe('temp-1');
        expect(data.offset).toBe(0);
        expect(data.scale).toBe(1.0);
        done();
      });
      collector.calibrateSensor('temp-1', 0, 1.0);
    });
  });

  // ===== Sample Recording Tests =====
  describe('Sample Recording', () => {
    beforeEach(() => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });
    });

    test('should record a sample', () => {
      const sample = collector.recordSample('temp-1', 25.5);
      expect(sample).not.toBeNull();
      expect(sample.calibratedValue).toBe(25.5);
    });

    test('should throw on invalid sensor', () => {
      expect(() => collector.recordSample('invalid', 25.5)).toThrow();
    });

    test('should throw on out-of-bounds value', () => {
      expect(() => collector.recordSample('temp-1', 150)).toThrow();
    });

    test('should detect and reject outliers', () => {
      // Record normal values
      collector.recordSample('temp-1', 25.0);
      collector.recordSample('temp-1', 25.1);
      collector.recordSample('temp-1', 25.2);

      let outlierDetected = false;
      collector.on('outlierDetected', () => {
        outlierDetected = true;
      });

      // Try to record outlier
      const result = collector.recordSample('temp-1', 50.0);

      // Result should be null (outlier rejected)
      expect(result).toBeNull();
      expect(outlierDetected).toBe(true);
    });

    test('should apply moving average filter', () => {
      const options = new SensorDataCollector({
        enableFiltering: true,
        filterType: 'moving-average',
        filterWindow: 3,
      });
      options.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });

      options.recordSample('temp-1', 20);
      options.recordSample('temp-1', 30);
      const sample = options.recordSample('temp-1', 40);

      expect(sample.filteredValue).toBe(30); // (20+30+40)/3
    });

    test('should apply low-pass filter', () => {
      const options = new SensorDataCollector({
        enableFiltering: true,
        filterType: 'low-pass',
      });
      options.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });

      options.recordSample('temp-1', 20);
      const sample = options.recordSample('temp-1', 40);

      // Alpha = 0.3, filtered = 0.3 * 40 + 0.7 * 20 = 26
      expect(sample.filteredValue).toBeCloseTo(26, 1);
    });

    test('should emit sampleRecorded event', (done) => {
      collector.on('sampleRecorded', (data) => {
        expect(data.sensorId).toBe('temp-1');
        expect(data.calibratedValue).toBe(25);
        done();
      });
      collector.recordSample('temp-1', 25);
    });
  });

  // ===== Subscription Tests =====
  describe('Subscriptions', () => {
    beforeEach(() => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });
    });

    test('should subscribe to sensor updates', (done) => {
      collector.subscribe('temp-1', (sample) => {
        expect(sample.sensorId).toBe('temp-1');
        done();
      });
      collector.recordSample('temp-1', 25);
    });

    test('should notify all subscriptions', () => {
      let count = 0;
      collector.subscribe('temp-1', () => count++);
      collector.subscribe('temp-1', () => count++);

      collector.recordSample('temp-1', 25);
      expect(count).toBe(2);
    });

    test('should unsubscribe', () => {
      let count = 0;
      const unsubscribe = collector.subscribe('temp-1', () => {
        count++;
      });

      collector.recordSample('temp-1', 25);
      expect(count).toBe(1);

      unsubscribe();
      collector.recordSample('temp-1', 26);
      expect(count).toBe(1);
    });
  });

  // ===== Buffer Tests =====
  describe('Data Buffering', () => {
    beforeEach(() => {
      collector = new SensorDataCollector({
        bufferSize: 5,
      });
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });
    });

    test('should maintain buffer size', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordSample('temp-1', 20 + i);
      }
      const buffer = collector.getBuffer('temp-1');
      expect(buffer.length).toBe(5);
    });

    test('should get last N samples', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordSample('temp-1', 20 + i);
      }
      const buffer = collector.getBuffer('temp-1', 3);
      expect(buffer.length).toBe(3);
    });

    test('should get all buffer data', () => {
      for (let i = 0; i < 3; i++) {
        collector.recordSample('temp-1', 20 + i);
      }
      const buffer = collector.getBuffer('temp-1');
      expect(buffer.length).toBe(3);
    });
  });

  // ===== Statistics Tests =====
  describe('Sensor Statistics', () => {
    beforeEach(() => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });
    });

    test('should calculate statistics', () => {
      const values = [20, 25, 30, 25, 20];
      values.forEach((v) => collector.recordSample('temp-1', v));

      const stats = collector.getSensorStatistics('temp-1');
      expect(stats.count).toBe(5);
      expect(stats.min).toBe(20);
      expect(stats.max).toBe(30);
      expect(stats.mean).toBe(24);
    });

    test('should handle empty buffer', () => {
      const stats = collector.getSensorStatistics('temp-1');
      expect(stats).toBeNull();
    });

    test('should calculate standard deviation', () => {
      [10, 20, 30].forEach((v) => collector.recordSample('temp-1', v));

      const stats = collector.getSensorStatistics('temp-1');
      expect(stats.stdDev).toBeGreaterThan(0);
    });
  });

  // ===== Streaming Tests =====
  describe('Streaming Mode', () => {
    test('should start and stop streaming', () => {
      let started = false,
        stopped = false;

      collector.on('streamingStarted', () => {
        started = true;
      });
      collector.on('streamingStopped', () => {
        stopped = true;
      });

      collector.startStreaming();
      expect(collector.streaming).toBe(true);
      expect(started).toBe(true);

      collector.stopStreaming();
      expect(collector.streaming).toBe(false);
      expect(stopped).toBe(true);
    });
  });

  // ===== Statistics Tests =====
  describe('Collector Statistics', () => {
    test('should track samples collected', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });

      collector.recordSample('temp-1', 25);
      collector.recordSample('temp-1', 26);

      const stats = collector.getStatistics();
      expect(stats.samplesCollected).toBe(2);
    });

    test('should track outliers rejected', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });

      collector.recordSample('temp-1', 25);
      collector.recordSample('temp-1', 26);
      collector.recordSample('temp-1', 25);
      collector.recordSample('temp-1', 80); // Outlier

      const stats = collector.getStatistics();
      expect(stats.outliersRejected).toBeGreaterThan(0);
    });

    test('should provide collector overview', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
      });

      const stats = collector.getStatistics();
      expect(stats.registeredSensors).toBe(1);
      expect(stats.activeSensors).toBe(1);
      expect(stats.timestamp).toBeDefined();
    });
  });

  // ===== Edge Cases =====
  describe('Edge Cases', () => {
    test('should handle zero calibration scale', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });

      expect(() => collector.calibrateSensor('temp-1', 0, 0)).not.toThrow();
    });

    test('should handle rapid sample recording', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -100,
        maxValue: 1000,
      });

      for (let i = 0; i < 100; i++) {
        collector.recordSample('temp-1', Math.random() * 100);
      }

      const buffer = collector.getBuffer('temp-1');
      expect(buffer.length).toBeLessThanOrEqual(300);
    });

    test('should clear buffers correctly', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });

      collector.recordSample('temp-1', 25);
      collector.recordSample('temp-1', 26);

      let cleared = false;
      collector.on('buffersCleared', () => {
        cleared = true;
      });

      collector.clearBuffers();
      expect(collector.getBuffer('temp-1').length).toBe(0);
      expect(cleared).toBe(true);
    });
  });

  // ===== Get Sensors Tests =====
  describe('Get Sensors', () => {
    test('should return all registered sensors', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
      });
      collector.registerSensor('pressure-1', {
        type: 'pressure',
        unit: 'PSI',
      });

      const sensors = collector.getSensors();
      expect(sensors.length).toBe(2);
      expect(sensors[0].id).toBe('temp-1');
      expect(sensors[1].id).toBe('pressure-1');
    });
  });

  // ===== Event Error Handling =====
  describe('Event Error Handling', () => {
    test('should emit subscription error', () => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });

      let errorEmitted = false;
      collector.on('subscriptionError', () => {
        errorEmitted = true;
      });

      // Add subscription that throws
      collector.subscribe('temp-1', () => {
        throw new Error('Test error');
      });

      collector.recordSample('temp-1', 25);
      expect(errorEmitted).toBe(true);
    });
  });

  // ===== Disable Outlier Detection =====
  describe('Disable Outlier Detection', () => {
    test('should record outliers when detection disabled', () => {
      const noOutlier = new SensorDataCollector({
        enableOutlierDetection: false,
      });
      noOutlier.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -100,
        maxValue: 1000,
      });

      noOutlier.recordSample('temp-1', 25);
      noOutlier.recordSample('temp-1', 26);
      const outlier = noOutlier.recordSample('temp-1', 100);

      expect(outlier).not.toBeNull();
      expect(outlier.calibratedValue).toBe(100);
    });
  });

  // ===== Sensor Reading Tests =====
  describe('Get Sensor Reading', () => {
    beforeEach(() => {
      collector.registerSensor('temp-1', {
        type: 'temperature',
        unit: '°C',
        minValue: -10,
        maxValue: 100,
      });
    });

    test('should get latest sensor reading', () => {
      collector.recordSample('temp-1', 25);
      const reading = collector.getSensorReading('temp-1');
      expect(reading).toBe(25);
    });

    test('should return null for no reading', () => {
      const reading = collector.getSensorReading('temp-1');
      expect(reading).toBeNull();
    });
  });
});
