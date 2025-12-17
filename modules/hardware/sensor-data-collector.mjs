/**
 * Sensor Data Collector Module
 *
 * Manages multi-sensor input with real-time streaming, calibration,
 * and signal processing for CNC hardware integration.
 */

export class SensorDataCollector {
  constructor(options = {}) {
    this.options = {
      bufferSize: options.bufferSize || 300,
      filterType: options.filterType || 'moving-average',
      filterWindow: options.filterWindow || 5,
      outlierThreshold: options.outlierThreshold || 3.0,
      enableOutlierDetection: options.enableOutlierDetection !== false,
      enableFiltering: options.enableFiltering !== false,
      ...options,
    };

    this.sensors = new Map();
    this.dataBuffers = new Map();
    this.calibrations = new Map();
    this.subscriptions = new Map();
    this.listeners = {};
    this.stats = {
      samplesCollected: 0,
      outliersRejected: 0,
      sensorErrors: 0,
    };

    this.streaming = false;
  }

  /**
   * Register a sensor with the collector
   * @param {string} sensorId - Unique sensor identifier
   * @param {object} config - Sensor configuration
   * @returns {boolean} - True if sensor registered
   */
  registerSensor(sensorId, config) {
    if (!sensorId || !config) {
      throw new Error('Invalid sensor registration parameters');
    }

    if (this.sensors.has(sensorId)) {
      throw new Error(`Sensor ${sensorId} already registered`);
    }

    this.sensors.set(sensorId, {
      id: sensorId,
      type: config.type,
      unit: config.unit,
      minValue: config.minValue || -Infinity,
      maxValue: config.maxValue || Infinity,
      sampleRate: config.sampleRate || 100,
      description: config.description || '',
      active: config.active !== false,
      lastReading: null,
      lastTimestamp: null,
    });

    this.dataBuffers.set(sensorId, []);
    this.calibrations.set(sensorId, {
      offset: 0,
      scale: 1.0,
      reference: 0,
    });

    this.emit('sensorRegistered', { sensorId, config });
    return true;
  }

  /**
   * Set calibration parameters for a sensor
   * @param {string} sensorId - Sensor identifier
   * @param {number} offset - Zero offset
   * @param {number} scale - Scaling factor
   */
  calibrateSensor(sensorId, offset, scale) {
    if (!this.sensors.has(sensorId)) {
      throw new Error(`Sensor ${sensorId} not found`);
    }

    if (typeof offset !== 'number' || typeof scale !== 'number') {
      throw new Error('Invalid calibration parameters');
    }

    const calibration = this.calibrations.get(sensorId);
    calibration.offset = offset;
    calibration.scale = scale;

    this.emit('sensorCalibrated', { sensorId, offset, scale });
  }

