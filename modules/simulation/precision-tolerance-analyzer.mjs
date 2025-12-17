/**
 * Precision & Tolerance Analyzer
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Analyzes achievable precision and tolerance based on:
 * - Machine calibration and backlash
 * - Tool runout and deflection
 * - Spindle vibration
 * - Feed rate and cutting forces
 * - Material properties
 */

export class PrecisionToleranceAnalyzer {
  constructor(options = {}) {
    this.options = {
      machineBacklash: options.machineBacklash || 0.01, // mm
      toolRunout: options.toolRunout || 0.02, // mm
      positioningAccuracy: options.positioningAccuracy || 0.05, // mm
      repeatability: options.repeatability || 0.02, // mm
      spindleRunout: options.spindleRunout || 0.015, // mm
      vibrationAmplitude: options.vibrationAmplitude || 0.001, // mm
      calibrationFactor: options.calibrationFactor || 1.0,
      ...options,
    };

    this.analysisHistory = [];
    this.toleranceStandards = {
      iso: { h7: 0.025, h9: 0.063, h11: 0.16 },
      ifttt: { tight: 0.01, standard: 0.05, loose: 0.1 },
    };

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
   * Calculate achievable tolerance (worst-case error accumulation)
   */
  calculateAchievableTolerance(params) {
    if (!params) {
      throw new Error('Tolerance calculation requires parameters');
    }

    const { operationType, toolDiameter, feedRate, vibrationLevel, material, passes } = params;

    // Base error sources (RSS - Root Sum of Squares)
    const errors = {
      backlash: this.options.machineBacklash,
      toolRunout: this.options.toolRunout,
      positioning: this.options.positioningAccuracy,
      spindle: this.options.spindleRunout,
      vibration: (vibrationLevel || 0) * 10,
    };

    // Sum in quadrature (RSS method - most realistic for random errors)
    const rssError = Math.sqrt(Object.values(errors).reduce((sum, err) => sum + err * err, 0));

    // Apply calibration factor
    const achievableTolerance = rssError * this.options.calibrationFactor;

    // Classify tolerance capability
    const classification = this.classifyTolerance(achievableTolerance);

    // Confidence level based on error sources
    const confidence = Math.max(0, 1 - (vibrationLevel || 0) * 5);

    const result = {
      achievableTolerance: parseFloat(achievableTolerance.toFixed(4)),
      toleranceClass: classification,
      confidence: parseFloat(confidence.toFixed(2)),
      errorBreakdown: {
        backlash: parseFloat(errors.backlash.toFixed(4)),
        toolRunout: parseFloat(errors.toolRunout.toFixed(4)),
        positioning: parseFloat(errors.positioning.toFixed(4)),
        spindle: parseFloat(errors.spindle.toFixed(4)),
        vibration: parseFloat(errors.vibration.toFixed(4)),
      },
      rssTotal: parseFloat(rssError.toFixed(4)),
      timestamp: Date.now(),
    };

    this.analysisHistory.push(result);
    this.emit('tolerance:calculated', result);

    return result;
  }

  /**
   * Classify tolerance capability
   */
  classifyTolerance(tolerance) {
    if (tolerance <= 0.01) return 'ULTRA_PRECISION';
    if (tolerance <= 0.025) return 'PRECISION';
    if (tolerance <= 0.05) return 'STANDARD';
    if (tolerance <= 0.1) return 'COARSE';
    return 'VERY_COARSE';
  }

  /**
   * Check if tolerance can be achieved
   */
  canAchieveTolerance(params) {
    if (!params || !params.requiredTolerance) {
      throw new Error('Tolerance check requires requiredTolerance');
    }

    const { requiredTolerance, vibrationLevel } = params;

    const analysis = this.calculateAchievableTolerance({
      vibrationLevel,
    });

    const canAchieve = analysis.achievableTolerance <= requiredTolerance;
    const margin = requiredTolerance - analysis.achievableTolerance;
    const marginPercent = (margin / requiredTolerance) * 100;

    return {
      canAchieve,
      requiredTolerance: parseFloat(requiredTolerance.toFixed(4)),
      achievableTolerance: analysis.achievableTolerance,
      margin: parseFloat(margin.toFixed(4)),
      marginPercent: parseFloat(marginPercent.toFixed(1)),
      recommendation: canAchieve
        ? marginPercent > 20
          ? 'Proceed - good safety margin'
          : 'Proceed - tight but achievable'
        : 'Cannot achieve - requires adjustments',
    };
  }

  /**
   * Analyze surface position tolerance (GD&T)
   */
  analyzeSurfacePositionTolerance(params) {
    if (!params || params.nominalDimension === undefined) {
      throw new Error('Surface analysis requires nominalDimension');
    }

    const { nominalDimension, datumReferences, positionalTolerance } = params;

    const achievable = this.calculateAchievableTolerance({});

    // Positional tolerance zone (diameter of cylinder)
    const allowedPositionalError = (positionalTolerance || 0.05) / 2;

    // Can maintain position?
    const canMaintainPosition = achievable.achievableTolerance < allowedPositionalError;

    return {
      nominalDimension: nominalDimension,
      allowedPositionalError: parseFloat(allowedPositionalError.toFixed(4)),
      achievablePositionalError: achievable.achievableTolerance,
      canMaintainPosition,
      datumReferences: datumReferences || ['A'],
      stability: canMaintainPosition ? 'STABLE' : 'UNSTABLE',
      confidence: achievable.confidence,
    };
  }

  /**
   * Generate dimensional tolerance stack-up analysis
   */
  analyzeToleranceStackUp(params) {
    if (!params || !params.dimensions || !Array.isArray(params.dimensions)) {
      throw new Error('Stack-up analysis requires dimensions array');
    }

    const { dimensions } = params;

    // Calculate worst-case stack-up (additive)
    const worstCase = dimensions.reduce((sum, dim) => sum + (dim.tolerance || 0.05), 0);

    // Calculate RMS stack-up (more realistic)
    const rmsStackUp = Math.sqrt(
      dimensions.reduce((sum, dim) => sum + (dim.tolerance || 0.05) ** 2, 0)
    );

    // Achievable tolerance per dimension
    const perDimensionTolerance = rmsStackUp / Math.sqrt(dimensions.length);

    return {
      numberOfDimensions: dimensions.length,
      worstCaseStackUp: parseFloat(worstCase.toFixed(4)),
      rmsStackUp: parseFloat(rmsStackUp.toFixed(4)),
      tolerancePerDimension: parseFloat(perDimensionTolerance.toFixed(4)),
      recommendation:
        rmsStackUp > 0.5 ? 'Consider tighter individual tolerances' : 'Stack-up acceptable',
      dimensions: dimensions.map((d) => ({
        name: d.name,
        tolerance: d.tolerance,
        percentDistribution: parseFloat(((d.tolerance / rmsStackUp) * 100).toFixed(1)),
      })),
    };
  }

  /**
   * Predict achievable runout
   */
  predictRunout(params) {
    if (!params || !params.toolLength) {
      throw new Error('Runout prediction requires toolLength');
    }

    const { toolLength, toolDiameter, spindleType } = params;

    // Runout increases with tool length (cantilevered)
    const lengthFactor = 1 + (toolLength / 50) * 0.5; // 0.5% per 10mm of length

    // Spindle type affects runout
    const spindleFactors = {
      ER16: 1.0,
      ER20: 0.95,
      ER32: 0.9,
      ISO30: 0.85,
      ISO40: 0.8,
    };
    const spindle = spindleFactors[spindleType] || 1.0;

    const predictedRunout =
      (this.options.spindleRunout + this.options.toolRunout) * lengthFactor * spindle;

    return {
      predictedRunout: parseFloat(predictedRunout.toFixed(4)),
      toolLength,
      lengthFactor: parseFloat(lengthFactor.toFixed(2)),
      spindleFactor: spindle,
      recommendation:
        predictedRunout > 0.05 ? 'Consider shorter tool or larger spindle' : 'Acceptable runout',
    };
  }

  /**
   * Recommend precision for specific tolerance class
   */
  recommendPrecisionSetup(params) {
    if (!params || !params.requiredTolerance) {
      throw new Error('Setup recommendation requires requiredTolerance');
    }

    const { requiredTolerance } = params;

    const setup = {
      tolerance: requiredTolerance,
      spindleType: 'ER20',
      feedRate: 100,
      spindleSpeed: 8000,
      toolOffset: true,
      rigidity: 'HIGH',
      stepdownDepth: 2,
    };

    // Adjust based on tolerance
    if (requiredTolerance <= 0.01) {
      setup.spindleType = 'ISO30';
      setup.feedRate = 50;
      setup.spindleSpeed = 12000;
      setup.rigidity = 'EXTREME';
      setup.stepdownDepth = 0.5;
    } else if (requiredTolerance <= 0.025) {
      setup.spindleType = 'ER32';
      setup.feedRate = 75;
      setup.spindleSpeed = 10000;
      setup.rigidity = 'VERY_HIGH';
      setup.stepdownDepth = 1;
    } else if (requiredTolerance <= 0.05) {
      setup.feedRate = 125;
      setup.spindleSpeed = 8000;
      setup.rigidity = 'HIGH';
    }

    return {
      requiredTolerance: parseFloat(requiredTolerance.toFixed(4)),
      recommendedSetup: setup,
      expectedAchievable: parseFloat((requiredTolerance * 0.8).toFixed(4)),
      margin: parseFloat((requiredTolerance * 0.2).toFixed(4)),
    };
  }

  /**
   * Analyze multiple passes for tolerance buildup
   */
  analyzeMultiPassTolerance(params) {
    if (!params || !params.numberOfPasses) {
      throw new Error('Multi-pass analysis requires numberOfPasses');
    }

    const { numberOfPasses, tolerancePerPass } = params;

    // Tolerance compounds with each pass (RSS method)
    let cumulativeTolerance = 0;
    const passes = [];

    for (let i = 1; i <= numberOfPasses; i++) {
      const passError = Math.sqrt(i) * (tolerancePerPass || 0.02);
      cumulativeTolerance = parseFloat(passError.toFixed(4));

      passes.push({
        passNumber: i,
        cumulativeTolerance: parseFloat(passError.toFixed(4)),
        addedTolerance:
          i === 1
            ? passError
            : parseFloat(
                (passError - parseFloat(passes[i - 2]?.cumulativeTolerance || 0)).toFixed(4)
              ),
      });
    }

    return {
      numberOfPasses,
      finalTolerance: cumulativeTolerance,
      passes,
      recommendation:
        numberOfPasses > 3 ? 'Consider fewer passes for better tolerance' : 'Acceptable pass count',
    };
  }

  /**
   * Get analysis history
   */
  getHistory(limit = 100) {
    return this.analysisHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.analysisHistory = [];
  }

  /**
   * Get statistics from analysis history
   */
  getStatistics() {
    if (this.analysisHistory.length === 0) {
      return { message: 'No analysis history' };
    }

    const tolerances = this.analysisHistory.map((h) => h.achievableTolerance);
    const avgTolerance = tolerances.reduce((a, b) => a + b, 0) / tolerances.length;

    return {
      totalAnalyses: this.analysisHistory.length,
      averageTolerance: parseFloat(avgTolerance.toFixed(4)),
      bestTolerance: parseFloat(Math.min(...tolerances).toFixed(4)),
      worstTolerance: parseFloat(Math.max(...tolerances).toFixed(4)),
      unit: 'Tolerance (mm)',
    };
  }
}

export default PrecisionToleranceAnalyzer;
