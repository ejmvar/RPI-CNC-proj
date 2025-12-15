/* global THREE */
/**
 * Material Removal Simulation Module
 * Simulates cutting/milling operations with real-time visual feedback
 *
 * Features:
 * - Voxel-based material representation
 * - Progressive removal visualization
 * - Volume calculations
 * - Performance-optimized for real-time updates
 */

/**
 * Voxel Grid for material representation
 * Uses a 3D grid to track material presence
 */
export class VoxelGrid {
  constructor(bounds, resolution = 1.0) {
    this.bounds = bounds; // { min: {x, y, z}, max: {x, y, z} }
    this.resolution = resolution; // voxel size in mm

    // Calculate grid dimensions
    this.gridX = Math.ceil((bounds.max.x - bounds.min.x) / resolution);
    this.gridY = Math.ceil((bounds.max.y - bounds.min.y) / resolution);
    this.gridZ = Math.ceil((bounds.max.z - bounds.min.z) / resolution);

    // Initialize grid (1 = material present, 0 = removed)
    this.grid = new Uint8Array(this.gridX * this.gridY * this.gridZ);
    this.grid.fill(1); // Start with full material block

    this.totalVoxels = this.gridX * this.gridY * this.gridZ;
    this.removedVoxels = 0;
  }

  /**
   * Convert world coordinates to grid indices
   */
  worldToGrid(x, y, z) {
    const i = Math.floor((x - this.bounds.min.x) / this.resolution);
    const j = Math.floor((y - this.bounds.min.y) / this.resolution);
    const k = Math.floor((z - this.bounds.min.z) / this.resolution);
    return [i, j, k];
  }

  /**
   * Convert grid indices to array index
   */
  gridToIndex(i, j, k) {
    if (i < 0 || i >= this.gridX || j < 0 || j >= this.gridY || k < 0 || k >= this.gridZ) {
      return -1;
    }
    return i + j * this.gridX + k * this.gridX * this.gridY;
  }

  /**
   * Check if material exists at position
   */
  hasMaterial(x, y, z) {
    const [i, j, k] = this.worldToGrid(x, y, z);
    const idx = this.gridToIndex(i, j, k);
    return idx >= 0 && this.grid[idx] === 1;
  }

  /**
   * Remove material in a spherical region (tool sweep)
   */
  removeSphere(x, y, z, radius) {
    const [i, j, k] = this.worldToGrid(x, y, z);
    const r = Math.ceil(radius / this.resolution);

    let removed = 0;

    // Iterate through cubic region around sphere center
    for (let di = -r; di <= r; di++) {
      for (let dj = -r; dj <= r; dj++) {
        for (let dk = -r; dk <= r; dk++) {
          const gi = i + di;
          const gj = j + dj;
          const gk = k + dk;

          // Check if point is within sphere
          const distSq = di * di + dj * dj + dk * dk;
          if (distSq <= r * r) {
            const idx = this.gridToIndex(gi, gj, gk);
            if (idx >= 0 && this.grid[idx] === 1) {
              this.grid[idx] = 0;
              removed++;
            }
          }
        }
      }
    }

    this.removedVoxels += removed;
    return removed;
  }

  /**
   * Remove material along a line segment (tool path)
   */
  removePath(x1, y1, z1, x2, y2, z2, radius) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (length === 0) return 0;

    const steps = Math.ceil(length / (this.resolution * 0.5));
    const stepX = dx / steps;
    const stepY = dy / steps;
    const stepZ = dz / steps;

    let totalRemoved = 0;

    for (let i = 0; i <= steps; i++) {
      const x = x1 + stepX * i;
      const y = y1 + stepY * i;
      const z = z1 + stepZ * i;
      totalRemoved += this.removeSphere(x, y, z, radius);
    }

    return totalRemoved;
  }

  /**
   * Get removal statistics
   */
  getStats() {
    const removedPercentage = (this.removedVoxels / this.totalVoxels) * 100;
    const voxelVolume = Math.pow(this.resolution, 3) / 1000; // convert mm³ to cm³
    const removedVolume = this.removedVoxels * voxelVolume;
    const totalVolume = this.totalVoxels * voxelVolume;
    const remainingVolume = (this.totalVoxels - this.removedVoxels) * voxelVolume;

    return {
      totalVoxels: this.totalVoxels,
      removedVoxels: this.removedVoxels,
      remainingVoxels: this.totalVoxels - this.removedVoxels,
      removedPercentage: removedPercentage,
      removedVolume: removedVolume,
      totalVolume: totalVolume,
      remainingVolume: remainingVolume,
    };
  }

  /**
   * Reset grid to full material
   */
  reset() {
    this.grid.fill(1);
    this.removedVoxels = 0;
  }
}

/**
 * Material Removal Simulator
 * Coordinates voxel grid and Three.js visualization
 */
