/**
 * Critical Speed Analyzer
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Analyzes spindle dynamics to find critical (resonant) speeds.
 * Prevents operation at dangerous speeds that cause vibration and poor finish.
 */

export class CriticalSpeedAnalyzer {
  constructor(options = {}) {
    this.options = {
      spindleStiffness: options.spindleStiffness || 1000, // N/µm
      toolDiameter: options.toolDiameter || 3, // mm
      massArmatureRotor: options.massArmatureRotor || 0.5, // kg
      massToolHolder: options.massToolHolder || 0.2, // kg
      bearingSpacing: options.bearingSpacing || 100, // mm
      damping: options.damping || 0.05, // damping ratio
      ...options,
    };

    this.analysisHistory = [];
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
   * Calculate natural frequency of spindle system
   */
  calculateNaturalFrequency(params) {
    // Simple harmonic oscillator model: f = (1/2π)√(k/m)
    const { stiffness, mass } = params;

    if (!stiffness || !mass) {
      throw new Error('Natural frequency calculation requires stiffness and mass');
    }

    const omega = Math.sqrt(stiffness / mass); // rad/s
    const frequencyHz = omega / (2 * Math.PI);
    const frequencyRPM = frequencyHz * 60;

    return {
      frequencyHz: parseFloat(frequencyHz.toFixed(2)),
      frequencyRPM: parseFloat(frequencyRPM.toFixed(0)),
      omegaRadPerSec: parseFloat(omega.toFixed(2)),
    };
  }

  /**
   * Find critical speeds (multiples of natural frequency)
   */
  findCriticalSpeeds(params) {
    const { maxRPM, harmonics } = params;

    if (!maxRPM) {
      throw new Error('Critical speed search requires maxRPM');
    }

    // Calculate system natural frequency
    const totalMass = this.options.massArmatureRotor + this.options.massToolHolder;
    const naturalFreq = this.calculateNaturalFrequency({
      stiffness: this.options.spindleStiffness,
      mass: totalMass,
    });

    // Find critical speeds (resonant frequencies)
    const numHarmonics = harmonics || 3;
    const criticalSpeeds = [];

    for (let i = 1; i <= numHarmonics; i++) {
      const criticalRPM = naturalFreq.frequencyRPM * i;
      if (criticalRPM <= maxRPM) {
        criticalSpeeds.push({
          harmonic: i,
          frequencyRPM: parseFloat(criticalRPM.toFixed(0)),
          frequencyHz: parseFloat((criticalRPM / 60).toFixed(2)),
          severity: this.estimateSeverity(i),
        });
      }
    }

    return {
      naturalFrequencyRPM: naturalFreq.frequencyRPM,
      criticalSpeeds,
      timestamp: Date.now(),
    };
  }

  /**
   * Estimate severity of critical speed
   */
  estimateSeverity(harmonic) {
    if (harmonic === 1) return 'CRITICAL';
    if (harmonic === 2) return 'HIGH';
    if (harmonic <= 4) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Identify safe operating ranges (avoiding critical speeds)
   */
  identifySafeRanges(params) {
    if (!params || !params.maxRPM) {
      throw new Error('Safe range identification requires maxRPM');
    }

    const criticalAnalysis = this.findCriticalSpeeds(params);
    const safeRanges = [];
    const unsafe = [];

    // Define unsafe zones around critical speeds
    const unsafeMargin = params.unsafeMargin || 0.15; // 15% margin
    const minRPM = params.minRPM || 100;

    // Build unsafe ranges
    for (const critical of criticalAnalysis.criticalSpeeds) {
      const marginRPM = critical.frequencyRPM * unsafeMargin;
      unsafe.push({
        lowerBound: Math.max(minRPM, critical.frequencyRPM - marginRPM),
        upperBound: critical.frequencyRPM + marginRPM,
        criticality: critical.harmonic,
      });
    }

    // Sort unsafe ranges
    unsafe.sort((a, b) => a.lowerBound - b.lowerBound);

    // Extract safe ranges between unsafe zones
    let currentRPM = minRPM;
    for (const unsafeZone of unsafe) {
      if (currentRPM < unsafeZone.lowerBound) {
        safeRanges.push({
          lowerBound: currentRPM,
          upperBound: unsafeZone.lowerBound,
          width: unsafeZone.lowerBound - currentRPM,
          recommended: unsafeZone.lowerBound - currentRPM > 500,
        });
      }
      currentRPM = unsafeZone.upperBound;
    }

    // Add final safe range if space remains
    if (currentRPM < params.maxRPM) {
      safeRanges.push({
        lowerBound: currentRPM,
        upperBound: params.maxRPM,
        width: params.maxRPM - currentRPM,
        recommended: true,
      });
    }

    return {
      safeRanges: safeRanges.map((r) => ({
        ...r,
        width: parseFloat(r.width.toFixed(0)),
      })),
      unsafeZones: unsafe.map((u) => ({
        ...u,
        lowerBound: parseFloat(u.lowerBound.toFixed(0)),
        upperBound: parseFloat(u.upperBound.toFixed(0)),
      })),
    };
  }

  /**
   * Recommend safe spindle speeds for operation
   */
  recommendSpeeds(params) {
    if (!params || !params.maxRPM) {
      throw new Error('Speed recommendation requires maxRPM');
    }

    const safeData = this.identifySafeRanges(params);
    const recommendations = [];

    // Find largest safe zones
    const largeSafeZones = safeData.safeRanges
      .filter((r) => r.recommended)
      .sort((a, b) => b.width - a.width);

    for (let i = 0; i < Math.min(largeSafeZones.length, 3); i++) {
      const zone = largeSafeZones[i];
      const midpoint = (zone.lowerBound + zone.upperBound) / 2;

      recommendations.push({
        recommendedRPM: parseFloat(midpoint.toFixed(0)),
        safeRangeLower: parseFloat(zone.lowerBound.toFixed(0)),
        safeRangeUpper: parseFloat(zone.upperBound.toFixed(0)),
        zoneWidth: parseFloat(zone.width.toFixed(0)),
        priority: i + 1,
        reason: i === 0 ? 'Largest safe zone' : i === 1 ? 'Second largest' : 'Third option',
      });
    }

    return {
      recommendations,
      totalSafeZones: safeData.safeRanges.length,
      totalUnsafeZones: safeData.unsafeZones.length,
    };
  }

  /**
   * Analyze vibration risk at specific speed
   */
  analyzeVibrationRisk(params) {
    if (!params || !params.currentRPM) {
      throw new Error('Vibration risk analysis requires currentRPM');
    }

    const { currentRPM, maxRPM } = params;
    const criticalData = this.findCriticalSpeeds({ maxRPM });
    const safeData = this.identifySafeRanges({ maxRPM });

    // Check if in unsafe zone
    let inUnsafeZone = false;
    let nearestCritical = Infinity;
    let risk = 'LOW';

    for (const unsafe of safeData.unsafeZones) {
      if (currentRPM >= unsafe.lowerBound && currentRPM <= unsafe.upperBound) {
        inUnsafeZone = true;
        risk =
          unsafe.criticality === 1 ? 'CRITICAL' : unsafe.criticality === 2 ? 'HIGH' : 'MODERATE';
        break;
      }

      // Find nearest critical speed
      const distToCritical = Math.min(
        Math.abs(currentRPM - unsafe.lowerBound),
        Math.abs(currentRPM - unsafe.upperBound)
      );
      nearestCritical = Math.min(nearestCritical, distToCritical);
    }

    if (!inUnsafeZone && nearestCritical < 100) {
      risk = 'CAUTION';
    }

    return {
      currentRPM,
      inUnsafeZone,
      riskLevel: risk,
      recommendedAction: inUnsafeZone
        ? 'Reduce speed immediately'
        : risk === 'CAUTION'
        ? 'Monitor vibration'
        : 'Continue operation',
      distanceToNearestCritical: parseFloat(nearestCritical.toFixed(0)),
    };
  }

  /**
   * Compare different tool holders/setups
   */
  compareSetups(params) {
    if (!params || !Array.isArray(params.setups)) {
      throw new Error('Setup comparison requires setups array');
    }

    const { setups, maxRPM } = params;

    const comparison = setups.map((setup) => {
      const totalMass = setup.massArmatureRotor || this.options.massArmatureRotor;
      const stiffness = setup.spindleStiffness || this.options.spindleStiffness;

      const naturalFreq = this.calculateNaturalFrequency({
        stiffness,
        mass: totalMass,
      });

      const critical = this.findCriticalSpeeds({
        maxRPM: maxRPM || 24000,
        harmonics: 3,
      });

      return {
        setupName: setup.name || 'Setup',
        naturalFrequencyRPM: naturalFreq.frequencyRPM,
        criticalCount: critical.criticalSpeeds.length,
        firstCritical: critical.criticalSpeeds[0]?.frequencyRPM || 0,
        stabilityRating: this.rateStability(naturalFreq.frequencyRPM, maxRPM),
      };
    });

    return comparison.sort((a, b) => b.firstCritical - a.firstCritical);
  }

  /**
   * Rate stability of setup
   */
  rateStability(naturalFreqRPM, maxRPM) {
    const ratio = naturalFreqRPM / (maxRPM || 24000);

    if (ratio > 0.4) return 'EXCELLENT';
    if (ratio > 0.3) return 'GOOD';
    if (ratio > 0.2) return 'FAIR';
    return 'POOR';
  }

  /**
   * Get analysis history
   */
  getHistory(limit = 100) {
    return this.analysisHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.analysisHistory = [];
  }

  /**
   * Get statistics from analysis history
   */
  getStatistics() {
    if (this.analysisHistory.length === 0) {
      return { message: 'No analysis history' };
    }

    const frequencies = this.analysisHistory.map((h) => h.naturalFrequencyRPM || 0);
    const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;

    return {
      totalAnalyses: this.analysisHistory.length,
      averageNaturalFrequencyRPM: parseFloat(avgFreq.toFixed(0)),
      lowestFrequencyRPM: parseFloat(Math.min(...frequencies).toFixed(0)),
      highestFrequencyRPM: parseFloat(Math.max(...frequencies).toFixed(0)),
      unit: 'Frequency (RPM)',
    };
  }
}

export default CriticalSpeedAnalyzer;
