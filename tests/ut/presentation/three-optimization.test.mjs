/**
 * Three.js Optimization Tests (Phase 13.1)
 * Tests LOD, instancing, frustum culling, and object pooling
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  ToolpathLOD,
  InstancedGeometryOptimizer,
  FrustumCullOptimizer,
  GeometryObjectPool,
} from '../../../modules/presentation/three-optimization.mjs';

// Mock THREE.js objects for testing
const mockTHREE = {
  LOD: class LOD {
    constructor() {
      this.levels = [];
      this.currentDistance = 0;
    }
    addLevel(obj, distance) {
      this.levels.push({ obj, distance });
    }
    update(distance) {
      this.currentDistance = distance;
    }
  },
  BufferGeometry: class BufferGeometry {
    constructor() {
      this.uuid = Math.random().toString();
      this.attributes = {};
      this.index = null;
    }
    clone() {
      const cloned = new this.constructor();
      cloned.uuid = this.uuid;
      cloned.attributes = { ...this.attributes };
      cloned.index = this.index;
      return cloned;
    }
    getAttribute(name) {
      return this.attributes[name];
    }
    setIndex(index) {
      this.index = index;
    }
  },
  BufferAttribute: class BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
      this.count = array.length / itemSize;
    }
  },
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    distanceTo(v) {
      const dx = v.x - this.x;
      const dy = v.y - this.y;
      const dz = v.z - this.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  },
  Matrix4: class Matrix4 {
    constructor() {
      this.elements = new Float32Array(16);
    }
    setPosition(v) {
      this.elements[12] = v.x;
      this.elements[13] = v.y;
      this.elements[14] = v.z;
    }
    multiplyMatrices() {
      return this;
    }
  },
  Frustum: class Frustum {
    constructor() {
      this.planes = [];
    }
    setFromProjectionMatrix() {
      // Mock implementation
    }
    intersectsBox() {
      return true; // Mock: assume visible
    }
  },
  Box3: class Box3 {
    constructor() {
      this.min = new mockTHREE.Vector3();
      this.max = new mockTHREE.Vector3();
    }
    setFromObject() {
      return this;
    }
  },
  InstancedMesh: class InstancedMesh {
    constructor(geometry, material, count) {
      this.geometry = geometry;
      this.material = material;
      this.count = count;
      this.instanceMatrix = { needsUpdate: false };
    }
    setMatrixAt() {
      // Mock implementation
    }
  },
};

// Make THREE available globally for imports
global.THREE = mockTHREE;

describe('Phase 13.1: Three.js Optimization', () => {
  let lod, geometry, instancer, frustum, pool;

  beforeEach(() => {
    lod = new ToolpathLOD();

    // Create mock geometry
    geometry = new mockTHREE.BufferGeometry();
    geometry.attributes.position = new mockTHREE.BufferAttribute(new Float32Array(1000), 3);

    instancer = new InstancedGeometryOptimizer();
    frustum = new FrustumCullOptimizer();

    // Pool with mock factory
    pool = new GeometryObjectPool(
      () => ({
        visible: true,
        position: { set: jest.fn() },
      }),
      10
    );
  });

  describe('LOD (Level of Detail) System', () => {
    test('creates LOD object with multiple levels', () => {
      const lodGeometry = lod.createLODGeometry(geometry, 'test-geometry');

      expect(lodGeometry).toBeDefined();
      expect(lodGeometry.levels).toHaveLength(4); // 4 LOD levels
    });

    test('LOD levels have increasing distance thresholds', () => {
      const lodGeometry = lod.createLODGeometry(geometry, 'test-geometry');

      expect(lodGeometry.levels[0].distance).toBeLessThan(lodGeometry.levels[1].distance);
      expect(lodGeometry.levels[1].distance).toBeLessThan(lodGeometry.levels[2].distance);
    });

    test('stores LOD in cache by geometry ID', () => {
      lod.createLODGeometry(geometry, 'unique-id-123');

      expect(lod.lodLevels.has('unique-id-123')).toBe(true);
    });

    test('simplifies geometry based on reduction factor', () => {
      const simplified = lod.simplifyGeometry(geometry, 0.5);

      expect(simplified).toBeDefined();
      expect(simplified.index).toBeDefined();
    });

    test('updates LOD distance based on camera position', () => {
      const lodGeometry = lod.createLODGeometry(geometry, 'test');
      const camera = new mockTHREE.Vector3(0, 0, 0);
      const object = new mockTHREE.Vector3(50, 0, 0);

      lod.updateLODDistance(lodGeometry, camera, object);

      expect(lodGeometry.currentDistance).toBeCloseTo(50, 0);
    });

    test('provides optimization statistics', () => {
      lod.createLODGeometry(geometry, 'test1');
      lod.createLODGeometry(geometry, 'test2');

      const stats = lod.getOptimizationStats();

      expect(stats.lodLevelsCount).toBe(2);
      expect(stats.approximateMemorySaved).toBeGreaterThan(0);
    });

    test('handles multiple geometry updates efficiently', () => {
      const lodGeometries = [];
      for (let i = 0; i < 5; i++) {
        lodGeometries.push(lod.createLODGeometry(geometry, `geom-${i}`));
      }

      // Test individual updates instead of batch
      const camera = new mockTHREE.Vector3(0, 0, 0);
      const position = new mockTHREE.Vector3(100, 0, 0);

      lodGeometries.forEach((lodGeom) => {
        lod.updateLODDistance(lodGeom, camera, position);
      });

      // Should update without error
      expect(lodGeometries[0].currentDistance).toBeCloseTo(100, 0);
      expect(lodGeometries[4].currentDistance).toBeCloseTo(100, 0);
    });

    test('disables LOD when option is false', () => {
      const noLod = new ToolpathLOD({ enableLOD: false });
      const lodGeometry = noLod.createLODGeometry(geometry, 'test');

      // Should have only 1 level when LOD disabled
      expect(lodGeometry.levels).toHaveLength(1);
    });
  });

  describe('Instanced Geometry Optimizer', () => {
    test('creates instanced mesh for repeated geometry', () => {
      const positions = [
        new mockTHREE.Vector3(0, 0, 0),
        new mockTHREE.Vector3(10, 0, 0),
        new mockTHREE.Vector3(20, 0, 0),
      ];

      const mesh = instancer.createInstancedMesh(geometry, {}, positions);

      expect(mesh.count).toBe(3);
    });

    test('updates individual instance transforms', () => {
      const mesh = instancer.createInstancedMesh(geometry, {}, [new mockTHREE.Vector3(0, 0, 0)]);

      const matrix = new mockTHREE.Matrix4();
      matrix.setPosition(new mockTHREE.Vector3(10, 10, 10));

      instancer.updateInstance(mesh, 0, matrix);

      expect(mesh.instanceMatrix.needsUpdate).toBe(true);
    });

    test('batch updates multiple instances', () => {
      const mesh = instancer.createInstancedMesh(geometry, {}, [
        new mockTHREE.Vector3(0, 0, 0),
        new mockTHREE.Vector3(10, 0, 0),
      ]);

      const matrices = [new mockTHREE.Matrix4(), new mockTHREE.Matrix4()];

      instancer.batchUpdateInstances(mesh, matrices);

      expect(mesh.instanceMatrix.needsUpdate).toBe(true);
    });

    test('calculates memory savings from instancing', () => {
      const positions = [];
      for (let i = 0; i < 100; i++) {
        positions.push(new mockTHREE.Vector3(i * 10, 0, 0));
      }

      const mesh = instancer.createInstancedMesh(geometry, {}, positions);
      const savings = instancer.getMemorySavings(mesh);

      expect(savings).toBeGreaterThan(0);
    });

    test('stores instanced meshes by geometry UUID', () => {
      const positions = [new mockTHREE.Vector3(0, 0, 0)];
      instancer.createInstancedMesh(geometry, {}, positions);

      expect(instancer.instances.has(geometry.uuid)).toBe(true);
    });
  });

  describe('Frustum Culling Optimizer', () => {
    test('updates frustum from camera', () => {
      const mockCamera = {
        projectionMatrix: new mockTHREE.Matrix4(),
        matrixWorldInverse: new mockTHREE.Matrix4(),
      };

      expect(() => frustum.updateFrustum(mockCamera)).not.toThrow();
    });

    test('tests if object is visible in frustum', () => {
      const mockObject = {};
      const isVisible = frustum.isObjectVisible(mockObject);

      expect(typeof isVisible).toBe('boolean');
    });

    test('batch culls multiple objects', () => {
      const objects = [{}, {}, {}];
      const visible = frustum.cullObjects(objects);

      expect(visible.length).toBeGreaterThan(0);
    });

    test('efficiently filters large object lists', () => {
      const objects = Array(1000).fill({});
      const visible = frustum.cullObjects(objects);

      expect(visible).toHaveLength(1000); // Mock returns all as visible
    });
  });

  describe('Object Pooling', () => {
    test('acquires objects from pool', () => {
      const obj1 = pool.acquire();
      const obj2 = pool.acquire();

      expect(obj1).toBeDefined();
      expect(obj2).toBeDefined();
      expect(obj1).not.toBe(obj2);
    });

    test('returns objects to pool', () => {
      const obj = pool.acquire();
      const statsBefore = pool.getStats();

      pool.release(obj);
      const statsAfter = pool.getStats();

      expect(statsAfter.available).toBeGreaterThan(statsBefore.available);
    });

    test('reuses released objects', () => {
      const obj = pool.acquire();
      pool.release(obj);

      const reused = pool.acquire();
      expect(reused).toBe(obj);
    });

    test('creates new objects when pool is empty', () => {
      // Empty the pool
      const stats = pool.getStats();
      for (let i = 0; i < stats.total; i++) {
        pool.acquire();
      }

      const newObj = pool.acquire();
      expect(newObj).toBeDefined();
    });

    test('tracks pool statistics accurately', () => {
      const obj1 = pool.acquire();
      pool.acquire();

      let stats = pool.getStats();
      expect(stats.inUse).toBe(2);

      pool.release(obj1);
      stats = pool.getStats();

      expect(stats.available).toBeGreaterThan(0);
      expect(stats.inUse).toBe(1);
    });

    test('resets object state when releasing', () => {
      const obj = pool.acquire();
      pool.release(obj);

      expect(obj.visible).toBe(false);
      expect(obj.position.set).toHaveBeenCalledWith(0, 0, 0);
    });
  });

  describe('Performance Benchmark', () => {
    test('LOD reduces render calls efficiently', () => {
      const geometries = [];
      for (let i = 0; i < 50; i++) {
        geometries.push(lod.createLODGeometry(geometry, `geom-${i}`));
      }

      expect(geometries.length).toBe(50);
      expect(lod.lodLevels.size).toBe(50);
    });

    test('instancing scales to many objects', () => {
      const positions = [];
      for (let i = 0; i < 1000; i++) {
        positions.push(new mockTHREE.Vector3(i, 0, 0));
      }

      const mesh = instancer.createInstancedMesh(geometry, {}, positions);
      expect(mesh.count).toBe(1000);
    });

    test('object pool reduces GC pressure', () => {
      const initialStats = pool.getStats();

      for (let i = 0; i < 100; i++) {
        const obj = pool.acquire();
        pool.release(obj);
      }

      const finalStats = pool.getStats();
      expect(finalStats.total).toBe(initialStats.total); // No new allocations
    });

    test('frustum culling is efficient for large scenes', () => {
      const startTime = Date.now();

      const largeObjectList = Array(5000).fill({});
      frustum.cullObjects(largeObjectList);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Integration & Edge Cases', () => {
    test('combines LOD + instancing for maximum optimization', () => {
      const positions = [new mockTHREE.Vector3(0, 0, 0), new mockTHREE.Vector3(10, 0, 0)];

      const mesh = instancer.createInstancedMesh(geometry, {}, positions);
      const lodMesh = lod.createLODGeometry(mesh.geometry, 'combo-test');

      expect(mesh).toBeDefined();
      expect(lodMesh).toBeDefined();
    });

    test('handles zero-distance camera updates gracefully', () => {
      const lodGeometry = lod.createLODGeometry(geometry, 'test');
      const camera = new mockTHREE.Vector3(0, 0, 0);
      const object = new mockTHREE.Vector3(0, 0, 0);

      expect(() => lod.updateLODDistance(lodGeometry, camera, object)).not.toThrow();
    });

    test('pool handles rapid acquire/release cycles', () => {
      for (let i = 0; i < 100; i++) {
        const obj = pool.acquire();
        pool.release(obj);
      }

      const stats = pool.getStats();
      expect(stats.inUse).toBe(0);
    });
  });
});
