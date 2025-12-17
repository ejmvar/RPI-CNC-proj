/**
 * Advanced Toolpath Optimizer
 * Phase 16: Advanced Simulation & Analysis
 *
 * Optimizes toolpaths for:
 * - Reduced cutting time
 * - Better surface finish
 * - Lower tool wear
 * - Optimal tool utilization
 * - Collision avoidance
 */

export class AdvancedToolpathOptimizer {
  constructor(options = {}) {
    this.options = {
      enabled: options.enabled !== false,
      optimizeForTime: options.optimizeForTime !== false,
      optimizeForFinish: options.optimizeForFinish !== false,
      optimizeForWear: options.optimizeForWear !== false,
      enableCollisionAvoidance: options.enableCollisionAvoidance !== false,
      ...options,
    };

    this.optimizationStrategies = {
      time: {
        name: 'Time Optimization',
        weight: options.timeWeight || 0.4,
      },
      finish: {
        name: 'Surface Finish',
        weight: options.finishWeight || 0.35,
      },
      wear: {
        name: 'Tool Wear',
        weight: options.wearWeight || 0.15,
      },
      safety: {
        name: 'Safety',
        weight: options.safetyWeight || 0.1,
      },
    };

    this.optimizationHistory = [];
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
   * Optimize a complete toolpath
   */
  optimizeToolpath(toolpath) {
    if (!toolpath || !Array.isArray(toolpath.commands)) {
      throw new Error('Toolpath requires commands array');
    }

    // Apply various optimization strategies
    let optimizedPath = toolpath.commands;

    if (this.options.optimizeForTime) {
      optimizedPath = this.optimizeForMinimumTime(optimizedPath);
    }

    if (this.options.optimizeForFinish) {
      optimizedPath = this.optimizeForSurfaceFinish(optimizedPath);
    }

    if (this.options.optimizeForWear) {
      optimizedPath = this.optimizeForToolWear(optimizedPath);
    }

    if (this.options.enableCollisionAvoidance) {
      optimizedPath = this.avoidCollisions(optimizedPath);
    }

    // Consolidate tool changes
    optimizedPath = this.consolidateToolChanges(optimizedPath);

    const metrics = this.calculateMetrics(toolpath.commands, optimizedPath);
    const result = {
      originalPath: toolpath,
      optimizedPath,
      metrics,
      improvements: this.calculateImprovements(toolpath.commands, optimizedPath),
      timestamp: Date.now(),
    };

    this.optimizationHistory.push(result);
    this.emit('toolpath:optimized', result);

    return result;
  }

  /**
   * Optimize for minimum machining time
   */
  optimizeForMinimumTime(commands) {
    const optimized = [...commands];

    // Strategy 1: Reduce rapid movements by reordering compatible operations
    optimized.sort((a, b) => {
      // Prioritize cutting operations over rapids
      if (a.type === 'cut' && b.type === 'rapid') return -1;
      if (a.type === 'rapid' && b.type === 'cut') return 1;

      // Within same type, minimize distance
      if (a.type === b.type && a.position && b.position) {
        const distA = this.calculateDistance(a.position);
        const distB = this.calculateDistance(b.position);
        return distA - distB;
      }

      return 0;
    });

    // Strategy 2: Increase feed rates where safe
    return optimized.map((cmd) => {
      if (cmd.type === 'cut' && cmd.feedRate) {
        // Increase feed by 10% (conservative)
        return {
          ...cmd,
          feedRate: cmd.feedRate * 1.1,
          optimizationApplied: 'increased-feed',
        };
      }
      return cmd;
    });
  }

  /**
   * Optimize for surface finish quality
   */
  optimizeForSurfaceFinish(commands) {
    const optimized = [...commands];

    return optimized.map((cmd) => {
      if (cmd.type === 'cut' && cmd.position) {
        // For finishing passes, reduce feedrate for better surface finish
        const isFinishingPass = cmd.description?.toLowerCase()?.includes('finish');

        if (isFinishingPass && cmd.feedRate) {
          return {
            ...cmd,
            feedRate: cmd.feedRate * 0.7, // Reduce to 70% for better finish
            spindleSpeed: (cmd.spindleSpeed || 6000) * 1.2, // Increase spindle speed
            optimizationApplied: 'finishing-pass',
          };
        }

        // For regular cutting, use moderate parameters
        return {
          ...cmd,
          feedRate: cmd.feedRate || 100,
          spindleSpeed: cmd.spindleSpeed || 6000,
          optimizationApplied: 'optimized-feed-speed',
        };
      }

      return cmd;
    });
  }

  /**
   * Optimize for reduced tool wear
   */
  optimizeForToolWear(commands) {
    const optimized = [...commands];

    return optimized.map((cmd) => {
      if (cmd.type === 'cut' && cmd.feedRate && cmd.spindleSpeed) {
        // Calculate tool life factor based on feed and speed
        // Lower speeds and feeds = longer tool life
        const baselineFeedRate = 100;
        const baselineSpindle = 6000;

        const feedReduction = Math.min(cmd.feedRate / baselineFeedRate, 1.0);
        const speedReduction = Math.min(cmd.spindleSpeed / baselineSpindle, 1.0);

        // Reduce feed and speed by 15% for better tool life
        const wearFactor = 0.85;

        return {
          ...cmd,
          feedRate: cmd.feedRate * wearFactor,
          spindleSpeed: Math.max(cmd.spindleSpeed * wearFactor, 2000),
          optimizationApplied: 'wear-reduction',
          estimatedToolLife: 1 / (feedReduction * speedReduction),
        };
      }

      return cmd;
    });
  }

  /**
   * Avoid collisions by adjusting tool paths
   */
  avoidCollisions(commands) {
    const optimized = [];
    const workArea = {
      minX: -250,
      maxX: 250,
      minY: -250,
      maxY: 250,
      minZ: -100,
      maxZ: 100,
    };

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];

      // Check if command would cause collision
      if (cmd.position && this.isCollisionRisk(cmd.position, workArea)) {
        // Insert intermediate safe moves
        const safePath = this.generateSafePath(
          i > 0 ? commands[i - 1].position : { x: 0, y: 0, z: 10 },
          cmd.position,
          workArea
        );

        optimized.push(...safePath);
      }

      optimized.push(cmd);
    }