export class MaterialRemovalSimulator {
  constructor(scene, bounds, options = {}) {
    this.scene = scene;
    this.bounds = bounds;
    this.options = {
      resolution: 2.0, // mm per voxel (lower = more detail, slower)
      materialColor: 0xcccccc,
      materialOpacity: 0.3,
      showRemovedVoxels: false,
      updateInterval: 10, // Update visual every N operations
      ...options,
    };

    this.grid = new VoxelGrid(bounds, this.options.resolution);
    this.materialBlock = null;
    this.removedMeshes = [];
    this.operationCount = 0;
    this.enabled = true;
    this.updateInterval = this.options.updateInterval;

    this._createMaterialBlock();
  }

  /**
   * Create initial material block visualization
   */
  _createMaterialBlock() {
    if (typeof THREE === 'undefined') return;

    const width = this.bounds.max.x - this.bounds.min.x;
    const height = this.bounds.max.y - this.bounds.min.y;
    const depth = this.bounds.max.z - this.bounds.min.z;

    const geometry = new THREE.BoxGeometry(width, depth, height);
    const material = new THREE.MeshPhongMaterial({
      color: this.options.materialColor,
      transparent: true,
      opacity: this.options.materialOpacity,
      side: THREE.DoubleSide,
    });

    this.materialBlock = new THREE.Mesh(geometry, material);

    // Position at center of bounds
    const centerX = (this.bounds.max.x + this.bounds.min.x) / 2;
    const centerY = (this.bounds.max.y + this.bounds.min.y) / 2;
    const centerZ = (this.bounds.max.z + this.bounds.min.z) / 2;

    // Three.js coordinate mapping: CNC Z -> Three.js Y
    this.materialBlock.position.set(centerX, centerZ, centerY);
    this.materialBlock.visible = this.enabled;

    if (this.scene) {
      this.scene.add(this.materialBlock);
    }
  }

  /**
   * Enable/disable simulation
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.materialBlock) {
      this.materialBlock.visible = enabled;
    }
  }

  /**
   * Process tool movement and remove material
   */
  processCut(startPos, endPos, toolRadius) {
    if (!this.enabled) return;

    const removed = this.grid.removePath(
      startPos.x,
      startPos.y,
      startPos.z,
      endPos.x,
      endPos.y,
      endPos.z,
      toolRadius
    );

    this.operationCount++;

    // Update visualization periodically for performance
    if (this.operationCount % this.updateInterval === 0) {
      this._updateVisualization();
    }

    return removed;
  }

  /**
   * Update visual representation based on voxel grid
   */
  _updateVisualization() {
    if (!this.materialBlock) return;

    const stats = this.grid.getStats();

    // Fade material as it's removed
    const remainingPercent = 100 - stats.removedPercentage;
    this.materialBlock.material.opacity = this.options.materialOpacity * (remainingPercent / 100);

    // Optional: Change color based on removal
    if (remainingPercent < 50) {
      this.materialBlock.material.color.setHex(0xff6666); // Reddish when heavily cut
    }
  }

  /**
   * Force visual update
   */
  updateNow() {
    this._updateVisualization();
  }

  /**
   * Get current statistics
   */
  getStats() {
    return this.grid.getStats();
  }

  /**
   * Reset simulation
   */
  reset() {
    this.grid.reset();
    this.operationCount = 0;

    if (this.materialBlock) {
      this.materialBlock.material.opacity = this.options.materialOpacity;
      this.materialBlock.material.color.setHex(this.options.materialColor);
    }
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.materialBlock) {
      if (this.scene) {
        this.scene.remove(this.materialBlock);
      }
      this.materialBlock.geometry.dispose();
      this.materialBlock.material.dispose();
      this.materialBlock = null;
    }

    this.removedMeshes.forEach((mesh) => {
      if (this.scene) {
        this.scene.remove(mesh);
      }
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.removedMeshes = [];
  }
}

/**
 * Helper function to estimate workpiece bounds from toolpath
 */
export function estimateWorkpieceBounds(toolpathPoints, padding = 5) {
  if (toolpathPoints.length === 0) {
    return {
      min: { x: -padding, y: -padding, z: -padding },
      max: { x: padding, y: padding, z: padding },
    };
  }

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (const point of toolpathPoints) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    minZ = Math.min(minZ, point.z);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    maxZ = Math.max(maxZ, point.z);
  }

  return {
    min: {
      x: minX - padding,
      y: minY - padding,
      z: Math.min(minZ - padding, 0), // Ensure material extends below work
    },
    max: {
      x: maxX + padding,
      y: maxY + padding,
      z: Math.max(maxZ + padding, 10), // Ensure reasonable height
    },
  };
}

// Export all
export default {
  VoxelGrid,
  MaterialRemovalSimulator,
  estimateWorkpieceBounds,
};
