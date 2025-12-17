/**
 * Hardware Fault Detection & Recovery Module
 *
 * Detects faults from sensor anomalies, executes recovery sequences,
 * and provides root cause analysis and maintenance recommendations.
 */

export class FaultDetectionRecovery {
  constructor(options = {}) {
    this.options = {
      faultHistorySize: options.faultHistorySize || 100,
      recoveryTimeoutMs: options.recoveryTimeoutMs || 30000,
      enableAutoRecovery: options.enableAutoRecovery !== false,
      ...options,
    };

    this.faults = new Map();
    this.recoverySequences = new Map();
    this.faultHistory = [];
    this.listeners = {};
    this.stats = {
      faultsDetected: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
    };

    this._initRecoverySequences();
  }

  /**
   * Initialize default recovery sequences
   * @private
   */
  _initRecoverySequences() {
    // Spindle overheat recovery
    this.recoverySequences.set('spindle_overheat', [
      {
        action: 'reduce_spindle_speed',
        params: { percentage: 0.7 },
      },
      {
        action: 'increase_coolant_flow',
        params: { percentage: 1.5 },
      },
      {
        action: 'pause_cutting',
        params: { duration: 5000 },
      },
      { action: 'monitor_temperature', params: {} },
    ]);

    // Feed rate instability recovery
    this.recoverySequences.set('feed_instability', [
      {
        action: 'reduce_feed_rate',
        params: { percentage: 0.5 },
      },
      { action: 'check_tool_wear', params: {} },
      { action: 'verify_workpiece_clamp', params: {} },
      { action: 'resume_with_lower_feed', params: {} },
    ]);

    // Vibration warning recovery
    this.recoverySequences.set('vibration_warning', [
      {
        action: 'reduce_spindle_load',
        params: { percentage: 0.7 },
      },
      { action: 'stabilize_position', params: {} },
      { action: 'check_tool_runout', params: {} },
      { action: 'resume_operation', params: {} },
    ]);

    // Tool breakage recovery
    this.recoverySequences.set('tool_breakage', [
      {
        action: 'emergency_stop',
        params: {},
      },
      {
        action: 'retract_spindle',
        params: { safeDistance: 50 },
      },
      {
        action: 'log_incident',
        params: {},
      },
      {
        action: 'raise_alarm',
        params: { severity: 'critical' },
      },
    ]);

    // Power supply fault recovery
    this.recoverySequences.set('power_fault', [
      {
        action: 'safe_stop',
        params: {},
      },
      {
        action: 'cut_spindle',
        params: {},
      },
      {
        action: 'retract_axes',
        params: {},
      },
      {
        action: 'wait_for_restart',
        params: { timeout: 60000 },
      },
    ]);
  }

  /**
   * Detect fault from sensor anomalies
   * @param {string} faultType - Type of fault
   * @param {object} sensorData - Sensor readings
   * @param {number} severity - Fault severity (0-1)
   * @returns {object} - Detected fault
   */
  detectFault(faultType, sensorData, severity = 0.5) {
    if (!faultType || !sensorData) {
      throw new Error('Invalid fault detection parameters');
    }

    const fault = {
      id: `fault-${Date.now()}-${Math.random()}`,
      type: faultType,
      severity,
      detectedAt: Date.now(),
      sensorData,
      predictedRootCause: null,
      recoveryAttempts: 0,
      status: 'detected',
    };

    // Analyze root cause
    fault.predictedRootCause = this._analyzeRootCause(faultType, sensorData);

    this.faults.set(fault.id, fault);
    this.faultHistory.push(fault);

    if (this.faultHistory.length > this.options.faultHistorySize) {
      this.faultHistory.shift();
    }

    this.stats.faultsDetected++;

    this.emit('faultDetected', {
      faultId: fault.id,
      type: faultType,
      severity,
      rootCause: fault.predictedRootCause,
    });

    // Attempt automatic recovery if enabled
    if (this.options.enableAutoRecovery && severity > 0.5) {
      this._triggerRecoverySequence(fault.id);
    }

    return fault;
  }

  /**
   * Analyze root cause from sensor data
   * @private
   */
  _analyzeRootCause(faultType, sensorData) {
    const causes = [];

    if (
      faultType.includes('thermal') ||
      faultType.includes('spindle') ||
      faultType.includes('overheat')
    ) {
      if (sensorData.temperature > 80) {
        causes.push('High ambient temperature');
      }
      if (!sensorData.coolingFlow) {
        causes.push('Coolant flow interrupted');
      }
      if (sensorData.spindle?.load > 90) {
        causes.push('Excessive spindle load');
      }
    }

    if (faultType.includes('vibration')) {
      if (sensorData.spindle?.runout > 0.05) {
        causes.push('Tool runout exceeded');
      }
      if (sensorData.bearing?.temperature > 60) {
        causes.push('Bearing wear');
      }
      if (!sensorData.workpiece?.clamped) {
        causes.push('Workpiece not secured');
      }
    }

    if (faultType.includes('feed')) {
      if (sensorData.tool?.wear > 0.5) {
        causes.push('Tool wear');
      }
      if (sensorData.feedRate > 500) {
        causes.push('Feed rate too aggressive');
      }
    }

    if (faultType.includes('power')) {
      if (sensorData.voltage < 200) {
        causes.push('Low input voltage');
      }
      if (sensorData.current > 50) {
        causes.push('Overcurrent condition');
      }
    }

    return causes.length > 0 ? causes[0] : 'Unknown';
  }