    return optimized;
  }

  /**
   * Check if a position would cause collision
   */
  isCollisionRisk(position, workArea) {
    const safetyMargin = 5; // mm

    return (
      position.x < workArea.minX + safetyMargin ||
      position.x > workArea.maxX - safetyMargin ||
      position.y < workArea.minY + safetyMargin ||
      position.y > workArea.maxY - safetyMargin ||
      position.z < workArea.minZ + safetyMargin ||
      position.z > workArea.maxZ - safetyMargin
    );
  }

  /**
   * Generate safe intermediate moves to avoid collision
   */
  generateSafePath(startPos, endPos, workArea) {
    const path = [];
    const safeHeight = 20; // mm above workpiece

    // Move up to safe height first
    if (startPos.z < safeHeight) {
      path.push({
        type: 'rapid',
        position: { x: startPos.x, y: startPos.y, z: safeHeight },
        description: 'Move to safe height',
      });
    }

    // Move horizontally to destination
    path.push({
      type: 'rapid',
      position: { x: endPos.x, y: endPos.y, z: safeHeight },
      description: 'Move to destination height',
    });

    return path;
  }

  /**
   * Consolidate unnecessary tool changes
   */
  consolidateToolChanges(commands) {
    const consolidated = [];
    let currentTool = null;

    for (const cmd of commands) {
      // Skip duplicate tool changes
      if (cmd.type === 'tool-change') {
        if (cmd.toolId !== currentTool) {
          consolidated.push(cmd);
          currentTool = cmd.toolId;
        }
      } else {
        consolidated.push(cmd);
      }
    }

    return consolidated;
  }

  /**
   * Calculate toolpath metrics
   */
  calculateMetrics(original, optimized) {
    const originalTime = this.estimateExecutionTime(original);
    const optimizedTime = this.estimateExecutionTime(optimized);
    const originalDistance = this.calculateTotalDistance(original);
    const optimizedDistance = this.calculateTotalDistance(optimized);

    return {
      originalExecutionTime: originalTime,
      optimizedExecutionTime: optimizedTime,
      originalDistance: originalDistance,
      optimizedDistance: optimizedDistance,
      commandCount: {
        original: original.length,
        optimized: optimized.length,
      },
    };
  }

  /**
   * Calculate improvements from optimization
   */
  calculateImprovements(original, optimized) {
    const metrics = this.calculateMetrics(original, optimized);

    const timeSavings = metrics.originalExecutionTime - metrics.optimizedExecutionTime;
    const timePercentage =
      ((metrics.originalExecutionTime - metrics.optimizedExecutionTime) /
        metrics.originalExecutionTime) *
        100 || 0;

    const distanceSavings = metrics.originalDistance - metrics.optimizedDistance;
    const distancePercentage =
      ((metrics.originalDistance - metrics.optimizedDistance) / metrics.originalDistance) * 100 ||
      0;

    return {
      timeReduction: {
        absolute: parseFloat(timeSavings.toFixed(2)),
        percentage: parseFloat(timePercentage.toFixed(2)),
        unit: 'minutes',
      },
      distanceReduction: {
        absolute: parseFloat(distanceSavings.toFixed(2)),
        percentage: parseFloat(distancePercentage.toFixed(2)),
        unit: 'mm',
      },
      commandsReduced: original.length - optimized.length,
    };
  }

  /**
   * Estimate execution time for a toolpath
   */
  estimateExecutionTime(commands) {
    let totalTime = 0;

    for (const cmd of commands) {
      if (cmd.type === 'cut' && cmd.feedRate) {
        // Estimate distance for this cut (simplified)
        const distance = cmd.distance || 10; // Default 10mm if not specified
        const feedRate = cmd.feedRate;
        totalTime += distance / feedRate;
      } else if (cmd.type === 'rapid') {
        // Rapid moves assumed to take 1 second per 100mm
        const distance = this.calculateDistance(cmd.position) || 100;
        const rapidRate = 5000; // 5000 mm/min rapid
        totalTime += distance / rapidRate;
      }
    }

    return totalTime; // In minutes
  }

  /**
   * Calculate total distance traveled
   */
  calculateTotalDistance(commands) {
    let totalDistance = 0;
    let currentPos = { x: 0, y: 0, z: 0 };

    for (const cmd of commands) {
      if (cmd.position) {
        totalDistance += this.distanceBetween(currentPos, cmd.position);
        currentPos = cmd.position;
      }
    }

    return totalDistance;
  }

  /**
   * Calculate distance from origin
   */
  calculateDistance(position) {
    if (!position) return 0;
    const x = position.x || 0;
    const y = position.y || 0;
    const z = position.z || 0;
    return Math.sqrt(x * x + y * y + z * z);
  }

  /**
   * Calculate distance between two points
   */
  distanceBetween(p1, p2) {
    const dx = (p2.x || 0) - (p1.x || 0);
    const dy = (p2.y || 0) - (p1.y || 0);
    const dz = (p2.z || 0) - (p1.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get optimization history
   */
  getHistory(limit = 100) {
    return this.optimizationHistory.slice(-limit);
  }

  /**
   * Clear optimization history
   */
  clearHistory() {
    this.optimizationHistory = [];
  }

  /**
   * Get optimization statistics
   */
  getStatistics() {
    if (this.optimizationHistory.length === 0) {
      return { message: 'No optimization history' };
    }

    let totalTimeSavings = 0;
    let totalDistanceSavings = 0;
    let averageTimeReduction = 0;
    let averageDistanceReduction = 0;

    this.optimizationHistory.forEach((result) => {
      const improvements = result.improvements;
      totalTimeSavings += improvements.timeReduction.absolute;
      totalDistanceSavings += improvements.distanceReduction.absolute;
    });

    averageTimeReduction = totalTimeSavings / this.optimizationHistory.length;
    averageDistanceReduction = totalDistanceSavings / this.optimizationHistory.length;

    return {
      totalOptimizations: this.optimizationHistory.length,
      totalTimeSaved: parseFloat(totalTimeSavings.toFixed(2)),
      totalDistanceSaved: parseFloat(totalDistanceSavings.toFixed(2)),
      averageTimeSavingsPerJob: parseFloat(averageTimeReduction.toFixed(2)),
      averageDistanceSavingsPerJob: parseFloat(averageDistanceReduction.toFixed(2)),
    };
  }

  /**
   * Get optimization strategies
   */
  getStrategies() {
    return structuredClone(this.optimizationStrategies);
  }

  /**
   * Update optimization strategies
   */
  updateStrategies(strategies) {
    if (strategies) {
      Object.assign(this.optimizationStrategies, strategies);
    }
    return this.optimizationStrategies;
  }
}

export default AdvancedToolpathOptimizer;
