/**
 * Tool Wear Predictor
 * Phase 16: Advanced Simulation & Analysis
 *
 * Predicts tool wear and tool life:
 * - Wear rate estimation
 * - Flank wear tracking
 * - Tool failure prediction
 * - Maintenance scheduling
 */

export class ToolWearPredictor {
  constructor(options = {}) {
    this.options = {
      wearModel: options.wearModel || 'exponential',
      wearThreshold: options.wearThreshold || 0.5, // mm
      notificationThreshold: options.notificationThreshold || 0.3, // mm
      ...options,
    };

    this.tools = new Map();
    this.listeners = {};
  }

  /**
   * Register tool for wear tracking
   */
  registerTool(toolId, tool) {
    if (!toolId || !tool) {
      throw new Error('Tool ID and tool object required');
    }

    this.tools.set(toolId, {
      id: toolId,
      name: tool.name || 'Unknown Tool',
      type: tool.type || 'end-mill',
      diameter: tool.diameter || 3.175,
      flutes: tool.flutes || 2,
      initialWear: 0,
      currentWear: 0,
      cuttingTime: 0,
      registeredAt: Date.now(),
      lastMaintenanceTime: Date.now(),
      wearHistory: [],
    });

    this.emit('tool:registered', { toolId });

    return { registered: true, toolId };
  }

  /**
   * Calculate wear rate
   */
  calculateWearRate(toolId, feedRate, spindle, material = 'aluminum') {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // Material wear coefficients (simplified)
    const wearCoefficients = {
      aluminum: 0.001,
      steel: 0.005,
      stainless: 0.008,
      plastic: 0.0005,
      wood: 0.0001,
    };

    const coeff = wearCoefficients[material.toLowerCase()] || 0.001;

    // Wear rate = coefficient * feed rate * spindle speed / diameter
    const wearRate = (coeff * feedRate * spindle) / (tool.diameter * 1000);

    return {
      wearRate: parseFloat(wearRate.toFixed(6)),
      unit: 'mm/minute',
      material,
      feedRate,
      spindle,
      coefficient: coeff,
    };
  }

  /**
   * Update tool wear
   */
  updateWear(toolId, wearAmount, cuttingTime = 0) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    tool.currentWear += wearAmount;
    tool.cuttingTime += cuttingTime;

    tool.wearHistory.push({
      wear: tool.currentWear,
      timestamp: Date.now(),
      cuttingTime: tool.cuttingTime,
    });

    // Keep only last 100 entries
    if (tool.wearHistory.length > 100) {
      tool.wearHistory.shift();
    }

    const status = this.getWearStatus(toolId);

    if (!status.isHealthy) {
      this.emit('wear:warning', { toolId, wear: tool.currentWear, status });
    }

    return status;
  }

  /**
   * Get wear status
   */
  getWearStatus(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const wearPercentage = (tool.currentWear / this.options.wearThreshold) * 100;
    const isHealthy = tool.currentWear < this.options.notificationThreshold;
    const isWorn = tool.currentWear >= this.options.wearThreshold;

    return {
      toolId,
      currentWear: parseFloat(tool.currentWear.toFixed(4)),
      wearPercentage: Math.min(100, Math.round(wearPercentage)),
      isHealthy,
      isWorn,
      needsReplacement: isWorn,
      status: isWorn ? 'needs-replacement' : isHealthy ? 'good' : 'monitor',
      remainingLife: Math.max(
        0,
        parseFloat((this.options.wearThreshold - tool.currentWear).toFixed(4))
      ),
    };
  }

  /**
   * Predict remaining tool life
   */
  predictRemainingLife(toolId, feedRate, spindle, material = 'aluminum') {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const wearRate = this.calculateWearRate(toolId, feedRate, spindle, material);
    const remainingWear = this.options.wearThreshold - tool.currentWear;

    if (wearRate.wearRate <= 0) {
      return {
        remainingTime: Infinity,
        remainingDistance: Infinity,
        unit: 'infinite',
      };
    }

    const remainingTime = remainingWear / wearRate.wearRate;
    const remainingDistance = (remainingTime * feedRate) / 60; // mm

    return {
      remainingTime: Math.round(remainingTime),
      remainingDistance: parseFloat(remainingDistance.toFixed(2)),
      unit: 'minutes/mm',
      currentWear: tool.currentWear,
      threshold: this.options.wearThreshold,
    };
  }

  /**
   * Estimate maintenance schedule
   */
  estimateMaintenanceSchedule(toolIds = null) {
    const toCheck = toolIds || Array.from(this.tools.keys());
    const schedule = [];

    toCheck.forEach((toolId) => {
      const tool = this.tools.get(toolId);
      if (!tool) return;

      const status = this.getWearStatus(toolId);

      if (status.needsReplacement) {
        schedule.push({
          toolId,
          action: 'replace',
          priority: 'high',
          wear: status.currentWear,
          timeUsed: Math.round(tool.cuttingTime),
        });
      } else if (!status.isHealthy) {
        schedule.push({
          toolId,
          action: 'monitor',
          priority: 'medium',
          wear: status.currentWear,
          timeUsed: Math.round(tool.cuttingTime),
        });
      }
    });

    return {
      toolsRequiringMaintenance: schedule.length,
      schedule: schedule.sort((a, b) => b.priority.localeCompare(a.priority)),
    };
  }

  /**
   * Get wear history
   */
  getWearHistory(toolId, limit = 20) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const history = tool.wearHistory.slice(-limit);

    return {
      toolId,
      history,
      count: history.length,
      currentWear: tool.currentWear,
    };
  }

  /**
   * Reset tool wear
   */
  resetToolWear(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    tool.currentWear = 0;
    tool.wearHistory = [];
    tool.lastMaintenanceTime = Date.now();

    this.emit('tool:reset', { toolId });

    return { reset: true, toolId };
  }

  /**
   * Get wear statistics
   */
  getStats() {
    const toolsArray = Array.from(this.tools.values());

    let totalWear = 0;
    let avgWear = 0;
    let maxWear = 0;
    let toolsNeedReplacement = 0;

    toolsArray.forEach((tool) => {
      totalWear += tool.currentWear;
      maxWear = Math.max(maxWear, tool.currentWear);

      const status = this.getWearStatus(tool.id);
      if (status.needsReplacement) {
        toolsNeedReplacement++;
      }
    });

    if (toolsArray.length > 0) {
      avgWear = totalWear / toolsArray.length;
    }

    return {
      totalTools: toolsArray.length,
      avgWear: parseFloat(avgWear.toFixed(4)),
      maxWear: parseFloat(maxWear.toFixed(4)),
      toolsNeedReplacement,
      wearThreshold: this.options.wearThreshold,
    };
  }

  /**
   * Event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }
}