  /**
   * Record a data sample from a sensor
   * @param {string} sensorId - Sensor identifier
   * @param {number} value - Raw sensor value
   * @param {number} timestamp - Optional timestamp
   * @returns {object} - Processed sample data
   */
  recordSample(sensorId, value, timestamp = Date.now()) {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found`);
    }

    if (!sensor.active) {
      this.stats.sensorErrors++;
      throw new Error(`Sensor ${sensorId} is not active`);
    }

    // Apply calibration
    const calibration = this.calibrations.get(sensorId);
    let calibratedValue = (value - calibration.offset) * calibration.scale;

    // Check bounds
    if (calibratedValue < sensor.minValue || calibratedValue > sensor.maxValue) {
      this.stats.sensorErrors++;
      throw new Error(`Sample out of bounds for sensor ${sensorId}: ${calibratedValue}`);
    }

    // Detect outliers using z-score method
    const buffer = this.dataBuffers.get(sensorId);
    if (this.options.enableOutlierDetection && buffer.length > 1) {
      const mean = buffer.reduce((sum, s) => sum + s.value, 0) / buffer.length;
      const variance =
        buffer.reduce((sum, s) => sum + Math.pow(s.value - mean, 2), 0) / buffer.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 0) {
        const zScore = Math.abs((calibratedValue - mean) / stdDev);
        if (zScore > this.options.outlierThreshold) {
          this.stats.outliersRejected++;
          this.emit('outlierDetected', {
            sensorId,
            value: calibratedValue,
            zScore,
          });
          return null;
        }
      }
    }

    // Apply signal filtering if enabled
    let filteredValue = calibratedValue;
    if (this.options.enableFiltering) {
      filteredValue = this._applyFilter(sensorId, calibratedValue);
    }

    // Add to buffer
    const sample = {
      sensorId,
      timestamp,
      rawValue: value,
      calibratedValue,
      filteredValue,
      unit: sensor.unit,
    };

    buffer.push(sample);
    if (buffer.length > this.options.bufferSize) {
      buffer.shift();
    }

    // Update sensor state
    sensor.lastReading = filteredValue;
    sensor.lastTimestamp = timestamp;

    this.stats.samplesCollected++;
    this.emit('sampleRecorded', sample);

    // Notify subscriptions
    this._notifySubscriptions(sensorId, sample);

    return sample;
  }

  /**
   * Apply signal filtering to data
   * @private
   */
  _applyFilter(sensorId, value) {
    const buffer = this.dataBuffers.get(sensorId);

    if (this.options.filterType === 'moving-average') {
      const window = Math.min(this.options.filterWindow, buffer.length);
      if (window === 0) return value;

      const start = Math.max(0, buffer.length - window);
      const recentValues = buffer.slice(start).map((s) => s.filteredValue || s.calibratedValue);
      const sum = recentValues.reduce((a, b) => a + b, 0);
      return sum / recentValues.length;
    }

    if (this.options.filterType === 'low-pass') {
      const alpha = 0.3;
      const lastValue =
        buffer.length > 0
          ? buffer[buffer.length - 1].filteredValue || buffer[buffer.length - 1].calibratedValue
          : value;
      return alpha * value + (1 - alpha) * lastValue;
    }

    return value;
  }

  /**
   * Subscribe to sensor data updates
   * @param {string} sensorId - Sensor identifier
   * @param {function} callback - Callback function
   */
  subscribe(sensorId, callback) {
    if (!this.sensors.has(sensorId)) {
      throw new Error(`Sensor ${sensorId} not found`);
    }

    if (!this.subscriptions.has(sensorId)) {
      this.subscriptions.set(sensorId, []);
    }

    this.subscriptions.get(sensorId).push(callback);
    return () => {
      const callbacks = this.subscriptions.get(sensorId);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all subscriptions for a sensor
   * @private
   */
  _notifySubscriptions(sensorId, sample) {
    const callbacks = this.subscriptions.get(sensorId) || [];
    callbacks.forEach((cb) => {
      try {
        cb(sample);
      } catch (err) {
        this.emit('subscriptionError', {
          sensorId,
          error: err.message,
        });
      }
    });
  }

  /**
   * Get current sensor reading
   * @param {string} sensorId - Sensor identifier
   * @returns {number} - Last recorded filtered value
   */
  getSensorReading(sensorId) {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found`);
    }

    return sensor.lastReading;
  }

  /**
   * Get sensor data buffer
   * @param {string} sensorId - Sensor identifier
   * @param {number} limit - Optional limit on returned samples
   * @returns {array} - Buffered samples
   */
  getBuffer(sensorId, limit = null) {
    const buffer = this.dataBuffers.get(sensorId);
    if (!buffer) {
      throw new Error(`Sensor ${sensorId} not found`);
    }

    if (limit && limit > 0) {
      return buffer.slice(-limit);
    }

    return [...buffer];
  }

  /**
   * Get statistics for a sensor
   * @param {string} sensorId - Sensor identifier
   * @returns {object} - Statistics
   */
  getSensorStatistics(sensorId) {
    const buffer = this.dataBuffers.get(sensorId);
    if (!buffer || buffer.length === 0) {
      return null;
    }

    const values = buffer.map((s) => s.filteredValue);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      sensorId,
      count: buffer.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean,
      stdDev,
      range: Math.max(...values) - Math.min(...values),
      latest: values[values.length - 1],
      timestamp: buffer[buffer.length - 1].timestamp,
    };
  }

  /**
   * Start streaming mode
   */
  startStreaming() {
    this.streaming = true;
    this.emit('streamingStarted', {
      timestamp: Date.now(),
    });
  }

  /**
   * Stop streaming mode
   */
  stopStreaming() {
    this.streaming = false;
    this.emit('streamingStopped', {
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all data buffers
   */
  clearBuffers() {
    this.dataBuffers.forEach((buffer) => {
      buffer.length = 0;
    });
    this.emit('buffersCleared', { timestamp: Date.now() });
  }

  /**
   * Get all registered sensors
   * @returns {array} - Sensor list
   */
  getSensors() {
    return Array.from(this.sensors.values());
  }

  /**
   * Get collector statistics
   * @returns {object} - Statistics
   */
  getStatistics() {
    return {
      registeredSensors: this.sensors.size,
      activeSensors: Array.from(this.sensors.values()).filter((s) => s.active).length,
      streaming: this.streaming,
      samplesCollected: this.stats.samplesCollected,
      outliersRejected: this.stats.outliersRejected,
      sensorErrors: this.stats.sensorErrors,
      timestamp: Date.now(),
    };
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
