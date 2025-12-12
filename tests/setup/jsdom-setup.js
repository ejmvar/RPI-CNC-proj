/**
 * Browser environment setup for testing browser wrappers
 * Creates minimal browser globals without JSDOM (avoids ESM dependency issues)
 */

function createBrowserEnvironment() {
  // Create minimal document mock
  const elementMock = {
    style: {},
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => null),
    children: [],
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(() => false),
    },
  };

  global.document = {
    createElement: jest.fn(() => ({ ...elementMock })),
    getElementById: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => null),
    body: { ...elementMock },
  };

  global.window = {
    document: global.document,
    navigator: {
      userAgent: 'Node.js',
    },
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  global.HTMLElement = class HTMLElement {};
  global.Element = class Element {};

  return { document: global.document, window: global.window };
}

// Mock THREE.js objects for tests that need them
global.THREE = {
  Scene: class Scene {
    constructor() {
      this.children = [];
    }
    add(obj) {
      this.children.push(obj);
    }
    remove(obj) {
      const idx = this.children.indexOf(obj);
      if (idx > -1) this.children.splice(idx, 1);
    }
  },
  PerspectiveCamera: class PerspectiveCamera {
    constructor(fov, aspect, near, far) {
      this.fov = fov;
      this.aspect = aspect;
      this.near = near;
      this.far = far;
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        set: function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
      this.rotation = { x: 0, y: 0, z: 0 };
    }
    lookAt() {}
    updateProjectionMatrix() {}
  },
  WebGLRenderer: class WebGLRenderer {
    constructor() {
      this.domElement = {
        tagName: 'CANVAS',
        width: 800,
        height: 600,
      };
    }
    setSize() {}
    setPixelRatio() {}
  },
  DirectionalLight: class DirectionalLight {
    constructor(color, intensity) {
      this.color = color;
      this.intensity = intensity;
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        set: function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
      this.castShadow = false;
    }
  },
  AmbientLight: class AmbientLight {
    constructor(color, intensity) {
      this.color = color;
      this.intensity = intensity;
    }
  },
  GridHelper: class GridHelper {
    constructor(size, divisions) {
      this.size = size;
      this.divisions = divisions;
    }
  },
  AxesHelper: class AxesHelper {
    constructor(size) {
      this.size = size;
    }
  },
  BoxGeometry: class BoxGeometry {
    constructor(width, height, depth) {
      this.parameters = { width, height, depth };
    }
    dispose() {}
  },
  MeshStandardMaterial: class MeshStandardMaterial {
    constructor(params) {
      Object.assign(this, params);
    }
    dispose() {}
  },
  Mesh: class Mesh {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
      this.position = {
        x: 0,
        y: 0,
        z: 0,
        set: function (x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
        },
      };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.castShadow = false;
      this.receiveShadow = false;
    }
  },
  SphereGeometry: class SphereGeometry {
    constructor(radius, widthSegments, heightSegments) {
      this.parameters = { radius, widthSegments, heightSegments };
    }
    dispose() {}
  },
  LineBasicMaterial: class LineBasicMaterial {
    constructor(params) {
      Object.assign(this, params);
    }
    dispose() {}
  },
  BufferGeometry: class BufferGeometry {
    constructor() {
      this.attributes = {};
    }
    setAttribute(name, attribute) {
      this.attributes[name] = attribute;
    }
    dispose() {}
  },
  Float32BufferAttribute: class Float32BufferAttribute {
    constructor(array, itemSize) {
      this.array = array;
      this.itemSize = itemSize;
      this.count = array.length / itemSize;
    }
  },
  Line: class Line {
    constructor(geometry, material) {
      this.geometry = geometry;
      this.material = material;
    }
  },
  Vector3: class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  },
  Color: class Color {
    constructor(color) {
      this.value = color;
    }
  },
};

// Clean up after each test
afterEach(() => {
  // Clear mocks if needed
  if (global.document && typeof global.document.createElement.mockClear === 'function') {
    global.document.createElement.mockClear();
  }
});

module.exports = { createBrowserEnvironment };
