/**
 * Unit Tests: Fleet Management
 * Phase 17: Cloud Integration & Collaboration
 */

import FleetManagement from '../../../modules/cloud/fleet-management.mjs';

describe('FleetManagement', () => {
  let fleet;

  beforeEach(() => {
    fleet = new FleetManagement({
      maxMachinesPerFleet: 1000,
      healthCheckInterval: 30000,
      machineTimeoutMs: 120000,
    });
  });

  describe('createFleet', () => {
    test('should create fleet successfully', () => {
      const result = fleet.createFleet({
        fleetName: 'Production Fleet',
        description: 'Main CNC machines',
        location: 'Building A',
        tags: ['production', 'cnc'],
      });

      expect(result.fleetId).toBeDefined();
      expect(result.fleetName).toBe('Production Fleet');
      expect(result.status).toBe('ACTIVE');
    });

    test('should throw error without fleetName', () => {
      expect(() => {
        fleet.createFleet({
          description: 'Test fleet',
        });
      }).toThrow('Fleet creation requires fleetName');
    });

    test('should emit fleet created event', (done) => {
      fleet.on('fleet:created', (f) => {
        expect(f.fleetName).toBe('Test Fleet');
        done();
      });

      fleet.createFleet({ fleetName: 'Test Fleet' });
    });
  });

  describe('registerMachine', () => {
    test('should register machine to fleet', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      const machine = fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        machineType: 'CNC',
        capacity: 100,
      });

      expect(machine.machineId).toBe('cnc_001');
      expect(machine.status).toBe('OFFLINE');
      expect(machine.currentLoad).toBe(0);
    });

    test('should throw error for invalid fleet', () => {
      expect(() => {
        fleet.registerMachine({
          machineId: 'cnc_001',
          fleetId: 'unknown_fleet',
          machineName: 'CNC-1',
        });
      }).toThrow('Fleet not found');
    });

    test('should enforce machine capacity limit', () => {
      const smallFleet = new FleetManagement({ maxMachinesPerFleet: 1 });
      const f = smallFleet.createFleet({ fleetName: 'Small Fleet' });

      smallFleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });

      expect(() => {
        smallFleet.registerMachine({
          machineId: 'cnc_002',
          fleetId: f.fleetId,
          machineName: 'CNC-2',
        });
      }).toThrow('Fleet at maximum machine capacity');
    });

    test('should emit machine registered event', (done) => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      fleet.on('machine:registered', (m) => {
        expect(m.machineId).toBe('cnc_001');
        done();
      });

      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });
    });
  });

  describe('reportHeartbeat', () => {
    test('should report machine heartbeat', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      const m = fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });

      const health = fleet.reportHeartbeat({
        machineId: 'cnc_001',
        currentLoad: 30,
        cpuUsage: 45,
        memoryUsage: 60,
      });

      expect(health.status).toBe('HEALTHY');
      expect(health.isHealthy).toBe(true);
    });

    test('should mark machine online after heartbeat', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });

      fleet.reportHeartbeat({
        machineId: 'cnc_001',
        cpuUsage: 30,
        memoryUsage: 40,
      });

      const machine = fleet.machines.get('cnc_001');
      expect(machine.status).toBe('ONLINE');
    });

    test('should mark degraded on high resource usage', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });

      const health = fleet.reportHeartbeat({
        machineId: 'cnc_001',
        cpuUsage: 95,
        memoryUsage: 90,
      });

      expect(health.status).toBe('DEGRADED');
      expect(health.isHealthy).toBe(false);
    });

    test('should emit heartbeat event', (done) => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });

      fleet.on('machine:heartbeat', (data) => {
        expect(data.machineId).toBe('cnc_001');
        done();
      });

      fleet.reportHeartbeat({
        machineId: 'cnc_001',
        cpuUsage: 40,
      });
    });
  });

  describe('allocateJobToMachine', () => {
    test('should allocate job to suitable machine', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        capacity: 100,
      });

      fleet.reportHeartbeat({
        machineId: 'cnc_001',
        currentLoad: 0,
      });

      const allocation = fleet.allocateJobToMachine({
        jobId: 'job_123',
        jobRequirements: { requiredCapacity: 30 },
      });

      expect(allocation.allocated).toBe(true);
      expect(allocation.machineId).toBe('cnc_001');
    });

    test('should use load balancing for allocation', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        capacity: 100,
      });

      fleet.registerMachine({
        machineId: 'cnc_002',
        fleetId: f.fleetId,
        machineName: 'CNC-2',
        capacity: 100,
      });

      fleet.reportHeartbeat({
        machineId: 'cnc_001',
        currentLoad: 80,
      });

      fleet.reportHeartbeat({
        machineId: 'cnc_002',
        currentLoad: 20,
      });

      const allocation = fleet.allocateJobToMachine({
        jobId: 'job_123',
        jobRequirements: { requiredCapacity: 10 },
      });

      expect(allocation.machineId).toBe('cnc_002');
    });

    test('should fail allocation if no suitable machine', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      const allocation = fleet.allocateJobToMachine({
        jobId: 'job_123',
        jobRequirements: { requiredCapacity: 30 },
      });

      expect(allocation.allocated).toBe(false);
      expect(allocation.message).toContain('No suitable machine');
    });

    test('should emit job allocated event', (done) => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        capacity: 100,
      });

      fleet.reportHeartbeat({
        machineId: 'cnc_001',
        currentLoad: 0,
      });

      fleet.on('job:allocated', (data) => {
        expect(data.jobId).toBe('job_123');
        done();
      });

      fleet.allocateJobToMachine({
        jobId: 'job_123',
        jobRequirements: { requiredCapacity: 10 },
      });
    });
  });

  describe('completeJobOnMachine', () => {
    test('should complete job on machine', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        capacity: 100,
      });

      fleet.reportHeartbeat({ machineId: 'cnc_001', currentLoad: 0 });

      fleet.allocateJobToMachine({
        jobId: 'job_123',
        jobRequirements: { requiredCapacity: 30 },
      });

      const completion = fleet.completeJobOnMachine({
        machineId: 'cnc_001',
        jobId: 'job_123',
        result: { success: true },
      });

      expect(completion.status).toBe('COMPLETED');
    });

    test('should emit job completed event', (done) => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });

      fleet.reportHeartbeat({ machineId: 'cnc_001' });

      fleet.on('job:completed', (data) => {
        expect(data.machineId).toBe('cnc_001');
        done();
      });

      fleet.completeJobOnMachine({
        machineId: 'cnc_001',
        jobId: 'job_123',
        result: { success: true },
      });
    });
  });

  describe('scheduleMaintenance', () => {
    test('should schedule maintenance', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });

      const maintenance = fleet.scheduleMaintenance({
        machineId: 'cnc_001',
        maintenanceType: 'PREVENTIVE',
        scheduledStart: Date.now() + 86400000,
        estimatedDuration: 3600000,
        description: 'Regular maintenance',
      });

      expect(maintenance.maintenanceId).toBeDefined();
      expect(maintenance.status).toBe('SCHEDULED');
    });

    test('should emit maintenance scheduled event', (done) => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
      });

      fleet.on('maintenance:scheduled', (data) => {
        expect(data.maintenanceType).toBe('PREVENTIVE');
        done();
      });

      fleet.scheduleMaintenance({
        machineId: 'cnc_001',
        maintenanceType: 'PREVENTIVE',
        scheduledStart: Date.now(),
      });
    });
  });

  describe('getFleetStatus', () => {
    test('should return fleet status', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        capacity: 100,
      });

      fleet.reportHeartbeat({ machineId: 'cnc_001' });

      const status = fleet.getFleetStatus({ fleetId: f.fleetId });

      expect(status.fleetId).toBe(f.fleetId);
      expect(status.machineCount).toBe(1);
      expect(status.onlineMachines).toBe(1);
      expect(status.utilizationRate).toBeDefined();
    });
  });

  describe('getMachineDetails', () => {
    test('should return machine details', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });
      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        capacity: 100,
      });

      const details = fleet.getMachineDetails({ machineId: 'cnc_001' });

      expect(details.machineId).toBe('cnc_001');
      expect(details.status).toBe('OFFLINE');
      expect(details.health).toBeDefined();
    });

    test('should throw error for non-existent machine', () => {
      expect(() => {
        fleet.getMachineDetails({ machineId: 'unknown' });
      }).toThrow('Machine not found');
    });
  });

  describe('getStatistics', () => {
    test('should return fleet statistics', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        capacity: 100,
      });

      fleet.reportHeartbeat({ machineId: 'cnc_001', currentLoad: 30 });

      const stats = fleet.getStatistics();

      expect(stats.fleetCount).toBe(1);
      expect(stats.machineCount).toBe(1);
      expect(stats.onlineMachines).toBe(1);
      expect(stats.utilizationRate).toBeDefined();
    });

    test('should calculate utilization rate', () => {
      const f = fleet.createFleet({ fleetName: 'Test Fleet' });

      fleet.registerMachine({
        machineId: 'cnc_001',
        fleetId: f.fleetId,
        machineName: 'CNC-1',
        capacity: 100,
      });

      fleet.reportHeartbeat({ machineId: 'cnc_001', currentLoad: 50 });

      const stats = fleet.getStatistics();

      expect(stats.utilizationRate).toBe(50);
    });
  });

  describe('event system', () => {
    test('should support multiple event listeners', () => {
      let count = 0;

      fleet.on('fleet:created', () => count++);
      fleet.on('fleet:created', () => count++);

      fleet.createFleet({ fleetName: 'Test' });

      expect(count).toBe(2);
    });
  });
});
