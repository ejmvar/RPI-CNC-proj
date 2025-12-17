/**
 * Performance Monitor Module
 * Real-time metrics collection, aggregation, and threshold-based alerting
 * for CNC operations monitoring and performance analysis.
 */

export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      metricsInterval: 1000, // ms between metric collections
      historySize: 300, // keep last 300 data points (5 minutes at 1s intervals)
      alertThresholds: {},
      ...options,
    };

    this.metrics = new Map(); // metric_name -> { values: [], aggregates: {} }
    this.alerts = []; // active alerts
    this.listeners = {}; // event listeners
    this.baselineMetrics = new Map(); // baseline for comparison
    this.isMonitoring = false;
    this.monitoringIntervals = [];
    this.alertHistory = []; // historical alerts
  }

  /**
   * Start monitoring performance metrics
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // System metrics collection interval
    const systemInterval = setInterval(() => {
      this._collectSystemMetrics();
    }, this.options.metricsInterval);

    this.monitoringIntervals.push(systemInterval);
    this.emit('monitoringStarted', { timestamp: Date.now() });
  }

  /**
   * Stop monitoring metrics
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;

    this.monitoringIntervals.forEach((interval) => clearInterval(interval));
    this.monitoringIntervals = [];

    this.emit('monitoringStopped', { timestamp: Date.now() });
  }

  /**
   * Record a metric value
   */
  recordMetric(metricName, value, metadata = {}) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, {
        values: [],
        timestamps: [],
        aggregates: { min: Infinity, max: -Infinity, avg: 0, sum: 0, count: 0 },
        metadata: {},
      });
    }

    const metric = this.metrics.get(metricName);
    metric.values.push(value);
    metric.timestamps.push(Date.now());
    metric.metadata = { ...metric.metadata, ...metadata };

    // Keep only recent history
    if (metric.values.length > this.options.historySize) {
      metric.values.shift();
      metric.timestamps.shift();
    }

    // Update aggregates
    this._updateAggregates(metricName);

    // Check thresholds
    this._checkThresholds(metricName, value);

    this.emit('metricRecorded', { metricName, value, timestamp: Date.now() });
  }

  /**
   * Collect system/simulated metrics
   * @private
   */
  _collectSystemMetrics() {
    // CPU usage simulation (0-100%)
    const cpuUsage = Math.random() * 100;
    this.recordMetric('cpu_usage', cpuUsage, { unit: '%' });

    // Memory usage simulation (0-100%)
    const memoryUsage = 30 + Math.random() * 50;
    this.recordMetric('memory_usage', memoryUsage, { unit: '%' });

    // Spindle load simulation (0-100%)
    const spindleLoad = 40 + Math.random() * 50;
    this.recordMetric('spindle_load', spindleLoad, { unit: '%' });

    // Feed rate stability (0-100%, higher is better)
    const feedStability = 85 + Math.random() * 15;
    this.recordMetric('feed_rate_stability', feedStability, { unit: '%' });

    // Temperature simulation (20-80°C)
    const temperature = 35 + Math.random() * 40;
    this.recordMetric('temperature', temperature, { unit: '°C' });

    // I/O throughput simulation (MB/s)
    const ioThroughput = Math.random() * 500;
    this.recordMetric('io_throughput', ioThroughput, { unit: 'MB/s' });
  }

  /**
   * Update aggregate statistics for a metric
   * @private
   */
  _updateAggregates(metricName) {
    const metric = this.metrics.get(metricName);
    const values = metric.values;

    if (values.length === 0) return;

    metric.aggregates.min = Math.min(...values);
    metric.aggregates.max = Math.max(...values);
    metric.aggregates.sum = values.reduce((a, b) => a + b, 0);
    metric.aggregates.count = values.length;
    metric.aggregates.avg = metric.aggregates.sum / values.length;
    metric.aggregates.latest = values[values.length - 1];
    metric.aggregates.timestamp = Date.now();
  }

  /**
   * Check if metric exceeds configured thresholds
   * @private
   */
  _checkThresholds(metricName, value) {
    const threshold = this.options.alertThresholds[metricName];
    if (!threshold) return;

    const exceededWarning = threshold.warning && value > threshold.warning;
    const exceededCritical = threshold.critical && value > threshold.critical;

    if (exceededCritical) {
      this._triggerAlert(metricName, 'CRITICAL', value, threshold.critical);
    } else if (exceededWarning) {
      this._triggerAlert(metricName, 'WARNING', value, threshold.warning);
    }
  }

  /**
   * Trigger an alert
   * @private
   */
  _triggerAlert(metricName, severity, value, threshold) {
    const alertId = `${metricName}_${severity}_${Date.now()}`;
    const alert = {
      id: alertId,
      metricName,
      severity, // CRITICAL, WARNING
      value,
      threshold,
      timestamp: Date.now(),
      resolved: false,
    };

    // Check if similar alert already exists (within last 5 seconds)
    const existingAlert = this.alerts.find(
      (a) =>
        a.metricName === metricName && a.severity === severity && Date.now() - a.timestamp < 5000
    );

    if (!existingAlert) {
      this.alerts.push(alert);
      this.alertHistory.push(alert);
      this.emit('alertTriggered', alert);
    }
  }

  /**
   * Set performance baseline for comparison
   */
  setBaseline(baselineMetrics) {
    this.baselineMetrics.clear();
    Object.entries(baselineMetrics).forEach(([key, value]) => {
      this.baselineMetrics.set(key, value);
    });
    this.emit('baselineSet', { timestamp: Date.now() });
  }

  /**
   * Compare current metrics against baseline
   */
  compareToBaseline(metricName) {
    const current = this.metrics.get(metricName);
    const baseline = this.baselineMetrics.get(metricName);

    if (!current || !baseline) return null;

    const currentAvg = current.aggregates.avg || 0;
    const deviation = ((currentAvg - baseline) / Math.max(baseline, 1)) * 100;

    return {
      metricName,
      current: currentAvg,
      baseline,
      deviation, // percentage change
      isAboveBaseline: deviation > 0,
    };
  }

  /**
   * Get metric data
   */
  getMetric(metricName) {
    return this.metrics.get(metricName) || null;
  }

  /**
   * Get all active alerts
   */
  getAlerts(filter = {}) {
    let alerts = this.alerts;

    if (filter.severity) {
      alerts = alerts.filter((a) => a.severity === filter.severity);
    }

    if (filter.metricName) {
      alerts = alerts.filter((a) => a.metricName === filter.metricName);
    }

    return alerts;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      this.emit('alertResolved', alert);
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    const metricsData = {};

    this.metrics.forEach((metric, name) => {
      metricsData[name] = {
        ...metric.aggregates,
        valueCount: metric.values.length,
        metadata: metric.metadata,
      };
    });

    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.size,
      metrics: metricsData,
      activeAlerts: this.alerts.length,
      alertHistory: this.alertHistory.length,
      totalAlertsTriggered: this.alertHistory.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
    this.alerts = [];
    this.emit('metricsCleared', { timestamp: Date.now() });
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    const exported = {};

    this.metrics.forEach((metric, name) => {
      exported[name] = {
        values: [...metric.values],
        timestamps: [...metric.timestamps],
        aggregates: { ...metric.aggregates },
        metadata: { ...metric.metadata },
      };
    });

    return {
      exportedAt: Date.now(),
      metrics: exported,
      alerts: [...this.alertHistory],
    };
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }
}
