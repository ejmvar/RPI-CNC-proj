/**
 * Surface Finish Predictor
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Predicts surface roughness and finish quality based on:
 * - Feed rate and spindle speed
 * - Tool geometry and condition
 * - Material properties
 * - Cutting forces and vibration
 * - Machine capabilities
 */

export class SurfaceFinishPredictor {
  constructor(options = {}) {
    this.options = {
      modelType: options.modelType || 'simplified', // 'simplified' or 'advanced'
      confidenceLevel: options.confidenceLevel || 0.75,
      referenceRoughness: options.referenceRoughness || 1.6, // Ra in micrometers
      ...options,
    };

    this.finishHistory = [];
    this.materialDatabase = {
      aluminum: { factor: 0.8, hardness: 95 },
      steel: { factor: 1.0, hardness: 200 },
      brass: { factor: 0.9, hardness: 130 },
      plastic: { factor: 0.7, hardness: 60 },
      titanium: { factor: 1.2, hardness: 320 },
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
   * Predict surface finish (Ra roughness in micrometers)
   */
  predictFinish(params) {
    if (!params || !params.feedRate || !params.toolDiameter) {
      throw new Error('Finish prediction requires feedRate and toolDiameter');
    }

    const { feedRate, toolDiameter, spindleSpeed, material, vibrationLevel, toolCondition } =
      params;

    // Base formula: Ra ≈ (f²) / (8 × R)
    // Where f = feed per tooth, R = tool radius
    const toolRadius = toolDiameter / 2;
    const estimatedFlutes = params.flutes || 2;
    const feedPerTooth = feedRate / ((spindleSpeed || 6000) / 60 / estimatedFlutes);

    // Calculate base roughness
    const baseRoughness = (feedPerTooth * feedPerTooth) / (8 * toolRadius);

    // Material factor
    const matFactor = this.materialDatabase[material?.toLowerCase()]?.factor || 1.0;

    // Vibration degradation (vibration increases roughness)
    const vibrationFactor = 1 + (vibrationLevel || 0) * 5;

    // Tool condition factor (worn tools increase roughness)
    const toolFactor = toolCondition === 'worn' ? 1.5 : toolCondition === 'fresh' ? 0.8 : 1.0;

    // Calculate final predicted roughness
    const predictedRoughness = baseRoughness * matFactor * vibrationFactor * toolFactor;

    // Determine finish quality rating
    const finishQuality = this.rateFinishQuality(predictedRoughness);

    const result = {
      predictedRa: parseFloat(predictedRoughness.toFixed(2)),
      finishQuality,
      baseRoughness: parseFloat(baseRoughness.toFixed(2)),
      feedPerTooth: parseFloat(feedPerTooth.toFixed(3)),
      confidenceLevel: this.options.confidenceLevel,
      factors: {
        material: matFactor,
        vibration: vibrationFactor,
        toolCondition: toolFactor,
      },
      recommendations: this.generateFinishRecommendations(predictedRoughness, params),
      timestamp: Date.now(),
    };

    this.finishHistory.push(result);
    this.emit('finish:predicted', result);

    return result;
  }

  /**
   * Rate finish quality (ANSI/ISO standard)
   */
  rateFinishQuality(roughnessRa) {
    if (roughnessRa <= 0.4) return 'EXCELLENT';
    if (roughnessRa <= 0.8) return 'VERY_GOOD';
    if (roughnessRa <= 1.6) return 'GOOD';
    if (roughnessRa <= 3.2) return 'FAIR';
    if (roughnessRa <= 6.4) return 'POOR';
    return 'VERY_POOR';
  }

  /**
   * Generate finish improvement recommendations
   */
  generateFinishRecommendations(roughness, params) {
    const recommendations = [];

    // If roughness is too high
    if (roughness > 3.2) {
      recommendations.push({
        priority: 1,
        action: 'Reduce feed rate by 30-50%',
        reason: 'High feed rate directly increases surface roughness',
        expectedImprovement: roughness * 0.4,
      });

      if ((params.vibrationLevel || 0) > 0.05) {
        recommendations.push({
          priority: 1,
          action: 'Reduce spindle speed to minimize vibration',
          reason: 'Vibration causes chatter marks and poor finish',
          expectedImprovement: roughness * 0.3,
        });
      }

      if (params.toolCondition === 'worn') {
        recommendations.push({
          priority: 2,
          action: 'Replace tool - wear significantly affects finish',
          reason: 'Worn tools create irregular cuts and poor surface',
          expectedImprovement: roughness * 0.5,
        });
      }
    }

    // For finishing passes, suggest specific parameters
    if (roughness > 1.6) {
      recommendations.push({
        priority: 2,
        action: 'Use dedicated finishing pass at low feed',
        reason: 'Separate finishing pass with optimized parameters',
        suggestedFeedRate: (params.feedRate || 100) * 0.6,
        suggestedSpeed: (params.spindleSpeed || 6000) * 1.2,
      });
    }

    // Tool path optimization
    if ((params.vibrationLevel || 0) > 0.03) {
      recommendations.push({
        priority: 3,
        action: 'Optimize tool path for better stability',
        reason: 'Better toolpath reduces vibration and improves finish',
      });
    }

    return recommendations;
  }

  /**
   * Optimize parameters for target finish
   */
  optimizeForTargetFinish(params) {
    if (!params || !params.targetRa || !params.toolDiameter) {
      throw new Error('Optimization requires targetRa and toolDiameter');
    }

    const { targetRa, toolDiameter, material, maxSpindleSpeed } = params;

    // Base formula: Ra = (f²) / (8 × R)
    // Rearrange: f = √(Ra × 8 × R)
    const toolRadius = toolDiameter / 2;
    const matFactor = this.materialDatabase[material?.toLowerCase()]?.factor || 1.0;

    // Calculate required feed per tooth
    const requiredFeedPerTooth = Math.sqrt((targetRa / matFactor) * 8 * toolRadius);

    // Estimate required feed rate (assuming 2 flutes, 6000 RPM)
    const estimatedFlutes = params.flutes || 2;
    const estimatedSpeed = params.currentSpeed || 6000;
    const requiredFeedRate = requiredFeedPerTooth * (estimatedSpeed / 60) * estimatedFlutes;

    // Suggest optimal spindle speed for better finish
    const optimalSpeed = Math.min(maxSpindleSpeed || 24000, 12000);

    return {
      targetRa,
      requiredFeedPerTooth: parseFloat(requiredFeedPerTooth.toFixed(3)),
      requiredFeedRate: parseFloat(requiredFeedRate.toFixed(2)),
      optimalSpindleSpeed: optimalSpeed,
      strategy: requiredFeedRate > 300 ? 'reduce_target_or_increase_speed' : 'feasible',
    };
  }

  /**
   * Compare tool types for finish quality
   */
  compareToolTypes(params) {
    if (!params || !params.feedRate) {
      throw new Error('Comparison requires feedRate');
    }

    const toolTypes = [
      { type: 'endmill', flutes: 2, radius: 1.5, factor: 1.0 },
      { type: 'ballnose', flutes: 2, radius: 2.0, factor: 0.8 },
      { type: 'tapered', flutes: 3, radius: 1.2, factor: 1.1 },
    ];

    const comparison = toolTypes.map((tool) => {
      const feedPerTooth = params.feedRate / ((params.spindleSpeed || 6000) / 60 / tool.flutes);
      const baseRoughness = (feedPerTooth * feedPerTooth) / (8 * tool.radius);
      const matFactor = this.materialDatabase[params.material?.toLowerCase()]?.factor || 1.0;

      const predictedRa = baseRoughness * matFactor * tool.factor;

      return {
        type: tool.type,
        predictedRa: parseFloat(predictedRa.toFixed(2)),
        finishQuality: this.rateFinishQuality(predictedRa),
        flutes: tool.flutes,
        feedPerTooth: parseFloat(feedPerTooth.toFixed(3)),
      };
    });

    return comparison.sort((a, b) => a.predictedRa - b.predictedRa);
  }

  /**
   * Assess finish consistency (stability over time)
   */
  assessConsistency(finishHistory) {
    if (!Array.isArray(finishHistory) || finishHistory.length < 2) {
      throw new Error('Consistency assessment requires at least 2 historical readings');
    }

    const roughnesses = finishHistory.map((f) => f.predictedRa);
    const avgRoughness = roughnesses.reduce((a, b) => a + b, 0) / roughnesses.length;

    // Calculate standard deviation
    const variance =
      roughnesses.reduce((sum, val) => sum + Math.pow(val - avgRoughness, 2), 0) /
      roughnesses.length;
    const stdDev = Math.sqrt(variance);

    // Consistency ratio (lower is better, more consistent)
    const consistencyRatio = stdDev / avgRoughness;

    return {
      averageRoughness: parseFloat(avgRoughness.toFixed(2)),
      standardDeviation: parseFloat(stdDev.toFixed(3)),
      consistencyRatio: parseFloat(consistencyRatio.toFixed(3)),
      consistency:
        consistencyRatio < 0.1 ? 'EXCELLENT' : consistencyRatio < 0.2 ? 'GOOD' : 'VARIABLE',
      readings: finishHistory.length,
    };
  }

  /**
   * Get finish prediction history
   */
  getHistory(limit = 100) {
    return this.finishHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.finishHistory = [];
  }

  /**
   * Get statistics from finish history
   */
  getStatistics() {
    if (this.finishHistory.length === 0) {
      return { message: 'No finish history' };
    }

    const roughnesses = this.finishHistory.map((h) => h.predictedRa);
    const avgRoughness = roughnesses.reduce((a, b) => a + b, 0) / roughnesses.length;

    return {
      totalPredictions: this.finishHistory.length,
      averageRoughness: parseFloat(avgRoughness.toFixed(2)),
      bestRoughness: parseFloat(Math.min(...roughnesses).toFixed(2)),
      worstRoughness: parseFloat(Math.max(...roughnesses).toFixed(2)),
      unit: 'Ra (micrometers)',
    };
  }
}

export default SurfaceFinishPredictor;
