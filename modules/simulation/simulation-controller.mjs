/**
 * Simulation Controller Module
 * Phase 14.3: Simulation Enhancements
 *
 * Advanced simulation features:
 * - Variable-speed replay control
 * - Bookmark system for interesting positions
 * - Time-based simulation (not just command-based)
 * - Feed rate and spindle speed tracking
 * - Simulation statistics and metrics
 */

/* global requestAnimationFrame, cancelAnimationFrame */

/**
 * Bookmark - Represents a saved position in simulation
 */
export class Bookmark {
  constructor(name, commandIndex, position, feedRate, spindleSpeed) {
    this.name = name;
    this.commandIndex = commandIndex;
    this.position = { ...position };
    this.feedRate = feedRate;
    this.spindleSpeed = spindleSpeed;
    this.timestamp = Date.now();
  }

  /**
   * Get bookmark description
   */
  getDescription() {
    return `${this.name} @ cmd ${this.commandIndex} (${this.position.x.toFixed(
      2
    )}, ${this.position.y.toFixed(2)}, ${this.position.z.toFixed(2)})`;
  }
}

/**
 * Simulation Statistics - Tracks metrics during simulation
 */
export class SimulationStatistics {
  constructor() {
    this.totalDistance = 0;
    this.cuttingDistance = 0;
    this.rapidDistance = 0;
    this.totalTime = 0; // seconds
    this.cuttingTime = 0; // seconds
    this.rapidTime = 0; // seconds
    this.commandCount = 0;
    this.toolChanges = 0;
    this.spindleStartStops = 0;
    this.averageFeedRate = 0;
    this.minFeedRate = Infinity;
    this.maxFeedRate = 0;
    this.averageSpindleSpeed = 0;
    this.minSpindleSpeed = Infinity;
    this.maxSpindleSpeed = 0;
  }

  /**
   * Add distance to statistics
   */
  addDistance(distance, isCutting = false) {
    this.totalDistance += distance;
    if (isCutting) {
      this.cuttingDistance += distance;
    } else {
      this.rapidDistance += distance;
    }
  }

  /**
   * Add time to statistics
   */
  addTime(time, isCutting = false) {
    this.totalTime += time;
    if (isCutting) {
      this.cuttingTime += time;
    } else {
      this.rapidTime += time;
    }
  }

  /**
   * Record feed rate
   */
  recordFeedRate(feedRate) {
    if (feedRate > 0) {
      this.minFeedRate = Math.min(this.minFeedRate, feedRate);
      this.maxFeedRate = Math.max(this.maxFeedRate, feedRate);
    }
  }

  /**
   * Record spindle speed
   */
  recordSpindleSpeed(speed) {
    if (speed > 0) {
      this.minSpindleSpeed = Math.min(this.minSpindleSpeed, speed);
      this.maxSpindleSpeed = Math.max(this.maxSpindleSpeed, speed);
    }
  }

  /**
   * Finalize statistics
   */
  finalize(totalFeedRateSum = 0, feedRateCount = 0, totalSpeedSum = 0, speedCount = 0) {
    if (feedRateCount > 0) {
      this.averageFeedRate = totalFeedRateSum / feedRateCount;
    }
    if (speedCount > 0) {
      this.averageSpindleSpeed = totalSpeedSum / speedCount;
    }
    if (this.minFeedRate === Infinity) this.minFeedRate = 0;
    if (this.minSpindleSpeed === Infinity) this.minSpindleSpeed = 0;
  }

