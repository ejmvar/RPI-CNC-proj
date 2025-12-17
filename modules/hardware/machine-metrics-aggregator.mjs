/**
 * Live Machine Metrics Aggregator Module
 *
 * Collects and aggregates spindle, feed, thermal, and power metrics
 * for real-time machine state monitoring.
 */

export class LiveMachineMetricsAggregator {
  constructor(options = {}) {
    this.options = {
      metricsBufferSize: options.metricsBufferSize || 300,
      aggregationInterval: options.aggregationInterval || 1000,
      thermalWarningTemp: options.thermalWarningTemp || 60,
      thermalCriticalTemp: options.thermalCriticalTemp || 80,
      ...options,
    };

    this.metrics = new Map();
    this.aggregates = new Map();
    this.listeners = {};
    this.lastAggregation = Date.now();
    this.stats = {
      metricsCollected: 0,
      thermalAlerts: 0,
      powerSpikes: 0,
    };
  }

  /**
   * Record spindle metrics
   * @param {object} spindle - Spindle data
   * @param {number} timestamp - Optional timestamp
   * @returns {object} - Recorded spindle metrics
   */
  recordSpindleMetrics(spindle, timestamp = Date.now()) {
    if (!spindle.speed) {
      throw new Error('Spindle speed is required');
    }

    const metrics = {
      timestamp,
      speed: spindle.speed || 0,
      load: spindle.load || 0,
      current: spindle.current || 0,
      temperature: spindle.temperature || 0,
      powerConsumption: (spindle.load / 100) * spindle.power || 0,
    };

    if (!this.metrics.has('spindle')) {
      this.metrics.set('spindle', []);
    }

    const buffer = this.metrics.get('spindle');
    buffer.push(metrics);

    if (buffer.length > this.options.metricsBufferSize) {
      buffer.shift();
    }

    this.stats.metricsCollected++;

    // Check thermal status
    if (metrics.temperature > this.options.thermalCriticalTemp) {
      this.stats.thermalAlerts++;
      this.emit('thermalCritical', {
        component: 'spindle',
        temperature: metrics.temperature,
      });
    } else if (metrics.temperature > this.options.thermalWarningTemp) {
      this.emit('thermalWarning', {
        component: 'spindle',
        temperature: metrics.temperature,
      });
    }

    this.emit('spindleMetricsRecorded', metrics);
    return metrics;
  }

  /**
   * Record feed rate metrics
   * @param {object} feed - Feed data
   * @param {number} timestamp - Optional timestamp
   * @returns {object} - Recorded feed metrics
   */
  recordFeedMetrics(feed, timestamp = Date.now()) {
    if (feed.commanded === undefined) {
      throw new Error('Commanded feed rate is required');
    }

    const feedError = Math.abs(feed.actual - feed.commanded) / Math.max(feed.commanded, 1);

    const metrics = {
      timestamp,
      commandedRate: feed.commanded,
      actualRate: feed.actual || 0,
      feedError: feedError * 100,
      acceleration: feed.acceleration || 0,
      feedHoldActive: feed.feedHoldActive || false,
    };

    if (!this.metrics.has('feed')) {
      this.metrics.set('feed', []);
    }

    const buffer = this.metrics.get('feed');
    buffer.push(metrics);

    if (buffer.length > this.options.metricsBufferSize) {
      buffer.shift();
    }

    if (feedError > 0.1) {
      this.emit('feedRateDeviation', {
        expected: feed.commanded,
        actual: feed.actual,
        deviation: feedError * 100,
      });
    }

    this.emit('feedMetricsRecorded', metrics);
    return metrics;
  }

  /**
   * Record thermal metrics
   * @param {object} thermal - Thermal data
   * @param {number} timestamp - Optional timestamp
   * @returns {object} - Recorded thermal metrics
   */
  recordThermalMetrics(thermal, timestamp = Date.now()) {
    const metrics = {
      timestamp,
      spindleTemp: thermal.spindleTemp || 0,
      motorTemp: thermal.motorTemp || 0,
      driveTemp: thermal.driveTemp || 0,
      cuttingZoneTemp: thermal.cuttingZoneTemp || 0,
      ambientTemp: thermal.ambientTemp || 20,
      coolingFlowRate: thermal.coolingFlowRate || 0,
    };

    if (!this.metrics.has('thermal')) {
      this.metrics.set('thermal', []);
    }

    const buffer = this.metrics.get('thermal');
    buffer.push(metrics);

    if (buffer.length > this.options.metricsBufferSize) {
      buffer.shift();
    }

    // Check all temperatures
    Object.entries(metrics).forEach(([key, temp]) => {
      if (typeof temp === 'number' && key.includes('Temp')) {
        if (temp > this.options.thermalCriticalTemp) {
          this.stats.thermalAlerts++;
          this.emit('thermalCritical', {
            component: key,
            temperature: temp,
          });
        } else if (temp > this.options.thermalWarningTemp) {
          this.emit('thermalWarning', {
            component: key,
            temperature: temp,
          });
        }
      }
    });

    this.emit('thermalMetricsRecorded', metrics);
    return metrics;
  }