  /**
   * Trigger recovery sequence for a fault
   * @private
   */
  async _triggerRecoverySequence(faultId) {
    const fault = this.faults.get(faultId);
    if (!fault) {
      throw new Error(`Fault ${faultId} not found`);
    }

    const sequence = this.recoverySequences.get(fault.type);
    if (!sequence) {
      this.emit('noRecoverySequence', {
        faultId,
        faultType: fault.type,
      });
      return;
    }

    this.stats.recoveryAttempts++;
    fault.status = 'recovering';
    fault.recoveryAttempts++;

    try {
      for (const step of sequence) {
        await this._executeRecoveryStep(faultId, step);
      }

      fault.status = 'recovered';
      this.stats.successfulRecoveries++;

      this.emit('recoverySuccessful', {
        faultId,
        recoveryTime: Date.now() - fault.detectedAt,
      });
    } catch (err) {
      fault.status = 'recovery_failed';
      this.stats.failedRecoveries++;

      this.emit('recoveryFailed', {
        faultId,
        error: err.message,
      });

      await this._executeSafeShutdown(faultId);
    }
  }

  /**
   * Execute a single recovery step
   * @private
   */
  async _executeRecoveryStep(faultId, step) {
    return new Promise((resolve) => {
      // Simulate step execution
      setTimeout(() => {
        this.emit('recoveryStepExecuted', {
          faultId,
          action: step.action,
          params: step.params,
        });
        resolve();
      }, 500);
    });
  }

  /**
   * Execute safe shutdown procedure
   * @private
   */
  async _executeSafeShutdown(faultId) {
    const shutdownSequence = [
      { action: 'stop_spindle', params: {} },
      {
        action: 'retract_all_axes',
        params: { speed: 100 },
      },
      { action: 'disable_servos', params: {} },
      { action: 'raise_emergency_alarm', params: {} },
    ];

    for (const step of shutdownSequence) {
      await this._executeRecoveryStep(faultId, step);
    }

    this.emit('safeShutdownComplete', {
      faultId,
      timestamp: Date.now(),
    });
  }

  /**
   * Get fault details
   * @param {string} faultId - Fault identifier
   * @returns {object} - Fault details
   */
  getFaultDetails(faultId) {
    const fault = this.faults.get(faultId);
    if (!fault) {
      throw new Error(`Fault ${faultId} not found`);
    }

    return {
      ...fault,
      age: Date.now() - fault.detectedAt,
      recommendedAction: this._getRecommendedAction(fault),
    };
  }

  /**
   * Get recommended maintenance action
   * @private
   */
  _getRecommendedAction(fault) {
    if (fault.type.includes('tool')) {
      return 'Replace tool immediately';
    }
    if (fault.type.includes('bearing')) {
      return 'Schedule bearing replacement';
    }
    if (
      fault.type.includes('thermal') ||
      fault.type.includes('spindle') ||
      fault.type.includes('overheat')
    ) {
      return 'Check cooling system';
    }
    if (fault.type.includes('vibration')) {
      return 'Balance spindle and check runout';
    }
    return 'Perform preventive maintenance';
  }

  /**
   * Get fault history
   * @param {number} limit - Optional limit on returned faults
   * @returns {array} - Fault history
   */
  getFaultHistory(limit = null) {
    if (limit && limit > 0) {
      return this.faultHistory.slice(-limit);
    }
    return [...this.faultHistory];
  }

  /**
   * Get faults by type
   * @param {string} faultType - Type of fault
   * @returns {array} - Matching faults
   */
  getFaultsByType(faultType) {
    return this.faultHistory.filter((f) => f.type === faultType);
  }

  /**
   * Get active faults
   * @returns {array} - Active faults
   */
  getActiveFaults() {
    return this.faultHistory.filter((f) => f.status === 'detected' || f.status === 'recovering');
  }

  /**
   * Resolve a fault
   * @param {string} faultId - Fault identifier
   * @param {string} resolution - Resolution description
   * @returns {boolean} - True if resolved
   */
  resolveFault(faultId, resolution) {
    const fault = this.faults.get(faultId);
    if (!fault) {
      throw new Error(`Fault ${faultId} not found`);
    }

    fault.status = 'resolved';
    fault.resolution = resolution;
    fault.resolvedAt = Date.now();

    this.emit('faultResolved', {
      faultId,
      resolution,
      duration: fault.resolvedAt - fault.detectedAt,
    });

    return true;
  }

  /**
   * Get system statistics
   * @returns {object} - Statistics
   */
  getStatistics() {
    const activeFaults = this.getActiveFaults();

    return {
      faultsDetected: this.stats.faultsDetected,
      activeFaults: activeFaults.length,
      recoveryAttempts: this.stats.recoveryAttempts,
      successfulRecoveries: this.stats.successfulRecoveries,
      failedRecoveries: this.stats.failedRecoveries,
      recoverySuccessRate:
        this.stats.recoveryAttempts > 0
          ? (this.stats.successfulRecoveries / this.stats.recoveryAttempts) * 100
          : 0,
      faultHistory: this.faultHistory.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Event emitter pattern
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }
}
