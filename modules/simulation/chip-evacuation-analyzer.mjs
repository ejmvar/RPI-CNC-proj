/**
 * Chip Evacuation Analyzer
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Analyzes chip formation, evacuation, and re-cutting prevention:
 * - Chip characteristics and curling
 * - Evacuation timing and volume
 * - Tool wear from chip welding
 * - Optimal cutting parameters for chip control
 */

export class ChipEvacuationAnalyzer {
  constructor(options = {}) {
    this.options = {
      fluteCrossSection: options.fluteCrossSection || 5, // mm²
      fluteLength: options.fluteLength || 25, // mm
      numberOfFlutes: options.numberOfFlutes || 2,
      spindleSpeed: options.spindleSpeed || 12000, // RPM
      feedPerTooth: options.feedPerTooth || 0.1, // mm
      maxChipThickness: options.maxChipThickness || 0.5, // mm
      evacuationThreshold: options.evacuationThreshold || 0.8, // 80% of flute volume
      ...options,
    };

    this.chipHistory = [];
    this.materialChipFactors = {
      aluminum: { curling: 0.6, adhesion: 0.3 },
      steel: { curling: 1.0, adhesion: 1.0 },
      brass: { curling: 0.4, adhesion: 0.2 },
      plastic: { curling: 0.2, adhesion: 0.1 },
      titanium: { curling: 1.2, adhesion: 1.5 },
      composites: { curling: 0.3, adhesion: 0.4 },
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
   * Calculate chip characteristics
   */
  calculateChipCharacteristics(params) {
    if (!params || params.feedRate === undefined || params.depth === undefined) {
      throw new Error('Chip calculation requires feedRate and depth');
    }

    const { feedRate, depth, material = 'steel', spindleSpeed = 12000 } = params;

    const chipFactors = this.materialChipFactors[material?.toLowerCase()] || {
      curling: 1.0,
      adhesion: 1.0,
    };

    // Chip thickness = feed per tooth
    const feedPerTooth = feedRate / (this.options.numberOfFlutes * (spindleSpeed / 60));
    const chipThickness = Math.max(0.01, Math.min(feedPerTooth, this.options.maxChipThickness));

    // Chip width = depth of cut
    const chipWidth = depth;

    // Chip volume = thickness × width × flute length
    const chipVolume = chipThickness * chipWidth * this.options.fluteLength;

    // Chip curling radius
    const curlingRadius = (depth / (chipFactors.curling * chipThickness)) * 10; // mm

    // Evacuation rate = chip volume per tooth per revolution
    const toothFeedRate = feedRate / this.options.numberOfFlutes; // mm per tooth
    const chipVolumePerTooth = chipThickness * chipWidth * toothFeedRate;

    // Adhesion risk
    const adhesionRisk = chipFactors.adhesion * chipVolume * (spindleSpeed / 1000);

    // Classification
    let chipType = 'CONTINUOUS';
    if (curlingRadius < 5) chipType = 'TIGHTLY_CURLED';
    else if (curlingRadius < 15) chipType = 'MODERATE_CURL';
    else if (chipVolume > 2) chipType = 'LONG_STRINGY';

    const result = {
      feedPerToothMm: parseFloat(feedPerTooth.toFixed(4)),
      chipThicknessMm: parseFloat(chipThickness.toFixed(4)),
      chipWidthMm: parseFloat(chipWidth.toFixed(4)),
      chipVolumeMm3: parseFloat(chipVolume.toFixed(3)),
      curlingRadiusMm: parseFloat(Math.max(0.1, curlingRadius).toFixed(2)),
      chipType,
      chipVolumePerToothMm3: parseFloat(chipVolumePerTooth.toFixed(3)),
      adhesionRisk: parseFloat(adhesionRisk.toFixed(2)),
      recommendedCurling:
        chipType === 'TIGHTLY_CURLED'
          ? 'Good for small parts, risk of clogging'
          : chipType === 'MODERATE_CURL'
          ? 'Optimal for most operations'
          : 'Monitor for tool wear',
      timestamp: Date.now(),
    };

    this.chipHistory.push(result);
    this.emit('chip:calculated', result);

    return result;
  }

  /**
   * Analyze evacuation adequacy
   */
  analyzeEvacuation(params) {
    if (!params || params.chipVolumePerSecond === undefined) {
      throw new Error('Evacuation analysis requires chipVolumePerSecond');
    }

    const { chipVolumePerSecond, fluteFilling = 0.75, material = 'steel' } = params;

    const fluteCapacity = this.options.fluteCrossSection * this.options.fluteLength;
    const maxChipPerFlute = fluteCapacity * fluteFilling;
    const maxChipPerSecond =
      (maxChipPerFlute * this.options.numberOfFlutes * this.options.spindleSpeed) / 60;

    // Evacuation adequacy ratio
    const evacuationRatio = chipVolumePerSecond / maxChipPerSecond;

    // Risk classification
    let evacuationStatus = 'EXCELLENT';
    let riskLevel = 'LOW';

    if (evacuationRatio > 1.2) {
      evacuationStatus = 'CRITICAL';
      riskLevel = 'CRITICAL';
    } else if (evacuationRatio > 1.0) {
      evacuationStatus = 'OVERLOADED';
      riskLevel = 'HIGH';
    } else if (evacuationRatio > 0.8) {
      evacuationStatus = 'ADEQUATE';
      riskLevel = 'MODERATE';
    } else if (evacuationRatio > 0.5) {
      evacuationStatus = 'GOOD';
      riskLevel = 'LOW';
    } else {
      evacuationStatus = 'EXCELLENT';
      riskLevel = 'MINIMAL';
    }

    // Clogging probability
    const cloggingProbability = Math.min(100, evacuationRatio * 100);

    // Tool heating due to friction with chips
    const toolHeating = chipVolumePerSecond * 0.1 * (evacuationRatio > 1 ? 2 : 1);

    const result = {
      chipVolumePerSecondMm3: chipVolumePerSecond,
      maxChipCapacityPerSecondMm3: parseFloat(maxChipPerSecond.toFixed(1)),
      evacuationRatio: parseFloat(evacuationRatio.toFixed(2)),
      evacuationStatus,
      riskLevel,
      fluteFillPercentage: parseFloat((fluteFilling * 100).toFixed(1)),
      cloggingProbabilityPercent: parseFloat(cloggingProbability.toFixed(1)),
      toolHeatingFactor: parseFloat(toolHeating.toFixed(2)),
      recommendation:
        riskLevel === 'CRITICAL'
          ? 'URGENT: Reduce depth/feed or increase speed'
          : riskLevel === 'HIGH'
          ? 'Increase spindle speed or use coolant'
          : 'Normal operation',
      timestamp: Date.now(),
    };

    this.chipHistory.push(result);
    this.emit('evacuation:analyzed', result);

    return result;
  }

  /**
   * Predict tool wear from chip interaction
   */
  predictToolWearFromChips(params) {
    if (!params || params.chipVolumeTotal === undefined) {
      throw new Error('Wear prediction requires chipVolumeTotal and material');
    }

    const { chipVolumeTotal, material = 'steel', operatingHours = 1, temperature = 200 } = params;

    const chipFactors = this.materialChipFactors[material?.toLowerCase()] || {
      curling: 1.0,
      adhesion: 1.0,
    };

    // Adhesion wear = chip welding/adhesion to flute
    const adhesionWear = (chipVolumeTotal * chipFactors.adhesion * temperature) / 50000;

    // Attrition wear = abrasive action of hard particles
    const attritionWear = (chipVolumeTotal * 0.001 * operatingHours) / 1000;

    // Diffusion wear = chemical dissolution (high temp)
    const diffusionWear = temperature > 800 ? (chipVolumeTotal * operatingHours * 0.0001) / 100 : 0;

    // Total flank wear
    const totalFlanWear = adhesionWear + attritionWear + diffusionWear;

    // Wear rate
    const wearRate = totalFlanWear / (operatingHours || 1);

    // Tool life prediction (when flank wear reaches 0.3 mm criterion)
    const wearCriterion = 0.3; // mm
    const remainingLife = Math.max(0, (wearCriterion - totalFlanWear) / (wearRate || 0.001));

    const result = {
      chipVolumeProcessedMm3: chipVolumeTotal,
      adhesionWearMm: parseFloat(adhesionWear.toFixed(4)),
      attritionWearMm: parseFloat(attritionWear.toFixed(4)),
      diffusionWearMm: parseFloat(diffusionWear.toFixed(4)),
      totalFlankWearMm: parseFloat(totalFlanWear.toFixed(4)),
      wearRateMmPerHour: parseFloat(wearRate.toFixed(4)),
      temperatureDegreeC: temperature,
      toolLifeRemainingHours: parseFloat(remainingLife.toFixed(1)),
      wearCriterionMm: wearCriterion,
      toolCondition: totalFlanWear < 0.1 ? 'EXCELLENT' : totalFlanWear < 0.2 ? 'GOOD' : 'WORN',
      recommendation:
        totalFlanWear > 0.25
          ? 'Tool replacement recommended soon'
          : totalFlanWear > 0.15
          ? 'Monitor tool for wear'
          : 'Tool in good condition',
      timestamp: Date.now(),
    };

    this.chipHistory.push(result);
    this.emit('wear:predicted', result);

    return result;
  }

  /**
   * Recommend optimal cutting parameters for chip control
   */
  recommendOptimalChipParameters(params) {
    if (!params || params.depth === undefined) {
      throw new Error('Recommendation requires depth');
    }

    const { depth, material = 'steel', fluteDiameter = 3 } = params;

    const chipFactors = this.materialChipFactors[material?.toLowerCase()] || {
      curling: 1.0,
      adhesion: 1.0,
    };

    // Optimal feed per tooth based on chip type preference
    const baseFeeds = {
      aluminum: 0.15,
      steel: 0.12,
      brass: 0.18,
      plastic: 0.08,
      titanium: 0.08,
      composites: 0.1,
    };

    const baseFeed = baseFeeds[material?.toLowerCase()] || 0.12;

    // Calculate recommended parameters
    const recommendedFeedPerTooth = baseFeed * Math.sqrt(depth / 5);
    const numberOfFlutes = Math.ceil(fluteDiameter / 2); // Typical flute count
    const recommendedFeedRate = recommendedFeedPerTooth * numberOfFlutes * 12000; // @ 12000 RPM

    // Spindle speed optimization
    const baseSpeed = {
      aluminum: 400,
      steel: 100,
      brass: 300,
      plastic: 200,
      titanium: 50,
      composites: 150,
    };

    const speedFactor = baseSpeed[material?.toLowerCase()] || 100;
    const recommendedSpeed = Math.floor((speedFactor * 1000) / fluteDiameter);

    const strategies = [
      {
        name: 'For Continuous Chips (Steel)',
        feedPerTooth: recommendedFeedPerTooth,
        speed: recommendedSpeed,
        description: 'Maximize productivity',
      },
      {
        name: 'For Chip Breaking',
        feedPerTooth: recommendedFeedPerTooth * 0.8,
        speed: recommendedSpeed * 1.2,
        description: 'Shorter, curled chips',
      },
      {
        name: 'Conservative (Low Wear)',
        feedPerTooth: recommendedFeedPerTooth * 0.5,
        speed: recommendedSpeed * 0.9,
        description: 'Extended tool life',
      },
    ];

    return {
      materialType: material,
      depthOfCutMm: depth,
      recommendedFeedPerToothMm: parseFloat(recommendedFeedPerTooth.toFixed(3)),
      recommendedSpindleSpeedRPM: recommendedSpeed,
      recommendedFeedRateMmMin: parseFloat(recommendedFeedRate.toFixed(1)),
      strategies,
      bestStrategy: strategies[0].name,
      expectedChipType: recommendedFeedPerTooth > 0.1 ? 'CONTINUOUS' : 'BROKEN',
      timestamp: Date.now(),
    };
  }

  /**
   * History management
   */
  getHistory(limit = 50) {
    return this.chipHistory.slice(-limit);
  }

  clearHistory() {
    this.chipHistory = [];
  }

  /**
   * Statistics
   */
  getStatistics() {
    if (this.chipHistory.length === 0) {
      return { message: 'No chip history available' };
    }

    const chipVolumes = this.chipHistory
      .filter((h) => h.chipVolumeMm3 !== undefined)
      .map((h) => h.chipVolumeMm3);

    if (chipVolumes.length === 0) {
      return { message: 'No chip volume data in history' };
    }

    const avgVolume = chipVolumes.reduce((a, b) => a + b, 0) / chipVolumes.length;

    return {
      totalMeasurements: this.chipHistory.length,
      averageChipVolumeMm3: parseFloat(avgVolume.toFixed(2)),
      maxChipVolumeMm3: parseFloat(Math.max(...chipVolumes).toFixed(2)),
      minChipVolumeMm3: parseFloat(Math.min(...chipVolumes).toFixed(2)),
      totalChipsProcessedMm3: parseFloat(chipVolumes.reduce((a, b) => a + b, 0).toFixed(0)),
    };
  }
}

export default ChipEvacuationAnalyzer;
