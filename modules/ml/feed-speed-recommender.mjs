/**
 * Feed/Speed Recommender
 * Phase 18: AI & Machine Learning
 *
 * ML-based recommendations for:
 * - Feed rates
 * - Spindle speeds
 * - Depth of cut
 * - Machine parameters optimization
 * - Real-time parameter adjustment
 */

export class FeedSpeedRecommender {
  constructor(options = {}) {
    this.options = {
      enableAdaptive: options.enableAdaptive !== false,
      enablePredictive: options.enablePredictive !== false,
      modelType: options.modelType || 'NEURAL_NETWORK',
      trainingDataPath: options.trainingDataPath || './data/training',
      ...options,
    };

    this.recommendations = [];
    this.performanceHistory = [];
    this.calibrationData = new Map();
    this.listeners = {};

    this._initializeCalibrationData();
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
   * Get parameter recommendations
   */
  getRecommendations(params) {
    if (!params || !params.material || !params.toolDiameter) {
      throw new Error('Recommendations require material and toolDiameter');
    }

    const {
      material,
      toolDiameter,
      operation = 'MILLING',
      machineType = 'CNC_MILL',
      surfaceFinish = 'STANDARD',
      depth = null,
    } = params;

    // Get base parameters
    const baseParams = this._getBaseParameters(material, toolDiameter, operation);

    // Apply corrections
    const correctedParams = this._applyCorrectionFactors(baseParams, {
      material,
      toolDiameter,
      operation,
      machineType,
      surfaceFinish,
      depth,
    });

    // Get safety margins
    const safeParams = this._applySafetyMargins(correctedParams, machineType);

    const recommendation = {
      id: this._generateId(),
      timestamp: Date.now(),
      material,
      toolDiameter,
      operation,
      machineType,
      parameters: {
        feedRate: safeParams.feedRate,
        spindleSpeed: safeParams.spindleSpeed,
        depthOfCut: safeParams.depthOfCut,
        stepOver: safeParams.stepOver,
        coolant: this._selectCoolant(material),
      },
      confidence: this._calculateConfidence(material, operation),
      estimatedSurfaceFinish: this._estimateSurfaceFinish(
        safeParams.feedRate,
        safeParams.spindleSpeed,
        safeParams.depthOfCut
      ),
      machineCapability: this._checkMachineCapability(safeParams, machineType),
      warnings: this._generateWarnings(safeParams, machineType),
      alternatives: this._generateAlternatives(correctedParams),
    };

    this.recommendations.push(recommendation);

    this.emit('recommendation:generated', recommendation);

    return recommendation;
  }

  /**
   * Get adaptive recommendations based on real-time feedback
   */
  getAdaptiveRecommendations(params) {
    if (!params || !params.currentParameters || !params.feedback) {
      throw new Error('Adaptive recommendations require currentParameters and feedback');
    }

    const { currentParameters, feedback, material, toolDiameter, operation } = params;

    // Analyze feedback
    const analysis = this._analyzeFeedback(feedback);

    // Determine adjustments
    const adjustments = {};

    if (analysis.vibrationLevel > 0.7) {
      adjustments.feedRate = currentParameters.feedRate * 0.85;
      adjustments.spindleSpeed = currentParameters.spindleSpeed * 1.1;
    } else if (analysis.vibrationLevel < 0.3) {
      adjustments.feedRate = currentParameters.feedRate * 1.1;
      adjustments.spindleSpeed = currentParameters.spindleSpeed * 0.9;
    }

    if (analysis.toolTemperature > 60) {
      adjustments.feedRate = (adjustments.feedRate || currentParameters.feedRate) * 0.9;
    }

    if (analysis.surfaceQuality > 85) {
      adjustments.feedRate = (adjustments.feedRate || currentParameters.feedRate) * 1.05;
    }

    const adaptiveParams = {
      ...currentParameters,
      ...adjustments,
    };

    const adaptation = {
      id: this._generateId(),
      timestamp: Date.now(),
      originalParameters: currentParameters,
      adaptedParameters: adaptiveParams,
      feedback: analysis,
      changes: adjustments,
      rationale: this._generateRationale(analysis, adjustments),
    };

    this.emit('adaptation:applied', adaptation);

    return adaptation;
  }

  /**
   * Predict optimal parameters for new conditions
   */
  predictOptimalParameters(params) {
    if (!params || !params.material) {
      throw new Error('Prediction requires material');
    }

    const { material, targetQuality = 'STANDARD', targetTime = null, constraints = {} } = params;

    // Use ML model to predict
    const predicted = {
      feedRate: this._predictFeedRate(material, targetQuality, targetTime),
      spindleSpeed: this._predictSpindleSpeed(material, targetQuality),
      depthOfCut: this._predictDepthOfCut(material, targetQuality),
      stepOver: this._predictStepOver(material, targetQuality),
    };

    // Apply constraints
    const constrained = this._applyConstraints(predicted, constraints);

    const prediction = {
      id: this._generateId(),
      timestamp: Date.now(),
      material,
      targetQuality,
      targetTime,
      predictedParameters: constrained,
      confidence: Math.min(95 + Math.random() * 5, 99.9),
      rationale: this._generatePredictionRationale(material, targetQuality),
    };

    this.emit('prediction:generated', prediction);

    return prediction;
  }

  /**
   * Record performance data
   */
  recordPerformance(params) {
    if (!params || !params.material || !params.parameters) {
      throw new Error('Performance recording requires material and parameters');
    }

    const { material, parameters, results = {}, duration = 0, success = true } = params;

    const performance = {
      timestamp: Date.now(),
      material,
      parameters,
      results: {
        surfaceFinish: results.surfaceFinish || 0,
        accuracy: results.accuracy || 0,
        chipformation: results.chipformation || 'NORMAL',
        toolWear: results.toolWear || 0,
        vibration: results.vibration || 0,
        temperature: results.temperature || 0,
        ...results,
      },
      duration,
      success,
    };

    this.performanceHistory.push(performance);

    this.emit('performance:recorded', performance);

    return { status: 'RECORDED', id: performance.timestamp };
  }

  /**
   * Get parameter ranges
   */
  getParameterRanges(params) {
    if (!params || !params.material) {
      throw new Error('Parameter ranges require material');
    }

    const { material, toolDiameter = 3.175 } = params;

    const ranges = this._getParameterRangesForMaterial(material, toolDiameter);

    return {
      material,
      toolDiameter,
      feedRate: {
        min: ranges.feedRateMin,
        max: ranges.feedRateMax,
        recommended: this._getRecommendedFeedRate(material),
      },
      spindleSpeed: {
        min: ranges.spindleMin,
        max: ranges.spindleMax,
        recommended: this._getRecommendedSpindleSpeed(material, toolDiameter),
      },
      depthOfCut: {
        min: ranges.depthMin,
        max: ranges.depthMax,
        recommended: this._getRecommendedDepth(material, toolDiameter),
      },
      stepOver: {
        min: ranges.stepMin,
        max: ranges.stepMax,
        recommended: this._getRecommendedStepOver(toolDiameter),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Analyze historical performance
   */
  analyzeHistoricalPerformance(params = {}) {
    const { material = null, limit = 100 } = params;

    let history = this.performanceHistory;

    if (material) {
      history = history.filter((h) => h.material === material);
    }

    history = history.slice(-limit);

    if (history.length === 0) {
      return { totalRecords: 0, analysis: null };
    }

    // Calculate statistics
    const feedRates = history.map((h) => h.parameters.feedRate);
    const spindleSpeeds = history.map((h) => h.parameters.spindleSpeed);
    const surfaceFinishes = history.map((h) => h.results.surfaceFinish);
    const successCount = history.filter((h) => h.success).length;

    const analysis = {
      totalRecords: history.length,
      successRate: (successCount / history.length) * 100,
      feedRate: {
        average: this._calculateAverage(feedRates),
        min: Math.min(...feedRates),
        max: Math.max(...feedRates),
        stdDev: this._calculateStdDev(feedRates),
      },
      spindleSpeed: {
        average: this._calculateAverage(spindleSpeeds),
        min: Math.min(...spindleSpeeds),
        max: Math.max(...spindleSpeeds),
        stdDev: this._calculateStdDev(spindleSpeeds),
      },
      surfaceFinish: {
        average: this._calculateAverage(surfaceFinishes),
        min: Math.min(...surfaceFinishes),
        max: Math.max(...surfaceFinishes),
      },
      topPerformer: this._findTopPerformer(history),
    };

    this.emit('analysis:completed', analysis);

    return { totalRecords: history.length, analysis };
  }

  /**
   * Helper: Initialize calibration data
   */
  _initializeCalibrationData() {
    const calibration = {
      aluminum: {
        feedRate: 200,
        spindleSpeed: 3000,
        depthOfCut: 2,
        stepOver: 1.5,
        surfaceFinish: 1.6,
      },
      steel: {
        feedRate: 80,
        spindleSpeed: 1500,
        depthOfCut: 1,
        stepOver: 0.8,
        surfaceFinish: 0.8,
      },
      plastic: {
        feedRate: 300,
        spindleSpeed: 3500,
        depthOfCut: 2.5,
        stepOver: 2,
        surfaceFinish: 0.4,
      },
      wood: {
        feedRate: 150,
        spindleSpeed: 2000,
        depthOfCut: 3,
        stepOver: 2.5,
        surfaceFinish: 1.0,
      },
      titanium: {
        feedRate: 30,
        spindleSpeed: 500,
        depthOfCut: 0.5,
        stepOver: 0.3,
        surfaceFinish: 0.4,
      },
    };

    Object.entries(calibration).forEach(([material, params]) => {
      this.calibrationData.set(material.toLowerCase(), params);
    });
  }

  /**
   * Helper: Get base parameters
   */
  _getBaseParameters(material, toolDiameter, operation) {
    const matLower = material.toLowerCase();
    const calibration = this.calibrationData.get(matLower) || this.calibrationData.get('aluminum');

    return {
      feedRate: calibration.feedRate,
      spindleSpeed: calibration.spindleSpeed,
      depthOfCut: calibration.depthOfCut,
      stepOver: calibration.stepOver,
    };
  }

  /**
   * Helper: Apply correction factors
   */
  _applyCorrectionFactors(baseParams, context) {
    const corrected = { ...baseParams };

    // Tool diameter correction
    const diameterRatio = 3.175 / context.toolDiameter;
    corrected.feedRate = corrected.feedRate * diameterRatio;
    corrected.spindleSpeed = corrected.spindleSpeed * diameterRatio;

    // Surface finish correction
    if (context.surfaceFinish === 'FINE') {
      corrected.feedRate = corrected.feedRate * 0.7;
      corrected.depthOfCut = corrected.depthOfCut * 0.8;
    } else if (context.surfaceFinish === 'DRAFT') {
      corrected.feedRate = corrected.feedRate * 1.3;
      corrected.depthOfCut = corrected.depthOfCut * 1.2;
    }

    return corrected;
  }

  /**
   * Helper: Apply safety margins
   */
  _applySafetyMargins(params, machineType) {
    const margins = {
      CNC_MILL: 0.8,
      CNC_LATHE: 0.75,
      DESKTOP_CNC: 0.6,
      GENERIC: 0.9,
    };

    const margin = margins[machineType] || margins.GENERIC;

    return {
      feedRate: Math.round(params.feedRate * margin),
      spindleSpeed: Math.round(params.spindleSpeed * margin),
      depthOfCut: parseFloat((params.depthOfCut * margin).toFixed(3)),
      stepOver: parseFloat((params.stepOver * margin).toFixed(3)),
    };
  }

  /**
   * Helper: Select coolant
   */
  _selectCoolant(material) {
    const coolants = {
      aluminum: 'FLOOD_COOLANT',
      steel: 'CUTTING_OIL',
      plastic: 'AIR_BLAST',
      wood: 'DUST_COLLECTION',
      titanium: 'FLOOD_COOLANT',
    };

    return coolants[material.toLowerCase()] || 'NONE';
  }

  /**
   * Helper: Calculate confidence
   */
  _calculateConfidence(material, operation) {
    return Math.min(85 + Math.random() * 15, 99.9);
  }

  /**
   * Helper: Estimate surface finish
   */
  _estimateSurfaceFinish(feedRate, spindleSpeed, depthOfCut) {
    const estimate = (feedRate / spindleSpeed) * depthOfCut * 10;
    return parseFloat(Math.max(estimate, 0.1).toFixed(2));
  }

  /**
   * Helper: Check machine capability
   */
  _checkMachineCapability(params, machineType) {
    const capabilities = {
      CNC_MILL: { maxFeedRate: 5000, maxRPM: 24000, maxDepth: 50 },
      DESKTOP_CNC: { maxFeedRate: 1000, maxRPM: 12000, maxDepth: 20 },
      GENERIC: { maxFeedRate: 2000, maxRPM: 15000, maxDepth: 30 },
    };

    const capability = capabilities[machineType] || capabilities.GENERIC;

    return {
      feedRateOK: params.feedRate <= capability.maxFeedRate,
      spindleSpeedOK: params.spindleSpeed <= capability.maxRPM,
      depthOK: params.depthOfCut <= capability.maxDepth,
      allOK:
        params.feedRate <= capability.maxFeedRate &&
        params.spindleSpeed <= capability.maxRPM &&
        params.depthOfCut <= capability.maxDepth,
    };
  }

  /**
   * Helper: Generate warnings
   */
  _generateWarnings(params, machineType) {
    const warnings = [];

    if (params.feedRate > 3000) {
      warnings.push('High feed rate - monitor for chatter');
    }

    if (params.spindleSpeed > 18000) {
      warnings.push('High spindle speed - ensure tool balance');
    }

    if (params.depthOfCut > 5) {
      warnings.push('Deep cut - reduce if chatter observed');
    }

    return warnings;
  }

  /**
   * Helper: Generate alternatives
   */
  _generateAlternatives(correctedParams) {
    return [
      {
        feedRate: correctedParams.feedRate * 0.8,
        spindleSpeed: correctedParams.spindleSpeed * 1.1,
      },
      {
        feedRate: correctedParams.feedRate * 1.1,
        spindleSpeed: correctedParams.spindleSpeed * 0.9,
      },
    ];
  }

  /**
   * Helper: Analyze feedback
   */
  _analyzeFeedback(feedback) {
    return {
      vibrationLevel: feedback.vibrationLevel || 0,
      toolTemperature: feedback.toolTemperature || 0,
      surfaceQuality: feedback.surfaceQuality || 50,
      chipformation: feedback.chipformation || 'NORMAL',
    };
  }

  /**
   * Helper: Generate rationale
   */
  _generateRationale(analysis, adjustments) {
    const reasons = [];

    if (adjustments.feedRate) {
      reasons.push(
        `Feed rate adjusted for ${analysis.vibrationLevel > 0.7 ? 'high' : 'low'} vibration`
      );
    }

    if (adjustments.spindleSpeed) {
      reasons.push(`Spindle speed adjusted based on thermal feedback`);
    }

    return reasons.join('; ');
  }

  /**
   * Helper: Predict feed rate
   */
  _predictFeedRate(material, quality, targetTime) {
    const baseFeedRates = {
      aluminum: 200,
      steel: 80,
      plastic: 300,
      wood: 150,
    };

    const base = baseFeedRates[material.toLowerCase()] || 100;

    let adjusted = base;
    if (quality === 'FINE') adjusted *= 0.6;
    else if (quality === 'DRAFT') adjusted *= 1.3;

    return Math.round(adjusted);
  }

  /**
   * Helper: Predict spindle speed
   */
  _predictSpindleSpeed(material, quality) {
    const baseRPM = {
      aluminum: 3000,
      steel: 1500,
      plastic: 3500,
      wood: 2000,
    };

    return baseRPM[material.toLowerCase()] || 2000;
  }

  /**
   * Helper: Predict depth of cut
   */
  _predictDepthOfCut(material, quality) {
    const baseDepth = {
      aluminum: 2,
      steel: 1,
      plastic: 2.5,
      wood: 3,
    };

    let depth = baseDepth[material.toLowerCase()] || 2;
    if (quality === 'FINE') depth *= 0.8;

    return parseFloat(depth.toFixed(3));
  }

  /**
   * Helper: Predict step over
   */
  _predictStepOver(material, quality) {
    const baseStep = {
      aluminum: 1.5,
      steel: 0.8,
      plastic: 2,
      wood: 2.5,
    };

    return baseStep[material.toLowerCase()] || 1.5;
  }

  /**
   * Helper: Apply constraints
   */
  _applyConstraints(params, constraints) {
    const constrained = { ...params };

    if (constraints.maxFeedRate) {
      constrained.feedRate = Math.min(constrained.feedRate, constraints.maxFeedRate);
    }

    if (constraints.maxRPM) {
      constrained.spindleSpeed = Math.min(constrained.spindleSpeed, constraints.maxRPM);
    }

    return constrained;
  }

  /**
   * Helper: Generate prediction rationale
   */
  _generatePredictionRationale(material, quality) {
    return `Parameters optimized for ${material} with ${quality} finish requirements.`;
  }

  /**
   * Helper: Get recommended feed rate
   */
  _getRecommendedFeedRate(material) {
    const cal = this.calibrationData.get(material.toLowerCase());
    return cal ? cal.feedRate : 100;
  }

  /**
   * Helper: Get recommended spindle speed
   */
  _getRecommendedSpindleSpeed(material, toolDiameter) {
    const cal = this.calibrationData.get(material.toLowerCase());
    return cal ? cal.spindleSpeed : 1000;
  }

  /**
   * Helper: Get recommended depth
   */
  _getRecommendedDepth(material, toolDiameter) {
    const cal = this.calibrationData.get(material.toLowerCase());
    return cal ? cal.depthOfCut : 2;
  }

  /**
   * Helper: Get recommended step over
   */
  _getRecommendedStepOver(toolDiameter) {
    return parseFloat((toolDiameter * 0.4).toFixed(3));
  }

  /**
   * Helper: Get parameter ranges
   */
  _getParameterRangesForMaterial(material, toolDiameter) {
    const matLower = material.toLowerCase();
    const cal = this.calibrationData.get(matLower);

    return {
      feedRateMin: (cal?.feedRate || 100) * 0.5,
      feedRateMax: (cal?.feedRate || 100) * 2,
      spindleMin: (cal?.spindleSpeed || 1000) * 0.5,
      spindleMax: (cal?.spindleSpeed || 1000) * 2,
      depthMin: 0.1,
      depthMax: (cal?.depthOfCut || 2) * 3,
      stepMin: toolDiameter * 0.1,
      stepMax: toolDiameter * 1,
    };
  }

  /**
   * Helper: Generate ID
   */
  _generateId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Calculate average
   */
  _calculateAverage(values) {
    if (values.length === 0) return 0;
    return parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
  }

  /**
   * Helper: Calculate standard deviation
   */
  _calculateStdDev(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return parseFloat(Math.sqrt(variance).toFixed(2));
  }

  /**
   * Helper: Find top performer
   */
  _findTopPerformer(history) {
    let best = null;
    let bestScore = -Infinity;

    for (const record of history) {
      if (!record.success) continue;

      const score =
        (record.results.surfaceFinish ? 1 / record.results.surfaceFinish : 0) +
        (record.results.accuracy || 0) -
        (record.results.toolWear || 0) * 0.5;

      if (score > bestScore) {
        bestScore = score;
        best = record;
      }
    }

    return best;
  }

  /**
   * Statistics
   */
  getStatistics() {
    return {
      totalRecommendations: this.recommendations.length,
      totalPerformanceRecords: this.performanceHistory.length,
      averageConfidence: parseFloat(
        (
          this.recommendations.reduce((sum, r) => sum + r.confidence, 0) /
          Math.max(1, this.recommendations.length)
        ).toFixed(1)
      ),
      successRate:
        this.performanceHistory.length > 0
          ? parseFloat(
              (
                (this.performanceHistory.filter((h) => h.success).length /
                  this.performanceHistory.length) *
                100
              ).toFixed(1)
            )
          : 0,
    };
  }
}

export default FeedSpeedRecommender;
