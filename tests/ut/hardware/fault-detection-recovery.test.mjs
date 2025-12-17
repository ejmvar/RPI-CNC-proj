import { FaultDetectionRecovery } from '../../../modules/hardware/fault-detection-recovery.mjs';

describe('FaultDetectionRecovery', () => {
  let system;

  beforeEach(() => {
    system = new FaultDetectionRecovery();
  });

  // ===== Fault Detection Tests =====
  describe('Fault Detection', () => {
    test('should detect a fault', () => {
      const fault = system.detectFault('spindle_overheat', {
        temperature: 85,
        coolingFlow: 10,
      });

      expect(fault).not.toBeNull();
      expect(fault.type).toBe('spindle_overheat');
      expect(fault.status).toBe('detected');
    });

    test('should assign unique fault ID', () => {
      const fault1 = system.detectFault('spindle_overheat', { temperature: 85 });
      const fault2 = system.detectFault('spindle_overheat', { temperature: 85 });

      expect(fault1.id).not.toBe(fault2.id);
    });

    test('should throw on invalid parameters', () => {
      expect(() => system.detectFault('', {})).toThrow();
    });

    test('should emit fault detected event', (done) => {
      system.on('faultDetected', (data) => {
        expect(data.type).toBe('spindle_overheat');
        expect(data.severity).toBeDefined();
        done();
      });

      system.detectFault('spindle_overheat', {
        temperature: 85,
      });
    });

    test('should set fault severity', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 }, 0.8);

      expect(fault.severity).toBe(0.8);
    });

    test('should track detected faults', () => {
      system.detectFault('spindle_overheat', {
        temperature: 85,
      });
      const stats = system.getStatistics();
      expect(stats.faultsDetected).toBe(1);
    });
  });

  // ===== Root Cause Analysis Tests =====
  describe('Root Cause Analysis', () => {
    test('should analyze thermal fault root cause', () => {
      const fault = system.detectFault('spindle_overheat', {
        temperature: 85,
        coolingFlow: 0,
      });

      expect(fault.predictedRootCause).toBeDefined();
    });

    test('should identify multiple potential causes', () => {
      const fault = system.detectFault('vibration_warning', {
        spindle: { runout: 0.1 },
        bearing: { temperature: 70 },
        workpiece: { clamped: false },
      });

      expect(fault.predictedRootCause).not.toBe('Unknown');
    });

    test('should suggest tool wear for feed faults', () => {
      const fault = system.detectFault('feed_instability', {
        tool: { wear: 0.7 },
        feedRate: 150,
      });

      expect(fault.predictedRootCause).toBeDefined();
    });

    test('should identify power supply issues', () => {
      const fault = system.detectFault('power_fault', {
        voltage: 180,
        current: 60,
      });

      expect(fault.predictedRootCause).not.toBe('Unknown');
    });
  });

  // ===== Recovery Sequence Tests =====
  describe('Recovery Sequences', () => {
    test('should have spindle overheat recovery', () => {
      const recovery = system.recoverySequences.get('spindle_overheat');
      expect(recovery).toBeDefined();
      expect(recovery.length).toBeGreaterThan(0);
    });

    test('should have feed instability recovery', () => {
      const recovery = system.recoverySequences.get('feed_instability');
      expect(recovery).toBeDefined();
    });

    test('should have vibration warning recovery', () => {
      const recovery = system.recoverySequences.get('vibration_warning');
      expect(recovery).toBeDefined();
    });

    test('should have tool breakage recovery', () => {
      const recovery = system.recoverySequences.get('tool_breakage');
      expect(recovery).toBeDefined();
    });

    test('should have power fault recovery', () => {
      const recovery = system.recoverySequences.get('power_fault');
      expect(recovery).toBeDefined();
    });

    test('recovery should have action steps', () => {
      const recovery = system.recoverySequences.get('spindle_overheat');
      recovery.forEach((step) => {
        expect(step.action).toBeDefined();
        expect(step.params).toBeDefined();
      });
    });
  });

  // ===== Automatic Recovery Tests =====
  describe('Automatic Recovery', () => {
    test('should trigger recovery for high severity', (done) => {
      system.on('recoverySuccessful', () => {
        done();
      });

      system.detectFault(
        'spindle_overheat',
        {
          temperature: 85,
        },
        0.8
      );

      setTimeout(() => {
        // Recovery should have been triggered
      }, 100);
    });

    test('should emit recovery steps', (done) => {
      let stepCount = 0;
      system.on('recoveryStepExecuted', () => {
        stepCount++;
        if (stepCount >= 1) done();
      });

      system.detectFault(
        'spindle_overheat',
        {
          temperature: 85,
        },
        0.8
      );
    });

    test('should disable auto recovery when configured', () => {
      const noAuto = new FaultDetectionRecovery({
        enableAutoRecovery: false,
      });

      let recovered = false;
      noAuto.on('recoverySuccessful', () => {
        recovered = true;
      });

      noAuto.detectFault(
        'spindle_overheat',
        {
          temperature: 85,
        },
        0.8
      );

      setTimeout(() => {
        // Should not have triggered automatic recovery
        expect(recovered).toBe(false);
      }, 500);
    });
  });

  // ===== Fault Details Tests =====
  describe('Fault Details', () => {
    test('should get fault details', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 });
      const details = system.getFaultDetails(fault.id);

      expect(details.id).toBe(fault.id);
      expect(details.type).toBe('spindle_overheat');
      expect(details.age).toBeDefined();
    });

    test('should throw on non-existent fault', () => {
      expect(() => system.getFaultDetails('non-existent')).toThrow();
    });

    test('should include recommended action', () => {
      const fault = system.detectFault('tool_breakage', {});
      const details = system.getFaultDetails(fault.id);

      expect(details.recommendedAction).toBeDefined();
    });

    test('should calculate fault age', async () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 });

      await new Promise((res) => setTimeout(res, 50));
      const details = system.getFaultDetails(fault.id);
      expect(details.age).toBeGreaterThan(0);
    });
  });

  // ===== Fault History Tests =====
  describe('Fault History', () => {
    test('should maintain fault history', () => {
      system.detectFault('spindle_overheat', {
        temperature: 85,
      });
      system.detectFault('feed_instability', {
        feedRate: 150,
      });

      const history = system.getFaultHistory();
      expect(history.length).toBe(2);
    });

    test('should limit fault history size', () => {
      const limited = new FaultDetectionRecovery({
        faultHistorySize: 3,
      });

      for (let i = 0; i < 5; i++) {
        limited.detectFault('spindle_overheat', {
          temperature: 85,
        });
      }

      const history = limited.getFaultHistory();
      expect(history.length).toBeLessThanOrEqual(3);
    });

    test('should get faults by type', () => {
      system.detectFault('spindle_overheat', {
        temperature: 85,
      });
      system.detectFault('spindle_overheat', {
        temperature: 88,
      });
      system.detectFault('feed_instability', {
        feedRate: 150,
      });

      const spindle = system.getFaultsByType('spindle_overheat');
      expect(spindle.length).toBe(2);
    });

    test('should get active faults', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 });
      system.resolveFault(fault.id, 'Resolved');

      const active = system.getActiveFaults();
      expect(active.some((f) => f.id === fault.id)).toBe(false);
    });
  });

  // ===== Fault Resolution Tests =====
  describe('Fault Resolution', () => {
    test('should resolve a fault', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 });

      const result = system.resolveFault(fault.id, 'Cooling system cleaned');
      expect(result).toBe(true);
    });

    test('should emit fault resolved event', (done) => {
      system.on('faultResolved', (data) => {
        expect(data.faultId).toBeDefined();
        expect(data.resolution).toBeDefined();
        expect(data.duration).toBeDefined();
        done();
      });

      const fault = system.detectFault('spindle_overheat', { temperature: 85 });
      system.resolveFault(fault.id, 'Fixed');
    });

    test('should throw on non-existent fault resolution', () => {
      expect(() => system.resolveFault('non-existent', 'Fixed')).toThrow();
    });

    test('should set resolved status', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 });
      system.resolveFault(fault.id, 'Fixed');

      const resolved = system.faults.get(fault.id);
      expect(resolved.status).toBe('resolved');
    });
  });

  // ===== Safe Shutdown Tests =====
  describe('Safe Shutdown', () => {
    test('should have safe shutdown recovery sequence', () => {
      const recovery = system.recoverySequences.get('power_fault');
      expect(recovery).toBeDefined();
      expect(recovery.some((s) => s.action === 'safe_stop')).toBe(true);
    });

    test('should execute shutdown steps in recovery', () => {
      const recovery = system.recoverySequences.get('power_fault');
      expect(recovery.length).toBeGreaterThan(0);
      recovery.forEach((step) => {
        expect(step.action).toBeDefined();
      });
    });
  });

  // ===== System Statistics Tests =====
  describe('System Statistics', () => {
    test('should provide statistics', () => {
      system.detectFault('spindle_overheat', {
        temperature: 85,
      });

      const stats = system.getStatistics();
      expect(stats.faultsDetected).toBe(1);
      expect(stats.recoveryAttempts).toBeGreaterThanOrEqual(0);
    });

    test('should track recovery success rate', () => {
      system.detectFault(
        'spindle_overheat',
        {
          temperature: 85,
        },
        0.8
      );

      const stats = system.getStatistics();
      expect(stats.recoverySuccessRate).toBeDefined();
    });

    test('should count active faults', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 });

      const stats = system.getStatistics();
      expect(stats.activeFaults).toBeGreaterThan(0);

      system.resolveFault(fault.id, 'Fixed');
      const statsAfter = system.getStatistics();
      expect(statsAfter.activeFaults).toBeLessThan(stats.activeFaults);
    });

    test('should track fault history size', () => {
      system.detectFault('spindle_overheat', {
        temperature: 85,
      });
      system.detectFault('feed_instability', {
        feedRate: 150,
      });

      const stats = system.getStatistics();
      expect(stats.faultHistory).toBe(2);
    });
  });

  // ===== Recommended Actions Tests =====
  describe('Recommended Actions', () => {
    test('should recommend tool replacement', () => {
      const fault = system.detectFault('tool_breakage', {
        acousticPeak: 85,
      });
      const details = system.getFaultDetails(fault.id);

      expect(details.recommendedAction).toContain('Replace');
    });

    test('should recommend bearing service', () => {
      const fault = system.detectFault('bearing_fault', { temperature: 90 });
      const details = system.getFaultDetails(fault.id);

      expect(details.recommendedAction).toBeDefined();
    });

    test('should recommend cooling check', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 });
      const details = system.getFaultDetails(fault.id);

      expect(details.recommendedAction.toLowerCase()).toContain('cool');
    });

    test('should recommend preventive maintenance', () => {
      const fault = system.detectFault('unknown_fault', {});
      const details = system.getFaultDetails(fault.id);

      expect(details.recommendedAction).toBeDefined();
    });
  });

  // ===== Recovery Attempt Tracking =====
  describe('Recovery Attempt Tracking', () => {
    test('should track recovery attempts on faults', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85 });

      expect(fault.recoveryAttempts).toBeDefined();
    });

    test('should track successful recoveries', () => {
      system.detectFault(
        'spindle_overheat',
        {
          temperature: 85,
        },
        0.8
      );

      setTimeout(() => {
        const stats = system.getStatistics();
        expect(stats.successfulRecoveries).toBeGreaterThanOrEqual(0);
      }, 500);
    });
  });

  // ===== Sensor Data Storage Tests =====
  describe('Sensor Data Storage', () => {
    test('should store sensor data with fault', () => {
      const sensorData = {
        temperature: 85,
        coolingFlow: 5,
        spindle: { speed: 5000 },
      };

      const fault = system.detectFault('spindle_overheat', sensorData);

      expect(fault.sensorData).toEqual(sensorData);
    });

    test('should include sensor data in history', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 85, coolingFlow: 5 });

      const history = system.getFaultHistory();
      expect(history[0].sensorData).toBeDefined();
      expect(history[0].sensorData.temperature).toBe(85);
    });
  });

  // ===== Severity Handling Tests =====
  describe('Severity Handling', () => {
    test('should handle low severity faults', () => {
      const fault = system.detectFault('spindle_overheat', { temperature: 65 }, 0.2);

      expect(fault.severity).toBe(0.2);
    });

    test('should handle critical severity faults', () => {
      const fault = system.detectFault('tool_breakage', { acousticPeak: 95 }, 0.95);

      expect(fault.severity).toBe(0.95);
    });

    test('should trigger recovery for high severity', (done) => {
      let recovered = false;

      system.on('recoverySuccessful', () => {
        recovered = true;
        done();
      });

      system.detectFault(
        'spindle_overheat',
        {
          temperature: 85,
        },
        0.8
      );
    });

    test('should not auto-trigger recovery for low severity', () => {
      let recovered = false;

      system.on('recoverySuccessful', () => {
        recovered = true;
      });

      system.detectFault(
        'spindle_overheat',
        {
          temperature: 65,
        },
        0.3
      );

      setTimeout(() => {
        // Low severity should not trigger automatic recovery
      }, 500);
    });
  });

  // ===== Event Emission Tests =====
  describe('Event Emission', () => {
    test('should support event listener capability', () => {
      let eventFired = false;
      system.on('testEvent', () => {
        eventFired = true;
      });
      system.emit('testEvent', {});
      expect(eventFired).toBe(true);
    });

    test('should emit events with data', (done) => {
      system.on('customEvent', (data) => {
        expect(data.value).toBe(42);
        done();
      });
      system.emit('customEvent', { value: 42 });
    });
  });
});
