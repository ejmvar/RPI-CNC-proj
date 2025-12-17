/**
 * Vibration Analysis System
 * Phase 16: Advanced Simulation & Analysis
 *
 * Analyzes spindle vibration, predicts resonance issues, and provides optimization recommendations:
 * - Spindle speed resonance detection
 * - Feed rate harmonic analysis
 * - Tool deflection estimation
 * - Chatter prediction and mitigation strategies
 * - Vibration risk scoring
 */

export class VibrationAnalyzer {
  constructor(options = {}) {
    this.options = {
      samplingRate: options.samplingRate || 1000, // Hz
      windowSize: options.windowSize || 1024,
      enableChatterDetection: options.enableChatterDetection !== false,
      enableResonanceDetection: options.enableResonanceDetection !== false,
      riskThreshold: options.riskThreshold || 0.7, // 0-1 scale
      ...options,
    };

    this.machineProfile = {
      spindle: {
        maxSpeed: options.maxSpindleSpeed || 24000, // RPM
        mass: options.spindleMass || 2.5, // kg
        damping: options.spindleDamping || 0.05, // damping ratio
      },
      bed: {
        stiffness: options.bedStiffness || 50000, // N/m
        mass: options.bedMass || 5.0, // kg
        damping: options.bedDamping || 0.08,
      },
      structure: {
        stiffness: options.structureStiffness || 100000, // N/m
        naturalFrequency: options.naturalFrequency || 120, // Hz
      },
    };

    this.calibrationData = [];
    this.vibrationHistory = [];
    this.resonanceMap = new Map(); // frequency -> risk
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
   * Analyze cutting operation for vibration risk
   * Returns vibration metrics and recommendations
   */
  analyzeOperation(operation) {
    if (!operation || !operation.spindleSpeed || !operation.feedRate) {
      throw new Error('Operation requires spindleSpeed, feedRate');
    }

    const spindleVibration = this.calculateSpindleVibration(operation);
    const toolDeflection = this.calculateToolDeflection(operation);
    const chatterRisk = this.predictChatter(operation);
    const resonanceRisk = this.checkResonance(operation);

    const riskScore = this.calculateRiskScore(
      spindleVibration,
      toolDeflection,
      chatterRisk,
      resonanceRisk
    );

    const recommendations = this.generateRecommendations(
      operation,
      spindleVibration,
      toolDeflection,
      chatterRisk,
      resonanceRisk,
      riskScore
    );

    const result = {
      riskScore,
      isHighRisk: riskScore >= this.options.riskThreshold,
      vibration: spindleVibration,
      deflection: toolDeflection,
      chatterRisk,
      resonanceRisk,
      recommendations,
      timestamp: Date.now(),
    };

    if (result.isHighRisk) {
      this.emit('vibration:risk-detected', result);
    }

    this.vibrationHistory.push(result);
    return result;
  }

  /**
   * Calculate spindle vibration based on speed and load
   */
  calculateSpindleVibration(operation) {
    const { spindleSpeed, feedRate, toolDiameter, depth } = operation;

    // Base vibration from spindle imbalance (typically 0-2mm at 1000 RPM)
    const baseVibration = 0.002 * (1000 / Math.max(spindleSpeed, 100));

    // Increase with load (feed rate relative to tool diameter)
    const loadFactor = feedRate / (toolDiameter || 3.175) / 100;
    const loadVibration = baseVibration * (1 + loadFactor * 5);

    // Depth of cut influence
    const depthFactor = (depth || 1) / 10;
    const depthVibration = loadVibration * (1 + depthFactor);

    // Spindle bearing condition effect
    const bearingFactor = 1.0; // Could vary with maintenance history
    const finalVibration = depthVibration * bearingFactor;

    return {
      amplitude: Math.min(finalVibration, 0.1), // mm (0-100μm typically)
      frequency: (spindleSpeed / 60) * 2, // 2x spindle frequency
      baselineAmplitude: baseVibration,
      loadContribution: loadVibration - baseVibration,
    };
  }

  /**
   * Calculate tool deflection under cutting forces
   */
  calculateToolDeflection(operation) {
    const { toolDiameter, length, material, feedRate, depth } = operation;

    // Simplified deflection model (microns)
    const toolRadius = (toolDiameter || 3.175) / 2;
    const toolLength = length || 25.4;

    // Bending stiffness proportional to (diameter^4) / length
    const stiffness = (Math.pow(toolRadius, 4) * 1e6) / toolLength;

    // Cutting force estimate (depends on material)
    const materialFactors = {
      aluminum: 0.5,
      steel: 1.5,
      brass: 0.8,
      plastic: 0.2,
    };
    const matFactor = materialFactors[material?.toLowerCase()] || 1.0;

    const cuttingForce = feedRate * depth * matFactor * 10; // Simplified model

    // Deflection = Force / Stiffness
    const axialDeflection = (cuttingForce / stiffness) * 1000; // Convert to microns

    // Radial deflection (perpendicular to tool axis)
    const radialDeflection = axialDeflection * 0.6;

    return {
      axial: Math.max(0, axialDeflection),
      radial: Math.max(0, radialDeflection),
      maxAllowable: 50, // microns (typical limit)
      percentOfLimit: (axialDeflection / 50) * 100,
      stiffness,
      cuttingForce,
    };
  }

  /**
   * Predict chatter probability
   * Chatter occurs when tool vibration causes intermittent contact
   */
  predictChatter(operation) {
    const { spindleSpeed, feedRate, toolDiameter, depth } = operation;

    // Chatter is more likely at specific speed ranges
    // Critical spindle speeds are at natural frequencies
    const criticalSpeeds = [
      120, // First natural frequency
      240, // Second harmonic
      360, // Third harmonic
    ];

    const spindleFreq = spindleSpeed / 60;

    let proximityToResonance = 0;
    criticalSpeeds.forEach((freq) => {
      const difference = Math.abs(spindleFreq - freq);
      if (difference < 50) {
        // Within 50 Hz
        proximityToResonance = Math.max(proximityToResonance, 1 - difference / 50);
      }
    });

    // Feed per tooth consideration
    const feedPerTooth = feedRate / (spindleSpeed / 60 / (operation.flutes || 2)) || 0.01;
    const feedFactor = Math.min(feedPerTooth / 0.1, 1.0); // Normalized to 0.1 mm/tooth

    // Depth of cut factor
    const depthFactor = Math.min(depth || 1, 5) / 5; // Normalized to 5mm

    // Chatter likelihood (0-1)
    const chatterLikelihood = Math.min(
      proximityToResonance * 0.6 + feedFactor * 0.3 + depthFactor * 0.1,
      1.0
    );

    // Stability margin (higher is safer)
    const stabilityMargin = 1.0 - chatterLikelihood;

    return {
      likelihood: chatterLikelihood,
      proximityToResonance,
      feedFactor,
      depthFactor,
      stabilityMargin,
      likelyFrequencies: criticalSpeeds,
      prediction: chatterLikelihood > 0.5 ? 'HIGH' : chatterLikelihood > 0.25 ? 'MEDIUM' : 'LOW',
    };
  }

  /**
   * Check for resonance at current operating parameters
   */
  checkResonance(operation) {
    const { spindleSpeed, feedRate, toolDiameter } = operation;

    const spindleFreq = spindleSpeed / 60;
    const structuralFreq = this.machineProfile.structure.naturalFrequency;

    // Calculate harmonics that could excite resonance
    const excitationFrequencies = [];
    for (let i = 1; i <= 5; i++) {
      excitationFrequencies.push(spindleFreq * i);
    }

    // Check proximity to structural frequency
    let resonanceRisk = 0;
    let nearestHarmonic = null;
    let minDistance = Infinity;

    excitationFrequencies.forEach((freq, idx) => {
      const distance = Math.abs(freq - structuralFreq);
      if (distance < minDistance) {
        minDistance = distance;
        nearestHarmonic = { frequency: freq, harmonic: idx + 1 };
      }

      if (distance < 20) {
        // Within 20 Hz
        resonanceRisk = Math.max(resonanceRisk, 1 - distance / 20);
      }
    });

    // Update resonance map
    const key = `${Math.round(spindleFreq)}-${Math.round(feedRate)}`;
    this.resonanceMap.set(key, resonanceRisk);

    return {
      risk: resonanceRisk,
      structuralFrequency: structuralFreq,
      excitationFrequencies,
      nearestHarmonic,
      distanceToResonance: minDistance,
      isResonant: resonanceRisk > 0.5,
    };
  }

  /**
   * Calculate overall vibration risk score (0-1)
   */
  calculateRiskScore(spindle, deflection, chatter, resonance) {
    // Weighted combination of risk factors
    const spindleRisk = spindle.amplitude / 0.1; // Normalized to 100μm
    const deflectionRisk = deflection.percentOfLimit / 100;
    const chatterRisk = chatter.likelihood;
    const resonanceRisk = resonance.risk;

    // Weights (can be tuned based on machine profile)
    const weights = {
      spindle: 0.2,
      deflection: 0.3,
      chatter: 0.3,
      resonance: 0.2,
    };

    const score =
      Math.min(spindleRisk, 1) * weights.spindle +
      Math.min(deflectionRisk, 1) * weights.deflection +
      chatterRisk * weights.chatter +
      resonanceRisk * weights.resonance;

    return Math.min(score, 1.0);
  }

  /**
   * Generate vibration mitigation recommendations
   */
  generateRecommendations(operation, spindle, deflection, chatter, resonance, riskScore) {
    const recommendations = [];

    // Spindle vibration recommendations
    if (spindle.amplitude > 0.05) {
      recommendations.push({
        category: 'spindle',
        severity: 'HIGH',
        message: 'High spindle vibration detected',
        action: 'Check spindle bearing wear and balance. Consider spindle service.',
        priority: 1,
      });
    }

    // Tool deflection recommendations
    if (deflection.percentOfLimit > 80) {
      recommendations.push({
        category: 'deflection',
        severity: 'HIGH',
        message: 'Tool deflection exceeds safe limits',
        action: 'Reduce feed rate by 30-50% or use shorter tool extension',
        priority: 2,
      });
    } else if (deflection.percentOfLimit > 50) {
      recommendations.push({
        category: 'deflection',
        severity: 'MEDIUM',
        message: 'Tool deflection is elevated',
        action: 'Consider reducing feed rate or depth of cut by 20%',
        priority: 3,
      });
    }

    // Chatter recommendations
    if (chatter.prediction === 'HIGH') {
      recommendations.push({
        category: 'chatter',
        severity: 'HIGH',
        message: 'High chatter risk at current speeds',
        action: `Change spindle speed away from ${chatter.likelyFrequencies[0]} RPM. Increase damping.`,
        priority: 1,
      });
    } else if (chatter.prediction === 'MEDIUM') {
      recommendations.push({
        category: 'chatter',
        severity: 'MEDIUM',
        message: 'Moderate chatter risk detected',
        action: 'Monitor vibration. Consider slight speed adjustment.',
        priority: 3,
      });
    }

    // Resonance recommendations
    if (resonance.isResonant) {
      recommendations.push({
        category: 'resonance',
        severity: 'HIGH',
        message: `Operating near resonance at ${resonance.nearestHarmonic.harmonic}x spindle frequency`,
        action: `Change spindle speed to move away from ${Math.round(
          resonance.nearestHarmonic.frequency
        )} Hz`,
        priority: 1,
      });
    }

    // Optimization suggestions
    if (riskScore < 0.3) {
      recommendations.push({
        category: 'optimization',
        severity: 'LOW',
        message: 'Operating in optimal vibration zone',
        action: 'Current parameters are safe. Consider feeding faster if needed.',
        priority: 4,
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Suggest optimal spindle speeds to avoid resonance
   */
  suggestOptimalSpeeds(feedRate, toolDiameter, depth) {
    const resonantFrequencies = [
      this.machineProfile.structure.naturalFrequency,
      this.machineProfile.structure.naturalFrequency * 2,
      this.machineProfile.structure.naturalFrequency * 3,
    ];

    const safetyZone = 50; // Hz around resonance to avoid
    const maxSpeed = this.machineProfile.spindle.maxSpeed;

    const optimalSpeeds = [];

    // Generate safe speed ranges
    let currentSpeed = 1000;
    while (currentSpeed <= maxSpeed) {
      const spindleFreq = currentSpeed / 60;
      let isSafe = true;

      // Check distance from resonant frequencies
      for (const resonantFreq of resonantFrequencies) {
        if (Math.abs(spindleFreq - resonantFreq) < safetyZone) {
          isSafe = false;
          break;
        }
      }

      if (isSafe) {
        optimalSpeeds.push({
          speed: currentSpeed,
          frequency: spindleFreq,
          estimatedRisk: this.analyzeOperation({
            spindleSpeed: currentSpeed,
            feedRate,
            toolDiameter,
            depth,
            flutes: 2,
          }).riskScore,
        });
      }

      currentSpeed += 500; // Check every 500 RPM
    }

    return optimalSpeeds.sort((a, b) => a.estimatedRisk - b.estimatedRisk).slice(0, 5);
  }

  /**
   * Get vibration history for analysis
   */
  getHistory(limit = 100) {
    return this.vibrationHistory.slice(-limit);
  }

  /**
   * Clear vibration history
   */
  clearHistory() {
    this.vibrationHistory = [];
  }

  /**
   * Get machine profile calibration
   */
  getMachineProfile() {
    return structuredClone(this.machineProfile);
  }

  /**
   * Update machine profile (for calibration)
   */
  updateMachineProfile(profile) {
    if (profile.spindle) {
      Object.assign(this.machineProfile.spindle, profile.spindle);
    }
    if (profile.bed) {
      Object.assign(this.machineProfile.bed, profile.bed);
    }
    if (profile.structure) {
      Object.assign(this.machineProfile.structure, profile.structure);
    }
    return this.machineProfile;
  }

  /**
   * Get resonance map (frequency -> risk mapping)
   */
  getResonanceMap() {
    return Object.fromEntries(this.resonanceMap);
  }

  /**
   * Clear resonance map
   */
  clearResonanceMap() {
    this.resonanceMap.clear();
  }

  /**
   * Get statistics from vibration history
   */
  getStatistics() {
    if (this.vibrationHistory.length === 0) {
      return { message: 'No vibration history' };
    }

    const scores = this.vibrationHistory.map((v) => v.riskScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const highRiskCount = this.vibrationHistory.filter((v) => v.isHighRisk).length;

    return {
      totalOperations: this.vibrationHistory.length,
      averageRiskScore: avgScore,
      maxRiskScore: maxScore,
      minRiskScore: minScore,
      highRiskOperations: highRiskCount,
      percentageHighRisk: (highRiskCount / this.vibrationHistory.length) * 100,
    };
  }
}

export default VibrationAnalyzer;
