/**
 * Failure Predictor
 * Phase 18: AI & Machine Learning
 *
 * Predicts machine/tool failures:
 * - Tool breakage risk
 * - Spindle bearing fatigue
 * - Surface finish degradation
 * - Machine component wear
 * - Preventive maintenance triggers
 */

export class FailurePredictor {
  constructor(options = {}) {
    this.options = {
      enableAnomalyDetection: options.enableAnomalyDetection !== false,
      enablePredictive: options.enablePredictive !== false,
      baselineWindow: options.baselineWindow || 100,
      thresholdSensitivity: options.thresholdSensitivity || 0.8,
      ...options,
    };

    this.operationHistory = [];
    this.failureHistory = [];
    this.predictions = [];
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
   * Predict tool breakage
   */
  predictToolBreakage(params) {
    if (!params || !params.toolId) {
      throw new Error('Tool breakage prediction requires toolId');
    }

    const {
      toolId,
      currentUsageHours = 0,
      vibrationLevel = 0,
      toolTemperature = 0,
      surfaceFinish = 0,
      chipControl = 'NORMAL',
    } = params;

    // Get historical data
    const history = this.operationHistory.filter((h) => h.toolId === toolId);

    if (history.length === 0) {
      return {
        toolId,
        riskLevel: 'UNKNOWN',
        breakageProbability: 0,
        recommendation: 'No historical data',
      };
    }

    // Calculate risk factors
    const usageRisk = this._calculateUsageRisk(history, currentUsageHours);
    const vibrationRisk = this._analyzeVibrationRisk(vibrationLevel);
    const thermalRisk = this._analyzeThermalRisk(toolTemperature);
    const chipRisk = this._analyzeChipControlRisk(chipControl);
    const surfaceRisk = this._analyzeSurfaceQualityRisk(history, surfaceFinish);

    // Combine risks using weighted model
    const combinedRisk =
      (usageRisk * 0.3 +
        vibrationRisk * 0.25 +
        thermalRisk * 0.2 +
        chipRisk * 0.15 +
        surfaceRisk * 0.1) *
      100;

    const riskLevel = this._classifyRiskLevel(combinedRisk);

    const prediction = {
      id: this._generateId(),
      timestamp: Date.now(),
      toolId,
      breakageProbability: parseFloat(Math.min(combinedRisk, 100).toFixed(1)),
      riskLevel,
      riskFactors: {
        usage: parseFloat(usageRisk.toFixed(1)),
        vibration: parseFloat(vibrationRisk.toFixed(1)),
        thermal: parseFloat(thermalRisk.toFixed(1)),
        chipControl: parseFloat(chipRisk.toFixed(1)),
        surfaceQuality: parseFloat(surfaceRisk.toFixed(1)),
      },
      estimatedRemainingLife: Math.max(0, 100 - combinedRisk),
      recommendation: this._generateToolRecommendation(riskLevel),
      actions: this._generateActions(riskLevel),
    };

    this.predictions.push(prediction);

    if (riskLevel === 'CRITICAL') {
      this.emit('failure:predicted-critical', prediction);
    } else {
      this.emit('failure:predicted', prediction);
    }

    return prediction;
  }

  /**
   * Predict spindle bearing fatigue
   */
  predictSpindleFatigue(params) {
    if (!params || !params.machineId) {
      throw new Error('Spindle fatigue prediction requires machineId');
    }

    const {
      machineId,
      spindleRPM = 0,
      operatingHours = 0,
      vibrationAxial = 0,
      vibrationRadial = 0,
      noiseLevel = 0,
      temperature = 0,
    } = params;

    // Get historical spindle data
    const history = this.operationHistory.filter((h) => h.machineId === machineId);

    // Calculate bearing fatigue indicators
    const rpmFatigue = this._calculateRPMFatigue(spindleRPM, operatingHours);
    const vibrationFatigue = this._calculateVibrationFatigue(vibrationAxial, vibrationRadial);
    const noiseFatigue = this._calculateNoiseFatigue(noiseLevel);
    const thermalFatigue = this._calculateThermalFatigue(temperature);

    const combinedFatigue =
      (rpmFatigue * 0.3 + vibrationFatigue * 0.35 + noiseFatigue * 0.2 + thermalFatigue * 0.15) *
      100;

    const fatigueLevel = this._classifyFatigueLevel(combinedFatigue);

    const prediction = {
      id: this._generateId(),
      timestamp: Date.now(),
      machineId,
      fatiguePercentage: parseFloat(Math.min(combinedFatigue, 100).toFixed(1)),
      fatigueLevel,
      indicators: {
        rpm: parseFloat(rpmFatigue.toFixed(1)),
        vibration: parseFloat(vibrationFatigue.toFixed(1)),
        noise: parseFloat(noiseFatigue.toFixed(1)),
        thermal: parseFloat(thermalFatigue.toFixed(1)),
      },
      estimatedBearingLife: Math.max(0, 500 - combinedFatigue * 5),
      maintenanceSchedule: this._getMaintenanceSchedule(fatigueLevel),
      recommendation: this._generateSpindleRecommendation(fatigueLevel),
    };

    this.predictions.push(prediction);

    if (fatigueLevel === 'CRITICAL') {
      this.emit('failure:spindle-critical', prediction);
    }

    return prediction;
  }

  /**
   * Predict surface finish degradation
   */
  predictSurfaceDegradation(params) {
    if (!params) {
      throw new Error('Surface degradation prediction requires parameters');
    }

    const {
      material,
      toolType,
      currentUsagePercent = 0,
      feedRate = 0,
      spindleSpeed = 0,
      depthOfCut = 0,
      lastSurfaceFinish = 0,
      passCount = 0,
    } = params;

    // Estimate tool wear effect on surface finish
    const wearEffect = currentUsagePercent * 0.6;
    const feedEffect = this._calculateFeedEffect(feedRate);
    const depthEffect = this._calculateDepthEffect(depthOfCut);
    const cumulativeEffect = wearEffect + feedEffect + depthEffect;

    // Calculate degradation
    const estimatedSurfaceFinish = Math.max(
      lastSurfaceFinish,
      lastSurfaceFinish * (1 + cumulativeEffect / 100)
    );

    const degradationPercent = parseFloat(
      (((estimatedSurfaceFinish - lastSurfaceFinish) / lastSurfaceFinish) * 100).toFixed(1)
    );

    const degradationLevel = this._classifyDegradationLevel(degradationPercent);

    const prediction = {
      id: this._generateId(),
      timestamp: Date.now(),
      material,
      toolType,
      currentSurfaceFinish: lastSurfaceFinish,
      estimatedSurfaceFinish: parseFloat(estimatedSurfaceFinish.toFixed(2)),
      degradationPercent,
      degradationLevel,
      contributingFactors: {
        toolWear: wearEffect,
        feedRate: feedEffect,
        depthOfCut: depthEffect,
      },
      interventionNeeded: degradationPercent > 15,
      recommendation: this._generateSurfaceRecommendation(degradationLevel),
    };

    this.predictions.push(prediction);

    this.emit('failure:surface-degradation', prediction);

    return prediction;
  }

  /**
   * Predict machine component wear
   */
  predictComponentWear(params) {
    if (!params || !params.machineId || !params.component) {
      throw new Error('Component wear prediction requires machineId and component');
    }

    const {
      machineId,
      component, // SPINDLE_BEARING, BALLSCREW, SERVO_MOTOR, LEADSCREW
      operatingHours = 0,
      cycleCount = 0,
      loadFactor = 1,
      coolingIntegrity = 1,
    } = params;

    // Get component-specific wear data
    const history = this.operationHistory.filter(
      (h) => h.machineId === machineId && h.component === component
    );

    const wearFactors = this._getComponentWearFactors(component);
    const calculatedWear = this._calculateComponentWear(
      component,
      operatingHours,
      cycleCount,
      loadFactor,
      coolingIntegrity,
      wearFactors
    );

    const wearLevel = this._classifyWearLevel(calculatedWear);

    const prediction = {
      id: this._generateId(),
      timestamp: Date.now(),
      machineId,
      component,
      wearPercentage: parseFloat(Math.min(calculatedWear, 100).toFixed(1)),
      wearLevel,
      operatingHours,
      cycleCount,
      expectedLifetime: wearFactors.expectedHours,
      remainingLife: Math.max(0, wearFactors.expectedHours - operatingHours),
      maintenanceInterval: this._getComponentMaintenanceInterval(wearLevel, component),
      recommendation: this._generateComponentRecommendation(wearLevel, component),
    };

    this.predictions.push(prediction);

    if (wearLevel === 'CRITICAL') {
      this.emit('failure:component-critical', prediction);
    }

    return prediction;
  }

  /**
   * Record operation for historical analysis
   */
  recordOperation(params) {
    if (!params) {
      throw new Error('Operation recording requires parameters');
    }

    const {
      machineId,
      toolId,
      component = null,
      duration = 0,
      metrics = {},
      status = 'SUCCESS',
    } = params;

    const operation = {
      timestamp: Date.now(),
      machineId,
      toolId,
      component,
      duration,
      metrics,
      status,
    };

    this.operationHistory.push(operation);

    this.emit('operation:recorded', operation);

    return { status: 'RECORDED', timestamp: operation.timestamp };
  }

  /**
   * Record actual failure for model training
   */
  recordFailure(params) {
    if (!params || !params.failureType) {
      throw new Error('Failure recording requires failureType');
    }

    const {
      failureType,
      machineId = null,
      toolId = null,
      component = null,
      description = '',
      severity = 'MEDIUM',
    } = params;

    const failure = {
      id: this._generateId(),
      timestamp: Date.now(),
      failureType,
      machineId,
      toolId,
      component,
      description,
      severity,
    };

    this.failureHistory.push(failure);

    this.emit('failure:recorded', failure);

    return failure.id;
  }

  /**
   * Get failure summary
   */
  getFailureSummary() {
    const summary = {
      totalPredictions: this.predictions.length,
      criticalPredictions: this.predictions.filter(
        (p) => p.riskLevel === 'CRITICAL' || p.fatigueLevel === 'CRITICAL'
      ).length,
      recordedFailures: this.failureHistory.length,
      failuresByType: {},
      preventedFailures: 0, // Would count actual prevented failures
    };

    // Count by type
    for (const failure of this.failureHistory) {
      summary.failuresByType[failure.failureType] =
        (summary.failuresByType[failure.failureType] || 0) + 1;
    }

    return summary;
  }

  /**
   * Helper: Calculate usage risk
   */
  _calculateUsageRisk(history, currentUsageHours) {
    const averageUsage =
      history.reduce((sum, h) => sum + (h.duration || 0), 0) / Math.max(1, history.length);
    const usageRatio = Math.min(currentUsageHours / Math.max(1, averageUsage * 100), 1);
    return usageRatio * 0.9;
  }

  /**
   * Helper: Analyze vibration risk
   */
  _analyzeVibrationRisk(vibrationLevel) {
    if (vibrationLevel < 0.3) return 0.1;
    if (vibrationLevel < 0.6) return 0.4;
    if (vibrationLevel < 0.8) return 0.7;
    return 0.95;
  }

  /**
   * Helper: Analyze thermal risk
   */
  _analyzeThermalRisk(temperature) {
    if (temperature < 40) return 0.1;
    if (temperature < 60) return 0.3;
    if (temperature < 80) return 0.6;
    return 0.9;
  }

  /**
   * Helper: Analyze chip control risk
   */
  _analyzeChipControlRisk(chipControl) {
    const risks = {
      NORMAL: 0.1,
      IRREGULAR: 0.4,
      POOR: 0.7,
      SEVERE: 0.95,
    };

    return risks[chipControl] || 0.5;
  }

  /**
   * Helper: Analyze surface quality risk
   */
  _analyzeSurfaceQualityRisk(history, currentSurfaceFinish) {
    if (history.length === 0) return 0.3;

    const previousFinishes = history.map((h) => h.metrics?.surfaceFinish || 0).filter((f) => f > 0);
    if (previousFinishes.length === 0) return 0.3;

    const averageFinish = previousFinishes.reduce((a, b) => a + b, 0) / previousFinishes.length;
    const degradation = (currentSurfaceFinish - averageFinish) / Math.max(1, averageFinish);

    return Math.min(Math.max(degradation, 0), 0.95);
  }

  /**
   * Helper: Classify risk level
   */
  _classifyRiskLevel(probability) {
    if (probability < 20) return 'LOW';
    if (probability < 50) return 'MEDIUM';
    if (probability < 80) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Helper: Classify fatigue level
   */
  _classifyFatigueLevel(percentage) {
    if (percentage < 30) return 'HEALTHY';
    if (percentage < 60) return 'AGING';
    if (percentage < 85) return 'FATIGUED';
    return 'CRITICAL';
  }

  /**
   * Helper: Classify degradation level
   */
  _classifyDegradationLevel(percent) {
    if (percent < 5) return 'MINIMAL';
    if (percent < 15) return 'MODERATE';
    if (percent < 30) return 'SIGNIFICANT';
    return 'SEVERE';
  }

  /**
   * Helper: Classify wear level
   */
  _classifyWearLevel(percentage) {
    if (percentage < 30) return 'GOOD';
    if (percentage < 60) return 'FAIR';
    if (percentage < 80) return 'WORN';
    return 'CRITICAL';
  }

  /**
   * Helper: Generate tool recommendation
   */
  _generateToolRecommendation(riskLevel) {
    const recommendations = {
      LOW: 'Continue normal operation',
      MEDIUM: 'Monitor tool performance closely',
      HIGH: 'Plan tool replacement soon',
      CRITICAL: 'Replace tool immediately',
    };

    return recommendations[riskLevel] || 'Monitor tool';
  }

  /**
   * Helper: Generate spindle recommendation
   */
  _generateSpindleRecommendation(fatigueLevel) {
    const recommendations = {
      HEALTHY: 'Continue normal operation',
      AGING: 'Schedule maintenance at next opportunity',
      FATIGUED: 'Schedule bearing replacement soon',
      CRITICAL: 'Replace bearings immediately',
    };

    return recommendations[fatigueLevel] || 'Schedule maintenance';
  }

  /**
   * Helper: Generate surface recommendation
   */
  _generateSurfaceRecommendation(degradationLevel) {
    const recommendations = {
      MINIMAL: 'Surface finish acceptable',
      MODERATE: 'Monitor surface finish',
      SIGNIFICANT: 'Consider tool replacement',
      SEVERE: 'Replace tool and adjust parameters',
    };

    return recommendations[degradationLevel] || 'Monitor surface';
  }

  /**
   * Helper: Generate component recommendation
   */
  _generateComponentRecommendation(wearLevel, component) {
    if (wearLevel === 'CRITICAL') {
      return `Replace ${component} immediately`;
    } else if (wearLevel === 'WORN') {
      return `Schedule ${component} replacement soon`;
    }

    return `Monitor ${component} condition`;
  }

  /**
   * Helper: Generate actions
   */
  _generateActions(riskLevel) {
    const actions = {
      LOW: [],
      MEDIUM: ['Monitor next 10 hours', 'Record performance data'],
      HIGH: ['Reduce parameters', 'Prepare replacement tool', 'Increase monitoring frequency'],
      CRITICAL: ['Stop operation', 'Replace tool immediately', 'Inspect machine for damage'],
    };

    return actions[riskLevel] || [];
  }

  /**
   * Helper: Calculate RPM fatigue
   */
  _calculateRPMFatigue(rpm, hours) {
    const rpmFatigue = Math.min((rpm / 24000) * 0.7, 1);
    const timeFatigue = Math.min((hours / 2000) * 0.3, 1);
    return rpmFatigue + timeFatigue;
  }

  /**
   * Helper: Calculate vibration fatigue
   */
  _calculateVibrationFatigue(axial, radial) {
    const axialFactor = Math.min(axial / 1, 1);
    const radialFactor = Math.min(radial / 0.5, 1);
    return axialFactor * 0.5 + radialFactor * 0.5;
  }

  /**
   * Helper: Calculate noise fatigue
   */
  _calculateNoiseFatigue(noiseLevel) {
    return Math.min(noiseLevel / 100, 1);
  }

  /**
   * Helper: Calculate thermal fatigue
   */
  _calculateThermalFatigue(temperature) {
    const baseFatigue = Math.min((temperature - 20) / 60, 1);
    return Math.max(0, baseFatigue);
  }

  /**
   * Helper: Get maintenance schedule
   */
  _getMaintenanceSchedule(fatigueLevel) {
    const schedules = {
      HEALTHY: '6 months',
      AGING: '3 months',
      FATIGUED: '1 month',
      CRITICAL: 'Immediate',
    };

    return schedules[fatigueLevel] || 'TBD';
  }

  /**
   * Helper: Calculate feed effect
   */
  _calculateFeedEffect(feedRate) {
    return Math.min((feedRate / 500) * 0.3, 0.3);
  }

  /**
   * Helper: Calculate depth effect
   */
  _calculateDepthEffect(depthOfCut) {
    return Math.min((depthOfCut / 5) * 0.2, 0.2);
  }

  /**
   * Helper: Get component wear factors
   */
  _getComponentWearFactors(component) {
    const factors = {
      SPINDLE_BEARING: { expectedHours: 2000, cycleMultiplier: 0.001 },
      BALLSCREW: { expectedHours: 5000, cycleMultiplier: 0.0005 },
      SERVO_MOTOR: { expectedHours: 3000, cycleMultiplier: 0.0008 },
      LEADSCREW: { expectedHours: 1500, cycleMultiplier: 0.002 },
    };

    return factors[component] || { expectedHours: 2000, cycleMultiplier: 0.001 };
  }

  /**
   * Helper: Calculate component wear
   */
  _calculateComponentWear(component, hours, cycles, loadFactor, cooling, factors) {
    const hourWear = (hours / factors.expectedHours) * 70;
    const cycleWear = Math.min(cycles * factors.cycleMultiplier, 30) * loadFactor;
    const coolingEffect = (1 - cooling) * 10;

    return Math.min(hourWear + cycleWear + coolingEffect, 100);
  }

  /**
   * Helper: Get component maintenance interval
   */
  _getComponentMaintenanceInterval(wearLevel, component) {
    const intervals = {
      GOOD: '12 months',
      FAIR: '6 months',
      WORN: '3 months',
      CRITICAL: 'Immediate',
    };

    return intervals[wearLevel] || 'TBD';
  }

  /**
   * Helper: Generate ID
   */
  _generateId() {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Statistics
   */
  getStatistics() {
    return {
      totalPredictions: this.predictions.length,
      criticalPredictions: this.predictions.filter(
        (p) => p.riskLevel === 'CRITICAL' || p.fatigueLevel === 'CRITICAL'
      ).length,
      recordedFailures: this.failureHistory.length,
      operationRecords: this.operationHistory.length,
      timestamp: Date.now(),
    };
  }
}

export default FailurePredictor;
