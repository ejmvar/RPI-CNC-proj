/**
 * Anomaly Detector
 * Phase 18: AI & Machine Learning
 *
 * Detects anomalies in machine behavior:
 * - Vibration anomalies
 * - Acoustic signature changes
 * - Process deviation detection
 * - Thermal anomalies
 * - Performance degradation
 */

export class AnomalyDetector {
  constructor(options = {}) {
    this.options = {
      enableRealTimeDetection: options.enableRealTimeDetection !== false,
      enableMultivariateAnalysis: options.enableMultivariateAnalysis !== false,
      sensitivityLevel: options.sensitivityLevel || 'MEDIUM', // LOW, MEDIUM, HIGH, CRITICAL
      baselineWindow: options.baselineWindow || 100,
      deviationThreshold: options.deviationThreshold || 2.5, // Standard deviations
      ...options,
    };

    this.baseline = new Map();
    this.readings = [];
    this.anomalies = [];
    this.statistics = {};
    this.listeners = {};
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Emit event to registered listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  /**
   * Record sensor reading
   */
  recordReading(params) {
    if (!params || !params.machineId || !params.sensorType) {
      throw new Error('Reading recording requires machineId and sensorType');
    }

    const {
      machineId,
      sensorType, // 'VIBRATION_X', 'VIBRATION_Y', 'VIBRATION_Z', 'ACOUSTIC', 'THERMAL', 'CURRENT'
      value,
      timestamp = Date.now(),
    } = params;

    const reading = {
      machineId,
      sensorType,
      value,
      timestamp,
    };

    this.readings.push(reading);

    // Check for anomaly
    const anomalyCheck = this._checkAnomaly(machineId, sensorType, value);

    if (anomalyCheck.isAnomaly) {
      this._recordAnomaly(machineId, sensorType, value, anomalyCheck);
    }

    this.emit('reading:recorded', reading);

    return { status: 'RECORDED', isAnomaly: anomalyCheck.isAnomaly };
  }

  /**
   * Initialize baseline for machine
   */
  initializeBaseline(params) {
    if (!params || !params.machineId) {
      throw new Error('Baseline initialization requires machineId');
    }

    const { machineId, calibrationData = {} } = params;

    // Calculate baseline from recent readings
    const recentReadings = this.readings
      .filter((r) => r.machineId === machineId)
      .slice(-this.options.baselineWindow);

    if (recentReadings.length === 0) {
      return { status: 'NO_DATA', machineId };
    }

    // Group by sensor type
    const sensorGroups = {};

    for (const reading of recentReadings) {
      if (!sensorGroups[reading.sensorType]) {
        sensorGroups[reading.sensorType] = [];
      }
      sensorGroups[reading.sensorType].push(reading.value);
    }

    // Calculate statistics for each sensor
    const baselineStats = {};

    for (const [sensorType, values] of Object.entries(sensorGroups)) {
      const stats = this._calculateStatistics(values);
      baselineStats[sensorType] = {
        ...stats,
        calibrationOffset: calibrationData[sensorType] || 0,
      };
    }

    this.baseline.set(machineId, baselineStats);

    this.emit('baseline:initialized', { machineId, sensors: Object.keys(baselineStats).length });

    return {
      status: 'INITIALIZED',
      machineId,
      sensors: Object.keys(baselineStats).length,
    };
  }

  /**
   * Detect vibration anomalies
   */
  detectVibrationAnomalies(params) {
    if (!params || !params.machineId) {
      throw new Error('Vibration detection requires machineId');
    }

    const { machineId, window = 50 } = params;

    const vibrationReadings = this.readings
      .filter(
        (r) =>
          r.machineId === machineId &&
          (r.sensorType === 'VIBRATION_X' ||
            r.sensorType === 'VIBRATION_Y' ||
            r.sensorType === 'VIBRATION_Z')
      )
      .slice(-window);

    if (vibrationReadings.length === 0) {
      return { machineId, anomaliesDetected: 0, readings: 0 };
    }

    const analysis = {
      timestamp: Date.now(),
      machineId,
      readingsAnalyzed: vibrationReadings.length,
      anomalies: [],
      summary: {},
    };

    // Analyze each axis
    const axes = ['VIBRATION_X', 'VIBRATION_Y', 'VIBRATION_Z'];

    for (const axis of axes) {
      const axisReadings = vibrationReadings
        .filter((r) => r.sensorType === axis)
        .map((r) => r.value);

      if (axisReadings.length > 0) {
        const stats = this._calculateStatistics(axisReadings);
        const peaks = this._detectPeaks(axisReadings, stats.mean, stats.stdDev);

        analysis.summary[axis] = {
          mean: parseFloat(stats.mean.toFixed(3)),
          stdDev: parseFloat(stats.stdDev.toFixed(3)),
          min: parseFloat(stats.min.toFixed(3)),
          max: parseFloat(stats.max.toFixed(3)),
          peaksDetected: peaks.length,
        };

        if (peaks.length > 0) {
          analysis.anomalies.push({
            axis,
            peakCount: peaks.length,
            maxPeak: Math.max(...peaks),
            description: `Excessive vibration detected on ${axis}`,
          });
        }
      }
    }

    const detection = {
      id: this._generateId(),
      timestamp: Date.now(),
      machineId,
      anomaliesDetected: analysis.anomalies.length,
      analysis,
      severity: this._classifyAnomalySeverity(analysis.anomalies),
      recommendation: this._generateVibrationRecommendation(analysis.anomalies),
    };

    this.emit('vibration:analyzed', detection);

    return detection;
  }

  /**
   * Detect acoustic anomalies
   */
  detectAcousticAnomalies(params) {
    if (!params || !params.machineId) {
      throw new Error('Acoustic detection requires machineId');
    }

    const { machineId, window = 50 } = params;

    const acousticReadings = this.readings
      .filter((r) => r.machineId === machineId && r.sensorType === 'ACOUSTIC')
      .slice(-window);

    if (acousticReadings.length === 0) {
      return { machineId, anomaliesDetected: 0 };
    }

    const values = acousticReadings.map((r) => r.value);
    const stats = this._calculateStatistics(values);

    // Detect frequency shifts (simulated)
    const anomalousReadings = values.filter((v) => Math.abs(v - stats.mean) > stats.stdDev * 2);

    const detection = {
      id: this._generateId(),
      timestamp: Date.now(),
      machineId,
      acousticAnalysis: {
        baselineNoise: parseFloat(stats.mean.toFixed(1)),
        stdDeviation: parseFloat(stats.stdDev.toFixed(1)),
        noiseLevel: this._classifyNoiseLevel(stats.mean),
        anomalousReadings: anomalousReadings.length,
      },
      anomaliesDetected: anomalousReadings.length,
      frequencyShifts: this._detectFrequencyShifts(values),
      potentialIssues: this._identifyAcousticIssues(stats),
      severity: anomalousReadings.length > 0 ? 'MEDIUM' : 'NORMAL',
    };

    this.emit('acoustic:analyzed', detection);

    return detection;
  }

  /**
   * Detect thermal anomalies
   */
  detectThermalAnomalies(params) {
    if (!params || !params.machineId) {
      throw new Error('Thermal detection requires machineId');
    }

    const { machineId, window = 50, thermalLimit = 80 } = params;

    const thermalReadings = this.readings
      .filter((r) => r.machineId === machineId && r.sensorType === 'THERMAL')
      .slice(-window);

    if (thermalReadings.length === 0) {
      return { machineId, anomaliesDetected: 0 };
    }

    const values = thermalReadings.map((r) => r.value);
    const stats = this._calculateStatistics(values);

    // Detect overheat conditions
    const overheated = values.filter((v) => v > thermalLimit);
    const rapidIncrease = this._detectRapidTemperatureChange(values);

    const detection = {
      id: this._generateId(),
      timestamp: Date.now(),
      machineId,
      thermalAnalysis: {
        currentTemperature: values[values.length - 1],
        averageTemperature: parseFloat(stats.mean.toFixed(1)),
        maxTemperature: stats.max,
        thermalTrend: rapidIncrease ? 'INCREASING' : 'STABLE',
        overheatingEvents: overheated.length,
      },
      anomaliesDetected: overheated.length + (rapidIncrease ? 1 : 0),
      thermalStatus: this._classifyThermalStatus(stats.mean, thermalLimit),
      recommendation: this._generateThermalRecommendation(stats.mean, thermalLimit),
    };

    this.emit('thermal:analyzed', detection);

    return detection;
  }

  /**
   * Detect process deviation
   */
  detectProcessDeviation(params) {
    if (!params || !params.machineId || !params.expectedParameters) {
      throw new Error('Process deviation detection requires machineId and expectedParameters');
    }

    const { machineId, expectedParameters, window = 50 } = params;

    const readings = this.readings.filter((r) => r.machineId === machineId).slice(-window);

    if (readings.length === 0) {
      return { machineId, deviationsDetected: 0 };
    }

    const deviations = [];

    // Check for parameter deviations
    for (const [param, expected] of Object.entries(expectedParameters)) {
      const paramReadings = readings.filter((r) => r.sensorType === param).map((r) => r.value);

      if (paramReadings.length > 0) {
        const actual = paramReadings[paramReadings.length - 1];
        const deviation = Math.abs(actual - expected) / Math.max(expected, 0.1);

        if (deviation > 0.1) {
          // 10% tolerance
          deviations.push({
            parameter: param,
            expected,
            actual,
            deviationPercent: parseFloat((deviation * 100).toFixed(1)),
            severity: deviation > 0.3 ? 'HIGH' : 'MEDIUM',
          });
        }
      }
    }

    const detection = {
      id: this._generateId(),
      timestamp: Date.now(),
      machineId,
      deviationsDetected: deviations.length,
      deviations,
      processHealth: deviations.length === 0 ? 'NORMAL' : 'ABNORMAL',
      recommendation: this._generateProcessRecommendation(deviations),
    };

    this.emit('process:deviation-detected', detection);

    return detection;
  }

  /**
   * Get anomaly report
   */
  getAnomalyReport(params = {}) {
    const { machineId = null, timeWindow = 24 * 60 * 60 * 1000 } = params;

    let anomalies = this.anomalies;

    if (machineId) {
      anomalies = anomalies.filter((a) => a.machineId === machineId);
    }

    const cutoffTime = Date.now() - timeWindow;
    anomalies = anomalies.filter((a) => a.timestamp >= cutoffTime);

    // Categorize anomalies
    const report = {
      timeWindow: `${(timeWindow / 60000).toFixed(0)} minutes`,
      totalAnomalies: anomalies.length,
      byType: {},
      bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      timeline: [],
    };

    for (const anomaly of anomalies) {
      report.byType[anomaly.type] = (report.byType[anomaly.type] || 0) + 1;
      report.bySeverity[anomaly.severity] = (report.bySeverity[anomaly.severity] || 0) + 1;

      report.timeline.push({
        timestamp: anomaly.timestamp,
        type: anomaly.type,
        severity: anomaly.severity,
      });
    }

    return report;
  }

  /**
   * Helper: Check for anomaly
   */
  _checkAnomaly(machineId, sensorType, value) {
    const baseline = this.baseline.get(machineId);

    if (!baseline || !baseline[sensorType]) {
      return { isAnomaly: false, reason: 'NO_BASELINE' };
    }

    const sensorBaseline = baseline[sensorType];
    const threshold = this.options.deviationThreshold;
    const deviation = Math.abs(value - sensorBaseline.mean) / Math.max(sensorBaseline.stdDev, 0.1);

    if (deviation > threshold) {
      return {
        isAnomaly: true,
        reason: 'DEVIATION_EXCEEDED',
        deviation,
        threshold,
      };
    }

    return { isAnomaly: false, reason: 'NORMAL' };
  }

  /**
   * Helper: Record anomaly
   */
  _recordAnomaly(machineId, sensorType, value, analysis) {
    const anomaly = {
      id: this._generateId(),
      timestamp: Date.now(),
      machineId,
      type: sensorType,
      value,
      analysis,
      severity: this._classifySensorSeverity(analysis),
    };

    this.anomalies.push(anomaly);

    this.emit(`anomaly:${sensorType}`, anomaly);
  }

  /**
   * Helper: Calculate statistics
   */
  _calculateStatistics(values) {
    if (values.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0 };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
    };
  }