  /**
   * Get formatted summary
   */
  getSummary() {
    return {
      totalDistance: this.totalDistance.toFixed(2),
      cuttingDistance: this.cuttingDistance.toFixed(2),
      rapidDistance: this.rapidDistance.toFixed(2),
      totalTime: this.formatTime(this.totalTime),
      cuttingTime: this.formatTime(this.cuttingTime),
      rapidTime: this.formatTime(this.rapidTime),
      commandCount: this.commandCount,
      toolChanges: this.toolChanges,
      spindleStartStops: this.spindleStartStops,
      averageFeedRate: this.averageFeedRate.toFixed(2),
      feedRateRange: `${this.minFeedRate.toFixed(1)} - ${this.maxFeedRate.toFixed(1)}`,
      averageSpindleSpeed: this.averageSpindleSpeed.toFixed(0),
      spindleSpeedRange: `${this.minSpindleSpeed.toFixed(0)} - ${this.maxSpindleSpeed.toFixed(0)}`,
    };
  }

  /**
   * Format time in seconds to HH:MM:SS
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
}

/**
 * Simulation State - Current state of simulation
 */
export class SimulationState {
  constructor() {
    this.currentCommandIndex = 0;
    this.position = { x: 0, y: 0, z: 0 };
    this.feedRate = 0;
    this.spindleSpeed = 0;
    this.spindleRunning = false;
    this.isRunning = false;
    this.isPaused = false;
    this.elapsedTime = 0; // seconds
    this.playbackSpeed = 1.0; // 1.0 = normal speed
    this.currentCommand = null;
  }

  /**
   * Clone current state
   */
  clone() {
    const clone = new SimulationState();
    clone.currentCommandIndex = this.currentCommandIndex;
    clone.position = { ...this.position };
    clone.feedRate = this.feedRate;
    clone.spindleSpeed = this.spindleSpeed;
    clone.spindleRunning = this.spindleRunning;
    clone.isRunning = this.isRunning;
    clone.isPaused = this.isPaused;
    clone.elapsedTime = this.elapsedTime;
    clone.playbackSpeed = this.playbackSpeed;
    clone.currentCommand = this.currentCommand ? { ...this.currentCommand } : null;
    return clone;
  }
}

/**
 * Simulation Controller - Manages simulation execution
 */
export class SimulationController {
  constructor(options = {}) {
    this.state = new SimulationState();
    this.statistics = new SimulationStatistics();
    this.bookmarks = new Map(); // name -> Bookmark
    this.stateSnapshots = new Map(); // commandIndex -> SimulationState
    this.listeners = {};
    this.commands = []; // Array of G-Code commands
    this.minPlaybackSpeed = options.minPlaybackSpeed || 0.1; // 10% speed
    this.maxPlaybackSpeed = options.maxPlaybackSpeed || 10.0; // 10x speed
    this.autoSaveSnapshots = options.autoSaveSnapshots !== false; // Default true
  }

  /**
   * Initialize simulation with commands
   */
  initialize(commands) {
    if (!Array.isArray(commands)) {
      throw new Error('Commands must be an array');
    }
    this.commands = commands;
    this.state = new SimulationState();
    this.statistics = new SimulationStatistics();
    this.stateSnapshots.clear();
    this.bookmarks.clear();
    this.emit('simulationInitialized', { commandCount: commands.length });
    return this;
  }

  /**
   * Set playback speed
   */
  setPlaybackSpeed(speed) {
    const clamped = Math.max(this.minPlaybackSpeed, Math.min(this.maxPlaybackSpeed, speed));
    this.state.playbackSpeed = clamped;
    this.emit('playbackSpeedChanged', { speed: clamped });
    return clamped;
  }

  /**
   * Get current playback speed
   */
  getPlaybackSpeed() {
    return this.state.playbackSpeed;
  }

  /**
   * Add bookmark at current position
   */
  addBookmark(name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Bookmark name must be a non-empty string');
    }
    const bookmark = new Bookmark(
      name,
      this.state.currentCommandIndex,
      this.state.position,
      this.state.feedRate,
      this.state.spindleSpeed
    );
    this.bookmarks.set(name, bookmark);
    this.emit('bookmarkAdded', { bookmark });
    return bookmark;
  }

  /**
   * Get bookmark by name
   */
  getBookmark(name) {
    return this.bookmarks.get(name) || null;
  }

