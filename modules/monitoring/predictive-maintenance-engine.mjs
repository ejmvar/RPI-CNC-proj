/**
 * Predictive Maintenance Engine
 * ML-based predictive system for tool wear, equipment health prediction,
 * and maintenance recommendations.
 */

export class PredictiveMaintenanceEngine {
  constructor(options = {}) {
    this.options = {
      wearThresholdWarning: 0.7, // 70% wear = warning
      wearThresholdCritical: 0.9, // 90% wear = critical
      healthScoreThreshold: 0.5, // below 50 = action needed
      predictionWindow: 3600000, // 1 hour in ms
      ...options,
    };

    this.equipmentProfiles = new Map(); // equipment_id -> profile
    this.predictions = new Map(); // equipment_id -> [ predictions ]
    this.recommendations = new Map(); // equipment_id -> [ recommendations ]
    this.healthScores = new Map(); // equipment_id -> { score, timestamp }
    this.listeners = {};
    this.historicalData = [];
  }

  /**
   * Register equipment for monitoring
   */
  registerEquipment(equipmentId, profile) {
    const fullProfile = {
      id: equipmentId,
      type: profile.type || 'tool', // tool, spindle, motor
      maxLifeHours: profile.maxLifeHours || 1000,
      operatingHours: profile.operatingHours || 0,
      material: profile.material || 'HSS',
      lastMaintenanceDate: profile.lastMaintenanceDate || Date.now(),
      wearRate: profile.wearRate || 0.001, // wear per hour
      temperatureSensitivity: profile.temperatureSensitivity || 0.5,
      vibrationThreshold: profile.vibrationThreshold || 5.0,
      ...profile,
    };

    this.equipmentProfiles.set(equipmentId, fullProfile);
    this.healthScores.set(equipmentId, { score: 1.0, timestamp: Date.now() });
    this.emit('equipmentRegistered', { equipmentId, timestamp: Date.now() });
  }

  /**
   * Predict tool wear for equipment
   */
  predictWear(equipmentId, operatingMetrics) {
    const profile = this.equipmentProfiles.get(equipmentId);
    if (!profile) throw new Error(`Equipment ${equipmentId} not registered`);

    const {
      feedRate = 100,
      spindleSpeed = 1000,
      temperature = 25,
      vibration = 0,
    } = operatingMetrics;

    // Simplified wear calculation based on operating conditions
    const baseWearPercentage = (profile.operatingHours / profile.maxLifeHours) * 100;
    const feedFactor = Math.max(0.5, feedRate / 100);
    const speedFactor = Math.max(0.8, (spindleSpeed / 3000) * 1.2);
    const tempFactor = Math.max(1, temperature / 20);
    const vibrationFactor = Math.max(1, vibration / Math.max(profile.vibrationThreshold, 1));

    const adjustedWearPercentage =
      (baseWearPercentage * feedFactor * speedFactor * tempFactor * vibrationFactor) / 100;
    const wearPercentage = Math.min(1.0, adjustedWearPercentage);

    const prediction = {
      equipmentId,
      wearPercentage,
      estimatedHoursRemaining: Math.max(
        0,
        (profile.maxLifeHours - profile.operatingHours) * (1 - wearPercentage)
      ),
      predictedFailureDate: new Date(
        Date.now() +
          (profile.maxLifeHours - profile.operatingHours) * (1 - wearPercentage) * 3600000
      ),
      severity:
        wearPercentage > this.options.wearThresholdCritical
          ? 'CRITICAL'
          : wearPercentage > this.options.wearThresholdWarning
          ? 'WARNING'
          : 'NORMAL',
      timestamp: Date.now(),
    };

    this._storePrediction(equipmentId, prediction);
    return prediction;
  }

  /**
   * Calculate equipment health score (0-1)
   */
  calculateHealthScore(equipmentId, metrics) {
    const profile = this.equipmentProfiles.get(equipmentId);
    if (!profile) throw new Error(`Equipment ${equipmentId} not registered`);

    const { vibration = 0, temperature = 25, efficiency = 100 } = metrics;

    // Health factors
    const wearFactor = 1 - (profile.operatingHours / profile.maxLifeHours) * 0.5;
    const vibrationFactor = Math.max(0, 1 - vibration / 10);
    const temperatureFactor = Math.max(0, 1 - Math.abs(temperature - 25) / 50);
    const efficiencyFactor = efficiency / 100;

    const healthScore = (wearFactor + vibrationFactor + temperatureFactor + efficiencyFactor) / 4;

    this.healthScores.set(equipmentId, {
      score: Math.max(0, Math.min(1, healthScore)),
      timestamp: Date.now(),
      factors: {
        wear: wearFactor,
        vibration: vibrationFactor,
        temperature: temperatureFactor,
        efficiency: efficiencyFactor,
      },
    });

    this.emit('healthScoreCalculated', {
      equipmentId,
      score: healthScore,
      timestamp: Date.now(),
    });

    return this.healthScores.get(equipmentId);
  }

