/**
 * Advanced Visualization Module
 * Phase 14.5: Advanced Visualization
 *
 * Features:
 * - Material removal simulation (3D cutaway view)
 * - Tool engagement analysis
 * - Chip load visualization
 * - Heat map for feed rate variations
 * - Rapid vs cutting move statistics
 */

/**
 * Voxel Grid - 3D grid for material removal simulation
 */
export class VoxelGrid {
  constructor(dimensions = { width: 100, height: 100, depth: 100 }, resolution = 1) {
    this.width = Math.ceil(dimensions.width / resolution);
    this.height = Math.ceil(dimensions.height / resolution);
    this.depth = Math.ceil(dimensions.depth / resolution);
    this.resolution = resolution;
    this.voxels = new Uint8Array(this.width * this.height * this.depth);

    // Initialize all voxels as filled (1 = material present)
    for (let i = 0; i < this.voxels.length; i++) {
      this.voxels[i] = 1;
    }

    this.materialRemoved = 0;
  }

  /**
   * Get voxel at position
   */
  getVoxel(x, y, z) {
    const ix = Math.floor(x / this.resolution);
    const iy = Math.floor(y / this.resolution);
    const iz = Math.floor(z / this.resolution);

    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height || iz < 0 || iz >= this.depth) {
      return 0;
    }

    return this.voxels[this.getIndex(ix, iy, iz)];
  }

  /**
   * Set voxel at position
   */
  setVoxel(x, y, z, value) {
    const ix = Math.floor(x / this.resolution);
    const iy = Math.floor(y / this.resolution);
    const iz = Math.floor(z / this.resolution);

    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height || iz < 0 || iz >= this.depth) {
      return;
    }

    const index = this.getIndex(ix, iy, iz);
    const oldValue = this.voxels[index];
    this.voxels[index] = value ? 1 : 0;

    if (oldValue === 1 && value === 0) {
      this.materialRemoved++;
    }
  }

  /**
   * Get linear index from coordinates
   */
  getIndex(x, y, z) {
    return x + y * this.width + z * this.width * this.height;
  }

  /**
   * Remove material along tool path
   */
  removeAlongPath(startPos, endPos, toolRadius) {
    // Simple sphere removal along path
    const steps = Math.ceil(
      Math.sqrt(
        Math.pow(endPos.x - startPos.x, 2) +
          Math.pow(endPos.y - startPos.y, 2) +
          Math.pow(endPos.z - startPos.z, 2)
      ) / this.resolution
    );

    for (let step = 0; step <= steps; step++) {
      const t = step / Math.max(steps, 1);
      const pos = {
        x: startPos.x + (endPos.x - startPos.x) * t,
        y: startPos.y + (endPos.y - startPos.y) * t,
        z: startPos.z + (endPos.z - startPos.z) * t,
      };

      this.removeSphere(pos, toolRadius);
    }
  }

  /**
   * Remove spherical material
   */
  removeSphere(center, radius) {
    const r = Math.ceil(radius / this.resolution);
    const radiusSq = r * r;

    for (let x = -r; x <= r; x++) {
      for (let y = -r; y <= r; y++) {
        for (let z = -r; z <= r; z++) {
          if (x * x + y * y + z * z <= radiusSq) {
            this.setVoxel(
              center.x + x * this.resolution,
              center.y + y * this.resolution,
              center.z + z * this.resolution,
              0
            );
          }
        }
      }
    }
  }

  /**
   * Get material removal percentage
   */
  getRemovalPercentage() {
    const total = this.width * this.height * this.depth;
    return (this.materialRemoved / total) * 100;
  }

  /**
   * Get density map (2D projection)
   */
  getDensityMap(axis = 'z') {
    let mapWidth, mapHeight;
    if (axis === 'z') {
      mapWidth = this.width;
      mapHeight = this.height;
    } else if (axis === 'x') {
      mapWidth = this.depth;
      mapHeight = this.height;
    } else {
      // y axis
      mapWidth = this.width;
      mapHeight = this.depth;
    }

    const map = new Uint32Array(mapWidth * mapHeight);

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          if (this.voxels[this.getIndex(x, y, z)] === 1) {
            let mapX, mapY;
            if (axis === 'z') {
              mapX = x;
              mapY = y;
            } else if (axis === 'x') {
              mapX = z;
              mapY = y;
            } else {
              mapX = x;
              mapY = z;
            }
            map[mapX + mapY * mapWidth]++;
          }
        }
      }
    }

    return map;
  }

  /**
   * Reset grid
   */
  reset() {
    this.voxels.fill(1);
    this.materialRemoved = 0;
  }
}

