/**
 * Fleet Management
 * Phase 17: Cloud Integration & Collaboration
 *
 * Manages a distributed fleet of CNC machines:
 * - Machine registration and discovery
 * - Status monitoring and health checks
 * - Resource allocation and load balancing
 * - Maintenance scheduling
 */

export class FleetManagement {
  constructor(options = {}) {
    this.options = {
      maxMachinesPerFleet: options.maxMachinesPerFleet || 1000,
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      machineTimeoutMs: options.machineTimeoutMs || 120000, // 2 minutes
      maxResourceUtilization: options.maxResourceUtilization || 85,
      ...options,
    };

    this.fleets = new Map();
    this.machines = new Map();
    this.healthStatus = new Map();
    this.maintenanceSchedule = new Map();
    this.listeners = {};
    this.loadBalancer = new Map();
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
   * Create fleet
   */
  createFleet(params) {
    if (!params || !params.fleetName) {
      throw new Error('Fleet creation requires fleetName');
    }

    const { fleetName, description = '', location = '', tags = [] } = params;

    const fleetId = `fleet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fleet = {
      fleetId,
      fleetName,
      description,
      location,
      tags,
      createdAt: Date.now(),
      machines: [],
      status: 'ACTIVE',
      totalCapacity: 0,
      usedCapacity: 0,
      machineCount: 0,
    };

    this.fleets.set(fleetId, fleet);

    this.emit('fleet:created', fleet);

    return fleet;
  }

  /**
   * Register machine to fleet
   */
  registerMachine(params) {
    if (!params || !params.machineId || !params.fleetId) {
      throw new Error('Machine registration requires machineId and fleetId');
    }

    const {
      machineId,
      fleetId,
      machineName,
      machineType = 'CNC',
      capacity = 100,
      processingPower = 100,
      location = '',
      metadata = {},
    } = params;

    // Validate fleet exists
    if (!this.fleets.has(fleetId)) {
      throw new Error(`Fleet not found: ${fleetId}`);
    }

    // Check fleet capacity
    const fleet = this.fleets.get(fleetId);
    if (fleet.machines.length >= this.options.maxMachinesPerFleet) {
      throw new Error(`Fleet at maximum machine capacity: ${this.options.maxMachinesPerFleet}`);
    }

    const machine = {
      machineId,
      fleetId,
      machineName,
      machineType,
      capacity,
      processingPower,
      location,
      metadata,
      registeredAt: Date.now(),
      status: 'OFFLINE',
      lastHeartbeat: null,
      currentLoad: 0,
      jobsAssigned: 0,
      jobsCompleted: 0,
      uptime: 0,
      errors: [],
    };

    this.machines.set(machineId, machine);
    fleet.machines.push(machineId);
    fleet.totalCapacity += capacity;
    fleet.machineCount++;

    this.healthStatus.set(machineId, { status: 'OFFLINE', lastCheck: Date.now() });

    this.emit('machine:registered', machine);

    return machine;
  }

  /**
   * Report machine heartbeat
   */
  reportHeartbeat(params) {
    if (!params || !params.machineId) {
      throw new Error('Heartbeat requires machineId');
    }

    const {
      machineId,
      currentLoad = 0,
      jobsProcessing = 0,
      cpuUsage = 0,
      memoryUsage = 0,
    } = params;

    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new Error(`Machine not found: ${machineId}`);
    }

    machine.lastHeartbeat = Date.now();
    machine.status = 'ONLINE';
    machine.currentLoad = currentLoad;
    machine.jobsProcessing = jobsProcessing;

    const health = {
      machineId,
      status: 'HEALTHY',
      lastCheck: Date.now(),
      cpuUsage,
      memoryUsage,
      isHealthy:
        cpuUsage < this.options.maxResourceUtilization &&
        memoryUsage < this.options.maxResourceUtilization,
    };

    if (!health.isHealthy) {
      health.status = 'DEGRADED';
      machine.status = 'DEGRADED';
    }

    this.healthStatus.set(machineId, health);

    this.emit('machine:heartbeat', { machineId, health });

    return health;
  }

  /**
   * Allocate job to machine
   */
  allocateJobToMachine(params) {
    if (!params || !params.jobId || !params.jobRequirements) {
      throw new Error('Job allocation requires jobId and jobRequirements');
    }

    const { jobId, jobRequirements, priority = 'NORMAL', fleetId = null } = params;

    // Find suitable machine
    let selectedMachine = null;
    let minLoad = Infinity;

    for (const [machineId, machine] of this.machines.entries()) {
      // Skip if offline or degraded
      if (machine.status === 'OFFLINE') continue;

      // Filter by fleet if specified
      if (fleetId && machine.fleetId !== fleetId) continue;

      // Check capacity
      if (machine.currentLoad + jobRequirements.requiredCapacity > machine.capacity) continue;

      // Select machine with lowest load (load balancing)
      if (machine.currentLoad < minLoad) {
        minLoad = machine.currentLoad;
        selectedMachine = machine;
      }
    }

    if (!selectedMachine) {
      return { allocated: false, message: 'No suitable machine found', jobId };
    }

    // Update machine state
    selectedMachine.currentLoad += jobRequirements.requiredCapacity;
    selectedMachine.jobsAssigned++;

    const allocation = {
      jobId,
      machineId: selectedMachine.machineId,
      fleetId: selectedMachine.fleetId,
      allocatedAt: Date.now(),
      estimatedDuration: jobRequirements.estimatedDuration || null,
      priority,
    };

    if (!this.loadBalancer.has(selectedMachine.machineId)) {
      this.loadBalancer.set(selectedMachine.machineId, []);
    }
    this.loadBalancer.get(selectedMachine.machineId).push(allocation);

    this.emit('job:allocated', allocation);

    return { allocated: true, ...allocation };
  }

  /**
   * Complete job on machine
   */
  completeJobOnMachine(params) {
    if (!params || !params.machineId || !params.jobId) {
      throw new Error('Job completion requires machineId and jobId');
    }

    const { machineId, jobId, result, duration } = params;

    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new Error(`Machine not found: ${machineId}`);
    }

    // Update load
    const allocations = this.loadBalancer.get(machineId) || [];
    const allocationIndex = allocations.findIndex((a) => a.jobId === jobId);

    if (allocationIndex >= 0) {
      const allocation = allocations[allocationIndex];
      machine.currentLoad -= allocation.estimatedDuration || 0;
      machine.jobsCompleted++;
      allocations.splice(allocationIndex, 1);
    }

    this.emit('job:completed', { machineId, jobId, result, duration });

    return { machineId, jobId, status: 'COMPLETED' };
  }

  /**
   * Schedule maintenance
   */
  scheduleMaintenance(params) {
    if (!params || !params.machineId) {
      throw new Error('Maintenance scheduling requires machineId');
    }

    const {
      machineId,
      maintenanceType = 'PREVENTIVE',
      scheduledStart,
      estimatedDuration,
      description = '',
    } = params;

    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new Error(`Machine not found: ${machineId}`);
    }

    const maintenanceId = `maint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const maintenance = {
      maintenanceId,
      machineId,
      maintenanceType,
      scheduledStart,
      estimatedDuration,
      description,
      createdAt: Date.now(),
      status: 'SCHEDULED',
      actualStart: null,
      actualEnd: null,
    };

    this.maintenanceSchedule.set(maintenanceId, maintenance);

    machine.status = 'MAINTENANCE_SCHEDULED';

    this.emit('maintenance:scheduled', maintenance);

    return maintenance;
  }

  /**
   * Get fleet status
   */
  getFleetStatus(params) {
    if (!params || !params.fleetId) {
      throw new Error('Fleet status requires fleetId');
    }

    const { fleetId } = params;

    const fleet = this.fleets.get(fleetId);
    if (!fleet) {
      throw new Error(`Fleet not found: ${fleetId}`);
    }

    const machineStatuses = fleet.machines.map((machineId) => {
      const machine = this.machines.get(machineId);
      const health = this.healthStatus.get(machineId);

      return {
        machineId,
        status: machine.status,
        currentLoad: machine.currentLoad,
        jobsAssigned: machine.jobsAssigned,
        healthStatus: health ? health.status : 'UNKNOWN',
      };
    });

    const onlineMachines = machineStatuses.filter((m) => m.status === 'ONLINE').length;
    const totalCapacity = fleet.machines.reduce(
      (sum, machineId) => sum + this.machines.get(machineId).capacity,
      0
    );
    const usedCapacity = fleet.machines.reduce(
      (sum, machineId) => sum + this.machines.get(machineId).currentLoad,
      0
    );

    return {
      fleetId,
      fleetName: fleet.fleetName,
      machineCount: fleet.machineCount,
      onlineMachines,
      totalCapacity,
      usedCapacity,
      utilizationRate:
        totalCapacity > 0 ? parseFloat(((usedCapacity / totalCapacity) * 100).toFixed(1)) : 0,
      machines: machineStatuses,
      timestamp: Date.now(),
    };
  }

  /**
   * Get machine details
   */
  getMachineDetails(params) {
    if (!params || !params.machineId) {
      throw new Error('Machine details requires machineId');
    }

    const { machineId } = params;

    const machine = this.machines.get(machineId);
    if (!machine) {
      throw new Error(`Machine not found: ${machineId}`);
    }

    const health = this.healthStatus.get(machineId);
    const allocations = this.loadBalancer.get(machineId) || [];

    return {
      ...machine,
      activeJobs: allocations.length,
      health: health || { status: 'UNKNOWN' },
    };
  }

  /**
   * History management
   */
  getFleetHistory(limit = 50) {
    const histories = [];

    for (const [fleetId, fleet] of this.fleets.entries()) {
      histories.push({
        fleetId,
        fleetName: fleet.fleetName,
        machineCount: fleet.machineCount,
        timestamp: fleet.createdAt,
      });
    }

    return histories.slice(-limit);
  }

  /**
   * Statistics
   */
  getStatistics() {
    const fleetCount = this.fleets.size;
    const machineCount = this.machines.size;
    const onlineMachines = Array.from(this.machines.values()).filter(
      (m) => m.status === 'ONLINE'
    ).length;
    const totalCapacity = Array.from(this.machines.values()).reduce(
      (sum, m) => sum + m.capacity,
      0
    );
    const usedCapacity = Array.from(this.machines.values()).reduce(
      (sum, m) => sum + m.currentLoad,
      0
    );
    const totalJobsCompleted = Array.from(this.machines.values()).reduce(
      (sum, m) => sum + m.jobsCompleted,
      0
    );

    return {
      fleetCount,
      machineCount,
      onlineMachines,
      offlineMachines: machineCount - onlineMachines,
      totalCapacity,
      usedCapacity,
      utilizationRate:
        totalCapacity > 0 ? parseFloat(((usedCapacity / totalCapacity) * 100).toFixed(1)) : 0,
      totalJobsCompleted,
      averageLoadPerMachine:
        machineCount > 0 ? parseFloat((usedCapacity / machineCount).toFixed(1)) : 0,
      scheduledMaintenance: this.maintenanceSchedule.size,
    };
  }
}

export default FleetManagement;
