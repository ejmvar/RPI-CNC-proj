/**
 * Three.js LOD (Level of Detail) Optimization Module
 * Phase 13.1: Performance Improvements - Three.js Optimization
 *
 * Implements LOD system for complex toolpaths to maintain 60 FPS rendering
 * Strategy: Simplify geometry detail based on zoom level and viewport distance
 */

// Note: THREE is expected to be available globally from Three.js library
// eslint-disable-next-line no-undef
const THREE = typeof window !== 'undefined' ? window.THREE : global.THREE;

export class ToolpathLOD {
  constructor(options = {}) {
    this.options = {
      maxDetailDistance: options.maxDetailDistance || 50, // Units from camera
      mediumDetailDistance: options.mediumDetailDistance || 150,
      lowDetailDistance: options.lowDetailDistance || 500,
      enableLOD: options.enableLOD !== false,
      ...options,
    };

    this.lodLevels = new Map(); // Store LOD data by geometry ID
  }

  /**
   * Create LOD levels for a toolpath geometry
   * Reduces triangle count by simplifying curves at distance
   * @param {THREE.BufferGeometry} geometry - Original full-detail geometry
   * @param {string} geometryId - Unique identifier for this geometry
   * @returns {THREE.LOD} Three.js LOD object
   */
  createLODGeometry(geometry, geometryId) {
    if (!this.options.enableLOD) {
      const lod = new THREE.LOD();
      lod.addLevel(geometry, 0);
      return lod;
    }

    const lod = new THREE.LOD();

    // Level 0 (close - full detail)
    lod.addLevel(geometry, this.options.maxDetailDistance);

    // Level 1 (medium - 50% reduction)
    const mediumGeometry = this.simplifyGeometry(geometry, 0.5);
    lod.addLevel(mediumGeometry, this.options.mediumDetailDistance);

    // Level 2 (far - 75% reduction)
    const lowGeometry = this.simplifyGeometry(geometry, 0.25);
    lod.addLevel(lowGeometry, this.options.lowDetailDistance);

    // Level 3 (very far - simple representation)
    const minimumGeometry = this.simplifyGeometry(geometry, 0.1);
    lod.addLevel(minimumGeometry, this.options.lowDetailDistance * 2);

    this.lodLevels.set(geometryId, lod);
    return lod;
  }

  /**
   * Simplify geometry by reducing triangle count
   * Uses simple vertex decimation strategy
   * @param {THREE.BufferGeometry} geometry - Original geometry
   * @param {number} reductionFactor - Keep this fraction of vertices (0-1)
   * @returns {THREE.BufferGeometry} Simplified geometry
   */
  simplifyGeometry(geometry, reductionFactor) {
    const simplified = geometry.clone();

    if (reductionFactor >= 1 || reductionFactor <= 0) {
      return simplified;
    }

    const positions = simplified.getAttribute('position');
    if (!positions) return simplified;

    const stride = Math.max(1, Math.floor(1 / reductionFactor));

    // Create index buffer with decimated vertices
    const indices = [];
    for (let i = 0; i < positions.count; i += stride) {
      indices.push(i);
    }

    simplified.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    return simplified;
  }

  /**
   * Update LOD camera distance (call on camera update)
   * @param {THREE.LOD} lod - LOD object
   * @param {THREE.Vector3} cameraPosition - Current camera position
   * @param {THREE.Vector3} objectPosition - Object position
   */
  updateLODDistance(lod, cameraPosition, objectPosition) {
    const distance = cameraPosition.distanceTo(objectPosition);
    lod.update(distance);
  }

  /**
   * Batch update all LOD objects
   * @param {THREE.Camera} camera - Current camera
   * @param {Array<THREE.LOD>} lodObjects - Array of LOD objects
   * @param {Array<THREE.Vector3>} positions - Corresponding positions
   */
  updateAllLOD(camera, lodObjects, positions) {
    lodObjects.forEach((lod, index) => {
      if (positions[index]) {
        this.updateLODDistance(lod, camera.position, positions[index]);
      }
    });
  }

  /**
   * Get memory savings from LOD implementation
   * @returns {Object} Statistics about LOD optimization
   */
  getOptimizationStats() {
    return {
      lodLevelsCount: this.lodLevels.size,
      approximateMemorySaved: this.lodLevels.size * 40, // Rough estimate in KB
      recommendedUpdateFrequency: '60fps', // Update LOD every frame
    };
  }
}

/**
 * Geometry Instancing Optimizer
 * Reuse geometry for repeated elements (e.g., multiple drill holes)
 */