  /**
   * List all bookmarks
   */
  listBookmarks() {
    return Array.from(this.bookmarks.values());
  }

  /**
   * Remove bookmark by name
   */
  removeBookmark(name) {
    const existed = this.bookmarks.has(name);
    this.bookmarks.delete(name);
    if (existed) {
      this.emit('bookmarkRemoved', { name });
    }
    return existed;
  }

  /**
   * Jump to bookmark
   */
  jumpToBookmark(name) {
    const bookmark = this.bookmarks.get(name);
    if (!bookmark) {
      throw new Error(`Bookmark '${name}' not found`);
    }
    this.jumpToCommand(bookmark.commandIndex);
    return bookmark;
  }

  /**
   * Save state snapshot at current command
   */
  saveSnapshot() {
    const snapshot = this.state.clone();
    this.stateSnapshots.set(this.state.currentCommandIndex, snapshot);
    this.emit('snapshotSaved', { commandIndex: this.state.currentCommandIndex });
    return snapshot;
  }

  /**
   * Get state snapshot at command index
   */
  getSnapshot(commandIndex) {
    return this.stateSnapshots.get(commandIndex) || null;
  }

  /**
   * Jump to command by index
   */
  jumpToCommand(commandIndex) {
    if (commandIndex < 0 || commandIndex > this.commands.length) {
      throw new Error(`Invalid command index: ${commandIndex}`);
    }
    this.state.currentCommandIndex = commandIndex;
    this.state.elapsedTime = 0;
    this.emit('commandJump', { commandIndex });
    return this.state;
  }

  /**
   * Update position during simulation
   */
  updatePosition(x, y, z) {
    const oldPos = { ...this.state.position };
    this.state.position = { x, y, z };
    this.emit('positionUpdated', { oldPosition: oldPos, newPosition: this.state.position });
  }

  /**
   * Update feed rate
   */
  updateFeedRate(feedRate) {
    this.state.feedRate = feedRate;
    this.statistics.recordFeedRate(feedRate);
    this.emit('feedRateUpdated', { feedRate });
  }

  /**
   * Update spindle speed and state
   */
  updateSpindleSpeed(speed, running) {
    const wasRunning = this.state.spindleRunning;
    this.state.spindleSpeed = speed;
    this.state.spindleRunning = running;

    this.statistics.recordSpindleSpeed(speed);

    if (wasRunning !== running) {
      this.statistics.spindleStartStops++;
    }

    this.emit('spindleUpdated', { speed, running });
  }

  /**
   * Advance simulation by distance/time
   */
  advanceSimulation(distance, isCutting = false, feedRate = this.state.feedRate) {
    if (feedRate <= 0) return 0;

    const time = (distance / feedRate) * 60; // Convert to seconds (feedRate is in units/min)
    this.state.elapsedTime += time;
    this.statistics.addDistance(distance, isCutting);
    this.statistics.addTime(time, isCutting);

    this.emit('simulationAdvanced', {
      distance,
      time,
      elapsedTime: this.state.elapsedTime,
      isCutting,
    });

    return time;
  }

  /**
   * Progress simulation to next command
   */
  nextCommand() {
    if (this.state.currentCommandIndex < this.commands.length) {
      this.state.currentCommandIndex++;
      this.statistics.commandCount++;

      if (this.autoSaveSnapshots) {
        this.saveSnapshot();
      }

      this.emit('commandExecuted', {
        commandIndex: this.state.currentCommandIndex,
        state: this.state.clone(),
      });

      return this.state;
    }
    return null;
  }

  /**
   * Go to previous command
   */
  previousCommand() {
    if (this.state.currentCommandIndex > 0) {
      this.state.currentCommandIndex--;
      this.emit('commandRewound', { commandIndex: this.state.currentCommandIndex });
      return this.state;
    }
    return null;
  }

  /**
   * Start simulation
   */
  start() {
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.emit('simulationStarted', { state: this.state });
  }

  /**
   * Pause simulation
   */
  pause() {
    this.state.isPaused = true;
    this.emit('simulationPaused', { state: this.state });
  }

