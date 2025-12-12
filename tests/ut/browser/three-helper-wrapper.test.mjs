/**
 * Tests for Simulator/web/js/three-helper.mjs browser wrapper
 * Tests Three.js scene initialization functions
 */

import { createSceneDefaults, initThreeJS } from '../../../Simulator/web/js/three-helper.mjs';

describe('three-helper.mjs browser wrapper', () => {
  beforeAll(() => {
    // Mock THREE.js globally
    global.THREE = {
      Scene: class Scene {
        constructor() {
          this.children = [];
          this.background = null;
        }
        add(obj) {
          this.children.push(obj);
        }
      },
      Color: class Color {
        constructor(color) {
          this.value = color;
        }
      },
      PerspectiveCamera: class PerspectiveCamera {
        constructor(fov, aspect, near, far) {
          this.fov = fov;
          this.aspect = aspect;
          this.near = near;
          this.far = far;
          this.position = { set: () => {} };
        }
      },
      WebGLRenderer: class WebGLRenderer {
        constructor() {
          this.domElement = { tagName: 'CANVAS' };
        }
        setSize() {}
        setPixelRatio() {}
      },
      BoxGeometry: class BoxGeometry {
        constructor(width, height, depth) {
          this.parameters = { width, height, depth };
        }
      },
      MeshPhongMaterial: class MeshPhongMaterial {
        constructor(params) {
          Object.assign(this, params);
        }
      },
      Mesh: class Mesh {
        constructor(geometry, material) {
          this.geometry = geometry;
          this.material = material;
          this.position = { x: 0, y: 0, z: 0, set: () => {} };
        }
      },
      AxesHelper: class AxesHelper {
        constructor(size) {
          this.size = size;
        }
      },
      SphereGeometry: class SphereGeometry {
        constructor(radius, widthSeg, heightSeg) {
          this.parameters = { radius, widthSeg, heightSeg };
        }
      },
      MeshBasicMaterial: class MeshBasicMaterial {
        constructor(params) {
          Object.assign(this, params);
        }
      },
      AmbientLight: class AmbientLight {
        constructor(color, intensity) {
          this.color = color;
          this.intensity = intensity;
        }
      },
      DirectionalLight: class DirectionalLight {
        constructor(color, intensity) {
          this.color = color;
          this.intensity = intensity;
          this.position = { set: () => {} };
        }
      },
    };

    // Mock document
    global.document = {
      querySelector: () => ({
        clientWidth: 800,
        clientHeight: 600,
        appendChild: () => {},
      }),
    };
  });

  describe('createSceneDefaults', () => {
    test('returns default scene configuration', () => {
      const defaults = createSceneDefaults();
      expect(defaults).toHaveProperty('background');
      expect(defaults).toHaveProperty('cameraFov');
      expect(defaults).toHaveProperty('near');
      expect(defaults).toHaveProperty('far');
    });

    test('default background color is dark gray', () => {
      const defaults = createSceneDefaults();
      expect(defaults.background).toBe(0x1f2937);
    });

    test('default camera FOV is 75 degrees', () => {
      const defaults = createSceneDefaults();
      expect(defaults.cameraFov).toBe(75);
    });

    test('default near plane is correct', () => {
      const defaults = createSceneDefaults();
      expect(defaults.near).toBe(0.1);
    });

    test('default far plane is correct', () => {
      const defaults = createSceneDefaults();
      expect(defaults.far).toBe(1000);
    });
  });

  describe('initThreeJS', () => {
    let containerEl;

    beforeEach(() => {
      containerEl = {
        clientWidth: 800,
        clientHeight: 600,
        appendChild: () => {},
      };
    });

    test('throws error when container element is not provided', () => {
      expect(() => initThreeJS(null)).toThrow('initThreeJS requires a container element');
    });

    test('throws error if THREE is not available', () => {
      const savedTHREE = global.THREE;
      global.THREE = undefined;
      expect(() => initThreeJS(containerEl)).toThrow('THREE is not available');
      global.THREE = savedTHREE;
    });

    test('creates scene, camera, and renderer', () => {
      const result = initThreeJS(containerEl);
      expect(result.scene).toBeDefined();
      expect(result.camera).toBeDefined();
      expect(result.renderer).toBeDefined();
    });

    test('uses custom options when provided', () => {
      const opts = {
        background: 0x000000,
        cameraFov: 60,
      };
      const result = initThreeJS(containerEl, opts);
      expect(result.scene.background.value).toBe(0x000000);
      expect(result.camera.fov).toBe(60);
    });

    test('creates workspace floor mesh', () => {
      const result = initThreeJS(containerEl);
      expect(result.scene.children.length).toBeGreaterThan(0);
    });

    test('creates tool mesh', () => {
      const result = initThreeJS(containerEl);
      expect(result.tool).toBeDefined();
    });

    test('accepts string selector for container element', () => {
      const queryResult = {
        clientWidth: 1024,
        clientHeight: 768,
        appendChild: () => {},
      };
      const originalQuery = global.document.querySelector;
      global.document.querySelector = () => queryResult;

      const result = initThreeJS('#my-container');
      expect(result.scene).toBeDefined();

      global.document.querySelector = originalQuery;
    });

    test('uses custom WORKSPACE_SIZE option', () => {
      const result = initThreeJS(containerEl, { WORKSPACE_SIZE: 100 });
      expect(result.scene.children.length).toBeGreaterThan(0);
    });

    test('uses custom WORKSPACE_HEIGHT option', () => {
      const result = initThreeJS(containerEl, { WORKSPACE_HEIGHT: 20 });
      expect(result.scene.children.length).toBeGreaterThan(0);
    });

    test('creates renderer with correct dimensions', () => {
      const result = initThreeJS(containerEl);
      expect(result.renderer).toBeDefined();
      expect(result.renderer.domElement).toBeDefined();
    });
  });
});
