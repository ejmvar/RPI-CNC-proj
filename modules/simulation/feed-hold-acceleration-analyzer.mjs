/**
 * Feed Hold & Acceleration Analyzer
 * Phase 16.5: Enhanced Analysis Modules
 *
 * Analyzes feed rate changes, acceleration effects, and servo dynamics:
 * - Deceleration/acceleration profiles
 * - Servo lag and tracking error
 * - Jerk analysis for smooth motion
 * - Path accuracy under acceleration
 */

export class FeedHoldAccelerationAnalyzer {
  constructor(options = {}) {
    this.options = {
      maxAccelerationX: options.maxAccelerationX || 1.0, // m/s²
      maxAccelerationY: options.maxAccelerationY || 1.0,
      maxAccelerationZ: options.maxAccelerationZ || 0.8,
      maxJerk: options.maxJerk || 10, // m/s³
      servoGain: options.servoGain || 1.0,
      updateFrequency: options.updateFrequency || 1000, // Hz (1 kHz servo loop)
      maxVelocityX: options.maxVelocityX || 10, // m/min
      maxVelocityY: options.maxVelocityY || 10,
      maxVelocityZ: options.maxVelocityZ || 5,
      ...options,
    };

    this.motionHistory = [];
    this.axisFrictionFactors = {
      X: 0.05,
      Y: 0.05,
      Z: 0.08, // Heavier friction (gravity effect)
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
   * Analyze feed hold event
   */
  analyzeFeedHold(params) {
    if (!params || params.currentVelocity === undefined || !params.axis) {
      throw new Error('Feed hold analysis requires currentVelocity and axis');
    }

    const { currentVelocity, axis = 'X', targetVelocity = 0, maxDeceleration } = params;

    const actualDeceleration = maxDeceleration || this.options[`maxAcceleration${axis}`];
    const frictionFactor = this.axisFrictionFactors[axis] || 0.05;
    const totalDeceleration = actualDeceleration + actualDeceleration * frictionFactor;

    // Time to stop
    const timeToStop = Math.abs(currentVelocity - targetVelocity) / totalDeceleration;

    // Distance traveled during deceleration
    const decelerationDistance =
      currentVelocity * timeToStop - 0.5 * totalDeceleration * timeToStop ** 2;

    // Servo lag during deceleration (increases with dynamics)
    const servoLagDuringHold =
      (currentVelocity * 0.001 * totalDeceleration) / this.options.updateFrequency;

    // Tracking error at end of hold
    const trackingError = servoLagDuringHold * currentVelocity;

    // Position overshoot
    const overshoot =
      Math.abs(decelerationDistance - 0) > 0 ? (servoLagDuringHold / timeToStop) * 100 : 0;

    const result = {
      axis,
      currentVelocityMmMin: currentVelocity,
      targetVelocityMmMin: targetVelocity,
      maxDecelerationMsec2: parseFloat(totalDeceleration.toFixed(3)),
      timeToStopMs: parseFloat((timeToStop * 1000).toFixed(1)),
      decelerationDistanceMm: parseFloat(Math.abs(decelerationDistance).toFixed(3)),
      servoLagMm: parseFloat(servoLagDuringHold.toFixed(4)),
      trackingErrorMm: parseFloat(trackingError.toFixed(4)),
      overshootPercent: parseFloat(overshoot.toFixed(1)),
      recommendedHoldTime: parseFloat((timeToStop * 1.5).toFixed(2)),
      timestamp: Date.now(),
    };

    this.motionHistory.push(result);
    this.emit('hold:analyzed', result);

    return result;
  }

  /**
   * Calculate optimal acceleration profile
   */
  calculateAccelerationProfile(params) {
    if (!params || params.startVelocity === undefined || params.endVelocity === undefined) {
      throw new Error('Profile calculation requires startVelocity and endVelocity');
    }

    const { startVelocity, endVelocity, axis = 'X', distance = 100 } = params;

    const maxAccel = this.options[`maxAcceleration${axis}`];
    const maxVel = this.options[`maxVelocity${axis}`];
    const maxJerk = this.options.maxJerk;

    // Trapezoidal profile: acceleration -> constant velocity -> deceleration
    const velocityDiff = endVelocity - startVelocity;
    const accelTime = Math.abs(velocityDiff) / maxAccel;
    const peakVelocity = Math.min(
      maxVel,
      Math.max(startVelocity, endVelocity) + maxAccel * accelTime
    );

    // Distance during acceleration
    const accelDistance = startVelocity * accelTime + 0.5 * maxAccel * accelTime ** 2;

    // Distance during deceleration
    const decelTime = Math.abs(peakVelocity - endVelocity) / maxAccel;
    const decelDistance = peakVelocity * decelTime - 0.5 * maxAccel * decelTime ** 2;

    // Constant velocity distance
    const constVelDistance = Math.max(0, distance - accelDistance - decelDistance);
    const constVelTime = constVelDistance > 0 ? constVelDistance / peakVelocity : 0;

    // Total time
    const totalTime = accelTime + constVelTime + decelTime;

    // Jerk analysis
    const jerkAccel = maxAccel / 0.001; // Assuming 1ms jerk duration
    const jerkLimited = jerkAccel > maxJerk;

    // Servo tracking error over profile
    const maxTrackingError = (peakVelocity ** 2 / (maxAccel * this.options.servoGain)) * 0.001;

    const profiles = [
      {
        name: 'Trapezoidal',
        accelTime: parseFloat(accelTime.toFixed(3)),
        constVelTime: parseFloat(constVelTime.toFixed(3)),
        decelTime: parseFloat(decelTime.toFixed(3)),
        totalTime: parseFloat(totalTime.toFixed(3)),
        peakVelocity: parseFloat(peakVelocity.toFixed(1)),
        jerkLimit: jerkAccel,
      },
      {
        name: 'S-Curve (Reduced Jerk)',
        accelTime: parseFloat((accelTime * 1.2).toFixed(3)),
        constVelTime: parseFloat((constVelTime * 0.95).toFixed(3)),
        decelTime: parseFloat((decelTime * 1.2).toFixed(3)),
        totalTime: parseFloat((totalTime * 1.1).toFixed(3)),
        peakVelocity: parseFloat((peakVelocity * 0.95).toFixed(1)),
        jerkLimit: jerkAccel * 0.6,
      },
    ];

    return {
      startVelocityMmMin: startVelocity,
      endVelocityMmMin: endVelocity,
      distanceMm: distance,
      axis,
      recommendedProfile: profiles[jerkLimited ? 1 : 0].name,
      profiles,
      maxTrackingErrorMm: parseFloat(maxTrackingError.toFixed(4)),
      isJerkLimited: jerkLimited,
      timestamp: Date.now(),
    };
  }

  /**
   * Analyze servo lag and tracking error
   */
  analyzeServoLag(params) {
    if (!params || params.velocity === undefined) {
      throw new Error('Servo lag analysis requires velocity');
    }

    const { velocity, acceleration = 0, axis = 'X' } = params;

    // Position lag = velocity / servo bandwidth
    const servoBandwidth = this.options.updateFrequency * this.options.servoGain;
    const positionLag = (velocity / servoBandwidth) * 1000; // Convert to mm

    // Velocity lag due to acceleration
    const velocityLag = (acceleration / servoBandwidth) * 100;

    // Total tracking error (RSS combination)
    const trackingError = Math.sqrt(positionLag ** 2 + velocityLag ** 2);

    // Contouring error on circular path (simplified: velocity-dependent)
    const contouringError = velocity * 0.00005; // 50 µm per m/min

    // Servo gain recommendation
    const gainRecommendation = Math.max(1, Math.min(10, (velocity / 100) * 2));

    // Stability analysis
    const phaseMargin = 45 - acceleration * 5; // Decreases with acceleration
    const stable = phaseMargin > 20; // Stable if >20°

    const result = {
      velocityMmMin: velocity,
      accelerationMsec2: acceleration,
      axis,
      positionLagMm: parseFloat(positionLag.toFixed(4)),
      velocityLagMmMin: parseFloat(velocityLag.toFixed(3)),
      totalTrackingErrorMm: parseFloat(trackingError.toFixed(4)),
      contouringErrorMm: parseFloat(contouringError.toFixed(5)),
      servoBandwidthHz: servoBandwidth,
      phaseMarginDegrees: parseFloat(phaseMargin.toFixed(1)),
      stable,
      recommendedServoGain: parseFloat(gainRecommendation.toFixed(2)),
      timestamp: Date.now(),
    };

    this.motionHistory.push(result);
    this.emit('servo:analyzed', result);

    return result;
  }

  /**
   * Assess path accuracy under acceleration
   */
  assessPathAccuracyUnderAcceleration(params) {
    if (!params || !params.pathType) {
      throw new Error('Path accuracy assessment requires pathType');
    }

    const { pathType, velocity = 100, acceleration = 0.5, pathRadius = 10 } = params;

    let baseError = 0;
    let recommendation = '';

    switch (pathType.toUpperCase()) {
      case 'LINEAR':
        baseError = velocity * 0.00001 + acceleration * 0.001;
        recommendation = 'Linear paths most accurate at constant velocity';
        break;
      case 'CIRCULAR':
        baseError = velocity * 0.0001 + (acceleration / pathRadius) * 0.1 + pathRadius * 0.001;
        recommendation = 'Reduce speed on tight curves or lower acceleration';
        break;
      case 'SPLINE':
        baseError = velocity * 0.00015 + acceleration * 0.002;
        recommendation = 'Smooth spline reduces jerk effects';
        break;
      default:
        baseError = velocity * 0.00001;
    }

    const dynamicError = baseError + (acceleration * velocity) / 1000;
    const servoLag = this.analyzeServoLag({ velocity, acceleration });

    const totalPathError = Math.sqrt(dynamicError ** 2 + servoLag.totalTrackingErrorMm ** 2);

    // Accuracy class
    let accuracyClass = 'EXCELLENT';
    if (totalPathError > 0.1) accuracyClass = 'GOOD';
    if (totalPathError > 0.2) accuracyClass = 'ACCEPTABLE';
    if (totalPathError > 0.5) accuracyClass = 'POOR';

    const result = {
      pathType,
      velocityMmMin: velocity,
      accelerationMsec2: acceleration,
      pathRadiusMm: pathRadius,
      basePathErrorMm: parseFloat(baseError.toFixed(4)),
      dynamicErrorMm: parseFloat(dynamicError.toFixed(4)),
      servoContributionMm: parseFloat(servoLag.totalTrackingErrorMm.toFixed(4)),
      totalPathErrorMm: parseFloat(totalPathError.toFixed(4)),
      accuracyClass,
      recommendation,
      timestamp: Date.now(),
    };

    this.motionHistory.push(result);
    this.emit('accuracy:assessed', result);

    return result;
  }

  /**
   * Recommend optimal feed hold strategy
   */
  recommendOptimalFeedHoldStrategy(params) {
    if (!params || params.currentVelocity === undefined) {
      throw new Error('Strategy recommendation requires currentVelocity');
    }

    const { currentVelocity, axis = 'X', taskType = 'general' } = params;

    const strategies = [
      {
        name: 'Soft Stop',
        description: 'Gradual deceleration with friction',
        decelerationFactor: 0.7,
        settlingTimeMs: 500,
        accuracy: 'HIGH',
        recommended: taskType === 'finishing',
      },
      {
        name: 'Hard Stop',
        description: 'Maximum deceleration',
        decelerationFactor: 1.0,
        settlingTimeMs: 200,
        accuracy: 'MEDIUM',
        recommended: taskType === 'roughing',
      },
      {
        name: 'Controlled Stop',
        description: 'Balanced deceleration',
        decelerationFactor: 0.85,
        settlingTimeMs: 350,
        accuracy: 'EXCELLENT',
        recommended: taskType === 'general',
      },
    ];

    const analysis = this.analyzeFeedHold({
      currentVelocity,
      axis,
      maxDeceleration: this.options[`maxAcceleration${axis}`],
    });

    const recommended = strategies.find((s) => s.recommended) || strategies[2];

    return {
      currentVelocityMmMin: currentVelocity,
      axis,
      taskType,
      recommendedStrategy: recommended.name,
      strategies: strategies.map((s) => ({
        ...s,
        timeToStopMs: parseFloat(
          (analysis.timeToStopMs / (1 - (1 - s.decelerationFactor))).toFixed(1)
        ),
        finalAccuracyMm: parseFloat(
          (analysis.trackingErrorMm * (1 - s.decelerationFactor)).toFixed(4)
        ),
      })),
      expectedSettlingTimeMs: recommended.settlingTimeMs,
      expectedAccuracyMm: parseFloat(
        (analysis.trackingErrorMm * (1 - recommended.decelerationFactor)).toFixed(4)
      ),
      timestamp: Date.now(),
    };
  }

  /**
   * History management
   */
  getHistory(limit = 50) {
    return this.motionHistory.slice(-limit);
  }

  clearHistory() {
    this.motionHistory = [];
  }

  /**
   * Statistics
   */
  getStatistics() {
    if (this.motionHistory.length === 0) {
      return { message: 'No motion history available' };
    }

    const errors = this.motionHistory
      .filter((h) => h.trackingErrorMm !== undefined || h.totalPathErrorMm !== undefined)
      .map((h) => h.trackingErrorMm || h.totalPathErrorMm || 0);

    if (errors.length === 0) {
      return { message: 'No error data in history' };
    }

    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;

    return {
      totalMeasurements: this.motionHistory.length,
      averageErrorMm: parseFloat(avgError.toFixed(4)),
      maxErrorMm: parseFloat(Math.max(...errors).toFixed(4)),
      minErrorMm: parseFloat(Math.min(...errors).toFixed(4)),
      standardDeviation: parseFloat(
        Math.sqrt(
          errors.reduce((sq, n) => sq + Math.pow(n - avgError, 2), 0) / errors.length
        ).toFixed(4)
      ),
    };
  }
}

export default FeedHoldAccelerationAnalyzer;
