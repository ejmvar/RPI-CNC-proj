/**
 * Runout & TIR Simulator
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Simulates tool runout and Total Indicated Runout (TIR) effects:
 * - Spindle runout characteristics
 * - Tool holder influence
 * - Tool length effects
 * - Vibration generation
 * - Surface finish impact
 */

export class RunoutTIRSimulator {
  constructor(options = {}) {
    this.options = {
      spindleRunout: options.spindleRunout || 0.015, // mm
      toolHolderRunout: options.toolHolderRunout || 0.01, // mm
      toolRunout: options.toolRunout || 0.02, // mm
      maxSpindleSpeed: options.maxSpindleSpeed || 24000, // RPM
      measurementZone: options.measurementZone || 'tip', // 'tip' or 'holder'
      ...options,
    };

    this.simulationHistory = [];
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
   * Calculate combined TIR (Total Indicated Runout)
   */
  calculateCombinedTIR(params) {
    const { toolLength, spindleSpeed, toolDiameter } = params || {};

    // RSS combination of runout sources
    const spindleRO = this.options.spindleRunout;
    const toolHolderRO = this.options.toolHolderRunout;
    const toolRO = this.options.toolRunout;

    // Radial runout (RSS)
    const radialRunout = Math.sqrt(spindleRO ** 2 + toolHolderRO ** 2 + toolRO ** 2);

    // Tool length effect (longer = more deflection = more runout appearance)
    const lengthFactor = toolLength ? 1 + (toolLength / 100) * 0.2 : 1; // 0.2% per mm

    // Speed effect (higher speed amplifies runout due to centrifugal forces)
    const speedFactor = spindleSpeed ? 1 + (spindleSpeed / this.options.maxSpindleSpeed) * 0.1 : 1;

    const effectiveTIR = radialRunout * lengthFactor * speedFactor;

    return {
      radialRunout: parseFloat(radialRunout.toFixed(4)),
      lengthFactor: parseFloat(lengthFactor.toFixed(3)),
      speedFactor: parseFloat(speedFactor.toFixed(3)),
      effectiveTIR: parseFloat(effectiveTIR.toFixed(4)),
      sourceBreakdown: {
        spindle: spindleRO,
        toolHolder: toolHolderRO,
        tool: toolRO,
      },
    };
  }

  /**
   * Simulate vibration from runout
   */
  simulateRunoutVibration(params) {
    if (!params || !params.spindleSpeed || !params.toolDiameter) {
      throw new Error('Vibration simulation requires spindleSpeed and toolDiameter');
    }

    const { spindleSpeed, toolDiameter, depth, material } = params;

    // Calculate TIR
    const tirAnalysis = this.calculateCombinedTIR(params);

    // Runout creates forced vibration at spindle frequency
    const spinFrequencyHz = spindleSpeed / 60;

    // Vibration amplitude proportional to runout and speed
    const baseAmplitude = tirAnalysis.effectiveTIR * 10; // Amplification factor
    const speedInfluence = (spindleSpeed / this.options.maxSpindleSpeed) * 1.5;
    const vibrationAmplitude = baseAmplitude * speedInfluence;

    // Cutting forces increase with depth - affects visible vibration
    const depthFactor = depth ? 1 + (depth / 5) * 0.3 : 1;

    // Material affects damping
    const materialDamping = {
      aluminum: 0.9,
      steel: 1.0,
      titanium: 1.2,
      composites: 0.7,
    };
    const damping = materialDamping[material?.toLowerCase()] || 1.0;

    const finalAmplitude = (vibrationAmplitude * depthFactor) / damping;

    const result = {
      spindleSpeed,
      spinFrequencyHz: parseFloat(spinFrequencyHz.toFixed(1)),
      tirRunout: tirAnalysis.effectiveTIR,
      baseAmplitude: parseFloat(baseAmplitude.toFixed(4)),
      vibrationAmplitude: parseFloat(finalAmplitude.toFixed(4)),
      vibrationSeverity: this.classifyVibrationSeverity(finalAmplitude),
      riskLevel: finalAmplitude > 0.05 ? 'HIGH' : finalAmplitude > 0.02 ? 'MODERATE' : 'LOW',
      timestamp: Date.now(),
    };

    this.simulationHistory.push(result);
    this.emit('vibration:simulated', result);

    return result;
  }

  /**
   * Classify vibration severity
   */
  classifyVibrationSeverity(amplitude) {
    if (amplitude < 0.01) return 'NEGLIGIBLE';
    if (amplitude < 0.02) return 'MINOR';
    if (amplitude < 0.05) return 'MODERATE';
    if (amplitude < 0.1) return 'SEVERE';
    return 'CRITICAL';
  }

  /**
   * Calculate surface finish impact from runout
   */
  calculateFinishImpact(params) {
    if (!params || !params.feedRate) {
      throw new Error('Finish impact requires feedRate');
    }

    const { feedRate, spindleSpeed, toolDiameter } = params;

    // TIR directly affects surface roughness
    const tirAnalysis = this.calculateCombinedTIR(params);

    // Base roughness from feed
    const baseRoughness = (feedRate * feedRate) / (8 * (toolDiameter / 2)) / 1000;

    // Runout adds waviness
    const runoutAddedRoughness = tirAnalysis.effectiveTIR * 20; // Empirical factor

    // Total roughness
    const totalRoughness = baseRoughness + runoutAddedRoughness;

    // Surface finish degradation percentage
    const degradation = (runoutAddedRoughness / totalRoughness) * 100;

    return {
      baseRoughness: parseFloat(baseRoughness.toFixed(3)),
      runoutContribution: parseFloat(runoutAddedRoughness.toFixed(3)),
      totalRoughness: parseFloat(totalRoughness.toFixed(3)),
      degradationPercent: parseFloat(degradation.toFixed(1)),
      recommendation: degradation > 30 ? 'Reduce runout' : 'Acceptable',
    };
  }

  /**
   * Analyze runout over tool life
   */
  analyzeRunoutProgression(params) {
    if (!params || !params.toolLifeHours) {
      throw new Error('Progression analysis requires toolLifeHours');
    }

    const { toolLifeHours } = params;

    // Runout typically increases over tool life
    const progression = [];
    const hours = Array.from({ length: 5 }, (_, i) => (toolLifeHours / 4) * i);

    for (const hour of hours) {
      // Wear increases runout (quadratic model)
      const wearFactor = (hour / toolLifeHours) ** 1.5;
      const initialRunout = this.options.toolRunout;
      const wornRunout = initialRunout * (1 + wearFactor * 2); // Can double over life

      progression.push({
        toolLifeHours: hour,
        wearPercent: parseFloat((wearFactor * 100).toFixed(1)),
        estimatedRunout: parseFloat(wornRunout.toFixed(4)),
        runoutGrowth: parseFloat((((wornRunout - initialRunout) / initialRunout) * 100).toFixed(1)),
      });
    }

    return {
      toolLifeHours,
      progression,
      recommendation:
        progression[progression.length - 1].estimatedRunout > 0.05
          ? 'Tool replacement recommended before end of life'
          : 'Tool is within acceptable runout limits',
    };
  }

  /**
   * Compare different spindle/holder combinations
   */
  compareSpindleSetups(params) {
    if (!params || !Array.isArray(params.setups)) {
      throw new Error('Setup comparison requires setups array');
    }

    const { setups } = params;

    const comparison = setups.map((setup) => {
      const analyzer = new RunoutTIRSimulator({
        spindleRunout: setup.spindleRunout || 0.015,
        toolHolderRunout: setup.toolHolderRunout || 0.01,
        toolRunout: setup.toolRunout || 0.02,
      });

      const tir = analyzer.calculateCombinedTIR({
        toolLength: 50,
        spindleSpeed: 12000,
      });

      return {
        setupName: setup.name || 'Setup',
        spindleType: setup.spindleType,
        effectiveTIR: tir.effectiveTIR,
        tirClass: this.classifyTIRClass(tir.effectiveTIR),
        recommendation:
          tir.effectiveTIR < 0.03
            ? 'EXCELLENT'
            : tir.effectiveTIR < 0.05
            ? 'GOOD'
            : 'NEEDS_IMPROVEMENT',
      };
    });

    return comparison.sort((a, b) => a.effectiveTIR - b.effectiveTIR);
  }

  /**
   * Classify TIR into quality classes
   */
  classifyTIRClass(tir) {
    if (tir < 0.01) return 'PRECISION_CLASS';
    if (tir < 0.025) return 'HIGH_CLASS';
    if (tir < 0.05) return 'STANDARD_CLASS';
    if (tir < 0.1) return 'INDUSTRIAL_CLASS';
    return 'COARSE_CLASS';
  }

  /**
   * Recommend runout reduction strategies
   */
  recommendRunoutReduction(params) {
    if (!params || params.currentTIR === undefined) {
      throw new Error('Recommendation requires currentTIR');
    }

    const { currentTIR, budget } = params;

    const strategies = [
      {
        strategy: 'Clean tool holder',
        cost: 0,
        impact: 0.7, // 30% reduction
        timeRequired: '15 min',
        priority: 1,
      },
      {
        strategy: 'Replace tool',
        cost: 50,
        impact: 0.5, // 50% reduction
        timeRequired: '5 min',
        priority: 2,
      },
      {
        strategy: 'Upgrade to precision tool holder',
        cost: 300,
        impact: 0.6, // 60% reduction
        timeRequired: '30 min',
        priority: 3,
      },
      {
        strategy: 'Spindle overhaul/replacement',
        cost: 2000,
        impact: 0.8, // 80% reduction
        timeRequired: '4 hours',
        priority: 4,
      },
    ];

    const budgetLimit = budget || 500;
    const affordableStrategies = strategies.filter((s) => s.cost <= budgetLimit);

    // Estimate final TIR after strategy
    const result = {
      currentTIR: parseFloat(currentTIR.toFixed(4)),
      affordableStrategies: affordableStrategies.map((s) => ({
        ...s,
        projectedTIR: parseFloat((currentTIR * (1 - s.impact)).toFixed(4)),
      })),
      recommendedSequence: affordableStrategies.sort((a, b) => a.priority - b.priority),
    };

    return result;
  }

  /**
   * Get simulation history
   */
  getHistory(limit = 100) {
    return this.simulationHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.simulationHistory = [];
  }

  /**
   * Get statistics from simulation history
   */
  getStatistics() {
    if (this.simulationHistory.length === 0) {
      return { message: 'No simulation history' };
    }

    const vibrations = this.simulationHistory.map((h) => h.vibrationAmplitude);
    const avgVibration = vibrations.reduce((a, b) => a + b, 0) / vibrations.length;

    return {
      totalSimulations: this.simulationHistory.length,
      averageVibration: parseFloat(avgVibration.toFixed(4)),
      maxVibration: parseFloat(Math.max(...vibrations).toFixed(4)),
      minVibration: parseFloat(Math.min(...vibrations).toFixed(4)),
      unit: 'Vibration Amplitude (mm)',
    };
  }
}

export default RunoutTIRSimulator;
