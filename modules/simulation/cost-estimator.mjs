/**
 * Cost Estimation System
 * Phase 16: Advanced Simulation & Analysis
 *
 * Estimates job costs including:
 * - Material costs (weight, type)
 * - Spindle operation time and power consumption
 * - Tool depreciation and wear
 * - Machine overhead
 * - Labor costs (if applicable)
 * - Total project cost with profitability analysis
 */

export class CostEstimator {
  constructor(options = {}) {
    this.options = {
      currencySymbol: options.currencySymbol || '$',
      ...options,
    };

    this.costProfiles = {
      materials: {
        aluminum: {
          density: 2.7, // g/cm³
          costPerKg: options.aluminumCostPerKg || 15,
          name: 'Aluminum',
        },
        steel: {
          density: 7.85,
          costPerKg: options.steelCostPerKg || 10,
          name: 'Steel',
        },
        brass: {
          density: 8.4,
          costPerKg: options.brassCostPerKg || 20,
          name: 'Brass',
        },
        plastic: {
          density: 1.2,
          costPerKg: options.plasticCostPerKg || 8,
          name: 'Plastic',
        },
        copper: {
          density: 8.96,
          costPerKg: options.copperCostPerKg || 25,
          name: 'Copper',
        },
      },
      tools: {
        endmill: {
          baseCost: options.endmillCost || 12,
          lifespan: options.endmillLifespan || 500000, // tool minutes
          flute: options.endmillFlute || 2,
          name: 'End Mill',
        },
        ballnose: {
          baseCost: options.ballnoseCost || 18,
          lifespan: options.ballnoseLifespan || 300000,
          flute: options.ballnoseFlute || 2,
          name: 'Ball Nose',
        },
        drill: {
          baseCost: options.drillCost || 8,
          lifespan: options.drillLifespan || 200000,
          flute: options.drillFlute || 2,
          name: 'Drill',
        },
        taper: {
          baseCost: options.taperCost || 25,
          lifespan: options.taperLifespan || 150000,
          flute: options.taperFlute || 3,
          name: 'Taper',
        },
      },
      machine: {
        spindlePower: options.spindlePower || 2.2, // kW (typical for hobby CNC)
        spindleEfficiency: options.spindleEfficiency || 0.85,
        electricityCost: options.electricityCost || 0.15, // per kWh
        machineOverheadPerHour: options.machineOverheadPerHour || 5, // $ per machine hour
        laborCostPerHour: options.laborCostPerHour || 0, // 0 = no labor cost
      },
      waste: {
        materialWasteFactor: options.materialWasteFactor || 0.15, // 15% waste
      },
    };

    this.jobHistory = [];
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
   * Estimate total job cost
   */
  estimateJobCost(jobParams) {
    if (!jobParams || !jobParams.material || !jobParams.machineTime || !jobParams.tools) {
      throw new Error('Job requires material, machineTime (minutes), and tools array');
    }

    const materialCost = this.calculateMaterialCost(jobParams);
    const toolCost = this.calculateToolCost(jobParams);
    const powerCost = this.calculatePowerCost(jobParams);
    const overheadCost = this.calculateMachineOverhead(jobParams);
    const laborCost = this.calculateLaborCost(jobParams);

    const subtotal = materialCost + toolCost + powerCost + overheadCost + laborCost;
    const profitMargin = jobParams.profitMargin || 0.25; // 25% default
    const totalCost = subtotal / (1 - profitMargin);

    const breakdown = {
      material: {
        cost: materialCost,
        weight: jobParams.materialWeight || 0,
        wasteFactor: this.costProfiles.waste.materialWasteFactor,
      },
      tools: {
        cost: toolCost,
        count: jobParams.tools?.length || 0,
        depreciation: toolCost,
      },
      power: {
        cost: powerCost,
        estimatedPowerUsage: (
          (this.costProfiles.machine.spindlePower * jobParams.machineTime) /
          60
        ).toFixed(2),
      },
      overhead: {
        cost: overheadCost,
        machineTime: jobParams.machineTime,
      },
      labor: {
        cost: laborCost,
        hours: (jobParams.machineTime / 60).toFixed(2),
      },
    };

    const result = {
      estimatedMaterialCost: parseFloat(materialCost.toFixed(2)),
      estimatedToolCost: parseFloat(toolCost.toFixed(2)),
      estimatedPowerCost: parseFloat(powerCost.toFixed(2)),
      estimatedMachineOverhead: parseFloat(overheadCost.toFixed(2)),
      estimatedLaborCost: parseFloat(laborCost.toFixed(2)),
      subtotal: parseFloat(subtotal.toFixed(2)),
      profitMargin: (profitMargin * 100).toFixed(1),
      totalEstimatedCost: parseFloat(totalCost.toFixed(2)),
      breakdown,
      timestamp: Date.now(),
    };

    this.jobHistory.push(result);
    this.emit('cost:estimated', result);

    return result;
  }

  /**
   * Calculate material cost
   */
  calculateMaterialCost(jobParams) {
    const material = jobParams.material?.toLowerCase() || 'aluminum';
    const materialProfile = this.costProfiles.materials[material];

    if (!materialProfile) {
      throw new Error(`Unknown material: ${material}`);
    }

    // Calculate weight if dimensions provided
    let weight = jobParams.materialWeight;
    if (!weight && jobParams.dimensions) {
      const { length, width, height } = jobParams.dimensions;
      const volume = (length * width * height) / 1000; // mm³ to cm³
      weight = (volume * materialProfile.density) / 1000; // g to kg
    }

    if (!weight) {
      throw new Error('Job requires materialWeight or dimensions');
    }

    // Add waste factor
    const wastedWeight = weight * (1 + this.costProfiles.waste.materialWasteFactor);
    return wastedWeight * materialProfile.costPerKg;
  }

  /**
   * Calculate tool cost (depreciation)
   */
  calculateToolCost(jobParams) {
    if (!jobParams.tools || !Array.isArray(jobParams.tools)) {
      return 0;
    }

    let totalCost = 0;

    jobParams.tools.forEach((tool) => {
      const toolType = tool.type?.toLowerCase() || 'endmill';
      const toolProfile = this.costProfiles.tools[toolType];

      if (!toolProfile) {
        console.warn(`Unknown tool type: ${toolType}, using default endmill cost`);
      }

      const profile = toolProfile || this.costProfiles.tools.endmill;
      const depreciationPerMinute = profile.baseCost / profile.lifespan;

      // Calculate tool usage in minutes
      const toolTime = tool.machineTime || jobParams.machineTime || 0;
      const toolDepreciation = depreciationPerMinute * toolTime;

      totalCost += toolDepreciation;
    });

    return totalCost;
  }

  /**
   * Calculate power consumption cost
   */
  calculatePowerCost(jobParams) {
    const machineTimeHours = jobParams.machineTime / 60;

    // Calculate power consumption (spindle + auxiliary)
    const spindleAveragePowerUsage =
      this.costProfiles.machine.spindlePower * jobParams.spindleLoadFactor || 0.75;
    const auxiliaryPower = 0.3; // kW for stepper motors, fans, etc.
    const totalPower = spindleAveragePowerUsage + auxiliaryPower;

    // Apply efficiency
    const actualPowerUsage =
      (totalPower / this.costProfiles.machine.spindleEfficiency) * machineTimeHours;

    return actualPowerUsage * this.costProfiles.machine.electricityCost;
  }

  /**
   * Calculate machine overhead (hourly rate)
   */
  calculateMachineOverhead(jobParams) {
    const machineTimeHours = jobParams.machineTime / 60;
    return machineTimeHours * this.costProfiles.machine.machineOverheadPerHour;
  }

  /**
   * Calculate labor cost
   */
  calculateLaborCost(jobParams) {
    const machineTimeHours = jobParams.machineTime / 60;

    // Add setup and cleanup time (10% of machine time, default)
    const setupCleanupTime = jobParams.setupCleanupTime || machineTimeHours * 0.1;
    const totalLaborTime = machineTimeHours + setupCleanupTime;

    return totalLaborTime * this.costProfiles.machine.laborCostPerHour;
  }

  /**
   * Compare cost of different materials for same job
   */
  compareMaterials(jobParams) {
    const materials = Object.keys(this.costProfiles.materials);
    const comparison = [];

    materials.forEach((material) => {
      try {
        const cost = this.calculateMaterialCost({ ...jobParams, material });
        comparison.push({
          material,
          costPerKg: this.costProfiles.materials[material].costPerKg,
          totalCost: parseFloat(cost.toFixed(2)),
          density: this.costProfiles.materials[material].density,
        });
      } catch (error) {
        // Skip if calculation fails
      }
    });

    return comparison.sort((a, b) => a.totalCost - b.totalCost);
  }

  /**
   * Break-even analysis: how many parts to make profit
   */
  breakEvenAnalysis(jobParams, sellingPrice) {
    if (!sellingPrice || sellingPrice <= 0) {
      throw new Error('Selling price required for break-even analysis');
    }

    const costPerPart = this.estimateJobCost(jobParams).totalEstimatedCost;
    const profitPerPart = sellingPrice - costPerPart;

    if (profitPerPart <= 0) {
      return {
        profitable: false,
        message: 'Selling price is below cost per part',
        profitPerPart,
        costPerPart,
      };
    }

    // Assume tooling investment for production
    const toolingInvestment = jobParams.toolingInvestment || 100;
    const breakEvenUnits = Math.ceil(toolingInvestment / profitPerPart);

    return {
      profitable: true,
      costPerPart: parseFloat(costPerPart.toFixed(2)),
      sellingPrice: parseFloat(sellingPrice.toFixed(2)),
      profitPerPart: parseFloat(profitPerPart.toFixed(2)),
      breakEvenUnits,
      profitAtBreakEven: parseFloat(
        (breakEvenUnits * profitPerPart - toolingInvestment).toFixed(2)
      ),
      profitMargin: ((profitPerPart / sellingPrice) * 100).toFixed(1),
    };
  }

  /**
   * Cost optimization suggestions
   */
  optimizationSuggestions(jobParams, currentCost) {
    const suggestions = [];

    // Material optimization
    const materialComparison = this.compareMaterials(jobParams);
    if (materialComparison.length > 1) {
      const cheapest = materialComparison[0];
      const current = materialComparison.find(
        (m) => m.material === jobParams.material?.toLowerCase()
      );

      if (current && cheapest.totalCost < current.totalCost) {
        const savings = current.totalCost - cheapest.totalCost;
        suggestions.push({
          category: 'material',
          priority: 1,
          message: `Switch to ${cheapest.material} for material savings`,
          action: `Using ${cheapest.material} instead of ${jobParams.material} could save ${
            this.options.currencySymbol
          }${savings.toFixed(2)}`,
          estimatedSavings: savings,
        });
      }
    }

    // Tool optimization
    const toolCost = this.calculateToolCost(jobParams);
    if (toolCost > currentCost * 0.1) {
      suggestions.push({
        category: 'tooling',
        priority: 2,
        message: 'High tool depreciation cost',
        action: 'Consider longer tool life strategies or better feeds/speeds',
        estimatedSavings: toolCost * 0.1,
      });
    }

    // Power optimization
    const powerCost = this.calculatePowerCost(jobParams);
    const powerOptimized = powerCost * 0.8; // 20% improvement possible
    if (powerOptimized < powerCost) {
      suggestions.push({
        category: 'power',
        priority: 3,
        message: 'Power consumption optimization possible',
        action: 'Reduce spindle speed or optimize cutting parameters',
        estimatedSavings: powerCost - powerOptimized,
      });
    }

    // Batch production efficiency
    if (!jobParams.batchSize || jobParams.batchSize === 1) {
      suggestions.push({
        category: 'production',
        priority: 4,
        message: 'Consider batch production',
        action: 'Spreading setup costs across multiple parts reduces unit cost',
        estimatedSavings: jobParams.machineTime * 0.05,
      });
    }

    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get cost history
   */
  getHistory(limit = 100) {
    return this.jobHistory.slice(-limit);
  }

  /**
   * Clear cost history
   */
  clearHistory() {
    this.jobHistory = [];
  }

  /**
   * Get cost profiles
   */
  getCostProfiles() {
    return structuredClone(this.costProfiles);
  }

  /**
   * Update cost profiles (for material/labor cost changes)
   */
  updateCostProfiles(profiles) {
    if (profiles.materials) {
      Object.assign(this.costProfiles.materials, profiles.materials);
    }
    if (profiles.tools) {
      Object.assign(this.costProfiles.tools, profiles.tools);
    }
    if (profiles.machine) {
      Object.assign(this.costProfiles.machine, profiles.machine);
    }
    return this.costProfiles;
  }

  /**
   * Get statistics from cost history
   */
  getStatistics() {
    if (this.jobHistory.length === 0) {
      return { message: 'No cost estimation history' };
    }

    const costs = this.jobHistory.map((j) => j.totalEstimatedCost);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const maxCost = Math.max(...costs);
    const minCost = Math.min(...costs);
    const totalRevenue = costs.reduce((a, b) => a + b, 0);

    return {
      totalEstimates: this.jobHistory.length,
      averageJobCost: parseFloat(avgCost.toFixed(2)),
      maxJobCost: parseFloat(maxCost.toFixed(2)),
      minJobCost: parseFloat(minCost.toFixed(2)),
      totalProjectValue: parseFloat(totalRevenue.toFixed(2)),
    };
  }
}

export default CostEstimator;
