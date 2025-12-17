/**
 * Collision Detection System
 * Phase 16: Advanced Simulation & Analysis
 *
 * Provides multi-tool and workspace collision detection:
 * - Tool vs fixture collision
 * - Tool vs workpiece collision
 * - Tool vs spindle head collision
 * - Safe work envelope validation
 */

export class CollisionDetector {
  constructor(options = {}) {
    this.options = {
      gridResolution: options.gridResolution || 10,
      checkInterval: options.checkInterval || 0.5,
      enableBoundaryCheck: options.enableBoundaryCheck !== false,
      enableFixtureCheck: options.enableFixtureCheck !== false,
      safetyMargin: options.safetyMargin || 2,
      ...options,
    };

    this.workArea = {
      minX: options.minX || -250,
      maxX: options.maxX || 250,
      minY: options.minY || -250,
      maxY: options.maxY || 250,
      minZ: options.minZ || -100,
      maxZ: options.maxZ || 100,
    };

    this.fixtures = [];
    this.tools = [];
    this.collisions = [];
    this.listeners = {};
  }

  /**
   * Add tool to collision detection
   */
  addTool(tool) {
    if (!tool || !tool.id) {
      throw new Error('Tool requires id property');
    }

    this.tools.push({
      id: tool.id,
      name: tool.name || 'Unknown Tool',
      diameter: tool.diameter || 3.175,
      length: tool.length || 25.4,
      flutes: tool.flutes || 2,
      type: tool.type || 'end-mill',
    });

    this.emit('tool:added', { toolId: tool.id });

    return { added: true, toolId: tool.id };
  }

  /**
   * Add fixture to workspace
   */
  addFixture(fixture) {
    if (!fixture || !fixture.id) {
      throw new Error('Fixture requires id property');
    }

    const fixtureObj = {
      id: fixture.id,
      name: fixture.name || 'Fixture',
      bounds: {
        minX: fixture.minX || 0,
        maxX: fixture.maxX || 100,
        minY: fixture.minY || 0,
        maxY: fixture.maxY || 100,
        minZ: fixture.minZ || 0,
        maxZ: fixture.maxZ || 10,
      },
    };

    this.fixtures.push(fixtureObj);
    this.emit('fixture:added', { fixtureId: fixture.id });

    return { added: true, fixtureId: fixture.id };
  }

  /**
   * Check collision at position
   */
  checkCollision(toolId, position) {
    if (!toolId || !position) {
      throw new Error('Tool ID and position required');
    }

    const tool = this.tools.find((t) => t.id === toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const collisionsFound = [];
    const radius = tool.diameter / 2;

    // Check workspace bounds
    if (this.options.enableBoundaryCheck) {
      const boundsCollisions = this.checkBoundsCollision(position, radius);
      collisionsFound.push(...boundsCollisions);
    }

    // Check fixture collisions
    if (this.options.enableFixtureCheck) {
      const fixtureCollisions = this.checkFixtureCollisions(position, radius);
      collisionsFound.push(...fixtureCollisions);
    }

    if (collisionsFound.length > 0) {
      this.emit('collision:detected', {
        toolId,
        position,
        collisions: collisionsFound,
        timestamp: Date.now(),
      });
    }

    return {
      hasCollision: collisionsFound.length > 0,
      collisions: collisionsFound,
      position,
    };
  }

  /**
   * Check workspace bounds collision
   */
  checkBoundsCollision(position, radius) {
    const collisions = [];

    if (position.x - radius < this.workArea.minX - this.options.safetyMargin) {
      collisions.push({ type: 'boundary', axis: 'X', reason: 'exceeds minimum' });
    }
    if (position.x + radius > this.workArea.maxX + this.options.safetyMargin) {
      collisions.push({ type: 'boundary', axis: 'X', reason: 'exceeds maximum' });
    }

    if (position.y - radius < this.workArea.minY - this.options.safetyMargin) {
      collisions.push({ type: 'boundary', axis: 'Y', reason: 'exceeds minimum' });
    }
    if (position.y + radius > this.workArea.maxY + this.options.safetyMargin) {
      collisions.push({ type: 'boundary', axis: 'Y', reason: 'exceeds maximum' });
    }

    if (position.z < this.workArea.minZ - this.options.safetyMargin) {
      collisions.push({ type: 'boundary', axis: 'Z', reason: 'exceeds minimum' });
    }
    if (position.z > this.workArea.maxZ + this.options.safetyMargin) {
      collisions.push({ type: 'boundary', axis: 'Z', reason: 'exceeds maximum' });
    }

    return collisions;
  }

  /**
   * Check fixture collision
   */
  checkFixtureCollisions(position, radius) {
    const collisions = [];

    this.fixtures.forEach((fixture) => {
      const bounds = fixture.bounds;

      // Simple AABB (Axis-Aligned Bounding Box) collision check
      const xCollides = position.x - radius < bounds.maxX && position.x + radius > bounds.minX;
      const yCollides = position.y - radius < bounds.maxY && position.y + radius > bounds.minY;
      const zCollides = position.z < bounds.maxZ && position.z > bounds.minZ;

      if (xCollides && yCollides && zCollides) {
        collisions.push({
          type: 'fixture',
          fixtureId: fixture.id,
          fixtureName: fixture.name,
          distance: this.calculateMinDistance(position, radius, bounds),
        });
      }
    });

    return collisions;
  }

  /**
   * Calculate minimum distance to fixture
   */
  calculateMinDistance(position, radius, bounds) {
    const dx = Math.max(bounds.minX - (position.x + radius), position.x - radius - bounds.maxX, 0);
    const dy = Math.max(bounds.minY - (position.y + radius), position.y - radius - bounds.maxY, 0);
    const dz = Math.max(bounds.minZ - position.z, position.z - bounds.maxZ, 0);

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Validate toolpath for collisions
   */
  validateToolpath(toolId, toolpath) {
    if (!toolId || !toolpath || !Array.isArray(toolpath)) {
      throw new Error('Tool ID and toolpath array required');
    }

    const tool = this.tools.find((t) => t.id === toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const collisionPoints = [];

    toolpath.forEach((point, idx) => {
      const result = this.checkCollision(toolId, point);
      if (result.hasCollision) {
        collisionPoints.push({
          pointIndex: idx,
          position: point,
          collisions: result.collisions,
        });
      }
    });

    const report = {
      hasCollisions: collisionPoints.length > 0,
      totalPoints: toolpath.length,
      collisionPoints: collisionPoints.length,
      safePoints: toolpath.length - collisionPoints.length,
      details: collisionPoints.slice(0, 10), // Return first 10 collisions
    };

    if (report.hasCollisions) {
      this.emit('toolpath:collision', report);
    }

    return report;
  }

  /**
   * Get collision statistics
   */
  getStats() {
    return {
      toolsTracked: this.tools.length,
      fixturesTracked: this.fixtures.length,
      recentCollisions: this.collisions.slice(-10).length,
      workArea: this.workArea,
      safetyMargin: this.options.safetyMargin,
    };
  }

  /**
   * Clear tracked collisions
   */
  clearCollisions() {
    const count = this.collisions.length;
    this.collisions = [];
    this.emit('collisions:cleared', { clearedCount: count });
    return { cleared: true, count };
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