  /**
   * Generate maintenance recommendations
   */
  generateRecommendations(equipmentId, prediction, healthScore) {
    const recommendations = [];
    const profile = this.equipmentProfiles.get(equipmentId);

    if (prediction.severity === 'CRITICAL') {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'REPLACE_IMMEDIATELY',
        reason: 'Tool wear critical',
        estimatedDowntime: '30 minutes',
      });
    } else if (prediction.severity === 'WARNING') {
      recommendations.push({
        priority: 'HIGH',
        action: 'PLAN_REPLACEMENT',
        reason: 'Tool wear at warning level',
        estimatedHours: Math.ceil(prediction.estimatedHoursRemaining),
      });
    }

    if (healthScore.score < this.options.healthScoreThreshold) {
      recommendations.push({
        priority: 'HIGH',
        action: 'MAINTENANCE_INSPECTION',
        reason: 'Equipment health score below threshold',
        components: ['vibration_sensor', 'bearing_system'],
      });
    }

    // Time-based maintenance
    const daysSinceMaintenance = (Date.now() - profile.lastMaintenanceDate) / (1000 * 60 * 60 * 24);
    if (daysSinceMaintenance > 30) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'ROUTINE_MAINTENANCE',
        reason: '30+ days since last maintenance',
        tasks: ['lubrication', 'inspection', 'calibration'],
      });
    }

    this._storeRecommendations(equipmentId, recommendations);
    this.emit('recommendationsGenerated', { equipmentId, recommendations, timestamp: Date.now() });

    return recommendations;
  }

  /**
   * Detect anomalies in equipment behavior
   */
  detectAnomalies(equipmentId, metrics) {
    const profile = this.equipmentProfiles.get(equipmentId);
    const anomalies = [];

    const { vibration = 0, temperature = 25, feedRateStability = 100, spindleRunout = 0 } = metrics;

    if (vibration > profile.vibrationThreshold * 1.5) {
      anomalies.push({
        type: 'EXCESSIVE_VIBRATION',
        severity: 'WARNING',
        value: vibration,
        threshold: profile.vibrationThreshold,
      });
    }

    if (temperature > 60) {
      anomalies.push({
        type: 'HIGH_TEMPERATURE',
        severity: 'WARNING',
        value: temperature,
        threshold: 60,
      });
    }

    if (feedRateStability < 90) {
      anomalies.push({
        type: 'UNSTABLE_FEED_RATE',
        severity: 'INFO',
        value: feedRateStability,
        threshold: 90,
      });
    }

    if (spindleRunout > 0.05) {
      anomalies.push({
        type: 'SPINDLE_RUNOUT',
        severity: 'WARNING',
        value: spindleRunout,
        threshold: 0.05,
      });
    }

    if (anomalies.length > 0) {
      this.emit('anomaliesDetected', { equipmentId, anomalies, timestamp: Date.now() });
    }

    return anomalies;
  }

  /**
   * Get maintenance history for equipment
   */
  getMaintenanceHistory(equipmentId) {
    const profile = this.equipmentProfiles.get(equipmentId);
    if (!profile) return [];

    const daysSince = (Date.now() - profile.lastMaintenanceDate) / (1000 * 60 * 60 * 24);

    return [
      {
        date: profile.lastMaintenanceDate,
        type: 'LAST_MAINTENANCE',
        daysSince: Math.round(daysSince),
      },
    ];
  }

  /**
   * Get predictions for equipment
   */
  getPredictions(equipmentId, limit = 50) {
    return (this.predictions.get(equipmentId) || []).slice(-limit);
  }

  /**
   * Get recommendations for equipment
   */
  getRecommendations(equipmentId) {
    return this.recommendations.get(equipmentId) || [];
  }

  /**
   * Get health score for equipment
   */
  getHealthScore(equipmentId) {
    return this.healthScores.get(equipmentId) || null;
  }

  /**
   * Store prediction
   * @private
   */
  _storePrediction(equipmentId, prediction) {
    if (!this.predictions.has(equipmentId)) {
      this.predictions.set(equipmentId, []);
    }

    this.predictions.get(equipmentId).push(prediction);
    this.historicalData.push(prediction);

    // Keep only last 1000 predictions
    if (this.predictions.get(equipmentId).length > 1000) {
      this.predictions.get(equipmentId).shift();
    }
  }

  /**
   * Store recommendations
   * @private
   */
  _storeRecommendations(equipmentId, recommendations) {
    this.recommendations.set(equipmentId, recommendations);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const equipmentCount = this.equipmentProfiles.size;
    const criticalCount = Array.from(this.healthScores.values()).filter(
      (h) => h.score < 0.3
    ).length;
    const warningCount = Array.from(this.healthScores.values()).filter((h) => h.score < 0.7).length;

    return {
      registeredEquipment: equipmentCount,
      totalPredictions: this.historicalData.length,
      criticalEquipment: criticalCount,
      warningEquipment: warningCount,
      averageHealthScore:
        equipmentCount > 0
          ? Array.from(this.healthScores.values()).reduce((sum, h) => sum + h.score, 0) /
            equipmentCount
          : 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }
}