/**
 * Tool Engagement - Tracks tool engagement metrics
 */
export class ToolEngagement {
  constructor() {
    this.totalEngagementTime = 0;
    this.engagementHistory = [];
    this.averageEngagementAngle = 0;
    this.maxEngagementAngle = 0;
    this.minEngagementAngle = 180;
    this.engagements = 0;
  }

  /**
   * Record tool engagement
   */
  recordEngagement(angle, duration) {
    if (angle < 0 || angle > 180) {
      throw new Error('Angle must be between 0 and 180 degrees');
    }

    this.engagementHistory.push({ angle, duration, timestamp: Date.now() });
    this.totalEngagementTime += duration;
    this.engagements++;

    this.maxEngagementAngle = Math.max(this.maxEngagementAngle, angle);
    this.minEngagementAngle = Math.min(this.minEngagementAngle, angle);

    const totalAngle = this.engagementHistory.reduce((sum, e) => sum + e.angle * e.duration, 0);
    this.averageEngagementAngle = totalAngle / this.totalEngagementTime;
  }

  /**
   * Get engagement summary
   */
  getSummary() {
    return {
      totalEngagementTime: this.totalEngagementTime.toFixed(3),
      averageEngagementAngle: this.averageEngagementAngle.toFixed(1),
      maxEngagementAngle: this.maxEngagementAngle.toFixed(1),
      minEngagementAngle: this.minEngagementAngle.toFixed(1),
      engagements: this.engagements,
    };
  }
}

/**
 * Chip Load Calculator - Analyzes chip load per tooth
 */
export class ChipLoadCalculator {
  constructor(toolTeeth = 2, toolRadius = 2.5) {
    this.toolTeeth = toolTeeth;
    this.toolRadius = toolRadius;
    this.chipLoads = [];
    this.maxChipLoad = 0;
    this.minChipLoad = Infinity;
  }

  /**
   * Calculate chip load for a segment
   */
  calculateChipLoad(feedRate, spindleSpeed) {
    if (spindleSpeed <= 0 || feedRate <= 0) return 0;

    // Chip load = Feed rate / (Spindle speed * Number of teeth)
    // Feed rate is in units/min, spindle speed is in RPM
    const chipLoad = feedRate / 60 / ((spindleSpeed / 60) * this.toolTeeth);

    this.chipLoads.push(chipLoad);
    this.maxChipLoad = Math.max(this.maxChipLoad, chipLoad);
    this.minChipLoad = Math.min(this.minChipLoad, chipLoad);

    return chipLoad;
  }

  /**
   * Get average chip load
   */
  getAverageChipLoad() {
    if (this.chipLoads.length === 0) return 0;
    const sum = this.chipLoads.reduce((a, b) => a + b, 0);
    return sum / this.chipLoads.length;
  }

  /**
   * Get chip load summary
   */
  getSummary() {
    return {
      averageChipLoad: this.getAverageChipLoad().toFixed(4),
      maxChipLoad: this.maxChipLoad === 0 ? '0.0000' : this.maxChipLoad.toFixed(4),
      minChipLoad: this.minChipLoad === Infinity ? '0.0000' : this.minChipLoad.toFixed(4),
      measurements: this.chipLoads.length,
    };
  }
}

