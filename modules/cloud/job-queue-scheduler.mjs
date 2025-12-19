/**
 * Job Queue & Scheduler
 * Phase 17: Cloud Integration & Collaboration
 *
 * Manages job queuing, scheduling, and execution:
 * - Job submission and queuing
 * - Priority-based execution
 * - Scheduled execution (cron-like)
 * - Status tracking and notifications
 */

export class JobQueueScheduler {
  constructor(options = {}) {
    this.options = {
      maxQueueSize: options.maxQueueSize || 10000,
      maxConcurrentJobs: options.maxConcurrentJobs || 10,
      defaultJobTimeout: options.defaultJobTimeout || 3600000, // 1 hour
      retryAttempts: options.retryAttempts || 3,
      ...options,
    };

    this.queue = [];
    this.executingJobs = new Map();
    this.completedJobs = [];
    this.failedJobs = [];
    this.scheduledJobs = new Map();
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
   * Submit job to queue
   */
  submitJob(params) {
    if (!params || !params.jobName || !params.jobType) {
      throw new Error('Job submission requires jobName and jobType');
    }

    const {
      jobName,
      jobType,
      projectId,
      priority = 'NORMAL',
      timeout = this.options.defaultJobTimeout,
      payload = {},
      userId,
    } = params;

    // Check queue size
    if (this.queue.length >= this.options.maxQueueSize) {
      throw new Error('Job queue at maximum capacity');
    }

    // Validate priority
    const priorityLevels = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    if (priorityLevels[priority] === undefined) {
      throw new Error(`Invalid priority: ${priority}`);
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job = {
      jobId,
      jobName,
      jobType,
      projectId,
      priority,
      priorityValue: priorityLevels[priority],
      timeout,
      payload,
      userId,
      status: 'QUEUED',
      createdAt: Date.now(),
      queuedAt: Date.now(),
      startedAt: null,
      completedAt: null,
      retryCount: 0,
      maxRetries: this.options.retryAttempts,
      progress: 0,
    };

    // Insert in priority queue order
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (job.priorityValue < this.queue[i].priorityValue) {
        this.queue.splice(i, 0, job);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.queue.push(job);
    }

    this.emit('job:submitted', job);

    return job;
  }

  /**
   * Start next job in queue
   */
  startNextJob() {
    if (this.executingJobs.size >= this.options.maxConcurrentJobs) {
      return { message: 'Max concurrent jobs reached' };
    }

    if (this.queue.length === 0) {
      return { message: 'Queue is empty' };
    }

    const job = this.queue.shift();
    job.status = 'RUNNING';
    job.startedAt = Date.now();

    this.executingJobs.set(job.jobId, job);

    this.emit('job:started', job);

    return job;
  }

  /**
   * Update job progress
   */
  updateJobProgress(params) {
    if (!params || !params.jobId || params.progress === undefined) {
      throw new Error('Progress update requires jobId and progress percentage');
    }

    const { jobId, progress, details = {} } = params;

    const job = this.executingJobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    job.progress = progress;
    job.lastUpdate = Date.now();
    job.details = details;

    this.emit('job:progress', { jobId, progress, details });

    return { jobId, progress, status: job.status };
  }

  /**
   * Complete job
   */
  completeJob(params) {
    if (!params || !params.jobId) {
      throw new Error('Job completion requires jobId');
    }

    const { jobId, result = {}, status = 'COMPLETED' } = params;

    const job = this.executingJobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.status = status;
    job.completedAt = Date.now();
    job.duration = job.completedAt - job.startedAt;
    job.result = result;
    job.progress = 100;

    this.executingJobs.delete(jobId);
    this.completedJobs.push(job);

    this.emit('job:completed', job);

    return job;
  }

  /**
   * Fail job with retry logic
   */
  failJob(params) {
    if (!params || !params.jobId) {
      throw new Error('Job failure requires jobId');
    }

    const { jobId, error, shouldRetry = true } = params;

    const job = this.executingJobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    job.error = error;
    job.status = 'FAILED';
    job.failedAt = Date.now();
    job.duration = job.failedAt - job.startedAt;

    if (shouldRetry && job.retryCount < job.maxRetries) {
      job.retryCount++;
      job.status = 'RETRY_QUEUED';
      job.lastError = error;

      // Re-queue job
      this.queue.unshift(job);
      this.executingJobs.delete(jobId);

      this.emit('job:retried', { jobId, retryCount: job.retryCount });

      return { jobId, status: 'RETRY_QUEUED', retryCount: job.retryCount };
    }

    this.executingJobs.delete(jobId);
    this.failedJobs.push(job);

    this.emit('job:failed', job);

    return { jobId, status: 'FAILED', error, retryCount: job.retryCount };
  }

  /**
   * Schedule job for future execution
   */
  scheduleJob(params) {
    if (!params || !params.jobName || !params.schedule) {
      throw new Error('Schedule requires jobName and schedule (cron expression or timestamp)');
    }

    const { jobName, jobType = 'SCHEDULED', schedule, payload = {} } = params;

    const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const scheduledJob = {
      scheduleId,
      jobName,
      jobType,
      schedule,
      payload,
      isActive: true,
      createdAt: Date.now(),
      lastRun: null,
      nextRun: this._calculateNextRun(schedule),
      runCount: 0,
    };

    this.scheduledJobs.set(scheduleId, scheduledJob);

    this.emit('job:scheduled', scheduledJob);

    return scheduledJob;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queuedJobs: this.queue.length,
      executingJobs: this.executingJobs.size,
      maxConcurrentJobs: this.options.maxConcurrentJobs,
      capacityUsed: parseFloat(
        ((this.executingJobs.size / this.options.maxConcurrentJobs) * 100).toFixed(1)
      ),
      completedJobs: this.completedJobs.length,
      failedJobs: this.failedJobs.length,
      scheduledJobs: this.scheduledJobs.size,
      topQueued: this.queue.slice(0, 5).map((j) => ({
        jobId: j.jobId,
        jobName: j.jobName,
        priority: j.priority,
        createdAt: j.createdAt,
      })),
      timestamp: Date.now(),
    };
  }

  /**
   * Get job details
   */
  getJobDetails(params) {
    if (!params || !params.jobId) {
      throw new Error('Job details requires jobId');
    }

    const { jobId } = params;

    const executing = this.executingJobs.get(jobId);
    if (executing) {
      return { ...executing, location: 'EXECUTING' };
    }

    const completed = this.completedJobs.find((j) => j.jobId === jobId);
    if (completed) {
      return { ...completed, location: 'COMPLETED' };
    }

    const failed = this.failedJobs.find((j) => j.jobId === jobId);
    if (failed) {
      return { ...failed, location: 'FAILED' };
    }

    const queued = this.queue.find((j) => j.jobId === jobId);
    if (queued) {
      return { ...queued, location: 'QUEUED' };
    }

    throw new Error(`Job not found: ${jobId}`);
  }

  /**
   * Helper: Calculate next run time from schedule
   */
  _calculateNextRun(schedule) {
    // Simple implementation: if it's a number, treat as delay in ms
    if (typeof schedule === 'number') {
      return Date.now() + schedule;
    }

    // If it's a cron-like string, simulate next execution
    return Date.now() + 60000; // Default 1 minute
  }

  /**
   * History management
   */
  getHistory(limit = 50) {
    const allJobs = [...this.completedJobs, ...this.failedJobs];
    return allJobs.slice(-limit);
  }

  clearHistory() {
    this.completedJobs = [];
    this.failedJobs = [];
  }

  /**
   * Statistics
   */
  getStatistics() {
    const allCompleted = this.completedJobs;
    const durations = allCompleted.map((j) => j.duration || 0);
    const totalJobs =
      this.queue.length + this.executingJobs.size + allCompleted.length + this.failedJobs.length;

    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const successRate =
      allCompleted.length + this.failedJobs.length > 0
        ? (allCompleted.length / (allCompleted.length + this.failedJobs.length)) * 100
        : 0;

    return {
      totalJobs,
      queuedJobs: this.queue.length,
      executingJobs: this.executingJobs.size,
      completedJobs: allCompleted.length,
      failedJobs: this.failedJobs.length,
      successRate: parseFloat(successRate.toFixed(1)),
      averageDurationMs: parseFloat(avgDuration.toFixed(0)),
      maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
      minDurationMs: durations.length > 0 ? Math.min(...durations) : 0,
      scheduledJobs: this.scheduledJobs.size,
    };
  }
}

export default JobQueueScheduler;
