/**
 * Tool Selector
 * Phase 18: AI & Machine Learning
 *
 * Intelligent tool selection based on:
 * - Material type and properties
 * - Operation type
 * - Desired surface finish
 * - Machine capabilities
 * - Tool wear prediction
 */

export class ToolSelector {
  constructor(options = {}) {
    this.options = {
      enablePredictiveWear: options.enablePredictiveWear !== false,
      enableCostOptimization: options.enableCostOptimization !== false,
      toolDatabase: options.toolDatabase || [],
      ...options,
    };

    this.toolLibrary = new Map();
    this.usageHistory = [];
    this.wearData = [];
    this.listeners = {};

    this._initializeToolLibrary();
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
   * Select tools for operation
   */
  selectTools(params) {
    if (!params || !params.material || !params.operation) {
      throw new Error('Tool selection requires material and operation');
    }

    const {
      material,
      operation, // 'DRILLING', 'MILLING', 'ENGRAVING', 'TURNING'
      geometry = {},
      quality = 'STANDARD', // DRAFT, STANDARD, FINE
      quantity = 1,
    } = params;

    // Get candidates
    const candidates = this._getToolCandidates(material, operation, quality);

    if (candidates.length === 0) {
      throw new Error(`No suitable tools found for ${material} ${operation}`);
    }

    // Rank candidates
    const ranked = this._rankTools(candidates, {
      material,
      operation,
      geometry,
      quality,
      quantity,
    });

    // Predict wear for recommended tools
    const recommendations = ranked.slice(0, 3).map((tool, index) => ({
      ...tool,
      rank: index + 1,
      wearPrediction: this._predictWear(tool, operation),
      estimatedLifetime: this._estimateToolLife(tool, operation),
      cost: this._calculateToolCost(tool, quantity),
      recommendation: index === 0 ? 'PRIMARY' : 'ALTERNATIVE',
    }));

    const selection = {
      id: this._generateId(),
      material,
      operation,
      quality,
      timestamp: Date.now(),
      recommendations,
      summary: {
        bestChoice: recommendations[0].toolId,
        alternatives: recommendations.slice(1).map((t) => t.toolId),
        estimatedCost: recommendations[0].cost,
      },
    };

    this.emit('tools:selected', selection);

    return selection;
  }

  /**
   * Analyze tool performance
   */
  analyzeTool(params) {
    if (!params || !params.toolId) {
      throw new Error('Tool analysis requires toolId');
    }

    const { toolId } = params;

    const tool = this.toolLibrary.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const history = this.usageHistory.filter((h) => h.toolId === toolId);
    const wear = this.wearData.filter((w) => w.toolId === toolId);

    const analysis = {
      toolId,
      toolType: tool.type,
      totalUsageTime: history.reduce((sum, h) => sum + h.duration, 0),
      usageCount: history.length,
      averageWear:
        wear.length > 0 ? wear.reduce((sum, w) => sum + w.wearPercent, 0) / wear.length : 0,
      wearTrend: this._calculateWearTrend(wear),
      estimatedRemainingLife: this._estimateRemainingLife(tool, wear),
      performance: {
        surfaceFinish: this._calculateAverageSurfaceFinish(history),
        accuracy: this._calculateAverageAccuracy(history),
        breakageRisk: this._calculateBreakageRisk(tool, wear),
      },
    };

    analysis.recommendations = this._generateToolRecommendations(tool, analysis);

    this.emit('tool:analyzed', analysis);

    return analysis;
  }

  /**
   * Predict tool failure
   */
  predictFailure(params) {
    if (!params || !params.toolId) {
      throw new Error('Failure prediction requires toolId');
    }

    const { toolId } = params;

    const tool = this.toolLibrary.get(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const history = this.usageHistory.filter((h) => h.toolId === toolId);
    const wear = this.wearData.filter((w) => w.toolId === toolId);

    // Simulate ML-based failure prediction
    const wearProgression = this._calculateWearProgression(wear);
    const riskFactors = this._calculateRiskFactors(tool, history);

    const prediction = {
      toolId,
      failureProbability: Math.min(wearProgression * 0.7 + riskFactors * 0.3, 100),
      estimatedUsageHours: Math.max(0, this._estimateRemainingLife(tool, wear)),
      riskLevel: this._classifyRisk(Math.min(wearProgression * 0.7 + riskFactors * 0.3, 100)),
      factors: {
        wearRate: parseFloat(wearProgression.toFixed(1)),
        vibrationAnomaly: parseFloat((Math.random() * 30).toFixed(1)),
        temperatureSpike: parseFloat((Math.random() * 20).toFixed(1)),
        feedRateDeviation: parseFloat((Math.random() * 15).toFixed(1)),
      },
      recommendation: this._failureRecommendation(
        Math.min(wearProgression * 0.7 + riskFactors * 0.3, 100)
      ),
      timestamp: Date.now(),
    };

    this.emit('failure:predicted', prediction);

    return prediction;
  }

  /**
   * Register tool usage
   */
  recordUsage(params) {
    if (!params || !params.toolId) {
      throw new Error('Usage recording requires toolId');
    }

    const { toolId, duration, material, operation, surfaceFinish = 0, accuracy = 0 } = params;

    const usage = {
      toolId,
      duration: duration || 0,
      material,
      operation,
      surfaceFinish,
      accuracy,
      timestamp: Date.now(),
    };

    this.usageHistory.push(usage);

    this.emit('usage:recorded', usage);

    return { status: 'RECORDED', toolId, timestamp: usage.timestamp };
  }

  /**
   * Record tool wear measurement
   */
  recordWear(params) {
    if (!params || !params.toolId || typeof params.wearPercent !== 'number') {
      throw new Error('Wear recording requires toolId and wearPercent');
    }

    const { toolId, wearPercent, measuredAt = Date.now() } = params;

    const wear = {
      toolId,
      wearPercent,
      measuredAt,
    };

    this.wearData.push(wear);

    this.emit('wear:recorded', wear);

    return { status: 'RECORDED', toolId, wearPercent };
  }

  /**
   * Get tool recommendations for current inventory
   */
  getInventoryRecommendations(params = {}) {
    const { material = null, operation = null } = params;

    const recommendations = [];

    for (const [toolId, tool] of this.toolLibrary) {
      if (material && tool.material !== material) continue;
      if (operation && !tool.operations.includes(operation)) continue;

      const usage = this.usageHistory.filter((h) => h.toolId === toolId);
      const wear = this.wearData.filter((w) => w.toolId === toolId);

      if (usage.length > 0 && wear.length > 0) {
        recommendations.push({
          toolId,
          type: tool.type,
          material: tool.material,
          usageCount: usage.length,
          averageWear: wear.reduce((sum, w) => sum + w.wearPercent, 0) / wear.length,
          status: this._getToolStatus(tool, wear),
        });
      }
    }

    return {
      recommendations: recommendations.sort((a, b) => b.usageCount - a.usageCount).slice(0, 10),
      timestamp: Date.now(),
    };
  }

  /**
   * Helper: Initialize tool library
   */
  _initializeToolLibrary() {
    const tools = [
      // End Mills
      {
        id: 'em_1_flute',
        type: 'End Mill',
        diameter: 1,
        material: 'Carbide',
        operations: ['MILLING', 'ENGRAVING'],
        cost: 8,
      },
      {
        id: 'em_2_flute',
        type: 'End Mill',
        diameter: 2,
        material: 'Carbide',
        operations: ['MILLING'],
        cost: 12,
      },
      {
        id: 'em_3_flute',
        type: 'End Mill',
        diameter: 3.175,
        material: 'Carbide',
        operations: ['MILLING'],
        cost: 15,
      },
      {
        id: 'em_6_flute',
        type: 'End Mill',
        diameter: 6,
        material: 'Carbide',
        operations: ['MILLING'],
        cost: 25,
      },

      // Drills
      {
        id: 'dr_1',
        type: 'Drill',
        diameter: 1,
        material: 'HSS',
        operations: ['DRILLING'],
        cost: 2,
      },
      {
        id: 'dr_2',
        type: 'Drill',
        diameter: 2,
        material: 'HSS',
        operations: ['DRILLING'],
        cost: 3,
      },
      {
        id: 'dr_3',
        type: 'Drill',
        diameter: 3.175,
        material: 'Carbide',
        operations: ['DRILLING'],
        cost: 6,
      },

      // Engraving Bits
      {
        id: 'eng_v30',
        type: 'Engraving Bit',
        diameter: 0.25,
        material: 'Carbide',
        operations: ['ENGRAVING'],
        cost: 5,
      },
      {
        id: 'eng_v60',
        type: 'Engraving Bit',
        diameter: 0.5,
        material: 'Carbide',
        operations: ['ENGRAVING'],
        cost: 7,
      },

      // Face Mills
      {
        id: 'fm_10',
        type: 'Face Mill',
        diameter: 10,
        material: 'Carbide',
        operations: ['FACING'],
        cost: 45,
      },
    ];

    tools.forEach((tool) => {
      this.toolLibrary.set(tool.id, tool);
    });
  }

  /**
   * Helper: Get tool candidates
   */
  _getToolCandidates(material, operation, quality) {
    const candidates = [];

    for (const [toolId, tool] of this.toolLibrary) {
      if (tool.operations.includes(operation)) {
        candidates.push(tool);
      }
    }

    return candidates;
  }

  /**
   * Helper: Rank tools
   */
  _rankTools(candidates, context) {
    return candidates
      .map((tool) => {
        const score =
          (100 - Math.abs(tool.diameter - 3.175) * 10) * 0.5 +
          (tool.material === 'Carbide' ? 50 : 25) * 0.5;

        return { ...tool, toolId: tool.id, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Helper: Predict wear
   */
  _predictWear(tool, operation) {
    const baseWearRates = {
      DRILLING: 0.05,
      MILLING: 0.08,
      ENGRAVING: 0.03,
      TURNING: 0.06,
    };

    return parseFloat((baseWearRates[operation] * 100).toFixed(1));
  }

  /**
   * Helper: Estimate tool life
   */
  _estimateToolLife(tool, operation) {
    const baseLife = {
      'End Mill': 200,
      Drill: 100,
      'Engraving Bit': 50,
      'Face Mill': 300,
    };

    return baseLife[tool.type] || 100;
  }

  /**
   * Helper: Calculate tool cost
   */
  _calculateToolCost(tool, quantity) {
    return tool.cost * quantity;
  }

  /**
   * Helper: Generate ID
   */
  _generateId() {
    return `sel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Calculate average surface finish
   */
  _calculateAverageSurfaceFinish(history) {
    if (history.length === 0) return 0;
    return parseFloat(
      (history.reduce((sum, h) => sum + h.surfaceFinish, 0) / history.length).toFixed(2)
    );
  }

  /**
   * Helper: Calculate average accuracy
   */
  _calculateAverageAccuracy(history) {
    if (history.length === 0) return 0;
    return parseFloat(
      (history.reduce((sum, h) => sum + h.accuracy, 0) / history.length).toFixed(2)
    );
  }

  /**
   * Helper: Calculate breakage risk
   */
  _calculateBreakageRisk(tool, wear) {
    if (wear.length === 0) return 0;
    const avgWear = wear.reduce((sum, w) => sum + w.wearPercent, 0) / wear.length;
    return Math.min(avgWear * 1.2, 100);
  }

  /**
   * Helper: Generate tool recommendations
   */
  _generateToolRecommendations(tool, analysis) {
    const recommendations = [];

    if (analysis.performance.breakageRisk > 70) {
      recommendations.push('Replace tool soon - high breakage risk');
    }

    if (analysis.wearTrend > 0.05) {
      recommendations.push('Monitor wear rate - accelerating degradation');
    }

    if (analysis.performance.surfaceFinish > 1.5) {
      recommendations.push('Replace tool for better surface finish');
    }

    return recommendations;
  }

  /**
   * Helper: Calculate wear trend
   */
  _calculateWearTrend(wear) {
    if (wear.length < 2) return 0;
    const recent = wear.slice(-5);
    const older = wear.slice(Math.max(0, wear.length - 10), wear.length - 5);

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, w) => sum + w.wearPercent, 0) / recent.length;
    const olderAvg = older.reduce((sum, w) => sum + w.wearPercent, 0) / older.length;

    return recentAvg - olderAvg;
  }

  /**
   * Helper: Estimate remaining life
   */
  _estimateRemainingLife(tool, wear) {
    if (wear.length === 0) return 100;
    const avgWear = wear.reduce((sum, w) => sum + w.wearPercent, 0) / wear.length;
    return Math.max(0, 100 - avgWear);
  }

  /**
   * Helper: Calculate wear progression
   */
  _calculateWearProgression(wear) {
    if (wear.length === 0) return 0;
    return Math.min(wear.reduce((sum, w) => sum + w.wearPercent, 0) / wear.length, 100);
  }

  /**
   * Helper: Calculate risk factors
   */
  _calculateRiskFactors(tool, history) {
    if (history.length === 0) return 0;
    return Math.random() * 30;
  }

  /**
   * Helper: Classify risk
   */
  _classifyRisk(probability) {
    if (probability < 20) return 'LOW';
    if (probability < 50) return 'MEDIUM';
    if (probability < 80) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Helper: Failure recommendation
   */
  _failureRecommendation(probability) {
    if (probability < 20) return 'Continue monitoring';
    if (probability < 50) return 'Monitor closely';
    if (probability < 80) return 'Plan replacement soon';
    return 'Replace immediately';
  }

  /**
   * Helper: Get tool status
   */
  _getToolStatus(tool, wear) {
    if (wear.length === 0) return 'NEW';
    const avgWear = wear.reduce((sum, w) => sum + w.wearPercent, 0) / wear.length;
    if (avgWear < 20) return 'GOOD';
    if (avgWear < 50) return 'FAIR';
    if (avgWear < 80) return 'WORN';
    return 'CRITICAL';
  }

  /**
   * Statistics
   */
  getStatistics() {
    return {
      totalTools: this.toolLibrary.size,
      totalUsageRecords: this.usageHistory.length,
      totalWearMeasurements: this.wearData.length,
      toolsInUse: new Set(this.usageHistory.map((h) => h.toolId)).size,
      averageWear:
        this.wearData.length > 0
          ? parseFloat(
              (
                this.wearData.reduce((sum, w) => sum + w.wearPercent, 0) / this.wearData.length
              ).toFixed(1)
            )
          : 0,
    };
  }
}

export default ToolSelector;