export class InstancedGeometryOptimizer {
  constructor() {
    this.instances = new Map();
  }

  /**
   * Create instanced mesh for repeated geometry
   * @param {THREE.BufferGeometry} baseGeometry - Shared geometry
   * @param {THREE.Material} material - Shared material
   * @param {Array<THREE.Vector3>} positions - Positions for instances
   * @returns {THREE.InstancedMesh} Optimized instanced mesh
   */
  createInstancedMesh(baseGeometry, material, positions) {
    const count = positions.length;
    const instancedMesh = new THREE.InstancedMesh(baseGeometry, material, count);

    // Set instance transforms
    const matrix = new THREE.Matrix4();
    positions.forEach((position, index) => {
      matrix.setPosition(position);
      instancedMesh.setMatrixAt(index, matrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    this.instances.set(baseGeometry.uuid, instancedMesh);

    return instancedMesh;
  }

  /**
   * Update instance at specific index
   * @param {THREE.InstancedMesh} mesh - Instanced mesh
   * @param {number} index - Instance index
   * @param {THREE.Matrix4} matrix - New transform matrix
   */
  updateInstance(mesh, index, matrix) {
    mesh.setMatrixAt(index, matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Batch update multiple instances
   * @param {THREE.InstancedMesh} mesh - Instanced mesh
   * @param {Array<THREE.Matrix4>} matrices - Transform matrices
   */
  batchUpdateInstances(mesh, matrices) {
    matrices.forEach((matrix, index) => {
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Get memory savings from instancing
   * @param {THREE.InstancedMesh} mesh - Instanced mesh
   * @returns {number} Approximate memory saved in KB
   */
  getMemorySavings(mesh) {
    // Rough calculation: (count - 1) * geometry size
    const geometrySize = mesh.geometry.getAttribute('position').array.byteLength;
    return ((mesh.count - 1) * geometrySize) / 1024;
  }
}

/**
 * Viewport Culling Optimizer
 * Don't render geometry outside camera frustum
 */
export class FrustumCullOptimizer {
  constructor() {
    this.frustum = new THREE.Frustum();
    this.cameraMatrix = new THREE.Matrix4();
  }

  /**
   * Update frustum from camera
   * @param {THREE.Camera} camera - Current camera
   */
  updateFrustum(camera) {
    this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  /**
   * Test if object is visible in frustum
   * @param {THREE.Object3D} object - Object to test
   * @returns {boolean} True if visible
   */
  isObjectVisible(object) {
    const box = new THREE.Box3().setFromObject(object);
    return this.frustum.intersectsBox(box);
  }

  /**
   * Batch cull objects
   * @param {Array<THREE.Object3D>} objects - Objects to test
   * @returns {Array<THREE.Object3D>} Visible objects
   */
  cullObjects(objects) {
    return objects.filter((obj) => this.isObjectVisible(obj));
  }
}

/**
 * Object Pooling for Dynamic Geometry
 * Reuse objects instead of creating/destroying repeatedly
 */
export class GeometryObjectPool {
  constructor(geometryFactory, poolSize = 100) {
    this.geometryFactory = geometryFactory;
    this.availableObjects = [];
    this.inUseObjects = new Set();

    // Pre-allocate pool
    for (let i = 0; i < poolSize; i++) {
      this.availableObjects.push(geometryFactory());
    }
  }

  /**
   * Acquire object from pool
   * @returns {THREE.Object3D} Object from pool or newly created
   */
  acquire() {
    let obj;
    if (this.availableObjects.length > 0) {
      obj = this.availableObjects.pop();
    } else {
      obj = this.geometryFactory();
    }
    this.inUseObjects.add(obj);
    return obj;
  }

  /**
   * Return object to pool
   * @param {THREE.Object3D} obj - Object to return
   */
  release(obj) {
    if (this.inUseObjects.has(obj)) {
      this.inUseObjects.delete(obj);
      // Reset object state
      obj.visible = false;
      obj.position.set(0, 0, 0);
      this.availableObjects.push(obj);
    }
  }

  /**
   * Get pool statistics
   * @returns {Object} Pool stats
   */
  getStats() {
    return {
      available: this.availableObjects.length,
      inUse: this.inUseObjects.size,
      total: this.availableObjects.length + this.inUseObjects.size,
    };
  }
}

export default {
  ToolpathLOD,
  InstancedGeometryOptimizer,
  FrustumCullOptimizer,
  GeometryObjectPool,
};