/**
 * Heat Map Data - Represents feed rate variations as heat map
 */
export class HeatMapData {
  constructor(gridWidth = 100, gridHeight = 100) {
    this.width = gridWidth;
    this.height = gridHeight;
    this.data = new Float32Array(gridWidth * gridHeight);
    this.minValue = Infinity;
    this.maxValue = -Infinity;
  }

  /**
   * Add value to grid cell
   */
  addValue(x, y, value) {
    const ix = Math.min(Math.floor(x), this.width - 1);
    const iy = Math.min(Math.floor(y), this.height - 1);
    const index = ix + iy * this.width;

    this.data[index] += value;
    this.minValue = Math.min(this.minValue, this.data[index]);
    this.maxValue = Math.max(this.maxValue, this.data[index]);
  }

  /**
   * Get normalized heat map (0-255)
   */
  getNormalizedData() {
    const range = this.maxValue - this.minValue || 1;
    const normalized = new Uint8Array(this.data.length);

    for (let i = 0; i < this.data.length; i++) {
      normalized[i] = Math.round(((this.data[i] - this.minValue) / range) * 255);
    }

    return normalized;
  }

  /**
   * Get color for value
   */
  getColorForValue(value) {
    const normalized = (value - this.minValue) / (this.maxValue - this.minValue || 1);
    const hue = (1 - normalized) * 240; // Blue to red
    return `hsl(${hue}, 100%, 50%)`;
  }
}

/**
 * Move Statistics - Tracks rapid vs cutting moves
 */
export class MoveStatistics {
  constructor() {
    this.rapidMoves = {
      count: 0,
      distance: 0,
      time: 0,
    };
    this.cuttingMoves = {
      count: 0,
      distance: 0,
      time: 0,
    };
  }

  /**
   * Record rapid move (G0)
   */
  recordRapidMove(distance, time) {
    this.rapidMoves.count++;
    this.rapidMoves.distance += distance;
    this.rapidMoves.time += time;
  }

  /**
   * Record cutting move (G1)
   */
  recordCuttingMove(distance, time) {
    this.cuttingMoves.count++;
    this.cuttingMoves.distance += distance;
    this.cuttingMoves.time += time;
  }

  /**
   * Get move statistics
   */
  getStatistics() {
    const totalDistance = this.rapidMoves.distance + this.cuttingMoves.distance;
    const totalTime = this.rapidMoves.time + this.cuttingMoves.time;

    return {
      rapid: {
        count: this.rapidMoves.count,
        distance: this.rapidMoves.distance.toFixed(2),
        time: this.rapidMoves.time.toFixed(2),
        percentDistance:
          totalDistance > 0 ? ((this.rapidMoves.distance / totalDistance) * 100).toFixed(1) : '0.0',
        percentTime: totalTime > 0 ? ((this.rapidMoves.time / totalTime) * 100).toFixed(1) : '0.0',
      },
      cutting: {
        count: this.cuttingMoves.count,
        distance: this.cuttingMoves.distance.toFixed(2),
        time: this.cuttingMoves.time.toFixed(2),
        percentDistance:
          totalDistance > 0
            ? ((this.cuttingMoves.distance / totalDistance) * 100).toFixed(1)
            : '0.0',
        percentTime:
          totalTime > 0 ? ((this.cuttingMoves.time / totalTime) * 100).toFixed(1) : '0.0',
      },
      total: {
        distance: totalDistance.toFixed(2),
        time: totalTime.toFixed(2),
      },
    };
  }
}

/**
 * Advanced Visualization Manager - Orchestrates all visualization features
 */
export class AdvancedVisualizationManager {
  constructor(options = {}) {
    this.voxelGrid = new VoxelGrid(options.gridDimensions, options.gridResolution || 1);
    this.toolEngagement = new ToolEngagement();
    this.chipLoadCalculator = new ChipLoadCalculator(
      options.toolTeeth || 2,
      options.toolRadius || 2.5
    );
    this.feedRateHeatMap = new HeatMapData(
      options.heatmapWidth || 100,
      options.heatmapHeight || 100
    );
    this.moveStatistics = new MoveStatistics();
    this.visualizations = {};
    this.eventListeners = {};
  }

