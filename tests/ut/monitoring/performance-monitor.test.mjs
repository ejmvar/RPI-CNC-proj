import { PerformanceMonitor } from '../../../modules/monitoring/performance-monitor.mjs';

describe('PerformanceMonitor', () => {
  let monitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      metricsInterval: 100,
      historySize: 100,
      alertThresholds: {
        cpu_usage: { warning: 80, critical: 95 },
        spindle_load: { warning: 85, critical: 95 },
        temperature: { warning: 70, critical: 85 },
      },
    });
  });

  test('should initialize with default options', () => {
    const stats = monitor.getStatistics();
    expect(stats.isMonitoring).toBe(false);
    expect(stats.metricsCount).toBe(0);
    expect(stats.activeAlerts).toBe(0);
  });

  test('should start monitoring', (done) => {
    let monitoringStarted = false;
    monitor.on('monitoringStarted', () => {
      monitoringStarted = true;
    });

    monitor.startMonitoring();
    expect(monitor.getStatistics().isMonitoring).toBe(true);

    setTimeout(() => {
      expect(monitoringStarted).toBe(true);
      monitor.stopMonitoring();
      done();
    }, 150);
  });

  test('should record metrics', () => {
    monitor.recordMetric('cpu_usage', 45.5);
    const metric = monitor.getMetric('cpu_usage');
    expect(metric).not.toBeNull();
    expect(metric.aggregates.latest).toBe(45.5);
  });

  test('should calculate aggregates correctly', () => {
    monitor.recordMetric('memory_usage', 30);
    monitor.recordMetric('memory_usage', 40);
    monitor.recordMetric('memory_usage', 50);

    const metric = monitor.getMetric('memory_usage');
    expect(metric.aggregates.min).toBe(30);
    expect(metric.aggregates.max).toBe(50);
    expect(metric.aggregates.avg).toBe(40);
    expect(metric.aggregates.count).toBe(3);
  });

  test('should trigger warning alert', (done) => {
    let alertTriggered = false;
    monitor.on('alertTriggered', (alert) => {
      alertTriggered = true;
      expect(alert.severity).toBe('WARNING');
    });

    monitor.recordMetric('cpu_usage', 85);

    setTimeout(() => {
      expect(alertTriggered).toBe(true);
      done();
    }, 100);
  });

  test('should trigger critical alert', (done) => {
    let alertTriggered = false;
    let criticality = '';

    monitor.on('alertTriggered', (alert) => {
      alertTriggered = true;
      criticality = alert.severity;
    });

    monitor.recordMetric('cpu_usage', 97);

    setTimeout(() => {
      expect(alertTriggered).toBe(true);
      expect(criticality).toBe('CRITICAL');
      done();
    }, 100);
  });

  test('should set baseline for comparison', () => {
    monitor.setBaseline({
      cpu_usage: 50,
      memory_usage: 40,
    });

    monitor.recordMetric('cpu_usage', 60);
    const comparison = monitor.compareToBaseline('cpu_usage');

    expect(comparison).not.toBeNull();
    expect(comparison.baseline).toBe(50);
    expect(comparison.isAboveBaseline).toBe(true);
  });

  test('should track metric history', () => {
    for (let i = 0; i < 10; i++) {
      monitor.recordMetric('feed_rate_stability', 90 + Math.random() * 5);
    }

    const metric = monitor.getMetric('feed_rate_stability');
    expect(metric.values.length).toBe(10);
    expect(metric.timestamps.length).toBe(10);
  });

  test('should limit history to historySize', () => {
    const options = { historySize: 5 };
    const m = new PerformanceMonitor(options);

    for (let i = 0; i < 10; i++) {
      m.recordMetric('test_metric', i);
    }

    const metric = m.getMetric('test_metric');
    expect(metric.values.length).toEqual(5);
  });

  test('should get active alerts', (done) => {
    monitor.recordMetric('cpu_usage', 90);
    monitor.recordMetric('spindle_load', 90);

    setTimeout(() => {
      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      done();
    }, 100);
  });

  test('should filter alerts by severity', (done) => {
    monitor.recordMetric('cpu_usage', 97); // critical

    setTimeout(() => {
      const criticalAlerts = monitor.getAlerts({ severity: 'CRITICAL' });
      expect(criticalAlerts.length).toBeGreaterThan(0);
      done();
    }, 100);
  });

  test('should resolve alerts', (done) => {
    let alertResolved = false;
    monitor.on('alertResolved', () => {
      alertResolved = true;
    });

    monitor.recordMetric('cpu_usage', 90);

    setTimeout(() => {
      const alerts = monitor.getAlerts();
      if (alerts.length > 0) {
        monitor.resolveAlert(alerts[0].id);
        expect(alertResolved).toBe(true);
      }
      done();
    }, 100);
  });

  test('should maintain alert history', (done) => {
    monitor.recordMetric('cpu_usage', 90);

    setTimeout(() => {
      const history = monitor.getAlertHistory();
      expect(history.length).toBeGreaterThan(0);
      done();
    }, 100);
  });

  test('should emit metric recorded event', (done) => {
    let eventEmitted = false;
    let receivedValue = null;

    monitor.on('metricRecorded', (data) => {
      eventEmitted = true;
      receivedValue = data.value;
    });

    monitor.recordMetric('test', 42);

    setTimeout(() => {
      expect(eventEmitted).toBe(true);
      expect(receivedValue).toBe(42);
      done();
    }, 100);
  });

  test('should get statistics', () => {
    monitor.recordMetric('cpu_usage', 50);
    monitor.recordMetric('memory_usage', 40);

    const stats = monitor.getStatistics();
    expect(stats.metricsCount).toBe(2);
    expect(stats.metrics.cpu_usage).toBeDefined();
    expect(stats.metrics.memory_usage).toBeDefined();
  });

  test('should clear all metrics', () => {
    monitor.recordMetric('cpu_usage', 50);
    monitor.recordMetric('memory_usage', 40);

    let metricsCleared = false;
    monitor.on('metricsCleared', () => {
      metricsCleared = true;
    });

    monitor.clearMetrics();

    expect(metricsCleared).toBe(true);
    expect(monitor.getStatistics().metricsCount).toBe(0);
  });

  test('should export metrics', () => {
    monitor.recordMetric('cpu_usage', 50);
    monitor.recordMetric('memory_usage', 40);

    const exported = monitor.exportMetrics();
    expect(exported.metrics.cpu_usage).toBeDefined();
    expect(exported.metrics.memory_usage).toBeDefined();
    expect(exported.exportedAt).toBeDefined();
  });

  test('should stop monitoring', (done) => {
    monitor.startMonitoring();
    let monitoringStopped = false;

    monitor.on('monitoringStopped', () => {
      monitoringStopped = true;
    });

    monitor.stopMonitoring();

    setTimeout(() => {
      expect(monitoringStopped).toBe(true);
      expect(monitor.getStatistics().isMonitoring).toBe(false);
      done();
    }, 150);
  });

  test('should include metadata in metrics', () => {
    monitor.recordMetric('temperature', 55, { unit: '°C', sensor: 'primary' });
    const metric = monitor.getMetric('temperature');
    expect(metric.metadata.unit).toBe('°C');
    expect(metric.metadata.sensor).toBe('primary');
  });

  test('should handle multiple thresholds', (done) => {
    const m = new PerformanceMonitor({
      alertThresholds: {
        metric_a: { warning: 50, critical: 75 },
        metric_b: { warning: 60, critical: 85 },
      },
    });

    let alertCount = 0;
    m.on('alertTriggered', () => {
      alertCount++;
    });

    m.recordMetric('metric_a', 80);
    m.recordMetric('metric_b', 90);

    setTimeout(() => {
      expect(alertCount).toBeGreaterThan(0);
      done();
    }, 100);
  });

  test('should not duplicate alerts within threshold window', (done) => {
    let alertCount = 0;
    monitor.on('alertTriggered', () => {
      alertCount++;
    });

    monitor.recordMetric('cpu_usage', 90);
    monitor.recordMetric('cpu_usage', 91);

    setTimeout(() => {
      // Should only trigger once due to 5 second deduplication window
      expect(alertCount).toBe(1);
      done();
    }, 100);
  });

  test('should track multiple metric types', () => {
    const metrics = ['cpu_usage', 'memory_usage', 'spindle_load', 'temperature', 'io_throughput'];

    metrics.forEach((m) => {
      monitor.recordMetric(m, Math.random() * 100);
    });

    expect(monitor.getStatistics().metricsCount).toBe(metrics.length);
  });

  test('should calculate baseline deviation correctly', () => {
    monitor.setBaseline({ test_metric: 100 });

    monitor.recordMetric('test_metric', 150);
    const comparison = monitor.compareToBaseline('test_metric');

    expect(comparison.deviation).toBe(50); // 50% above baseline
  });
});
