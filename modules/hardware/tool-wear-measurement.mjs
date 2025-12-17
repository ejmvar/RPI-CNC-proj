/**
 * Tool Wear Measurement System Module
 *
 * Detects tool breakage, measures flank and crater wear,
 * monitors runout, and predicts tool life.
 */

export class ToolWearMeasurementSystem {
  constructor(options = {}) {
    this.options = {
      vbcThreshold: options.vbcThreshold || 0.3,
      vbbThreshold: options.vbbThreshold || 0.5,
      treeThreshold: options.treeThreshold || 0.05,
      criticalThreshold: options.criticalThreshold || 0.9,
      ...options,
    };

    this.tools = new Map();
    this.wearData = new Map();
    this.breakageDetection = new Map();
    this.listeners = {};
    this.stats = {
      toolsMonitored: 0,
      breakagesDetected: 0,
      toolsReplaced: 0,
    };
  }

  /**
   * Register a tool for wear monitoring
   * @param {string} toolId - Tool identifier
   * @param {object} toolConfig - Tool configuration
   * @returns {boolean} - True if registered
   */
  registerTool(toolId, toolConfig) {
    if (!toolId || !toolConfig) {
      throw new Error('Invalid tool registration parameters');
    }

    if (this.tools.has(toolId)) {
      throw new Error(`Tool ${toolId} already registered`);
    }

    this.tools.set(toolId, {
      id: toolId,
      type: toolConfig.type,
      material: toolConfig.material || 'unknown',
      diameter: toolConfig.diameter || 0,
      flutes: toolConfig.flutes || 1,
      maxLifeHours: toolConfig.maxLifeHours || 100,
      expectedLife: toolConfig.expectedLife || 50, // in part cycles
      toolGeometry: toolConfig.toolGeometry || 'flat_end',
      coatingType: toolConfig.coatingType || 'uncoated',
      insertNumber: toolConfig.insertNumber || 1,
      active: true,
      installTime: Date.now(),
      lastMeasurement: null,
      breakageRisk: 0,
    });

    this.wearData.set(toolId, []);
    this.breakageDetection.set(toolId, {
      acousticSpikes: [],
      vibrationSpikes: [],
      forceAnomalies: [],
    });

    this.stats.toolsMonitored++;
    this.emit('toolRegistered', { toolId, toolConfig });

    return true;
  }

  /**
   * Record flank wear measurement (VBb)
   * @param {string} toolId - Tool identifier
   * @param {number} vbbValue - Flank wear value (mm)
   * @param {number} timestamp - Optional timestamp
   * @returns {object} - Wear status
   */
  recordFlankWear(toolId, vbbValue, timestamp = Date.now()) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    if (vbbValue < 0) {
      throw new Error('VBb value cannot be negative');
    }

    const wearPercent = (vbbValue / this.options.vbbThreshold) * 100;
    let severity = 'normal';

    if (wearPercent >= this.options.criticalThreshold * 100) {
      severity = 'critical';
    } else if (wearPercent >= 70) {
      severity = 'warning';
    }

    const measurement = {
      toolId,
      type: 'flank_wear',
      vbbValue,
      wearPercent,
      severity,
      timestamp,
    };

    const wearHistory = this.wearData.get(toolId);
    wearHistory.push(measurement);

    tool.lastMeasurement = measurement;

    if (severity !== 'normal') {
      this.emit('wearWarning', {
        toolId,
        severity,
        wearPercent,
      });
    }

