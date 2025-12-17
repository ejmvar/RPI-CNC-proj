/**
 * Material Removal Rate (MRR) Calculator
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Calculates and optimizes material removal rate:
 * - Volume removal per unit time
 * - Cubic inches/centimeters per minute
 * - Time per part estimation
 * - Feed rate optimization for target MRR
 */

export class MRRCalculator {
  constructor(options = {}) {
    this.options = {
      unitSystem: options.unitSystem || 'metric', // 'metric' or 'imperial'
      targetMRR: options.targetMRR || 10, // cm³/min or in³/min
      safetyFactor: options.safetyFactor || 0.85, // Conservative multiplier
      ...options,
    };

    this.mrrHistory = [];
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
   * Calculate Material Removal Rate
   * MRR = Feed Rate × Depth of Cut × Width of Cut
   * Returns MRR in cm³/min or in³/min
   */
  calculateMRR(params) {
    if (!params || !params.feedRate || !params.depth) {
      throw new Error('MRR calculation requires feedRate and depth');
    }

    const { feedRate, depth, width, spindleSpeed, toolDiameter } = params;

    // Default width equals tool diameter if not specified
    const cutWidth = width || toolDiameter || 3.175;

    // MRR = feed rate × depth × width of cut
    const mrr = (feedRate * depth * cutWidth) / 1000; // Convert to cm³/min

    return {
      mrr: parseFloat(mrr.toFixed(2)),
      feedRate,
      depth,
      width: cutWidth,
      unit: this.options.unitSystem === 'metric' ? 'cm³/min' : 'in³/min',
    };
  }

  /**
   * Calculate optimized feed rate for target MRR
   */
  optimizeForTargetMRR(params) {
    if (!params || !params.depth || !params.targetMRR) {
      throw new Error('Optimization requires depth and targetMRR');
    }

    const { depth, targetMRR, width, toolDiameter, maxFeedRate } = params;
    const cutWidth = width || toolDiameter || 3.175;

    // Rearrange formula: Feed Rate = MRR / (Depth × Width)
    const calculatedFeedRate = (targetMRR * 1000) / (depth * cutWidth);

    // Apply safety factor
    const safeFeedRate = calculatedFeedRate * this.options.safetyFactor;

    // Enforce maximum feed rate if specified
    const finalFeedRate = maxFeedRate ? Math.min(safeFeedRate, maxFeedRate) : safeFeedRate;

    const result = {
      targetMRR,
      calculatedFeedRate: parseFloat(calculatedFeedRate.toFixed(2)),
      recommendedFeedRate: parseFloat(finalFeedRate.toFixed(2)),
      safetyFactor: this.options.safetyFactor,
      depth,
      width: cutWidth,
      achievedMRR: parseFloat(((finalFeedRate * depth * cutWidth) / 1000).toFixed(2)),
    };

    this.mrrHistory.push(result);
    this.emit('mrr:optimized', result);

    return result;
  }

  /**
   * Estimate time per part
   */
  estimateTimePerPart(params) {
    if (!params || !params.totalVolume || !params.feedRate || !params.depth) {
      throw new Error('Time estimation requires totalVolume, feedRate, and depth');
    }

    const { totalVolume, feedRate, depth, width, toolDiameter } = params;
    const cutWidth = width || toolDiameter || 3.175;

    // Calculate number of passes needed
    const passDepth = depth; // Depth per pass
    const numberOfPasses = params.numberOfPasses || 1;

    // Calculate total distance traveled
    const totalDistance = (totalVolume / (feedRate * depth * cutWidth)) * (feedRate || 100);

    // Calculate cutting time (distance / feed rate)
    const cuttingTime = totalDistance / (feedRate || 100);

    // Add rapid movements estimate (20% of cutting time)
    const rapidTime = cuttingTime * 0.2;

    // Total time including tool changes
    const toolChangeTime = (params.numberOfToolChanges || 0) * (params.toolChangeTime || 0.5);

    const totalTime = cuttingTime + rapidTime + toolChangeTime;

    const result = {
      totalVolume,
      feedRate,
      depth,
      width: cutWidth,
      numberOfPasses,
      cuttingTime: parseFloat(cuttingTime.toFixed(2)),
      rapidTime: parseFloat(rapidTime.toFixed(2)),
      toolChangeTime: parseFloat(toolChangeTime.toFixed(2)),
      totalTime: parseFloat(totalTime.toFixed(2)),
      unit: 'minutes',
    };

    return result;
  }

  /**
   * Compare different cutting strategies
   */
  compareStrategies(strategies) {
    if (!Array.isArray(strategies)) {
      throw new Error('Strategies must be an array');
    }

    const comparison = strategies.map((strategy) => {
      const mrr = this.calculateMRR(strategy);
      const time = this.estimateTimePerPart({
        totalVolume: strategy.totalVolume || 100,
        feedRate: strategy.feedRate,
        depth: strategy.depth,
        width: strategy.width,
        toolDiameter: strategy.toolDiameter,
      });

      return {
        name: strategy.name || `Strategy ${strategies.indexOf(strategy) + 1}`,
        feedRate: strategy.feedRate,
        depth: strategy.depth,
        width: strategy.width,
        mrr: mrr.mrr,
        timePerPart: time.totalTime,
        efficiency: (mrr.mrr / (strategy.feedRate || 1)) * 100,
      };
    });

    // Sort by MRR (highest first)
    return comparison.sort((a, b) => b.mrr - a.mrr);
  }

  /**
   * Get maximum possible MRR given machine constraints
   */
  getMaximumMRR(constraints) {
    if (!constraints || !constraints.maxFeedRate || !constraints.maxDepth) {
      throw new Error('Maximum MRR requires maxFeedRate and maxDepth');
    }

    const { maxFeedRate, maxDepth, maxWidth, toolDiameter } = constraints;
    const width = maxWidth || toolDiameter || 5;

    // Maximum MRR = max feed × max depth × max width
    const maxMRR = (maxFeedRate * maxDepth * width) / 1000;

    // Conservative maximum (with safety factor)
    const conservativeMax = maxMRR * this.options.safetyFactor;

    return {
      theoreticalMaximum: parseFloat(maxMRR.toFixed(2)),
      conservativeMaximum: parseFloat(conservativeMax.toFixed(2)),
      safetyFactor: this.options.safetyFactor,
      constraints: {
        maxFeedRate,
        maxDepth,
        maxWidth: width,
      },
    };
  }

  /**
   * Recommend optimal parameters for target MRR and time
   */
  recommendParameters(requirements) {
    if (!requirements || !requirements.targetMRR || !requirements.targetTime) {
      throw new Error('Recommendations require targetMRR and targetTime');
    }

    const { targetMRR, targetTime, availableTools, workpieceDimensions } = requirements;

    // Calculate required volume removal rate
    // Volume = MRR × Time
    const totalVolumeToRemove = (targetMRR * targetTime) / 60; // Convert to cm³

    const recommendations = [];

    if (availableTools && Array.isArray(availableTools)) {
      availableTools.forEach((tool) => {
        // Estimate reasonable depth and width for this tool
        const toolDiameter = tool.diameter || 3.175;
        const recommendedDepth = Math.min(tool.maxDepth || 5, toolDiameter * 0.5);
        const recommendedWidth = toolDiameter * 0.9;

        // Calculate required feed rate
        const requiredFeedRate = (targetMRR * 1000) / (recommendedDepth * recommendedWidth);

        recommendations.push({
          toolId: tool.id,
          toolType: tool.type,
          toolDiameter,
          recommendedFeedRate: parseFloat(requiredFeedRate.toFixed(2)),
          recommendedDepth: parseFloat(recommendedDepth.toFixed(2)),
          recommendedWidth: parseFloat(recommendedWidth.toFixed(2)),
          achievedMRR: targetMRR,
          estimatedTime: parseFloat(targetTime.toFixed(2)),
          feasible: requiredFeedRate <= (tool.maxFeedRate || 300),
        });
      });
    }

    return {
      targetMRR,
      targetTime,
      totalVolumeToRemove: parseFloat(totalVolumeToRemove.toFixed(2)),
      recommendations: recommendations.filter((r) => r.feasible),
    };
  }

  /**
   * Calculate productivity (parts per hour)
   */
  calculateProductivity(params) {
    if (!params || !params.timePerPart) {
      throw new Error('Productivity calculation requires timePerPart');
    }

    const { timePerPart, setupTime, cooldownTime } = params;

    const totalTimePerPart = timePerPart + (setupTime || 0) + (cooldownTime || 0);
    const partsPerHour = 60 / totalTimePerPart;
    const partsPerShift = partsPerHour * 8; // 8-hour shift
    const partsPerDay = partsPerHour * 16; // 2 shifts per day

    return {
      timePerPart,
      setupTime: setupTime || 0,
      cooldownTime: cooldownTime || 0,
      totalTimePerPart: parseFloat(totalTimePerPart.toFixed(2)),
      partsPerHour: parseFloat(partsPerHour.toFixed(2)),
      partsPerShift: parseFloat(partsPerShift.toFixed(0)),
      partsPerDay: parseFloat(partsPerDay.toFixed(0)),
    };
  }

  /**
   * Get MRR history
   */
  getHistory(limit = 100) {
    return this.mrrHistory.slice(-limit);
  }

  /**
   * Clear MRR history
   */
  clearHistory() {
    this.mrrHistory = [];
  }

  /**
   * Get statistics from MRR history
   */
  getStatistics() {
    if (this.mrrHistory.length === 0) {
      return { message: 'No MRR history' };
    }

    const mrrs = this.mrrHistory.map((h) => h.achievedMRR || h.mrr);
    const avgMRR = mrrs.reduce((a, b) => a + b, 0) / mrrs.length;

    return {
      totalOptimizations: this.mrrHistory.length,
      averageMRR: parseFloat(avgMRR.toFixed(2)),
      maxMRR: parseFloat(Math.max(...mrrs).toFixed(2)),
      minMRR: parseFloat(Math.min(...mrrs).toFixed(2)),
      unit: this.options.unitSystem === 'metric' ? 'cm³/min' : 'in³/min',
    };
  }
}

export default MRRCalculator;
