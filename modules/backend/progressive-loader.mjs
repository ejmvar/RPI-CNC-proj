/**
 * Progressive Loader Module
 * Phase 13.4: Performance Improvements - Progressive Loading Implementation
 *
 * Implements streaming G-Code parsing, progressive mesh generation,
 * and cancellable background operations for large file handling
 */

/**
 * Progressive G-Code Parser
 * Parses G-Code files incrementally with cancellation support
 */
export class ProgressiveGCodeParser {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000; // Lines per chunk
    this.delayBetweenChunks = options.delayBetweenChunks || 0; // MS between chunks
    this.listeners = {};
    this.isCancelled = false;
  }

  /**
   * Parse G-Code file progressively
   * @param {string} gcodeContent - Full G-Code content
   * @returns {Promise<Object>} Parsing result with all commands
   */
  async parseProgressive(gcodeContent) {
    this.isCancelled = false;
    const lines = gcodeContent.split('\n');
    const commands = [];
    let processedLines = 0;
    let gCodes = new Set();
    let mCodes = new Set();
    const bounds = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    };

    try {
      for (let i = 0; i < lines.length; i += this.chunkSize) {
        if (this.isCancelled) {
          this.emit('cancelled', { processedLines, totalLines: lines.length });
          return null;
        }

        const chunk = lines.slice(i, i + this.chunkSize);
        const chunkCommands = [];

        for (const line of chunk) {
          const parsed = this.parseLine(line);
          if (parsed) {
            chunkCommands.push(parsed);
            commands.push(parsed);

            // Track G-codes and M-codes
            if (parsed.gCode) gCodes.add(parsed.gCode);
            if (parsed.mCode) mCodes.add(parsed.mCode);

            // Update bounds
            if (parsed.params.X !== undefined) {
              bounds.minX = Math.min(bounds.minX, parsed.params.X);
              bounds.maxX = Math.max(bounds.maxX, parsed.params.X);
            }
            if (parsed.params.Y !== undefined) {
              bounds.minY = Math.min(bounds.minY, parsed.params.Y);
              bounds.maxY = Math.max(bounds.maxY, parsed.params.Y);
            }
            if (parsed.params.Z !== undefined) {
              bounds.minZ = Math.min(bounds.minZ, parsed.params.Z);
              bounds.maxZ = Math.max(bounds.maxZ, parsed.params.Z);
            }
          }
          processedLines += 1;
        }

        // Emit progress
        this.emit('progress', {
          processedLines,
          totalLines: lines.length,
          commandsProcessed: commands.length,
          chunkSize: chunkCommands.length,
          percentage: (processedLines / lines.length) * 100,
        });

        // Delay between chunks if configured
        if (this.delayBetweenChunks > 0) {
          await this.sleep(this.delayBetweenChunks);
        }
      }

      const result = {
        commands,
        totalCommands: commands.length,
        gCodes: Array.from(gCodes),
        mCodes: Array.from(mCodes),
        bounds: {
          ...bounds,
          width: bounds.maxX - bounds.minX,
          height: bounds.maxY - bounds.minY,
          depth: bounds.maxZ - bounds.minZ,
        },
        totalLines: lines.length,
      };

      this.emit('complete', result);
      return result;
    } catch (error) {
      this.emit('error', { error, processedLines });
      throw error;
    }
  }

  /**
   * Parse single G-Code line
   * @private
   */
  parseLine(line) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('%')) {
      return null;
    }

    // Remove inline comments
    const code = trimmed.split(';')[0].trim();
    if (!code) return null;

    // Parse G and M codes
    const gMatch = code.match(/G(\d+)/i);
    const mMatch = code.match(/M(\d+)/i);

    const gCode = gMatch ? parseInt(gMatch[1]) : null;
    const mCode = mMatch ? parseInt(mMatch[1]) : null;

    // Parse parameters
    const params = {};
    const paramRegex = /([A-Z])([+-]?\d*\.?\d+)/gi;
    let match;
    while ((match = paramRegex.exec(code)) !== null) {
      const letter = match[1].toUpperCase();
      if (!['G', 'M'].includes(letter)) {
        params[letter] = parseFloat(match[2]);
      }
    }

    return {
      line: trimmed,
      gCode,
      mCode,
      params,
      raw: code,
    };
  }

  /**
   * Cancel parsing operation
   */
  cancel() {
    this.isCancelled = true;
  }

  /**
   * Sleep utility for delays
   * @private
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Register event listener
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
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Emit event
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        callback(data);
      });
    }
  }
}

/**
 * Progressive Mesh Generator
 * Generates mesh compensation incrementally from probe points
 */
export class ProgressiveMeshGenerator {
  constructor(options = {}) {
    this.gridSize = options.gridSize || 10;
    this.chunkSize = options.chunkSize || 100; // Probes per chunk
    this.listeners = {};
    this.isCancelled = false;
  }

