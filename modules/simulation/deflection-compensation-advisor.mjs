/**
 * Deflection Compensation Advisor
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Analyzes tool and spindle deflection effects on:
 * - Dimensional accuracy
 * - Surface finish quality
 * - Workpiece geometry prediction
 * - Real-time compensation strategies
 */

export class DeflectionCompensationAdvisor {
  constructor(options = {}) {
    this.options = {
      toolStiffnessYZ: options.toolStiffnessYZ || 45000, // N/mm
      spindalStiffnessYZ: options.spindalStiffnessYZ || 85000, // N/mm
      workpieceStiffness: options.workpieceStiffness || 25000, // N/mm (variable)
      measurementResolution: options.measurementResolution || 0.001, // mm
      compensationAccuracy: options.compensationAccuracy || 0.95, // 95% effective
      maxCompensationDepth: options.maxCompensationDepth || 0.5, // mm
      ...options,
    };

    this.deflectionHistory = [];
    this.materialStiffnessFactor = {
      aluminum: 1.0,
      steel: 1.4,
      brass: 0.9,
      plastic: 0.3,
      titanium: 1.6,
      composites: 0.5,
      cast_iron: 1.2,
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
   * Calculate tool deflection under cutting forces
   */
  calculateToolDeflection(params) {
    if (!params || params.cuttingForce === undefined) {
      throw new Error('Tool deflection calculation requires cuttingForce');
    }

    const {
      cuttingForce, // N
      toolLength, // mm
      toolDiameter, // mm
      material,
      toolOverhang, // mm extended beyond holder
    } = params;

    // Stress concentration factor due to overhang
    const overhang = toolOverhang || toolLength * 0.5;
    const overhangFactor = 1 + (overhang / toolLength) * 0.5;

    // Material effect on workpiece stiffness
    const matStiffnessFactor = this.materialStiffnessFactor[material?.toLowerCase()] || 1.0;
    const effectiveWorkpieceStiffness = this.options.workpieceStiffness * matStiffnessFactor;

    // Tool deflection using Euler beam formula
    const toolDeflection = (cuttingForce * toolLength ** 2) / (3 * this.options.toolStiffnessYZ);

    // Combined deflection (tool + spindle + workpiece)
    const spindalDeflection = (cuttingForce * 50) / this.options.spindalStiffnessYZ; // 50mm effective length
    const workpieceDeflection = cuttingForce / effectiveWorkpieceStiffness;

    // Total deflection using spring combination
    const totalDeflection =
      (1 / toolDeflection + 1 / (spindalDeflection || 1) + 1 / (workpieceDeflection || 1)) ** -1;

    // Deflection impact on finish (µm to mm)
    const finishDegradation = Math.sqrt(totalDeflection ** 2 + 0.0001) * 1000; // Convert to µm

    const result = {
      cuttingForceN: cuttingForce,
      toolDeflectionMm: parseFloat(toolDeflection.toFixed(4)),
      spindalDeflectionMm: parseFloat(spindalDeflection.toFixed(4)),
      workpieceDeflectionMm: parseFloat(workpieceDeflection.toFixed(4)),
      totalDeflectionMm: parseFloat(totalDeflection.toFixed(4)),
      finishDegradationUm: parseFloat(finishDegradation.toFixed(2)),
      overhangFactor: parseFloat(overhangFactor.toFixed(2)),
      dominantSource: this._identifyDeflectionSource(
        toolDeflection,
        spindalDeflection,
        workpieceDeflection
      ),
      timestamp: Date.now(),
    };

    this.deflectionHistory.push(result);
    this.emit('deflection:calculated', result);

    return result;
  }

  /**
   * Identify which source contributes most to deflection
   */
  _identifyDeflectionSource(tool, spindle, workpiece) {
    const sources = { tool, spindle, workpiece };
    const max = Math.max(...Object.values(sources));

    if (tool === max) return 'TOOL';
    if (spindle === max) return 'SPINDLE';
    return 'WORKPIECE';
  }

  /**
   * Calculate compensation offset needed
   */
  calculateCompensationOffset(params) {
    if (!params || params.targetDimension === undefined) {
      throw new Error('Compensation offset requires targetDimension and cuttingForce');
    }

    const {
      targetDimension,
      cuttingForce = 500,
      material = 'aluminum',
      toolLength = 50,
      toolDiameter = 3,
    } = params;

    const deflection = this.calculateToolDeflection({
      cuttingForce,
      material,
      toolLength,
      toolDiameter,
    });

    // Compensation offset = predicted deflection
    const compensationOffset = deflection.totalDeflectionMm || 0;

    // Feasibility: can machine compensate?
    const feasible = compensationOffset <= this.options.maxCompensationDepth;
    const compensationQuality = feasible
      ? this.options.compensationAccuracy
      : this.options.compensationAccuracy * 0.7;

    // Dimensional accuracy after compensation
    const accuracyAfterCompensation = compensationOffset * (1 - compensationQuality);

    const result = {
      targetDimensionMm: targetDimension,
      predictedDimensionWithoutCompensation: parseFloat(
        (targetDimension - compensationOffset).toFixed(4)
      ),
      requiredCompensationMm: parseFloat(compensationOffset.toFixed(4)),
      feasible,
      compensationQuality: parseFloat((compensationQuality * 100).toFixed(1)),
      dimensionalAccuracyAfterCompensationMm: parseFloat(accuracyAfterCompensation.toFixed(4)),
      recommendation: feasible
        ? 'Compensation recommended and feasible'
        : 'Deflection exceeds compensation limits - consider tool change',
      timestamp: Date.now(),
    };

    this.deflectionHistory.push(result);
    this.emit('compensation:calculated', result);

    return result;
  }

  /**
   * Analyze real-time compensation during pass
   */
  analyzeRealTimeCompensation(params) {
    if (!params || !params.passes) {
      throw new Error('Real-time compensation analysis requires passes array');
    }

    const { passes, targetDimension } = params;

    const analysisData = passes.map((pass, idx) => {
      const deflection = this.calculateToolDeflection({
        cuttingForce: pass.cuttingForce || 500,
        material: pass.material || 'aluminum',
        toolLength: pass.toolLength || 50,
        toolDiameter: pass.toolDiameter || 3,
      });

      const compensation = this.calculateCompensationOffset({
        targetDimension: targetDimension || 25,
        cuttingForce: pass.cuttingForce || 500,
        material: pass.material || 'aluminum',
      });

      return {
        passNumber: idx + 1,
        depth: pass.depth || idx * 1,
        actualDeflectionMm: deflection.totalDeflectionMm,
        compensationApplied: compensation.requiredCompensationMm,
        residualError: parseFloat(
          (deflection.totalDeflectionMm - compensation.requiredCompensationMm).toFixed(4)
        ),
        achievedDimension: parseFloat(
          (targetDimension - compensation.dimensionalAccuracyAfterCompensationMm).toFixed(4)
        ),
      };
    });

    const errors = analysisData.map((p) => Math.abs(p.residualError));
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const maxError = Math.max(...errors);
    const consistency =
      avgError > 0 ? Math.max(0, Math.min(100, 100 - (maxError / avgError - 1) * 100)) : 100;

    return {
      numberOfPasses: passes.length,
      analysis: analysisData,
      averageResidualErrorMm: parseFloat(avgError.toFixed(4)),
      maxResidualErrorMm: parseFloat(maxError.toFixed(4)),
      minResidualErrorMm: parseFloat(Math.min(...errors).toFixed(4)),
      consistency: parseFloat(consistency.toFixed(1)),
      recommendation:
        avgError < 0.01
          ? 'Compensation excellent - no adjustment needed'
          : avgError < 0.05
          ? 'Compensation acceptable - monitor for wear'
          : 'Compensation suboptimal - consider tool change or strategy adjustment',
      timestamp: Date.now(),
    };
  }

  /**
   * Recommend compensation strategy for given parameters
   */
  recommendCompensationStrategy(params) {
    if (!params || params.predictedDeflection === undefined) {
      throw new Error('Recommendation requires predictedDeflection');
    }

    const { predictedDeflection, budget, accuracy_requirement } = params;

    const strategies = [
      {
        name: 'Soft Compensation (Software)',
        description: 'Adjust CAM offset in G-code',
        cost: 0,
        effectiveness: 70,
        accuracy: 0.05,
        implementationTime: 'Immediate',
      },
      {
        name: 'Tool Change',
        description: 'Use shorter, stiffer tool',
        cost: 150,
        effectiveness: 85,
        accuracy: 0.02,
        implementationTime: '5 minutes',
      },
      {
        name: 'Reduced Cutting Force',
        description: 'Lower feed rate and depth',
        cost: 0,
        effectiveness: 65,
        accuracy: 0.08,
        implementationTime: 'Immediate',
      },
      {
        name: 'Tool Holder Upgrade',
        description: 'High-precision spindle collet',
        cost: 500,
        effectiveness: 92,
        accuracy: 0.01,
        implementationTime: '30 minutes',
      },
      {
        name: 'Workpiece Support',
        description: 'Add steady rest or support',
        cost: 200,
        effectiveness: 88,
        accuracy: 0.015,
        implementationTime: '15 minutes',
      },
    ];

    const budgetLimit = budget || 1000;
    const requiredAccuracy = accuracy_requirement || 0.05;

    const feasibleStrategies = strategies
      .filter((s) => s.cost <= budgetLimit && s.accuracy <= requiredAccuracy)
      .sort((a, b) => b.effectiveness - a.effectiveness);

    const recommended = feasibleStrategies.length > 0 ? feasibleStrategies[0] : strategies[0];

    return {
      predictedDeflectionMm: predictedDeflection,
      budget,
      requiredAccuracy,
      recommendedStrategy: recommended.name,
      fullRecommendation: recommended,
      alternativeStrategies: feasibleStrategies.slice(1, 3),
      combinedStrategy:
        feasibleStrategies.length > 1
          ? [feasibleStrategies[0], feasibleStrategies[1]]
          : [recommended],
      expectedImprovement: parseFloat((((recommended.effectiveness - 50) / 50) * 100).toFixed(1)),
      timestamp: Date.now(),
    };
  }

  /**
   * History management
   */
  getHistory(limit = 50) {
    return this.deflectionHistory.slice(-limit);
  }

  clearHistory() {
    this.deflectionHistory = [];
  }

  /**
   * Statistics
   */
  getStatistics() {
    if (this.deflectionHistory.length === 0) {
      return { message: 'No deflection history available' };
    }

    const deflections = this.deflectionHistory
      .filter((h) => h.totalDeflectionMm !== undefined)
      .map((h) => h.totalDeflectionMm);

    if (deflections.length === 0) {
      return { message: 'No deflection measurements in history' };
    }

    const avgDeflection = deflections.reduce((a, b) => a + b, 0) / deflections.length;

    return {
      totalMeasurements: this.deflectionHistory.length,
      averageDeflectionMm: parseFloat(avgDeflection.toFixed(4)),
      maxDeflectionMm: parseFloat(Math.max(...deflections).toFixed(4)),
      minDeflectionMm: parseFloat(Math.min(...deflections).toFixed(4)),
      standardDeviation: parseFloat(
        Math.sqrt(
          deflections.reduce((sq, n) => sq + Math.pow(n - avgDeflection, 2), 0) / deflections.length
        ).toFixed(4)
      ),
    };
  }
}

export default DeflectionCompensationAdvisor;
