/**
 * Power Draw Analyzer
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Analyzes spindle and stepper motor power consumption based on:
 * - Cutting forces
 * - Spindle speed and load
 * - Feed rates
 * - Material properties
 * - Machine efficiency
 */

export class PowerDrawAnalyzer {
  constructor(options = {}) {
    this.options = {
      spindleMotorPower: options.spindleMotorPower || 2.2, // kW
      stepperMotorPower: options.stepperMotorPower || 0.4, // kW per axis
      numberOfAxes: options.numberOfAxes || 3, // X, Y, Z
      machineEfficiency: options.machineEfficiency || 0.85, // 85% efficiency
      idlePower: options.idlePower || 0.2, // kW at idle
      thermalMargin: options.thermalMargin || 0.8, // 80% of max power
      ...options,
    };

    this.powerHistory = [];
    this.materialPowerFactors = {
      aluminum: 0.8,
      steel: 1.0,
      brass: 0.85,
      plastic: 0.6,
      titanium: 1.5,
      composites: 1.1,
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
   * Calculate cutting power based on material removal rate
   */
  calculateCuttingPower(params) {
    if (!params || params.mrr === undefined) {
      throw new Error('Power calculation requires MRR (material removal rate)');
    }

    const { mrr, material, efficiency } = params;

    // Specific power for material (W/(cm³/min))
    const specificPowers = {
      aluminum: 4.0,
      steel: 9.0,
      brass: 6.5,
      plastic: 2.0,
      titanium: 18.0,
      composites: 5.0,
    };

    const matFactor = this.materialPowerFactors[material?.toLowerCase()] || 1.0;
    const specificPower = (specificPowers[material?.toLowerCase()] || 9.0) * matFactor;

    // Cutting power = specific power × MRR
    const cuttingPowerRequired = (specificPower * mrr) / 1000; // Convert to kW

    const machineEff = efficiency || this.options.machineEfficiency;
    const spindlePower = cuttingPowerRequired / machineEff;

    return {
      mrrCm3PerMin: mrr,
      specificPower,
      cuttingPowerRequired: parseFloat(cuttingPowerRequired.toFixed(2)),
      spindlePowerRequired: parseFloat(spindlePower.toFixed(2)),
      materialFactor: matFactor,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate total machine power draw
   */
  calculateTotalPowerDraw(params) {
    if (!params || params.mrr === undefined) {
      throw new Error('Total power calculation requires MRR');
    }

    const { mrr, material, feedRateXYZ, spindleSpeed } = params;

    // Spindle cutting power
    const cuttingPower = this.calculateCuttingPower({ mrr, material });

    // Stepper motor power for XY movement (Z typically lighter)
    const feedSpeed = feedRateXYZ || 100; // mm/min
    const feedFactor = Math.min(feedSpeed / 100, 1); // Normalized to 100 mm/min
    const stepperPowerPerAxis = this.options.stepperMotorPower * feedFactor * 0.5; // 50% utilization
    const stepperTotal = stepperPowerPerAxis * (this.options.numberOfAxes - 1); // Exclude Z

    // Spindle idle power
    const spindleIdle = this.options.idlePower;

    // Total
    const totalPower = cuttingPower.spindlePowerRequired + stepperTotal + spindleIdle;

    // Thermal analysis
    const thermalLimit = this.options.spindleMotorPower * this.options.thermalMargin;
    const thermalStatus = totalPower > thermalLimit ? 'WARNING' : 'OK';

    const result = {
      totalPower: parseFloat(totalPower.toFixed(2)),
      spindleContribution: parseFloat(cuttingPower.spindlePowerRequired.toFixed(2)),
      stepperContribution: parseFloat(stepperTotal.toFixed(2)),
      idleContribution: parseFloat(spindleIdle.toFixed(2)),
      thermalStatus,
      thermalLimit: parseFloat(thermalLimit.toFixed(2)),
      thermalMargin: parseFloat((thermalLimit - totalPower).toFixed(2)),
      utilizationPercent: parseFloat(
        ((totalPower / this.options.spindleMotorPower) * 100).toFixed(1)
      ),
      timestamp: Date.now(),
    };

    this.powerHistory.push(result);
    this.emit('power:calculated', result);

    return result;
  }

  /**
   * Estimate job energy consumption
   */
  estimateJobEnergy(params) {
    if (!params || !params.cycleTimeSeconds) {
      throw new Error('Energy estimation requires cycleTimeSeconds');
    }

    const { cycleTimeSeconds, averagePowerDraw, idlePower } = params;

    // Active cutting time vs total time
    const activeFraction = params.activeFraction || 0.7; // 70% cutting, 30% rapids/tool changes
    const activePower = averagePowerDraw || this.options.spindleMotorPower * 0.8;
    const idlePowerValue = idlePower || this.options.idlePower;

    // Energy calculation
    const activeTime = cycleTimeSeconds * activeFraction;
    const idleTime = cycleTimeSeconds * (1 - activeFraction);

    const activeEnergy = (activePower * activeTime) / 3600; // kWh
    const idleEnergy = (idlePowerValue * idleTime) / 3600; // kWh

    const totalEnergy = activeEnergy + idleEnergy;

    // Cost estimation (assuming $0.12/kWh average)
    const costPerKWh = params.costPerKWh || 0.12;
    const energyCost = totalEnergy * costPerKWh;

    return {
      totalTimeSeconds: cycleTimeSeconds,
      activeTimeSeconds: parseFloat(activeTime.toFixed(0)),
      idleTimeSeconds: parseFloat(idleTime.toFixed(0)),
      activeEnergyKWh: parseFloat(activeEnergy.toFixed(3)),
      idleEnergyKWh: parseFloat(idleEnergy.toFixed(3)),
      totalEnergyKWh: parseFloat(totalEnergy.toFixed(3)),
      estimatedCost: parseFloat(energyCost.toFixed(2)),
      costPerKWh,
    };
  }

  /**
   * Analyze power profile over job
   */
  analyzePowerProfile(params) {
    if (!params || !params.operations || !Array.isArray(params.operations)) {
      throw new Error('Power profile analysis requires operations array');
    }

    const { operations } = params;

    const profile = operations.map((op, idx) => {
      const power = this.calculateTotalPowerDraw({
        mrr: op.mrr || 10,
        material: op.material,
      });

      return {
        operationNumber: idx + 1,
        description: op.description,
        powerDraw: power.totalPower,
        duration: op.duration || 60,
        energy: (power.totalPower * (op.duration || 60)) / 3600,
        thermalStatus: power.thermalStatus,
      };
    });

    const totalEnergy = profile.reduce((sum, op) => sum + op.energy, 0);
    const peakPower = Math.max(...profile.map((op) => op.powerDraw));
    const avgPower = profile.reduce((sum, op) => sum + op.powerDraw, 0) / profile.length;

    return {
      numberOfOperations: operations.length,
      profile,
      peakPower: parseFloat(peakPower.toFixed(2)),
      averagePower: parseFloat(avgPower.toFixed(2)),
      totalEnergy: parseFloat(totalEnergy.toFixed(3)),
      thermalWarnings: profile.filter((op) => op.thermalStatus === 'WARNING').length,
    };
  }

  /**
   * Recommend power-efficient parameters
   */
  recommendEfficientParams(params) {
    if (!params || params.requiredMrr === undefined) {
      throw new Error('Recommendation requires requiredMrr');
    }

    const { requiredMrr, maxThermalPower } = params;

    const thermalLimit =
      maxThermalPower || this.options.spindleMotorPower * this.options.thermalMargin;

    // Calculate optimal material for lowest power
    const materials = ['aluminum', 'brass', 'plastic', 'steel', 'titanium'];
    const powerNeeded = materials.map((mat) => ({
      material: mat,
      power: this.calculateCuttingPower({
        mrr: requiredMrr,
        material: mat,
      }).spindlePowerRequired,
    }));

    const sorted = powerNeeded.sort((a, b) => a.power - b.power);

    // Check if feasible
    const feasible = sorted[0].power <= thermalLimit;

    return {
      requiredMrr,
      thermalLimit: parseFloat(thermalLimit.toFixed(2)),
      materialOptions: sorted,
      recommendedMaterial: sorted[0].material,
      recommendedPower: parseFloat(sorted[0].power.toFixed(2)),
      feasible,
      recommendation: feasible
        ? `Use ${sorted[0].material} for most efficient operation`
        : 'MRR too high - reduce or increase spindle power',
    };
  }

  /**
   * Get power history
   */
  getHistory(limit = 100) {
    return this.powerHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.powerHistory = [];
  }

  /**
   * Get statistics from power history
   */
  getStatistics() {
    if (this.powerHistory.length === 0) {
      return { message: 'No power history' };
    }

    const powers = this.powerHistory.map((h) => h.totalPower);
    const avgPower = powers.reduce((a, b) => a + b, 0) / powers.length;

    return {
      totalMeasurements: this.powerHistory.length,
      averagePower: parseFloat(avgPower.toFixed(2)),
      peakPower: parseFloat(Math.max(...powers).toFixed(2)),
      minimumPower: parseFloat(Math.min(...powers).toFixed(2)),
      unit: 'Power (kW)',
    };
  }
}

export default PowerDrawAnalyzer;
