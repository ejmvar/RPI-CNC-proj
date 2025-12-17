/**
 * Real-Time Position Feedback System
 * Phase 15.4: Hardware Integration
 *
 * Provides real-time position tracking and visualization:
 * - Position updates from GRBL status reports
 * - Coordinate system management (Machine/Work coordinates)
 * - Position history tracking
 * - Offset and compensation management
 */

export class PositionFeedback {
  constructor(options = {}) {
    this.options = {
      updateInterval: options.updateInterval || 100,
      historySize: options.historySize || 1000,
      enableHistory: options.enableHistory !== false,
      coordinateSystem: options.coordinateSystem || 'work',
      ...options,
    };

    this.currentPosition = { x: 0, y: 0, z: 0 };
    this.machinePosition = { x: 0, y: 0, z: 0 };
    this.offset = { x: 0, y: 0, z: 0 };
    this.positionHistory = [];
    this.listeners = {};
    this.lastUpdate = Date.now();
  }

  /**
   * Update position from status report
   */
  updatePosition(statusReport) {
    if (!statusReport) {
      throw new Error('Status report required');
    }

    const previous = { ...this.currentPosition };

    if (statusReport.mPos) {
      this.machinePosition = { ...statusReport.mPos };
    }

    if (statusReport.wPos) {
      this.currentPosition = { ...statusReport.wPos };
    } else if (statusReport.mPos && this.offset) {
      // Calculate work position from machine position and offset
      this.currentPosition = {
        x: statusReport.mPos.x - this.offset.x,
        y: statusReport.mPos.y - this.offset.y,
        z: statusReport.mPos.z - this.offset.z,
      };
    }

    const delta = this.calculateDelta(previous, this.currentPosition);

    if (this.options.enableHistory) {
      this.recordHistory({
        position: { ...this.currentPosition },
        timestamp: Date.now(),
        delta,
      });
    }

    this.emit('position:updated', {
      position: this.currentPosition,
      machinePosition: this.machinePosition,
      delta,
      timestamp: Date.now(),
    });

    return this.currentPosition;
  }

  /**
   * Set coordinate offset (tool offset, fixture offset)
   */
  setOffset(x, y, z) {
    const previous = { ...this.offset };

    this.offset = {
      x: parseFloat(x) || 0,
      y: parseFloat(y) || 0,
      z: parseFloat(z) || 0,
    };

    this.emit('offset:changed', { previous, current: this.offset });

    return this.offset;
  }

  /**
   * Get current position
   */
  getPosition() {
    return {
      work: { ...this.currentPosition },
      machine: { ...this.machinePosition },
      offset: { ...this.offset },
      lastUpdate: this.lastUpdate,
    };
  }

  /**
   * Calculate movement delta
   */
  calculateDelta(prev, curr) {
    return {
      x: parseFloat((curr.x - prev.x).toFixed(4)),
      y: parseFloat((curr.y - prev.y).toFixed(4)),
      z: parseFloat((curr.z - prev.z).toFixed(4)),
      distance: parseFloat(
        Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2 + (curr.z - prev.z) ** 2).toFixed(
          4
        )
      ),
    };
  }

  /**
   * Record position in history
   */
  recordHistory(entry) {
    this.positionHistory.push(entry);

    if (this.positionHistory.length > this.options.historySize) {
      this.positionHistory.shift();
    }

    this.emit('history:recorded', { entryCount: this.positionHistory.length });
  }

  /**
   * Get position history
   */
  getHistory(limit = null) {
    const history = [...this.positionHistory];

    if (limit && limit > 0) {
      return history.slice(-limit);
    }

    return history;
  }

  /**
   * Clear position history
   */
  clearHistory() {
    const count = this.positionHistory.length;
    this.positionHistory = [];

    this.emit('history:cleared', { clearedCount: count });

    return { cleared: true, count };
  }

  /**
   * Get statistics from history
   */
  getStats() {
    if (this.positionHistory.length === 0) {
      return {
        positions: 0,
        totalDistance: 0,
        maxX: 0,
        maxY: 0,
        maxZ: 0,
        minX: 0,
        minY: 0,
        minZ: 0,
      };
    }

    let totalDistance = 0;
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    this.positionHistory.forEach((entry) => {
      const pos = entry.position;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      minZ = Math.min(minZ, pos.z);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
      maxZ = Math.max(maxZ, pos.z);

      if (entry.delta) {
        totalDistance += entry.delta.distance;
      }
    });

    return {
      positions: this.positionHistory.length,
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      maxX,
      maxY,
      maxZ,
      minX,
      minY,
      minZ,
    };
  }

  /**
   * Reset position to origin
   */
  reset() {
    this.currentPosition = { x: 0, y: 0, z: 0 };
    this.machinePosition = { x: 0, y: 0, z: 0 };
    this.offset = { x: 0, y: 0, z: 0 };

    this.emit('position:reset', { timestamp: Date.now() });

    return { reset: true };
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
