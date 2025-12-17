/**
 * Chip Load Optimizer
 * Phase 16: Advanced Simulation & Analysis
 *
 * Optimizes chip load for cutting efficiency:
 * - Chip load calculation per tooth
 * - Feed rate recommendations
 * - Spindle speed optimization
 * - Material-specific parameters
 */

export class ChipLoadOptimizer {
  constructor(options = {}) {
    this.options = {
      materials: options.materials || this.getDefaultMaterials(),
      maxChipLoad: options.maxChipLoad || 0.5,
      minChipLoad: options.minChipLoad || 0.05,
      ...options,
    };

    this.listeners = {};
  }

  /**
   * Get default material parameters
   */
  getDefaultMaterials() {
    return {
      aluminum: {
        name: 'Aluminum',
        density: 2.7,
        chipLoad: { min: 0.05, max: 0.3 },
        surfaceSpeed: { min: 200, max: 500 },
        coolingRequired: false,
      },
      steel: {
        name: 'Steel',
        density: 7.85,
        chipLoad: { min: 0.03, max: 0.15 },
        surfaceSpeed: { min: 60, max: 150 },
        coolingRequired: true,
      },
      stainless: {
        name: 'Stainless Steel',
        density: 7.5,
        chipLoad: { min: 0.02, max: 0.1 },
        surfaceSpeed: { min: 40, max: 100 },
        coolingRequired: true,
      },
      plastic: {
        name: 'Plastic',
        density: 1.2,
        chipLoad: { min: 0.1, max: 0.5 },
        surfaceSpeed: { min: 300, max: 1000 },
        coolingRequired: false,
      },
      wood: {
        name: 'Wood',
        density: 0.6,
        chipLoad: { min: 0.1, max: 0.8 },
        surfaceSpeed: { min: 3000, max: 5000 },
        coolingRequired: false,
      },
    };
  }

  /**
   * Calculate chip load per tooth
   */
  calculateChipLoad(feedRate, spindle, flutes) {
    if (feedRate === undefined || spindle === undefined || !flutes) {
      throw new Error('Feed rate, spindle speed, and tooth count required');
    }

    if (spindle === 0) {
      throw new Error('Spindle speed cannot be zero');
    }

    const chipLoad = feedRate / (spindle * flutes);

    return {
      chipLoad: parseFloat(chipLoad.toFixed(4)),
      feedRate,
      spindle,
      flutes,
      unit: 'mm/tooth',
    };
  }

  /**
   * Recommend feed rate for target chip load
   */
  recommendFeedRate(targetChipLoad, spindle, flutes) {
    if (targetChipLoad === undefined || spindle === undefined || !flutes) {
      throw new Error('Target chip load, spindle speed, and tooth count required');
    }

    const recommendedFeed = targetChipLoad * spindle * flutes;

    return {
      recommendedFeedRate: parseFloat(recommendedFeed.toFixed(2)),
      targetChipLoad,
      spindle,
      flutes,
      unit: 'mm/min',
    };
  }

  /**
   * Optimize cutting parameters for material
   */
  optimizeForMaterial(material, toolDiameter, flutes) {
    const mat = material.toLowerCase();
    if (!this.options.materials[mat]) {
      throw new Error(`Unknown material: ${material}`);
    }

    const matParams = this.options.materials[mat];
    const optimalChipLoad = (matParams.chipLoad.min + matParams.chipLoad.max) / 2;

    // Calculate optimal spindle speed from surface speed
    // SurfaceSpeed = (RPM * π * Diameter) / 1000
    const avgSurfaceSpeed = (matParams.surfaceSpeed.min + matParams.surfaceSpeed.max) / 2;
    const optimalRPM = (avgSurfaceSpeed * 1000) / (Math.PI * toolDiameter);

    // Calculate optimal feed rate
    const optimalFeed = optimalChipLoad * optimalRPM * flutes;

    return {
      material: matParams.name,
      optimalChipLoad: parseFloat(optimalChipLoad.toFixed(4)),
      optimalRPM: Math.round(optimalRPM),
      optimalFeedRate: parseFloat(optimalFeed.toFixed(2)),
      chipLoadRange: matParams.chipLoad,
      surfaceSpeedRange: matParams.surfaceSpeed,
      coolingRequired: matParams.coolingRequired,
      recommendations: this.getRecommendations(matParams, optimalChipLoad),
    };
  }

  /**
   * Get recommendations for cutting parameters
   */
  getRecommendations(material, chipLoad) {
    const recommendations = [];

    if (material.coolingRequired) {
      recommendations.push('Cooling fluid recommended for better results');
      recommendations.push('Monitor for overheating');
    } else {
      recommendations.push('Dry cutting suitable for this material');
    }

    if (chipLoad < material.chipLoad.min) {
      recommendations.push('Chip load is too low - may cause tool rubbing');
    } else if (chipLoad > material.chipLoad.max) {
      recommendations.push('Chip load is too high - risk of tool breakage');
    } else {
      recommendations.push('Chip load is within optimal range');
    }

    return recommendations;
  }

  /**
   * Validate chip load parameters
   */
  validateChipLoad(chipLoad, material) {
    const mat = material.toLowerCase();
    if (!this.options.materials[mat]) {
      throw new Error(`Unknown material: ${material}`);
    }

    const matParams = this.options.materials[mat];
    const isValid = chipLoad >= matParams.chipLoad.min && chipLoad <= matParams.chipLoad.max;

    return {
      chipLoad,
      material: matParams.name,
      isValid,
      range: matParams.chipLoad,
      status: isValid ? 'optimal' : chipLoad < matParams.chipLoad.min ? 'too-low' : 'too-high',
      warning: !isValid ? `Chip load out of range for ${matParams.name}` : null,
    };
  }

  /**
   * Calculate estimated tool life
   */
  estimateToolLife(toolDiameter, material, chipLoad, cuttingTime) {
    const mat = material.toLowerCase();
    if (!this.options.materials[mat]) {
      throw new Error(`Unknown material: ${material}`);
    }

    // Simplified tool life estimation based on chip load and material
    const matParams = this.options.materials[mat];
    const optimalChip = (matParams.chipLoad.min + matParams.chipLoad.max) / 2;

    // Tool life factor (higher if close to optimal)
    const lifeFactor = 1.0 / Math.abs(chipLoad - optimalChip + 0.01);

    // Base tool life in minutes (simplified)
    const baseLife = 60 * lifeFactor;

    const estimatedLife = {
      baseToolLife: Math.round(baseLife),
      usedTime: Math.round(cuttingTime),
      remainingLife: Math.max(0, Math.round(baseLife - cuttingTime)),
      wearPercentage: Math.min(100, (cuttingTime / baseLife) * 100),
      recommendations: this.getToolLifeRecommendations(cuttingTime, baseLife),
    };

    return estimatedLife;
  }

  /**
   * Get tool life recommendations
   */
  getToolLifeRecommendations(used, total) {
    const percentage = (used / total) * 100;
    const recommendations = [];

    if (percentage < 20) {
      recommendations.push('Tool is still fresh');
    } else if (percentage < 50) {
      recommendations.push('Tool is in good condition');
    } else if (percentage < 75) {
      recommendations.push('Monitor tool condition closely');
      recommendations.push('Prepare replacement tool');
    } else if (percentage < 90) {
      recommendations.push('Tool is nearing end of life');
      recommendations.push('Replace tool soon');
    } else {
      recommendations.push('Replace tool immediately');
      recommendations.push('Risk of tool failure');
    }

    return recommendations;
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