  /**
   * Record axis vibration metrics
   * @param {object} vibration - Vibration data
   * @param {number} timestamp - Optional timestamp
   * @returns {object} - Recorded vibration metrics
   */
  recordVibrationMetrics(vibration, timestamp = Date.now()) {
    const metrics = {
      timestamp,
      xAcceleration: vibration.xAcceleration || 0,
      yAcceleration: vibration.yAcceleration || 0,
      zAcceleration: vibration.zAcceleration || 0,
      combinedAcceleration: Math.sqrt(
        (vibration.xAcceleration || 0) ** 2 +
          (vibration.yAcceleration || 0) ** 2 +
          (vibration.zAcceleration || 0) ** 2
      ),
      frequency: vibration.frequency || 0,
      amplitude: vibration.amplitude || 0,
    };

    if (!this.metrics.has('vibration')) {
      this.metrics.set('vibration', []);
    }

    const buffer = this.metrics.get('vibration');
    buffer.push(metrics);

    if (buffer.length > this.options.metricsBufferSize) {
      buffer.shift();
    }

    if (metrics.combinedAcceleration > 5.0) {
      this.emit('vibrationWarning', {
        acceleration: metrics.combinedAcceleration,
        timestamp,
      });
    }

    this.emit('vibrationMetricsRecorded', metrics);
    return metrics;
  }

  /**
   * Record power consumption metrics
   * @param {object} power - Power data
   * @param {number} timestamp - Optional timestamp
   * @returns {object} - Recorded power metrics
   */
  recordPowerMetrics(power, timestamp = Date.now()) {
    const metrics = {
      timestamp,
      mainSupply: power.mainSupply || 0,
      spindlePower: power.spindlePower || 0,
      servosPower: power.servosPower || 0,
      coolingPower: power.coolingPower || 0,
      totalPower:
        (power.mainSupply || 0) +
        (power.spindlePower || 0) +
        (power.servosPower || 0) +
        (power.coolingPower || 0),
      efficiency: power.efficiency || 0,
    };

    if (!this.metrics.has('power')) {
      this.metrics.set('power', []);
    }

    const buffer = this.metrics.get('power');
    buffer.push(metrics);

    if (buffer.length > this.options.metricsBufferSize) {
      buffer.shift();
    }

    if (metrics.totalPower > 5000) {
      this.stats.powerSpikes++;
      this.emit('powerSpike', {
        power: metrics.totalPower,
      });
    }

    this.emit('powerMetricsRecorded', metrics);
    return metrics;
  }

  /**
   * Calculate metrics aggregates
   * @param {string} metricType - Type of metric (spindle, feed, thermal, etc.)
   * @returns {object} - Aggregated statistics
   */
  calculateAggregates(metricType) {
    const buffer = this.metrics.get(metricType);
    if (!buffer || buffer.length === 0) {
      return null;
    }

    const aggregate = {
      metricType,
      sampleCount: buffer.length,
      timestamp: Date.now(),
      values: {},
    };

    // Calculate statistics for each numeric field
    const firstEntry = buffer[0];
    Object.keys(firstEntry).forEach((key) => {
      if (key !== 'timestamp' && typeof firstEntry[key] === 'number') {
        const values = buffer.map((b) => b[key]);
        aggregate.values[key] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          latest: values[values.length - 1],
          stdDev: this._calculateStdDev(values),
        };
      }
    });

    this.aggregates.set(metricType, aggregate);
    return aggregate;
  }

  /**
   * Calculate standard deviation
   * @private
   */
  _calculateStdDev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Get metric data
   * @param {string} metricType - Type of metric
   * @param {number} limit - Optional limit on samples
   * @returns {array} - Metric data
   */
  getMetricData(metricType, limit = null) {
    const buffer = this.metrics.get(metricType);
    if (!buffer) {
      return [];
    }

    if (limit && limit > 0) {
      return buffer.slice(-limit);
    }

    return [...buffer];
  }

  /**
   * Get real-time dashboard state
   * @returns {object} - Dashboard state
   */
  getDashboardState() {
    const state = {
      timestamp: Date.now(),
      spindle: this.calculateAggregates('spindle'),
      feed: this.calculateAggregates('feed'),
      thermal: this.calculateAggregates('thermal'),
      vibration: this.calculateAggregates('vibration'),
      power: this.calculateAggregates('power'),
    };

    return state;
  }

  /**
   * Get system statistics
   * @returns {object} - Statistics
   */
  getStatistics() {
    return {
      metricsCollected: this.stats.metricsCollected,
      thermalAlerts: this.stats.thermalAlerts,
      powerSpikes: this.stats.powerSpikes,
      activeMetricTypes: this.metrics.size,
      lastAggregation: this.lastAggregation,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics.forEach((buffer) => {
      buffer.length = 0;
    });
    this.aggregates.clear();
    this.emit('metricsReset', { timestamp: Date.now() });
  }

  /**
   * Event emitter pattern
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }
}