  /**
   * Generate mesh progressively from probe points
   * @param {Array} probePoints - Array of probe point objects
   * @returns {Promise<Object>} Generated mesh grid
   */
  async generateMeshProgressive(probePoints) {
    this.isCancelled = false;

    if (!probePoints || probePoints.length === 0) {
      this.emit('error', { error: 'No probe points provided' });
      return null;
    }

    try {
      // Calculate bounds
      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;
      const processedPoints = [];

      for (let i = 0; i < probePoints.length; i += this.chunkSize) {
        if (this.isCancelled) {
          this.emit('cancelled', { processedProbes: processedPoints.length });
          return null;
        }

        const chunk = probePoints.slice(i, Math.min(i + this.chunkSize, probePoints.length));

        for (const point of chunk) {
          processedPoints.push(point);
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }

        this.emit('progress', {
          processedProbes: processedPoints.length,
          totalProbes: probePoints.length,
          percentage: (processedPoints.length / probePoints.length) * 100,
          phase: 'collecting',
        });

        await this.sleep(0);
      }

      // Generate grid
      const stepX = (maxX - minX) / this.gridSize;
      const stepY = (maxY - minY) / this.gridSize;
      const grid = [];

      let gridIndex = 0;
      const totalGridPoints = (this.gridSize + 1) * (this.gridSize + 1);

      for (let gy = 0; gy <= this.gridSize; gy++) {
        const row = [];
        for (let gx = 0; gx <= this.gridSize; gx++) {
          if (this.isCancelled) {
            this.emit('cancelled', { gridProgress: gridIndex });
            return null;
          }

          const x = minX + gx * stepX;
          const y = minY + gy * stepY;

          // IDW interpolation
          const z = this.interpolateIDW(x, y, processedPoints);
          row.push(z);

          gridIndex += 1;

          // Emit grid progress
          if (gridIndex % 20 === 0) {
            this.emit('progress', {
              gridProgress: gridIndex,
              totalGridPoints,
              percentage: 50 + (gridIndex / totalGridPoints) * 50,
              phase: 'interpolating',
            });
            await this.sleep(0);
          }
        }
        grid.push(row);
      }

      const result = {
        grid,
        bounds: { minX, maxX, minY, maxY },
        gridSize: this.gridSize,
        stepX,
        stepY,
        pointCount: processedPoints.length,
      };

      this.emit('complete', result);
      return result;
    } catch (error) {
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * Inverse Distance Weighting interpolation
   * @private
   */
  interpolateIDW(x, y, points, power = 2) {
    if (points.length === 0) return 0;

    let totalWeight = 0;
    let totalZ = 0;

    for (const point of points) {
      const dist = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);

      if (dist < 0.001) {
        return point.z;
      }

      const weight = 1 / dist ** power;
      totalWeight += weight;
      totalZ += point.z * weight;
    }

    return totalZ / totalWeight;
  }

  /**
   * Cancel mesh generation
   */
  cancel() {
    this.isCancelled = true;
  }

  /**
   * Sleep utility for yielding to event loop
   * @private
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Register event listener
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
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Emit event
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        callback(data);
      });
    }
  }
}

/**
 * Progressive Command Processor
 * Processes G-Code commands incrementally for simulation or execution
 */
export class ProgressiveCommandProcessor {
  constructor(options = {}) {
    this.commandsPerChunk = options.commandsPerChunk || 50;
    this.delayBetweenChunks = options.delayBetweenChunks || 0;
    this.listeners = {};
    this.isCancelled = false;
    this.currentPosition = { x: 0, y: 0, z: 0 };
  }

  /**
   * Process commands progressively
   * @param {Array} commands - Array of G-Code commands
   * @param {Function} processor - Function to process each command
   * @returns {Promise<Object>} Processing result
   */
  async processCommandsProgressive(commands, processor) {
    this.isCancelled = false;
    const results = [];
    let processedCommands = 0;

    try {
      for (let i = 0; i < commands.length; i += this.commandsPerChunk) {
        if (this.isCancelled) {
          this.emit('cancelled', { processedCommands });
          return null;
        }

        const chunk = commands.slice(i, i + this.commandsPerChunk);

        for (const cmd of chunk) {
          try {
            const result = processor(cmd, this.currentPosition);
            results.push(result);

            // Update position tracking
            if (cmd.params.X !== undefined) this.currentPosition.x = cmd.params.X;
            if (cmd.params.Y !== undefined) this.currentPosition.y = cmd.params.Y;
            if (cmd.params.Z !== undefined) this.currentPosition.z = cmd.params.Z;

            processedCommands += 1;
          } catch (cmdError) {
            results.push({
              error: true,
              message: cmdError.message,
              command: cmd,
            });
          }
        }

        this.emit('progress', {
          processedCommands,
          totalCommands: commands.length,
          percentage: (processedCommands / commands.length) * 100,
          chunkSize: chunk.length,
          currentPosition: { ...this.currentPosition },
        });

        if (this.delayBetweenChunks > 0) {
          await this.sleep(this.delayBetweenChunks);
        }
      }

      const finalResult = {
        results,
        totalProcessed: results.length,
        totalCommands: commands.length,
        finalPosition: { ...this.currentPosition },
        successful: results.filter((r) => !r.error).length,
        failed: results.filter((r) => r.error).length,
      };

      this.emit('complete', finalResult);
      return finalResult;
    } catch (error) {
      this.emit('error', { error, processedCommands });
      throw error;
    }
  }

  /**
   * Cancel processing
   */
  cancel() {
    this.isCancelled = true;
  }

  /**
   * Get current position
   */
  getCurrentPosition() {
    return { ...this.currentPosition };
  }

  /**
   * Sleep utility
   * @private
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Register event listener
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
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Emit event
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        callback(data);
      });
    }
  }
}

export default {
  ProgressiveGCodeParser,
  ProgressiveMeshGenerator,
  ProgressiveCommandProcessor,
};
