import { LiveMachineMetricsAggregator } from '../../../modules/hardware/machine-metrics-aggregator.mjs';

describe('LiveMachineMetricsAggregator', () => {
  let aggregator;

  beforeEach(() => {
    aggregator = new LiveMachineMetricsAggregator();
  });

  // ===== Spindle Metrics Tests =====
  describe('Spindle Metrics', () => {
    test('should record spindle metrics', () => {
      const metrics = aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 75,
        current: 25,
        temperature: 45,
      });

      expect(metrics).not.toBeNull();
      expect(metrics.speed).toBe(5000);
      expect(metrics.load).toBe(75);
      expect(metrics.temperature).toBe(45);
    });

    test('should throw without speed', () => {
      expect(() =>
        aggregator.recordSpindleMetrics({
          load: 75,
        })
      ).toThrow();
    });

    test('should calculate power consumption', () => {
      const metrics = aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
        power: 1000,
      });

      expect(metrics.powerConsumption).toBeGreaterThan(0);
    });

    test('should emit spindle metrics recorded event', (done) => {
      aggregator.on('spindleMetricsRecorded', (data) => {
        expect(data.speed).toBe(5000);
        done();
      });

      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });
    });

    test('should detect thermal warning', (done) => {
      aggregator.on('thermalWarning', (data) => {
        expect(data.component).toBe('spindle');
        done();
      });

      aggregator.recordSpindleMetrics({
        speed: 5000,
        temperature: 65,
      });
    });

    test('should detect thermal critical', (done) => {
      aggregator.on('thermalCritical', (data) => {
        expect(data.component).toBe('spindle');
        done();
      });

      aggregator.recordSpindleMetrics({
        speed: 5000,
        temperature: 85,
      });
    });
  });

  // ===== Feed Metrics Tests =====
  describe('Feed Metrics', () => {
    test('should record feed metrics', () => {
      const metrics = aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 98,
      });

      expect(metrics).not.toBeNull();
      expect(metrics.commandedRate).toBe(100);
      expect(metrics.actualRate).toBe(98);
    });

    test('should throw without commanded feed', () => {
      expect(() =>
        aggregator.recordFeedMetrics({
          actual: 98,
        })
      ).toThrow();
    });

    test('should calculate feed error percentage', () => {
      const metrics = aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 80,
      });

      expect(metrics.feedError).toBeCloseTo(20, 1);
    });

    test('should emit feed metrics recorded event', (done) => {
      aggregator.on('feedMetricsRecorded', (data) => {
        expect(data.commandedRate).toBe(100);
        done();
      });

      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 100,
      });
    });

    test('should detect feed rate deviation', (done) => {
      aggregator.on('feedRateDeviation', (data) => {
        expect(data.deviation).toBeGreaterThan(10);
        done();
      });

      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 85,
      });
    });

    test('should track feed hold status', () => {
      const metrics = aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 100,
        feedHoldActive: true,
      });

      expect(metrics.feedHoldActive).toBe(true);
    });
  });

  // ===== Thermal Metrics Tests =====
  describe('Thermal Metrics', () => {
    test('should record thermal metrics', () => {
      const metrics = aggregator.recordThermalMetrics({
        spindleTemp: 50,
        motorTemp: 45,
        driveTemp: 40,
        cuttingZoneTemp: 55,
      });

      expect(metrics).not.toBeNull();
      expect(metrics.spindleTemp).toBe(50);
      expect(metrics.motorTemp).toBe(45);
    });

    test('should set ambient temperature default', () => {
      const metrics = aggregator.recordThermalMetrics({
        spindleTemp: 50,
      });

      expect(metrics.ambientTemp).toBe(20);
    });

    test('should emit thermal metrics recorded event', (done) => {
      aggregator.on('thermalMetricsRecorded', (data) => {
        expect(data.spindleTemp).toBe(50);
        done();
      });

      aggregator.recordThermalMetrics({
        spindleTemp: 50,
      });
    });

    test('should detect thermal warnings for each component', () => {
      let warningEmitted = false;

      aggregator.on('thermalWarning', () => {
        warningEmitted = true;
      });

      aggregator.recordThermalMetrics({
        spindleTemp: 65,
        motorTemp: 50,
      });

      expect(warningEmitted).toBe(true);
    });

    test('should track cooling flow rate', () => {
      const metrics = aggregator.recordThermalMetrics({
        spindleTemp: 50,
        coolingFlowRate: 15.5,
      });

      expect(metrics.coolingFlowRate).toBe(15.5);
    });
  });

  // ===== Vibration Metrics Tests =====
  describe('Vibration Metrics', () => {
    test('should record vibration metrics', () => {
      const metrics = aggregator.recordVibrationMetrics({
        xAcceleration: 1.0,
        yAcceleration: 1.2,
        zAcceleration: 0.8,
      });

      expect(metrics).not.toBeNull();
      expect(metrics.xAcceleration).toBe(1.0);
      expect(metrics.yAcceleration).toBe(1.2);
    });

    test('should calculate combined acceleration', () => {
      const metrics = aggregator.recordVibrationMetrics({
        xAcceleration: 3,
        yAcceleration: 4,
        zAcceleration: 0,
      });

      expect(metrics.combinedAcceleration).toBe(5); // 3-4-5 triangle
    });

    test('should emit vibration metrics recorded event', (done) => {
      aggregator.on('vibrationMetricsRecorded', (data) => {
        expect(data.xAcceleration).toBe(1.0);
        done();
      });

      aggregator.recordVibrationMetrics({
        xAcceleration: 1.0,
      });
    });

    test('should detect vibration warnings', (done) => {
      aggregator.on('vibrationWarning', (data) => {
        expect(data.acceleration).toBeGreaterThan(5.0);
        done();
      });

      aggregator.recordVibrationMetrics({
        xAcceleration: 4,
        yAcceleration: 3,
        zAcceleration: 1,
      });
    });

    test('should track frequency and amplitude', () => {
      const metrics = aggregator.recordVibrationMetrics({
        xAcceleration: 1.0,
        frequency: 2500,
        amplitude: 0.5,
      });

      expect(metrics.frequency).toBe(2500);
      expect(metrics.amplitude).toBe(0.5);
    });
  });

  // ===== Power Metrics Tests =====
  describe('Power Metrics', () => {
    test('should record power metrics', () => {
      const metrics = aggregator.recordPowerMetrics({
        mainSupply: 2000,
        spindlePower: 1000,
        servosPower: 500,
        coolingPower: 200,
      });

      expect(metrics).not.toBeNull();
      expect(metrics.mainSupply).toBe(2000);
    });

    test('should calculate total power', () => {
      const metrics = aggregator.recordPowerMetrics({
        mainSupply: 2000,
        spindlePower: 1000,
        servosPower: 500,
        coolingPower: 200,
      });

      expect(metrics.totalPower).toBe(3700);
    });

    test('should emit power metrics recorded event', (done) => {
      aggregator.on('powerMetricsRecorded', (data) => {
        expect(data.mainSupply).toBe(2000);
        done();
      });

      aggregator.recordPowerMetrics({
        mainSupply: 2000,
      });
    });

    test('should detect power spikes', (done) => {
      aggregator.on('powerSpike', (data) => {
        expect(data.power).toBeGreaterThan(5000);
        done();
      });

      aggregator.recordPowerMetrics({
        mainSupply: 3000,
        spindlePower: 2500,
      });
    });

    test('should track efficiency', () => {
      const metrics = aggregator.recordPowerMetrics({
        mainSupply: 2000,
        efficiency: 0.92,
      });

      expect(metrics.efficiency).toBe(0.92);
    });
  });

  // ===== Metrics Calculation Tests =====
  describe('Metrics Aggregation', () => {
    test('should calculate spindle aggregates', () => {
      for (let i = 0; i < 5; i++) {
        aggregator.recordSpindleMetrics({
          speed: 5000 + i * 100,
          load: 50 + i * 5,
        });
      }

      const aggregate = aggregator.calculateAggregates('spindle');
      expect(aggregate.sampleCount).toBe(5);
      expect(aggregate.values.speed).toBeDefined();
      expect(aggregate.values.speed.min).toBeDefined();
      expect(aggregate.values.speed.max).toBeDefined();
      expect(aggregate.values.speed.avg).toBeDefined();
    });

    test('should return null for empty metric type', () => {
      const aggregate = aggregator.calculateAggregates('nonexistent');
      expect(aggregate).toBeNull();
    });

    test('should calculate standard deviation', () => {
      aggregator.recordSpindleMetrics({
        speed: 4800,
        load: 45,
      });
      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });
      aggregator.recordSpindleMetrics({
        speed: 5200,
        load: 55,
      });

      const aggregate = aggregator.calculateAggregates('spindle');
      expect(aggregate.values.speed.stdDev).toBeGreaterThan(0);
    });
  });

  // ===== Get Metric Data Tests =====
  describe('Get Metric Data', () => {
    test('should get metric data', () => {
      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });
      aggregator.recordSpindleMetrics({
        speed: 5100,
        load: 52,
      });

      const data = aggregator.getMetricData('spindle');
      expect(data.length).toBe(2);
    });

    test('should limit metric data', () => {
      for (let i = 0; i < 10; i++) {
        aggregator.recordSpindleMetrics({
          speed: 5000 + i * 100,
          load: 50 + i * 2,
        });
      }

      const data = aggregator.getMetricData('spindle', 3);
      expect(data.length).toBe(3);
    });

    test('should return empty for non-existent metric type', () => {
      const data = aggregator.getMetricData('nonexistent');
      expect(data.length).toBe(0);
    });
  });

  // ===== Dashboard State Tests =====
  describe('Dashboard State', () => {
    test('should provide dashboard state', () => {
      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });
      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 98,
      });

      const state = aggregator.getDashboardState();
      expect(state.timestamp).toBeDefined();
      expect(state.spindle).toBeDefined();
      expect(state.feed).toBeDefined();
    });

    test('should include all metric types in dashboard', () => {
      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });
      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 98,
      });
      aggregator.recordThermalMetrics({
        spindleTemp: 50,
      });
      aggregator.recordVibrationMetrics({
        xAcceleration: 1.0,
      });
      aggregator.recordPowerMetrics({
        mainSupply: 2000,
      });

      const state = aggregator.getDashboardState();
      expect(state.spindle).not.toBeNull();
      expect(state.feed).not.toBeNull();
      expect(state.thermal).not.toBeNull();
      expect(state.vibration).not.toBeNull();
      expect(state.power).not.toBeNull();
    });
  });

  // ===== Statistics Tests =====
  describe('System Statistics', () => {
    test('should provide statistics', () => {
      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });

      const stats = aggregator.getStatistics();
      expect(stats.metricsCollected).toBeGreaterThan(0);
      expect(stats.thermalAlerts).toBe(0);
      expect(stats.powerSpikes).toBe(0);
    });

    test('should track thermal alerts', () => {
      aggregator.recordSpindleMetrics({
        speed: 5000,
        temperature: 85,
      });

      const stats = aggregator.getStatistics();
      expect(stats.thermalAlerts).toBeGreaterThan(0);
    });

    test('should track power spikes', () => {
      aggregator.recordPowerMetrics({
        mainSupply: 3000,
        spindlePower: 2500,
      });

      const stats = aggregator.getStatistics();
      expect(stats.powerSpikes).toBeGreaterThan(0);
    });

    test('should track active metric types', () => {
      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });
      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 98,
      });

      const stats = aggregator.getStatistics();
      expect(stats.activeMetricTypes).toBe(2);
    });
  });

  // ===== Buffer Management Tests =====
  describe('Buffer Management', () => {
    test('should enforce buffer size limit', () => {
      const limited = new LiveMachineMetricsAggregator({
        metricsBufferSize: 5,
      });

      for (let i = 0; i < 10; i++) {
        limited.recordSpindleMetrics({
          speed: 5000 + i * 100,
          load: 50 + i * 2,
        });
      }

      const data = limited.getMetricData('spindle');
      expect(data.length).toBeLessThanOrEqual(5);
    });

    test('should reset metrics', () => {
      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });

      let resetEmitted = false;
      aggregator.on('metricsReset', () => {
        resetEmitted = true;
      });

      aggregator.resetMetrics();
      const data = aggregator.getMetricData('spindle');
      expect(data.length).toBe(0);
      expect(resetEmitted).toBe(true);
    });
  });

  // ===== Edge Cases =====
  describe('Edge Cases', () => {
    test('should handle zero spindle load', () => {
      const metrics = aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 0,
      });

      expect(metrics.load).toBe(0);
    });

    test('should handle rapid metrics recording', () => {
      for (let i = 0; i < 100; i++) {
        aggregator.recordSpindleMetrics({
          speed: 5000 + Math.random() * 100,
          load: 50 + Math.random() * 20,
        });
      }

      const stats = aggregator.getStatistics();
      expect(stats.metricsCollected).toBeGreaterThanOrEqual(100);
    });

    test('should handle negative ambient temperature', () => {
      const metrics = aggregator.recordThermalMetrics({
        spindleTemp: 50,
        ambientTemp: -10,
      });

      expect(metrics.ambientTemp).toBe(-10);
    });

    test('should handle zero combined acceleration', () => {
      const metrics = aggregator.recordVibrationMetrics({
        xAcceleration: 0,
        yAcceleration: 0,
        zAcceleration: 0,
      });

      expect(metrics.combinedAcceleration).toBe(0);
    });
  });

  // ===== Multiple Metric Types Tests =====
  describe('Multiple Metric Types', () => {
    test('should track multiple metric types independently', () => {
      aggregator.recordSpindleMetrics({
        speed: 5000,
        load: 50,
      });
      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 98,
      });

      const spindle = aggregator.getMetricData('spindle');
      const feed = aggregator.getMetricData('feed');

      expect(spindle.length).toBe(1);
      expect(feed.length).toBe(1);
      expect(spindle[0].speed).toBe(5000);
      expect(feed[0].commandedRate).toBe(100);
    });
  });

  // ===== Aggregate Calculations Tests =====
  describe('Aggregate Calculations', () => {
    test('should calculate min/max/avg for feed metrics', () => {
      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 90,
      });
      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 95,
      });
      aggregator.recordFeedMetrics({
        commanded: 100,
        actual: 100,
      });

      const aggregate = aggregator.calculateAggregates('feed');
      expect(aggregate.values.actualRate.min).toBe(90);
      expect(aggregate.values.actualRate.max).toBe(100);
      expect(aggregate.values.actualRate.avg).toBeCloseTo(95, 0);
    });

    test('should calculate latest value in aggregates', () => {
      aggregator.recordSpindleMetrics({
        speed: 4800,
        load: 45,
      });
      aggregator.recordSpindleMetrics({
        speed: 5200,
        load: 55,
      });

      const aggregate = aggregator.calculateAggregates('spindle');
      expect(aggregate.values.speed.latest).toBe(5200);
    });
  });
});