    return measurement;
  }

  /**
   * Record crater wear measurement (VBc)
   * @param {string} toolId - Tool identifier
   * @param {number} vbcValue - Crater wear value (mm)
   * @param {number} timestamp - Optional timestamp
   * @returns {object} - Wear status
   */
  recordCraterWear(toolId, vbcValue, timestamp = Date.now()) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    if (vbcValue < 0) {
      throw new Error('VBc value cannot be negative');
    }

    const wearPercent = (vbcValue / this.options.vbcThreshold) * 100;
    let severity = 'normal';

    if (wearPercent >= this.options.criticalThreshold * 100) {
      severity = 'critical';
    } else if (wearPercent >= 70) {
      severity = 'warning';
    }

    const measurement = {
      toolId,
      type: 'crater_wear',
      vbcValue,
      wearPercent,
      severity,
      timestamp,
    };

    const wearHistory = this.wearData.get(toolId);
    wearHistory.push(measurement);

    tool.lastMeasurement = measurement;

    if (severity !== 'normal') {
      this.emit('craterWearWarning', {
        toolId,
        severity,
        wearPercent,
      });
    }

    return measurement;
  }

  /**
   * Detect tool breakage using sensor data
   * @param {string} toolId - Tool identifier
   * @param {object} sensorData - Sensor readings (acoustic, vibration, force)
   * @returns {boolean} - True if breakage detected
   */
  detectBreakage(toolId, sensorData) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const detection = this.breakageDetection.get(toolId);
    let breakageDetected = false;

    // Acoustic detection
    if (sensorData.acousticPeak > 80) {
      detection.acousticSpikes.push({
        value: sensorData.acousticPeak,
        timestamp: Date.now(),
      });
      breakageDetected = true;
    }

    // Vibration detection
    if (sensorData.vibrationAmplitude > 5.0) {
      detection.vibrationSpikes.push({
        value: sensorData.vibrationAmplitude,
        timestamp: Date.now(),
      });
      breakageDetected = true;
    }

    // Force anomaly detection
    if (sensorData.cuttingForce > 10000) {
      detection.forceAnomalies.push({
        value: sensorData.cuttingForce,
        timestamp: Date.now(),
      });
      breakageDetected = true;
    }

    if (breakageDetected) {
      this.stats.breakagesDetected++;
      tool.active = false;
      this.emit('breakageDetected', {
        toolId,
        sensorData,
      });
    }

    return breakageDetected;
  }

  /**
   * Monitor runout (TIR - Total Indicated Runout)
   * @param {string} toolId - Tool identifier
   * @param {number} tirValue - TIR measurement (mm)
   * @returns {object} - Runout status
   */
  monitorRunout(toolId, tirValue) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    let status = 'good';
    if (tirValue > this.options.treeThreshold * 2) {
      status = 'critical';
    } else if (tirValue > this.options.treeThreshold) {
      status = 'warning';
    }

    const measurement = {
      toolId,
      type: 'runout',
      tirValue,
      status,
      timestamp: Date.now(),
    };

    const wearHistory = this.wearData.get(toolId);
    wearHistory.push(measurement);

    if (status !== 'good') {
      this.emit('runoutWarning', {
        toolId,
        status,
        tirValue,
      });
    }

    return measurement;
  }

  /**
   * Calculate wear rate from historical data
   * @param {string} toolId - Tool identifier
   * @param {number} timeWindow - Time window in minutes
   * @returns {number} - Wear rate (mm/min)
   */
  calculateWearRate(toolId, timeWindow = 60) {
    const wearHistory = this.wearData.get(toolId);
    if (!wearHistory || wearHistory.length < 2) {
      return 0;
    }

    const now = Date.now();
    const windowStart = now - timeWindow * 60 * 1000;

    const recentMeasurements = wearHistory.filter(
      (m) => m.timestamp >= windowStart && (m.type === 'flank_wear' || m.type === 'crater_wear')
    );

    if (recentMeasurements.length < 2) {
      return 0;
    }

    const firstValue = recentMeasurements[0].vbbValue || recentMeasurements[0].vbcValue || 0;
    const lastValue =
      recentMeasurements[recentMeasurements.length - 1].vbbValue ||
      recentMeasurements[recentMeasurements.length - 1].vbcValue ||
      0;

    const wearDifference = lastValue - firstValue;
    const timeDiff = timeWindow;

    return timeDiff > 0 ? wearDifference / timeDiff : 0;
  }

  /**
   * Predict remaining tool life
   * @param {string} toolId - Tool identifier
   * @returns {object} - Life prediction
   */
  predictRemainingLife(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const wearRate = this.calculateWearRate(toolId, 120);
    if (wearRate <= 0) {
      return {
        toolId,
        remainingCycles: tool.expectedLife,
        remainingMinutes: null,
        predictedFailure: null,
      };
    }

    const remainingWear = this.options.vbbThreshold - (tool.lastMeasurement?.vbbValue || 0);
    const remainingMinutes = remainingWear / wearRate;

    return {
      toolId,
      wearRate,
      remainingMinutes,
      predictedFailure: new Date(Date.now() + remainingMinutes * 60 * 1000).toISOString(),
    };
  }

  /**
   * Replace tool
   * @param {string} toolId - Tool identifier
   * @returns {boolean} - True if replaced
   */
  replaceTool(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    tool.active = false;
    this.stats.toolsReplaced++;

    this.emit('toolReplaced', {
      toolId,
      replacementTime: Date.now(),
    });

    return true;
  }

  /**
   * Get tool status
   * @param {string} toolId - Tool identifier
   * @returns {object} - Tool status
   */
  getToolStatus(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    const prediction = this.predictRemainingLife(toolId);

    return {
      id: tool.id,
      type: tool.type,
      material: tool.material,
      active: tool.active,
      lastMeasurement: tool.lastMeasurement,
      wearRate: this.calculateWearRate(toolId),
      ...prediction,
    };
  }

  /**
   * Get all tools
   * @returns {array} - Tool list
   */
  getTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Get system statistics
   * @returns {object} - Statistics
   */
  getStatistics() {
    return {
      toolsMonitored: this.stats.toolsMonitored,
      breakagesDetected: this.stats.breakagesDetected,
      toolsReplaced: this.stats.toolsReplaced,
      activeTool: Array.from(this.tools.values()).filter((t) => t.active).length,
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