  /**
   * Process toolpath for visualization
   */
  processToolpath(segments) {
    if (!Array.isArray(segments)) {
      throw new Error('Segments must be an array');
    }

    let currentPos = { x: 0, y: 0, z: 0 };

    segments.forEach((segment) => {
      const endPos = segment.end || segment;

      // Update voxel grid (material removal)
      if (segment.isCutting !== false) {
        this.voxelGrid.removeAlongPath(currentPos, endPos, this.chipLoadCalculator.toolRadius);
      }

      // Record move type
      const distance = this.calculateDistance(currentPos, endPos);
      const time = segment.time || 0.1;

      if (segment.code === 'G0' || segment.isCutting === false) {
        this.moveStatistics.recordRapidMove(distance, time);
      } else {
        this.moveStatistics.recordCuttingMove(distance, time);
        this.chipLoadCalculator.calculateChipLoad(
          segment.feedRate || 100,
          segment.spindleSpeed || 1000,
          distance
        );
      }

      // Update heat map with feed rate
      if (endPos.x && endPos.y) {
        this.feedRateHeatMap.addValue(endPos.x, endPos.y, segment.feedRate || 0);
      }

      currentPos = { ...endPos };
    });

    this.emit('toolpathProcessed', {
      segmentCount: segments.length,
      materialRemoved: this.voxelGrid.materialRemoved,
    });
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(p1, p2) {
    const dx = (p2.x || 0) - (p1.x || 0);
    const dy = (p2.y || 0) - (p1.y || 0);
    const dz = (p2.z || 0) - (p1.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get material removal visualization data
   */
  getMaterialRemovalData() {
    return {
      totalVoxels: this.voxelGrid.width * this.voxelGrid.height * this.voxelGrid.depth,
      removedVoxels: this.voxelGrid.materialRemoved,
      removalPercentage: this.voxelGrid.getRemovalPercentage().toFixed(1),
      densityMap: this.voxelGrid.getDensityMap('z'),
    };
  }

  /**
   * Get tool engagement data
   */
  getToolEngagementData() {
    return this.toolEngagement.getSummary();
  }

  /**
   * Get chip load data
   */
  getChipLoadData() {
    return this.chipLoadCalculator.getSummary();
  }

  /**
   * Get feed rate heat map
   */
  getFeedRateHeatMap() {
    return {
      normalized: this.feedRateHeatMap.getNormalizedData(),
      min: this.feedRateHeatMap.minValue,
      max: this.feedRateHeatMap.maxValue,
      width: this.feedRateHeatMap.width,
      height: this.feedRateHeatMap.height,
    };
  }

  /**
   * Get move statistics
   */
  getMoveStatistics() {
    return this.moveStatistics.getStatistics();
  }

  /**
   * Get complete visualization report
   */
  getVisualizationReport() {
    return {
      timestamp: new Date().toISOString(),
      materialRemoval: this.getMaterialRemovalData(),
      toolEngagement: this.getToolEngagementData(),
      chipLoad: this.getChipLoadData(),
      feedRateHeatMap: this.getFeedRateHeatMap(),
      moveStatistics: this.getMoveStatistics(),
    };
  }

  /**
   * Reset all visualizations
   */
  reset() {
    this.voxelGrid.reset();
    this.toolEngagement = new ToolEngagement();
    this.chipLoadCalculator.chipLoads = [];
    this.chipLoadCalculator.maxChipLoad = 0;
    this.chipLoadCalculator.minChipLoad = Infinity;
    this.feedRateHeatMap.data.fill(0);
    this.moveStatistics = new MoveStatistics();
    this.emit('visualizationReset', {});
  }

  /**
   * Event listener management
   */
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach((callback) => callback(data));
  }
}
