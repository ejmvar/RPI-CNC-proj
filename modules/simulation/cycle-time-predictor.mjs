/**
 * Cycle Time Predictor
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Predicts total job cycle time with detailed breakdown:
 * - Cutting time based on toolpath
 * - Rapid movement time
 * - Tool change time
 * - Spindle acceleration time
 * - Material-specific delays
 */

export class CycleTimePredictor {
  constructor(options = {}) {
    this.options = {
      toolChangeTime: options.toolChangeTime || 15, // seconds
      spindleAccelTime: options.spindleAccelTime || 2, // seconds
      rapidFeedrate: options.rapidFeedrate || 3000, // mm/min
      rapidAccel: options.rapidAccel || 0.5, // seconds to reach rapid speed
      materalDelayFactor: options.materalDelayFactor || 1.0, // material-specific delay multiplier
      includeSetupTime: options.includeSetupTime !== false,
      setupTime: options.setupTime || 60, // seconds
      ...options,
    };

    this.cycleHistory = [];
    this.materialDelays = {
      aluminum: 0.9, // Aluminum is faster to machine
      steel: 1.0, // Standard reference
      brass: 0.95,
      plastic: 0.85, // Plastic is faster
      titanium: 1.3, // Titanium requires slower feeds
      composites: 1.2,
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
   * Predict total cycle time from toolpath
   */
  predictCycleTime(params) {
    if (!params || params.totalDistance === undefined) {
      throw new Error('Cycle time prediction requires totalDistance');
    }

    const { totalDistance, feedRate, rapidDistance, numberOfToolChanges, material } = params;

    // Calculate cutting time
    const cuttingTime = (totalDistance / (feedRate || 100)) * 60; // convert to seconds

    // Calculate rapid time (includes acceleration)
    const rapidDist = rapidDistance || 0;
    const rapidTimeBase = (rapidDist / (this.options.rapidFeedrate || 3000)) * 60;
    const rapidAccelTime = (numberOfToolChanges || 0) * this.options.rapidAccel;
    const rapidTime = rapidTimeBase + rapidAccelTime;

    // Calculate tool change time
    const toolChangeTotal = ((numberOfToolChanges || 0) + 1) * this.options.toolChangeTime;

    // Calculate spindle acceleration time (one per tool)
    const spindleAccelTotal = ((numberOfToolChanges || 0) + 1) * this.options.spindleAccelTime;

    // Apply material delay factor
    const matDelay = this.materialDelays[material?.toLowerCase()] || 1.0;
    const cuttingTimeAdjusted = cuttingTime * matDelay;

    // Setup time
    const setup = this.options.includeSetupTime ? this.options.setupTime : 0;

    // Total cycle time
    const totalTime = cuttingTimeAdjusted + rapidTime + toolChangeTotal + spindleAccelTotal + setup;

    const breakdown = {
      cutting: parseFloat(cuttingTimeAdjusted.toFixed(2)),
      rapid: parseFloat(rapidTime.toFixed(2)),
      toolChange: parseFloat(toolChangeTotal.toFixed(2)),
      spindleAccel: parseFloat(spindleAccelTotal.toFixed(2)),
      setup: parseFloat(setup.toFixed(2)),
      total: parseFloat(totalTime.toFixed(2)),
    };

    const result = {
      totalSeconds: breakdown.total,
      totalMinutes: parseFloat((breakdown.total / 60).toFixed(2)),
      totalHours: parseFloat((breakdown.total / 3600).toFixed(4)),
      breakdown,
      materialDelay: matDelay,
      inputParams: params,
      timestamp: Date.now(),
    };

    this.cycleHistory.push(result);
    this.emit('cycle:predicted', result);

    return result;
  }

  /**
   * Estimate time with high-level job parameters
   */
  estimateJobTime(params) {
    if (!params || !params.partCount) {
      throw new Error('Job estimation requires partCount');
    }

    const { partCount, cycleTimePerPart, toolChangesPerPart, setupTime, layoutTime, unloadTime } =
      params;

    // Per-part times
    const cycleTime = cycleTimePerPart || 60; // seconds
    const toolChangeTime = ((toolChangesPerPart || 1) * this.options.toolChangeTime) / partCount;

    // One-time costs
    const totalSetupTime =
      setupTime || (this.options.includeSetupTime ? this.options.setupTime : 0);
    const totalLayoutTime = layoutTime || 0;
    const totalUnloadTime = unloadTime || 0;

    // Calculate per-part time
    const timePerPart = cycleTime + toolChangeTime;

    // Total time
    const totalTime = totalSetupTime + totalLayoutTime + partCount * timePerPart + totalUnloadTime;

    return {
      timePerPart: parseFloat(timePerPart.toFixed(2)),
      totalSeconds: parseFloat(totalTime.toFixed(2)),
      totalMinutes: parseFloat((totalTime / 60).toFixed(2)),
      totalHours: parseFloat((totalTime / 3600).toFixed(4)),
      breakdown: {
        setup: totalSetupTime,
        layout: totalLayoutTime,
        partsCycle: partCount * timePerPart,
        unload: totalUnloadTime,
      },
      partCount,
    };
  }

  /**
   * Optimize tool sequence for minimum time
   */
  optimizeToolSequence(params) {
    if (!params || !params.tools || !Array.isArray(params.tools)) {
      throw new Error('Optimization requires tools array');
    }

    const { tools, operationCounts } = params;

    // Calculate time for current sequence
    let currentTime = 0;
    for (let i = 0; i < tools.length; i++) {
      currentTime += (operationCounts[i] || 1) * (tools[i].time || 10);
      if (i > 0) {
        currentTime += this.options.toolChangeTime;
      }
    }

    // Try to optimize by grouping similar tools
    const sortedTools = tools
      .map((t, idx) => ({ ...t, index: idx }))
      .sort((a, b) => (b.time || 0) - (a.time || 0));

    let optimizedTime = 0;
    for (let i = 0; i < sortedTools.length; i++) {
      const count = operationCounts[sortedTools[i].index] || 1;
      optimizedTime += count * (sortedTools[i].time || 10);
      if (i > 0) {
        optimizedTime += this.options.toolChangeTime;
      }
    }

    return {
      currentSequenceTime: parseFloat(currentTime.toFixed(2)),
      optimizedTime: parseFloat(optimizedTime.toFixed(2)),
      timeSaved: parseFloat((currentTime - optimizedTime).toFixed(2)),
      percentSaved: parseFloat((((currentTime - optimizedTime) / currentTime) * 100).toFixed(1)),
      recommendation:
        optimizedTime < currentTime ? 'Reorder tools for efficiency' : 'Current order is optimal',
    };
  }

  /**
   * Compare different feeds/speeds for time impact
   */
  compareFeeds(params) {
    if (!params || !params.distance) {
      throw new Error('Feed comparison requires distance parameter');
    }

    const { distance, materialDelay } = params;
    const delay = this.materialDelays[materialDelay?.toLowerCase()] || 1.0;

    const feedRates = [50, 75, 100, 150, 200, 250, 300];

    const comparison = feedRates.map((feed) => {
      const time = (distance / feed) * 60 * delay; // time in seconds

      return {
        feedRate: feed,
        timeSeconds: parseFloat(time.toFixed(2)),
        timeMinutes: parseFloat((time / 60).toFixed(2)),
        timePercentage: parseFloat(
          ((time / ((distance / feedRates[feedRates.length - 1]) * 60 * delay)) * 100).toFixed(1)
        ),
      };
    });

    return comparison;
  }

  /**
   * Calculate batch processing time and efficiency
   */
  calculateBatchTime(params) {
    if (!params || !params.batchSize || !params.timePerPart) {
      throw new Error('Batch calculation requires batchSize and timePerPart');
    }

    const { batchSize, timePerPart, setupTime, cleanupTime } = params;

    const totalTime = (setupTime || 0) + batchSize * timePerPart + (cleanupTime || 0);
    const averageTimePerPart = totalTime / batchSize;
    const efficiency = (timePerPart / averageTimePerPart) * 100;

    return {
      batchSize,
      timePerPart,
      totalBatchTime: parseFloat(totalTime.toFixed(2)),
      averageTimePerPart: parseFloat(averageTimePerPart.toFixed(2)),
      setupOverhead: parseFloat((((setupTime || 0) / totalTime) * 100).toFixed(1)),
      efficiency: parseFloat(efficiency.toFixed(1)),
      recommendation: efficiency > 90 ? 'Good efficiency' : 'Consider larger batch size',
    };
  }

  /**
   * Predict time savings from optimization strategy
   */
  predictOptimizationSavings(params) {
    if (!params || !params.currentTime) {
      throw new Error('Savings prediction requires currentTime');
    }

    const { currentTime, optimizations } = params;

    let totalSavings = 0;
    const details = [];

    if (optimizations?.reduceFeeds === false) {
      totalSavings += currentTime * 0.05; // Slightly slower but smoother
      details.push({ strategy: 'Reduce feeds', savings: -2.5, note: 'Slower but higher quality' });
    }

    if (optimizations?.combinedOperations) {
      totalSavings += currentTime * 0.1; // 10% savings from combining ops
      details.push({ strategy: 'Combined operations', savings: 10 });
    }

    if (optimizations?.reduceToolChanges) {
      totalSavings += currentTime * 0.08; // 8% savings
      details.push({ strategy: 'Reduce tool changes', savings: 8 });
    }

    if (optimizations?.optimizeRapids) {
      totalSavings += currentTime * 0.03; // 3% savings
      details.push({ strategy: 'Optimize rapids', savings: 3 });
    }

    const newTime = Math.max(currentTime - totalSavings, currentTime * 0.5); // floor at 50%

    return {
      currentTime: parseFloat(currentTime.toFixed(2)),
      projectedTime: parseFloat(newTime.toFixed(2)),
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      percentSavings: parseFloat(((totalSavings / currentTime) * 100).toFixed(1)),
      details,
    };
  }

  /**
   * Get cycle history
   */
  getHistory(limit = 100) {
    return this.cycleHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.cycleHistory = [];
  }

  /**
   * Get statistics from cycle history
   */
  getStatistics() {
    if (this.cycleHistory.length === 0) {
      return { message: 'No cycle history' };
    }

    const times = this.cycleHistory.map((h) => h.totalSeconds);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

    return {
      totalCycles: this.cycleHistory.length,
      averageTimeSeconds: parseFloat(avgTime.toFixed(2)),
      averageTimeMinutes: parseFloat((avgTime / 60).toFixed(2)),
      fastestTimeSeconds: parseFloat(Math.min(...times).toFixed(2)),
      slowestTimeSeconds: parseFloat(Math.max(...times).toFixed(2)),
      unit: 'Time (seconds)',
    };
  }
}

export default CycleTimePredictor;
