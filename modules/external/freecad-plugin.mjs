/**
 * FreeCAD Plugin Integration
 * Phase 15.3: External Tool Integration
 *
 * Provides integration with FreeCAD for:
 * - CAM workbench connectivity
 * - Tool library synchronization
 * - Job import/export
 * - Real-time simulation updates
 */

export class FreeCADPlugin {
  constructor(options = {}) {
    this.options = {
      hostname: options.hostname || 'localhost',
      port: options.port || 3040,
      enableSync: options.enableSync !== false,
      pollInterval: options.pollInterval || 1000,
      ...options,
    };

    this.isConnected = false;
    this.listeners = {};
    this.syncJob = null;
    this.toolLibrary = [];
    this.jobs = new Map();
  }

  /**
   * Connect to FreeCAD
   */
  connect() {
    if (this.isConnected) {
      throw new Error('Already connected to FreeCAD');
    }

    this.isConnected = true;
    this.emit('connected', { hostname: this.options.hostname, port: this.options.port });

    return {
      connected: true,
      hostname: this.options.hostname,
      port: this.options.port,
    };
  }

  /**
   * Disconnect from FreeCAD
   */
  disconnect() {
    if (!this.isConnected) {
      throw new Error('Not connected to FreeCAD');
    }

    this.isConnected = false;
    this.stopSync();
    this.emit('disconnected', {});

    return { disconnected: true };
  }

  /**
   * Import CAM job from FreeCAD
   */
  importCAMJob(jobName, gcode = null) {
    if (!this.isConnected) {
      throw new Error('Not connected to FreeCAD');
    }

    const jobId = this.generateId();
    const job = {
      id: jobId,
      name: jobName,
      source: 'freecad',
      gcode: gcode || `; FreeCAD Job: ${jobName}\nG0 X0 Y0 Z0`,
      tools: [...this.toolLibrary],
      imported: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);
    this.emit('job:imported', { jobId, jobName });

    return job;
  }

  /**
   * Export simulation result to FreeCAD
   */
  exportSimulation(simId, toolpathData) {
    if (!this.isConnected) {
      throw new Error('Not connected to FreeCAD');
    }

    if (!simId || !toolpathData) {
      throw new Error('Missing simId or toolpathData');
    }

    const data = {
      simId,
      toolpath: toolpathData,
      timestamp: Date.now(),
      format: 'freecad-cam',
    };

    this.emit('simulation:exported', { simId });

    return { exported: true, simId, format: data.format };
  }

  /**
   * Sync tool library with FreeCAD
   */
  syncToolLibrary(localTools) {
    if (!this.isConnected) {
      throw new Error('Not connected to FreeCAD');
    }

    if (!Array.isArray(localTools)) {
      throw new Error('localTools must be an array');
    }

    this.toolLibrary = [...localTools];
    this.emit('tools:synced', { count: localTools.length });

    return {
      synced: true,
      count: localTools.length,
      tools: this.toolLibrary,
    };
  }

  /**
   * Get tool from synchronized library
   */
  getTool(toolId) {
    return this.toolLibrary.find((t) => t.id === toolId);
  }

  /**
   * Start automatic synchronization
   */
  startSync(interval = null) {
    if (this.syncJob) {
      throw new Error('Sync already running');
    }

    const pollInterval = interval || this.options.pollInterval;

    // Simulate polling
    this.syncJob = {
      running: true,
      interval: pollInterval,
      lastSync: Date.now(),
    };

    this.emit('sync:started', { interval: pollInterval });

    return { syncing: true, interval: pollInterval };
  }

  /**
   * Stop automatic synchronization
   */
  stopSync() {
    if (!this.syncJob) {
      return { syncing: false };
    }

    this.emit('sync:stopped', {});
    this.syncJob = null;

    return { syncing: false };
  }

  /**
   * Check if currently syncing
   */
  isSyncing() {
    return this.syncJob !== null && this.syncJob.running === true;
  }

  /**
   * List available jobs from FreeCAD
   */
  listJobs() {
    const jobsList = Array.from(this.jobs.values()).map((job) => ({
      id: job.id,
      name: job.name,
      imported: job.imported,
    }));

    return { jobs: jobsList, count: jobsList.length };
  }

  /**
   * Get job details
   */
  getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return job;
  }

  /**
   * Delete job
   */
  deleteJob(jobId) {
    if (!this.jobs.has(jobId)) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const job = this.jobs.get(jobId);
    this.jobs.delete(jobId);
    this.emit('job:deleted', { jobId });

    return { deleted: true, jobId, name: job.name };
  }

  /**
   * Get plugin status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      syncing: this.isSyncing(),
      hostname: this.options.hostname,
      port: this.options.port,
      jobsCount: this.jobs.size,
      toolsCount: this.toolLibrary.length,
    };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `fc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }
}