  /**
   * Resume simulation
   */
  resume() {
    if (this.state.isPaused) {
      this.state.isPaused = false;
      this.emit('simulationResumed', { state: this.state });
    }
  }

  /**
   * Stop simulation
   */
  stop() {
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.emit('simulationStopped', { finalState: this.state });
  }

  /**
   * Reset simulation
   */
  reset() {
    this.state = new SimulationState();
    this.statistics = new SimulationStatistics();
    this.emit('simulationReset', {});
  }

  /**
   * Get current state
   */
  getState() {
    return this.state.clone();
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return this.statistics.getSummary();
  }

  /**
   * Get progress percentage
   */
  getProgress() {
    if (this.commands.length === 0) return 0;
    return (this.state.currentCommandIndex / this.commands.length) * 100;
  }

  /**
   * Get current command
   */
  getCurrentCommand() {
    return this.commands[this.state.currentCommandIndex] || null;
  }

  /**
   * Get command at index
   */
  getCommand(index) {
    return this.commands[index] || null;
  }

  /**
   * Get all commands
   */
  getCommands() {
    return [...this.commands];
  }

  /**
   * Event listener management
   */
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
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

/**
 * Time-based Simulation Runner
 */
export class TimeBasedSimulationRunner {
  constructor(controller, commandExecutor) {
    this.controller = controller;
    this.commandExecutor = commandExecutor; // Function that executes a command and returns metrics
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.frameTime = 0;
  }

  /**
   * Execute next time step
   */
  executeTimeStep(deltaTime) {
    if (!this.controller.state.isRunning || this.controller.state.isPaused) {
      return;
    }

    const elapsedThisFrame = (deltaTime / 1000) * this.controller.state.playbackSpeed; // Convert ms to seconds
    let remainingTime = elapsedThisFrame;

    while (
      remainingTime > 0 &&
      this.controller.state.currentCommandIndex < this.controller.commands.length
    ) {
      const command = this.controller.getCurrentCommand();
      if (!command) break;

      const metrics = this.commandExecutor(command, remainingTime);
      if (!metrics) break;

      const { timeRequired, distance, isCutting, feedRate } = metrics;

      if (timeRequired <= remainingTime) {
        this.controller.advanceSimulation(distance, isCutting, feedRate);
        this.controller.nextCommand();
        remainingTime -= timeRequired;
      } else {
        // Partial execution - update for next frame
        const partialDistance = distance * (remainingTime / timeRequired);
        this.controller.advanceSimulation(partialDistance, isCutting, feedRate);
        remainingTime = 0;
      }
    }

    if (this.controller.state.currentCommandIndex >= this.controller.commands.length) {
      this.controller.stop();
    }
  }

  /**
   * Start time-based simulation loop
   */
  start() {
    this.controller.start();
    this.lastFrameTime = performance.now();

    const loop = (currentTime) => {
      const deltaTime = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;

      this.executeTimeStep(deltaTime);

      if (this.controller.state.isRunning && !this.controller.state.isPaused) {
        this.animationFrameId = requestAnimationFrame(loop);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Pause time-based simulation
   */
  pause() {
    this.controller.pause();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * Resume time-based simulation
   */
  resume() {
    if (!this.controller.state.isRunning) {
      this.start();
    } else {
      this.controller.resume();
      this.lastFrameTime = performance.now();
      this.animationFrameId = requestAnimationFrame((currentTime) => {
        const loop = (frameTime) => {
          const deltaTime = frameTime - this.lastFrameTime;
          this.lastFrameTime = frameTime;
          this.executeTimeStep(deltaTime);

          if (this.controller.state.isRunning && !this.controller.state.isPaused) {
            this.animationFrameId = requestAnimationFrame(loop);
          }
        };
        loop(currentTime);
      });
    }
  }

  /**
   * Stop time-based simulation
   */
  stop() {
    this.controller.stop();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
