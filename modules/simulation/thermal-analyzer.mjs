/**
 * Thermal Analysis System
 * Phase 16: Advanced Simulation & Analysis
 *
 * Provides thermal simulation and analysis:
 * - Spindle load calculation
 * - Heat generation estimation
 * - Cutting temperature prediction
 * - Thermal stress analysis
 */

export class ThermalAnalyzer {
  constructor(options = {}) {
    this.options = {
      spindleType: options.spindleType || 'ER20',
      maxRPM: options.maxRPM || 24000,
      maxPower: options.maxPower || 3000, // watts
      ambientTemp: options.ambientTemp || 20, // Celsius
      materialThreshold: options.materialThreshold || 250, // Celsius
      ...options,
    };

    this.thermalData = [];
    this.listeners = {};
  }

  /**
   * Calculate spindle load based on cutting parameters
   */
  calculateSpindleLoad(tool, feedRate, spindle) {
    if (!tool || !feedRate || !spindle) {
      throw new Error('Tool, feed rate, and spindle speed required');
    }

    // Simplified load calculation
    const diameter = tool.diameter || 3.175;
    const chipLoad = feedRate / spindle / (tool.flutes || 2) || 0;
    const loadFactor = Math.min(spindle / this.options.maxRPM, 1.0);
    const feedFactor = Math.min(feedRate / 500, 1.0);

    const load = loadFactor * feedFactor * chipLoad * diameter * 100;

    return {
      load: Math.min(load, 100),
      chipLoad: parseFloat(chipLoad.toFixed(4)),
      feedFactor,
      spindle,
      diameter,
    };
  }

  /**
   * Estimate heat generation in watts
   */
  estimateHeatGeneration(tool, feedRate, spindle, material = 'aluminum') {
    if (!tool || feedRate === undefined || spindle === undefined) {
      throw new Error('Tool, feed rate, and spindle speed required');
    }

    // Material-specific heat coefficients (simplified)
    const materials = {
      aluminum: 0.8,
      steel: 1.2,
      stainless: 1.5,
      plastic: 0.5,
      wood: 0.3,
    };

    const materialCoeff = materials[material.toLowerCase()] || 1.0;
    const load = this.calculateSpindleLoad(tool, feedRate, spindle);
    const baseHeat = (load.load / 100) * this.options.maxPower;
    const heat = baseHeat * materialCoeff;

    return {
      heatGeneration: Math.round(heat),
      baseHeat: Math.round(baseHeat),
      materialCoeff,
      material,
    };
  }

  /**
   * Predict cutting temperature
   */
  predictCuttingTemp(tool, feedRate, spindle, material = 'aluminum', duration = 60) {
    if (!tool || feedRate === undefined || spindle === undefined) {
      throw new Error('Tool, feed rate, and spindle speed required');
    }

    const heat = this.estimateHeatGeneration(tool, feedRate, spindle, material);
    const toolDiameter = tool.diameter || 3.175;

    // Contact area in mm^2
    const contactArea = toolDiameter * 0.5 * 2; // simplified

    // Temperature rise (simplified: heat / area)
    const temperatureRise = (heat.heatGeneration / contactArea) * (duration / 60);

    const cuttingTemp = this.options.ambientTemp + temperatureRise;
    const isSafe = cuttingTemp < this.options.materialThreshold;

    return {
      cuttingTemp: Math.round(cuttingTemp),
      temperatureRise: Math.round(temperatureRise),
      ambientTemp: this.options.ambientTemp,
      threshold: this.options.materialThreshold,
      isSafe,
      duration,
      warning: !isSafe ? 'Temperature exceeds threshold!' : null,
    };
  }

  /**
   * Analyze toolpath for thermal stress
   */
  analyzeThermalStress(tool, toolpath, feedRate, spindle, material = 'aluminum') {
    if (!tool || !toolpath || !Array.isArray(toolpath)) {
      throw new Error('Tool and toolpath required');
    }

    const thermalEvents = [];
    let maxTemp = this.options.ambientTemp;
    let totalHeat = 0;

    // Analyze segments
    for (let i = 0; i < toolpath.length - 1; i++) {
      const segment = {
        start: toolpath[i],
        end: toolpath[i + 1],
      };

      // Calculate segment length
      const dx = segment.end.x - segment.start.x;
      const dy = segment.end.y - segment.start.y;
      const dz = segment.end.z - segment.start.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Estimate time for this segment
      const segmentTime = (length / feedRate) * 60; // in seconds

      // Calculate heat for this segment
      const heat = this.estimateHeatGeneration(tool, feedRate, spindle, material);
      totalHeat += heat.heatGeneration * (segmentTime / 3600);

      // Predict temp for this segment
      const temp = this.predictCuttingTemp(tool, feedRate, spindle, material, segmentTime);

      if (temp.cuttingTemp > maxTemp) {
        maxTemp = temp.cuttingTemp;
      }

      if (!temp.isSafe) {
        thermalEvents.push({
          index: i,
          position: segment.start,
          temp: temp.cuttingTemp,
          heat: heat.heatGeneration,
        });
      }
    }

    return {
      maxTemperature: Math.round(maxTemp),
      totalHeatGenerated: Math.round(totalHeat),
      thermalEvents: thermalEvents.length,
      eventDetails: thermalEvents.slice(0, 5),
      isSafe: maxTemp < this.options.materialThreshold,
      recommendations: this.getThermalRecommendations(maxTemp),
    };
  }

  /**
   * Get recommendations based on thermal analysis
   */
  getThermalRecommendations(temperature) {
    const recommendations = [];

    if (temperature > this.options.materialThreshold * 0.9) {
      recommendations.push('Consider reducing spindle speed');
      recommendations.push('Reduce feed rate to lower heat generation');
      recommendations.push('Use cutting fluid for better heat dissipation');
    }

    if (temperature > this.options.materialThreshold * 0.75) {
      recommendations.push('Monitor cutting temperature closely');
      recommendations.push('Ensure adequate cooling');
    }

    if (recommendations.length === 0) {
      recommendations.push('Thermal parameters are within safe limits');
    }

    return recommendations;
  }

  /**
   * Get thermal statistics
   */
  getStats() {
    return {
      spindleType: this.options.spindleType,
      maxPower: this.options.maxPower,
      maxRPM: this.options.maxRPM,
      ambientTemp: this.options.ambientTemp,
      materialThreshold: this.options.materialThreshold,
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