  /**
   * Helper: Detect peaks
   */
  _detectPeaks(values, mean, stdDev, threshold = 3) {
    const peaks = [];

    for (let i = 1; i < values.length - 1; i++) {
      if (
        values[i] > values[i - 1] &&
        values[i] > values[i + 1] &&
        Math.abs(values[i] - mean) > threshold * stdDev
      ) {
        peaks.push(values[i]);
      }
    }

    return peaks;
  }

  /**
   * Helper: Classify anomaly severity
   */
  _classifyAnomalySeverity(anomalies) {
    if (anomalies.length === 0) return 'NORMAL';
    if (anomalies.length === 1) return 'LOW';
    if (anomalies.length < 5) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Helper: Classify noise level
   */
  _classifyNoiseLevel(baseline) {
    if (baseline < 20) return 'QUIET';
    if (baseline < 50) return 'NORMAL';
    if (baseline < 75) return 'LOUD';
    return 'VERY_LOUD';
  }

  /**
   * Helper: Detect frequency shifts
   */
  _detectFrequencyShifts(values) {
    // Simplified frequency shift detection
    const changes = [];

    for (let i = 1; i < Math.min(values.length, 10); i++) {
      const change = Math.abs(values[i] - values[i - 1]);
      if (change > 10) {
        changes.push(change);
      }
    }

    return changes.length;
  }

  /**
   * Helper: Identify acoustic issues
   */
  _identifyAcousticIssues(stats) {
    const issues = [];

    if (stats.stdDev > stats.mean * 0.5) {
      issues.push('High acoustic variability detected');
    }

    if (stats.max > stats.mean * 2) {
      issues.push('Sudden noise spikes detected');
    }

    return issues;
  }

  /**
   * Helper: Detect rapid temperature change
   */
  _detectRapidTemperatureChange(values) {
    if (values.length < 2) return false;

    const recent = values.slice(-5);
    const older = values.slice(-10, -5);

    if (older.length === 0) return false;

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    return recentAvg - olderAvg > 5;
  }

  /**
   * Helper: Classify thermal status
   */
  _classifyThermalStatus(temperature, limit) {
    if (temperature < limit * 0.6) return 'COOL';
    if (temperature < limit * 0.8) return 'NORMAL';
    if (temperature < limit * 0.95) return 'WARM';
    return 'HOT';
  }

  /**
   * Helper: Generate vibration recommendation
   */
  _generateVibrationRecommendation(anomalies) {
    if (anomalies.length === 0) return 'Normal vibration levels';
    if (anomalies.length === 1) return 'Monitor vibration - minor deviation detected';
    return 'Significant vibration anomaly - investigate immediately';
  }

  /**
   * Helper: Generate thermal recommendation
   */
  _generateThermalRecommendation(temperature, limit) {
    if (temperature < limit * 0.8) return 'Temperature normal';
    if (temperature < limit * 0.95) return 'Monitor temperature - approaching limit';
    return 'Reduce load - temperature critical';
  }

  /**
   * Helper: Generate process recommendation
   */
  _generateProcessRecommendation(deviations) {
    if (deviations.length === 0) return 'Process parameters normal';
    if (deviations.length === 1) return 'Adjust single parameter slightly';
    return 'Multiple parameter deviations detected - review process setup';
  }

  /**
   * Helper: Classify sensor severity
   */
  _classifySensorSeverity(analysis) {
    if (analysis.deviation < 3) return 'LOW';
    if (analysis.deviation < 4) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Helper: Generate ID
   */
  _generateId() {
    return `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Statistics
   */
  getStatistics() {
    return {
      totalReadings: this.readings.length,
      totalAnomalies: this.anomalies.length,
      baselinesMachines: this.baseline.size,
      anomalyRate:
        this.readings.length > 0
          ? parseFloat(((this.anomalies.length / this.readings.length) * 100).toFixed(2))
          : 0,
    };
  }
}

export default AnomalyDetector;
