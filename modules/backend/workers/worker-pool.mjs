/**
 * WebWorker Pool Manager
 * Phase 13.2: Performance Improvements - WebWorker Implementation
 *
 * Manages a pool of reusable Web Workers for background processing
 * Supports: G-Code parsing, mesh compensation, collision detection
 */

// eslint-disable-next-line no-undef
const WorkerClass = typeof Worker !== 'undefined' ? Worker : null;

export class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers = new Set();
    this.taskIdCounter = 0;

    // Initialize worker pool
    for (let i = 0; i < poolSize; i++) {
      this.workers.push(null); // Lazy-loaded
    }
  }

  /**
   * Get or create a worker
   * @private
   * @returns {Worker} Worker instance
   */
  getWorker(index) {
    if (!this.workers[index]) {
      if (!WorkerClass) {
        throw new Error('Worker is not available in this environment');
      }
      this.workers[index] = new WorkerClass(this.workerScript);
    }
    return this.workers[index];
  }

  /**
   * Execute task on available worker
   * @param {Object} task - Task data to process
   * @param {number} timeout - Operation timeout in ms
   * @returns {Promise} Resolves with result or rejects on error/timeout
   */
  execute(task, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const taskId = ++this.taskIdCounter;
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Worker task ${taskId} timeout after ${timeout}ms`));
      }, timeout);

      const findAvailableWorker = () => {
        for (let i = 0; i < this.poolSize; i++) {
          if (!this.activeWorkers.has(i)) {
            return i;
          }
        }
        return -1;
      };

      const workerIndex = findAvailableWorker();

      if (workerIndex === -1) {
        // Queue task if no workers available
        this.taskQueue.push({
          task,
          timeout,
          resolve,
          reject,
          timeoutHandle,
        });
      } else {
        this.executeOnWorker(workerIndex, task, resolve, reject, timeoutHandle);
      }
    });
  }

  /**
   * Execute task on specific worker
   * @private
   */
  executeOnWorker(workerIndex, task, resolve, reject, timeoutHandle) {
    const worker = this.getWorker(workerIndex);
    this.activeWorkers.add(workerIndex);

    const handleMessage = (event) => {
      clearTimeout(timeoutHandle);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.activeWorkers.delete(workerIndex);

      const { success, result, error } = event.data;
      if (success) {
        resolve(result);
      } else {
        reject(new Error(error));
      }

      // Process queued tasks
      if (this.taskQueue.length > 0) {
        const queued = this.taskQueue.shift();
        this.executeOnWorker(
          workerIndex,
          queued.task,
          queued.resolve,
          queued.reject,
          queued.timeoutHandle
        );
      }
    };

    const handleError = (error) => {
      clearTimeout(timeoutHandle);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.activeWorkers.delete(workerIndex);

      reject(new Error(`Worker error: ${error.message}`));

      if (this.taskQueue.length > 0) {
        const queued = this.taskQueue.shift();
        this.executeOnWorker(
          workerIndex,
          queued.task,
          queued.resolve,
          queued.reject,
          queued.timeoutHandle
        );
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage(task);
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach((worker) => {
      if (worker) {
        worker.terminate();
      }
    });
    this.workers = [];
    this.activeWorkers.clear();
    this.taskQueue = [];
  }

  /**
   * Get pool statistics
   * @returns {Object} Pool stats
   */
  getStats() {
    return {
      poolSize: this.poolSize,
      activeWorkers: this.activeWorkers.size,
      idleWorkers: this.poolSize - this.activeWorkers.size,
      queuedTasks: this.taskQueue.length,
      totalTasksProcessed: this.taskIdCounter,
    };
  }
}

/**
 * Worker Task Coordinator
 * Orchestrates multiple worker pools for different task types
 */
export class WorkerCoordinator {
  constructor() {
    this.pools = new Map();
    this.initialized = false;
  }

  /**
   * Initialize worker pools
   * @param {Object} config - Pool configuration
   */
  initializePools(config = {}) {
    const defaultConfig = {
      gcodeParser: { poolSize: 2 },
      meshCompensation: { poolSize: 2 },
      collisionDetection: { poolSize: 1 },
    };

    // Store config for potential future use
    this.poolConfig = { ...defaultConfig, ...config };
    this.initialized = true;

    return this;
  }

  /**
   * Register worker pool
   * @param {string} name - Pool name/identifier
   * @param {WorkerPool} pool - Worker pool instance
   */
  registerPool(name, pool) {
    this.pools.set(name, pool);
    return this;
  }

  /**
   * Get worker pool
   * @param {string} name - Pool name
   * @returns {WorkerPool} Worker pool
   */
  getPool(name) {
    return this.pools.get(name);
  }

  /**
   * Execute task on appropriate worker pool
   * @param {string} poolName - Target pool name
   * @param {Object} task - Task to execute
   * @param {number} timeout - Task timeout
   * @returns {Promise} Task result
   */
  async executeTask(poolName, task, timeout = 30000) {
    const pool = this.getPool(poolName);
    if (!pool) {
      throw new Error(`Unknown worker pool: ${poolName}`);
    }

    return pool.execute(task, timeout);
  }

  /**
   * Batch execute tasks across workers
   * @param {string} poolName - Target pool
   * @param {Array<Object>} tasks - Array of tasks
   * @returns {Promise<Array>} Array of results
   */
  async batchExecute(poolName, tasks) {
    const pool = this.getPool(poolName);
    if (!pool) {
      throw new Error(`Unknown worker pool: ${poolName}`);
    }

    const promises = tasks.map((task) => pool.execute(task));
    return Promise.all(promises);
  }

  /**
   * Get coordinator statistics
   * @returns {Object} Statistics for all pools
   */
  getStats() {
    const stats = {};
    this.pools.forEach((pool, name) => {
      stats[name] = pool.getStats();
    });
    return stats;
  }

  /**
   * Shutdown all worker pools
   */
  shutdown() {
    this.pools.forEach((pool) => {
      pool.terminate();
    });
    this.pools.clear();
    this.initialized = false;
  }
}

export default {
  WorkerPool,
  WorkerCoordinator,
};
