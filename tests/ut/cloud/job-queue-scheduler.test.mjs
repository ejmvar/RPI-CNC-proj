/**
 * Unit Tests: Job Queue & Scheduler
 * Phase 17: Cloud Integration & Collaboration
 */

import JobQueueScheduler from '../../../modules/cloud/job-queue-scheduler.mjs';

describe('JobQueueScheduler', () => {
  let scheduler;

  beforeEach(() => {
    scheduler = new JobQueueScheduler({
      maxQueueSize: 10000,
      maxConcurrentJobs: 10,
      retryAttempts: 3,
    });
  });

  describe('submitJob', () => {
    test('should submit job to queue', () => {
      const job = scheduler.submitJob({
        jobName: 'Render CNC Path',
        jobType: 'RENDER',
        projectId: 'proj_123',
        priority: 'NORMAL',
      });

      expect(job.jobId).toBeDefined();
      expect(job.status).toBe('QUEUED');
      expect(job.createdAt).toBeDefined();
    });

    test('should throw error without jobName', () => {
      expect(() => {
        scheduler.submitJob({
          jobType: 'RENDER',
          projectId: 'proj_123',
        });
      }).toThrow('Job submission requires jobName and jobType');
    });

    test('should respect priority ordering', () => {
      const low = scheduler.submitJob({
        jobName: 'Low Priority',
        jobType: 'RENDER',
        priority: 'LOW',
      });

      const high = scheduler.submitJob({
        jobName: 'High Priority',
        jobType: 'RENDER',
        priority: 'HIGH',
      });

      const critical = scheduler.submitJob({
        jobName: 'Critical Priority',
        jobType: 'RENDER',
        priority: 'CRITICAL',
      });

      const status = scheduler.getQueueStatus();
      expect(status.topQueued[0].jobName).toBe('Critical Priority');
      expect(status.topQueued[1].jobName).toBe('High Priority');
    });

    test('should enforce queue size limit', () => {
      const smallScheduler = new JobQueueScheduler({ maxQueueSize: 2 });

      smallScheduler.submitJob({
        jobName: 'Job 1',
        jobType: 'RENDER',
      });

      smallScheduler.submitJob({
        jobName: 'Job 2',
        jobType: 'RENDER',
      });

      expect(() => {
        smallScheduler.submitJob({
          jobName: 'Job 3',
          jobType: 'RENDER',
        });
      }).toThrow('Job queue at maximum capacity');
    });

    test('should emit job submitted event', (done) => {
      scheduler.on('job:submitted', (job) => {
        expect(job.jobName).toBe('Test Job');
        done();
      });

      scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });
    });
  });

  describe('startNextJob', () => {
    test('should start next job from queue', () => {
      scheduler.submitJob({
        jobName: 'Job 1',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      expect(started.jobId).toBeDefined();
      expect(started.status).toBe('RUNNING');
      expect(started.startedAt).toBeDefined();
    });

    test('should respect max concurrent limit', () => {
      const smallScheduler = new JobQueueScheduler({ maxConcurrentJobs: 1 });

      smallScheduler.submitJob({
        jobName: 'Job 1',
        jobType: 'RENDER',
      });

      smallScheduler.submitJob({
        jobName: 'Job 2',
        jobType: 'RENDER',
      });

      smallScheduler.startNextJob();
      const result = smallScheduler.startNextJob();

      expect(result.message).toContain('Max concurrent');
    });

    test('should emit job started event', (done) => {
      scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      scheduler.on('job:started', (job) => {
        expect(job.status).toBe('RUNNING');
        done();
      });

      scheduler.startNextJob();
    });
  });

  describe('updateJobProgress', () => {
    test('should update job progress', () => {
      const job = scheduler.submitJob({
        jobName: 'Rendering',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      const update = scheduler.updateJobProgress({
        jobId: started.jobId,
        progress: 50,
        details: { currentFrame: 500, totalFrames: 1000 },
      });

      expect(update.progress).toBe(50);
    });

    test('should throw error for invalid progress', () => {
      const job = scheduler.submitJob({
        jobName: 'Test',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      expect(() => {
        scheduler.updateJobProgress({
          jobId: started.jobId,
          progress: 150,
        });
      }).toThrow('Progress must be between 0 and 100');
    });

    test('should emit progress event', (done) => {
      scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      scheduler.on('job:progress', (data) => {
        expect(data.progress).toBe(75);
        done();
      });

      scheduler.updateJobProgress({
        jobId: started.jobId,
        progress: 75,
      });
    });
  });

  describe('completeJob', () => {
    test('should complete job successfully', () => {
      const job = scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      const completed = scheduler.completeJob({
        jobId: started.jobId,
        result: { outputPath: '/tmp/render.png' },
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.duration).toBeDefined();
      expect(completed.result).toBeDefined();
    });

    test('should emit job completed event', (done) => {
      scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      scheduler.on('job:completed', (job) => {
        expect(job.status).toBe('COMPLETED');
        done();
      });

      scheduler.completeJob({
        jobId: started.jobId,
        result: { success: true },
      });
    });
  });

  describe('failJob', () => {
    test('should fail job with retry', () => {
      const job = scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      const failed = scheduler.failJob({
        jobId: started.jobId,
        error: 'Rendering error',
        shouldRetry: true,
      });

      expect(failed.status).toBe('RETRY_QUEUED');
      expect(failed.retryCount).toBe(1);
    });

    test('should max out retries', () => {
      const job = scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      let jobId;

      for (let i = 0; i < 4; i++) {
        const started = scheduler.startNextJob();
        jobId = started.jobId;

        const result = scheduler.failJob({
          jobId,
          error: `Error ${i}`,
          shouldRetry: true,
        });

        if (i < 3) {
          expect(result.status).toBe('RETRY_QUEUED');
        }
      }
    });

    test('should emit job failed event', (done) => {
      scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      scheduler.on('job:failed', (job) => {
        expect(job.error).toBe('Fatal error');
        done();
      });

      scheduler.failJob({
        jobId: started.jobId,
        error: 'Fatal error',
        shouldRetry: false,
      });
    });
  });

  describe('scheduleJob', () => {
    test('should schedule job for future execution', () => {
      const scheduled = scheduler.scheduleJob({
        jobName: 'Daily Backup',
        jobType: 'BACKUP',
        schedule: 86400000, // 1 day in ms
      });

      expect(scheduled.scheduleId).toBeDefined();
      expect(scheduled.isActive).toBe(true);
      expect(scheduled.nextRun).toBeDefined();
    });

    test('should throw error without schedule', () => {
      expect(() => {
        scheduler.scheduleJob({
          jobName: 'Test Job',
          jobType: 'BACKUP',
        });
      }).toThrow('Schedule requires jobName and schedule');
    });

    test('should emit scheduled job event', (done) => {
      scheduler.on('job:scheduled', (job) => {
        expect(job.jobName).toBe('Scheduled Job');
        done();
      });

      scheduler.scheduleJob({
        jobName: 'Scheduled Job',
        jobType: 'BACKUP',
        schedule: 60000,
      });
    });
  });

  describe('getQueueStatus', () => {
    test('should return queue status', () => {
      scheduler.submitJob({
        jobName: 'Job 1',
        jobType: 'RENDER',
      });

      scheduler.submitJob({
        jobName: 'Job 2',
        jobType: 'RENDER',
      });

      const status = scheduler.getQueueStatus();

      expect(status.queuedJobs).toBe(2);
      expect(status.executingJobs).toBe(0);
      expect(status.capacityUsed).toBeDefined();
      expect(status.timestamp).toBeDefined();
    });

    test('should show executing jobs', () => {
      scheduler.submitJob({
        jobName: 'Job 1',
        jobType: 'RENDER',
      });

      scheduler.startNextJob();

      const status = scheduler.getQueueStatus();

      expect(status.executingJobs).toBe(1);
      expect(status.queuedJobs).toBe(0);
    });
  });

  describe('getJobDetails', () => {
    test('should return job details', () => {
      const job = scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      const details = scheduler.getJobDetails({ jobId: job.jobId });

      expect(details.jobId).toBe(job.jobId);
      expect(details.jobName).toBe('Test Job');
      expect(details.location).toBe('QUEUED');
    });

    test('should throw error for non-existent job', () => {
      expect(() => {
        scheduler.getJobDetails({ jobId: 'unknown_job' });
      }).toThrow('Job not found');
    });
  });

  describe('history and statistics', () => {
    test('should maintain job history', () => {
      const job = scheduler.submitJob({
        jobName: 'Test Job',
        jobType: 'RENDER',
      });

      const started = scheduler.startNextJob();

      scheduler.completeJob({
        jobId: started.jobId,
        result: { success: true },
      });

      const history = scheduler.getHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    test('should return accurate statistics', () => {
      scheduler.submitJob({
        jobName: 'Job 1',
        jobType: 'RENDER',
      });

      scheduler.submitJob({
        jobName: 'Job 2',
        jobType: 'RENDER',
      });

      const stats = scheduler.getStatistics();

      expect(stats.totalJobs).toBeGreaterThan(0);
      expect(stats.successRate).toBeDefined();
      expect(stats.averageDurationMs).toBeDefined();
    });
  });

  describe('event system', () => {
    test('should support multiple listeners', () => {
      let count = 0;

      scheduler.on('job:submitted', () => count++);
      scheduler.on('job:submitted', () => count++);

      scheduler.submitJob({
        jobName: 'Test',
        jobType: 'RENDER',
      });

      expect(count).toBe(2);
    });
  });
});
