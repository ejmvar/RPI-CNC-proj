/**
 * WebGL Optimization Utilities
 * Tips and helpers for optimizing Three.js rendering
 */

class WebGLOptimizer {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.scene = scene;
  }

  /**
   * Apply recommended optimizations
   */
  applyOptimizations() {
    this.optimizeRenderer();
    this.optimizeScene();
  }

  /**
   * Optimize renderer settings
   */
  optimizeRenderer() {
    // Enable hardware acceleration
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Enable power preference
    const gl = this.renderer.getContext();
    if (gl) {
      console.log('WebGL Version:', gl.getParameter(gl.VERSION));
      console.log('WebGL Vendor:', gl.getParameter(gl.VENDOR));
    }

    // Enable logarithmic depth buffer for large scenes
    this.renderer.logarithmicDepthBuffer = true;

    // Sort objects for optimal rendering
    this.renderer.sortObjects = true;
  }

  /**
   * Optimize scene
   */
  optimizeScene() {
    // Enable frustum culling
    this.scene.traverse((object) => {
      if (object.isMesh) {
        object.frustumCulled = true;
      }
    });
  }

  /**
   * Enable geometry instancing for repeated objects
   */
  enableInstancing(geometry, material, count, positions) {
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      const position = positions[i];
      matrix.setPosition(position.x, position.y, position.z);
      instancedMesh.setMatrixAt(i, matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    return instancedMesh;
  }

  /**
   * Merge geometries to reduce draw calls
   */
  mergeGeometries(geometries) {
    return THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
  }

  /**
   * Dispose unused resources
   */
  disposeObject(object) {
    if (object.geometry) {
      object.geometry.dispose();
    }

    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => this.disposeMaterial(material));
      } else {
        this.disposeMaterial(object.material);
      }
    }

    if (object.dispose) {
      object.dispose();
    }
  }

  /**
   * Dispose material and its textures
   */
  disposeMaterial(material) {
    if (material.map) material.map.dispose();
    if (material.lightMap) material.lightMap.dispose();
    if (material.bumpMap) material.bumpMap.dispose();
    if (material.normalMap) material.normalMap.dispose();
    if (material.specularMap) material.specularMap.dispose();
    if (material.envMap) material.envMap.dispose();

    material.dispose();
  }

  /**
   * Get optimization report
   */
  getReport() {
    const info = this.renderer.info;

    return {
      memory: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      render: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
      },
      programs: info.programs.length,
      recommendations: this.getRecommendations(info),
    };
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(info) {
    const recommendations = [];

    if (info.render.calls > 100) {
      recommendations.push({
        type: 'warning',
        message: `High draw call count (${info.render.calls}). Consider merging geometries or using instancing.`,
      });
    }

    if (info.memory.geometries > 1000) {
      recommendations.push({
        type: 'warning',
        message: `High geometry count (${info.memory.geometries}). Consider level-of-detail (LOD) or geometry pooling.`,
      });
    }

    if (info.memory.textures > 100) {
      recommendations.push({
        type: 'info',
        message: `Many textures loaded (${info.memory.textures}). Consider texture atlases or compression.`,
      });
    }

    if (info.render.triangles > 1000000) {
      recommendations.push({
        type: 'warning',
        message: `High triangle count (${info.render.triangles.toLocaleString()}). Consider simplifying models.`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'Scene is well optimized!',
      });
    }

    return recommendations;
  }

  /**
   * Log optimization report
   */
  logReport() {
    const report = this.getReport();

    console.group('WebGL Optimization Report');
    console.log('Memory:', report.memory);
    console.log('Render Stats:', report.render);
    console.log('Programs:', report.programs);
    console.log('Recommendations:');
    report.recommendations.forEach((rec) => {
      console.log(`[${rec.type.toUpperCase()}]`, rec.message);
    });
    console.groupEnd();
  }
}

/**
 * Lazy loading utility for Three.js modules
 */
class LazyLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Lazy load a module
   */
  async load(modulePath) {
    if (this.cache.has(modulePath)) {
      return this.cache.get(modulePath);
    }

    try {
      const module = await import(modulePath);
      this.cache.set(modulePath, module);
      return module;
    } catch (error) {
      console.error(`Failed to load module: ${modulePath}`, error);
      throw error;
    }
  }

  /**
   * Preload modules
   */
  async preload(modulePaths) {
    return Promise.all(modulePaths.map((path) => this.load(path)));
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }
}

// Export
if (typeof window !== 'undefined') {
  window.WebGLOptimizer = WebGLOptimizer;
  window.LazyLoader = LazyLoader;
}

export { WebGLOptimizer, LazyLoader };
