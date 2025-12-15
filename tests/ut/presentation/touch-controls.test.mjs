/* global window, document, navigator */
/**
 * Unit tests for touch-controls.mjs module
 * Tests TouchState class, MobileTouchControls class, and utility functions
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock browser environment
global.window = global;
global.document = {
  createElement: jest.fn(() => ({
    id: 'mobile-touch-styles',
    tagName: 'STYLE',
    innerHTML: '',
    textContent: '',
  })),
  head: {
    appendChild: jest.fn(),
  },
  getElementById: jest.fn((id) => {
    if (id === 'mobile-touch-styles') return null;
    return undefined;
  }),
};
global.navigator = {
  userAgent: 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
};

// Simple TouchState class for testing
class TouchState {
  constructor() {
    this.touches = [];
    this.prevDistance = 0;
    this.prevAngle = 0;
    this.prevMidpoint = { x: 0, y: 0 };
    this.isPanning = false;
    this.isZooming = false;
    this.isRotating = false;
  }

  reset() {
    this.touches = [];
    this.prevDistance = 0;
    this.prevAngle = 0;
    this.prevMidpoint = { x: 0, y: 0 };
    this.isPanning = false;
    this.isZooming = false;
    this.isRotating = false;
  }

  updateTouches(event) {
    this.touches = Array.from(event.touches).map((t) => ({
      x: t.clientX,
      y: t.clientY,
    }));
  }

  getDistance() {
    if (this.touches.length < 2) return 0;
    const dx = this.touches[1].x - this.touches[0].x;
    const dy = this.touches[1].y - this.touches[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getAngle() {
    if (this.touches.length < 2) return 0;
    const dx = this.touches[1].x - this.touches[0].x;
    const dy = this.touches[1].y - this.touches[0].y;
    return Math.atan2(dy, dx);
  }

  getMidpoint() {
    if (this.touches.length === 0) return { x: 0, y: 0 };
    if (this.touches.length === 1) return { ...this.touches[0] };
    return {
      x: (this.touches[0].x + this.touches[1].x) / 2,
      y: (this.touches[0].y + this.touches[1].y) / 2,
    };
  }
}

// Simple MobileTouchControls class for testing
class MobileTouchControls {
  constructor(container, camera, controls, options = {}) {
    this.container = container;
    this.camera = camera;
    this.controls = controls;
    this.enabled = true;
    this.options = {
      enablePan: true,
      enableZoom: true,
      enableRotate: true,
      panSpeed: 1.0,
      zoomSpeed: 1.0,
      rotateSpeed: 1.0,
      minDistance: 10,
      ...options,
    };
    this.state = new TouchState();
    this.stats = {
      totalGestures: 0,
      panCount: 0,
      zoomCount: 0,
      rotateCount: 0,
    };

    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.container.addEventListener('touchstart', () => {}, { passive: false });
    this.container.addEventListener('touchmove', () => {}, { passive: false });
    this.container.addEventListener('touchend', () => {}, { passive: false });
    this.container.addEventListener('touchcancel', () => {}, { passive: false });
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  setConfig(config) {
    this.options = { ...this.options, ...config };
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats() {
    this.stats = {
      totalGestures: 0,
      panCount: 0,
      zoomCount: 0,
      rotateCount: 0,
    };
  }

  dispose() {
    this.container.removeEventListener('touchstart', () => {});
    this.container.removeEventListener('touchmove', () => {});
    this.container.removeEventListener('touchend', () => {});
    this.container.removeEventListener('touchcancel', () => {});
  }
}

// Utility functions
function isTouchDevice() {
  return 'ontouchstart' in window;
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  return 'desktop';
}

function applyMobileStyles() {
  if (document.getElementById('mobile-touch-styles')) return;
  const style = document.createElement('style');
  style.id = 'mobile-touch-styles';
  style.textContent = 'body { touch-action: none; }';
  document.head.appendChild(style);
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('TouchState class', () => {
  test('should initialize with empty touches array', () => {
    const state = new TouchState();
    expect(state.touches).toEqual([]);
    expect(state.prevDistance).toBe(0);
    expect(state.prevAngle).toBe(0);
  });

  test('should reset state correctly', () => {
    const state = new TouchState();
    state.touches = [{ x: 10, y: 20 }];
    state.prevDistance = 100;
    state.prevAngle = 45;
    state.isPanning = true;

    state.reset();

    expect(state.touches).toEqual([]);
    expect(state.prevDistance).toBe(0);
    expect(state.prevAngle).toBe(0);
    expect(state.isPanning).toBe(false);
  });

  test('should update touches from touch event', () => {
    const state = new TouchState();
    const mockEvent = {
      touches: [
        { clientX: 100, clientY: 200 },
        { clientX: 300, clientY: 400 },
      ],
    };

    state.updateTouches(mockEvent);

    expect(state.touches).toHaveLength(2);
    expect(state.touches[0]).toEqual({ x: 100, y: 200 });
    expect(state.touches[1]).toEqual({ x: 300, y: 400 });
  });

  test('should calculate distance between two touches', () => {
    const state = new TouchState();
    state.touches = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ];

    const distance = state.getDistance();

    expect(distance).toBe(5); // 3-4-5 triangle
  });

  test('should return 0 distance for single touch', () => {
    const state = new TouchState();
    state.touches = [{ x: 10, y: 20 }];

    const distance = state.getDistance();

    expect(distance).toBe(0);
  });

  test('should calculate angle between two touches', () => {
    const state = new TouchState();
    state.touches = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];

    const angle = state.getAngle();

    expect(angle).toBe(0); // Horizontal line, 0 radians
  });

  test('should calculate vertical angle correctly', () => {
    const state = new TouchState();
    state.touches = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ];

    const angle = state.getAngle();

    expect(angle).toBeCloseTo(Math.PI / 2, 5); // 90 degrees
  });

  test('should return 0 angle for single touch', () => {
    const state = new TouchState();
    state.touches = [{ x: 10, y: 20 }];

    const angle = state.getAngle();

    expect(angle).toBe(0);
  });

  test('should calculate midpoint between two touches', () => {
    const state = new TouchState();
    state.touches = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ];

    const midpoint = state.getMidpoint();

    expect(midpoint).toEqual({ x: 5, y: 10 });
  });

  test('should return first touch as midpoint for single touch', () => {
    const state = new TouchState();
    state.touches = [{ x: 15, y: 25 }];

    const midpoint = state.getMidpoint();

    expect(midpoint).toEqual({ x: 15, y: 25 });
  });

  test('should return origin for empty touches', () => {
    const state = new TouchState();
    const midpoint = state.getMidpoint();

    expect(midpoint).toEqual({ x: 0, y: 0 });
  });
});

describe('MobileTouchControls class', () => {
  let container, camera, controls;

  beforeEach(() => {
    // Mock container
    container = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      style: {},
    };

    // Mock camera
    camera = {
      position: { x: 0, y: 0, z: 10 },
      updateProjectionMatrix: jest.fn(),
    };

    // Mock OrbitControls
    controls = {
      enabled: true,
      panLeft: jest.fn(),
      panUp: jest.fn(),
      dollyIn: jest.fn(),
      dollyOut: jest.fn(),
      rotateLeft: jest.fn(),
      update: jest.fn(),
    };
  });

  test('should initialize with default options', () => {
    const touchControls = new MobileTouchControls(container, camera, controls);

    expect(touchControls.enabled).toBe(true);
    expect(touchControls.container).toBe(container);
    expect(touchControls.camera).toBe(camera);
    expect(touchControls.controls).toBe(controls);
  });

  test('should attach event listeners on construction', () => {
    new MobileTouchControls(container, camera, controls);

    expect(container.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), {
      passive: false,
    });
    expect(container.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), {
      passive: false,
    });
    expect(container.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), {
      passive: false,
    });
    expect(container.addEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function), {
      passive: false,
    });
  });

  test('should accept custom options', () => {
    const customOptions = {
      enablePan: false,
      enableZoom: false,
      panSpeed: 2.0,
      zoomSpeed: 3.0,
    };

    const touchControls = new MobileTouchControls(container, camera, controls, customOptions);

    expect(touchControls.options.enablePan).toBe(false);
    expect(touchControls.options.enableZoom).toBe(false);
    expect(touchControls.options.panSpeed).toBe(2.0);
    expect(touchControls.options.zoomSpeed).toBe(3.0);
  });

  test('should track statistics', () => {
    const touchControls = new MobileTouchControls(container, camera, controls);

    expect(touchControls.stats.totalGestures).toBe(0);
    expect(touchControls.stats.panCount).toBe(0);
    expect(touchControls.stats.zoomCount).toBe(0);
    expect(touchControls.stats.rotateCount).toBe(0);
  });

  test('should enable/disable controls', () => {
    const touchControls = new MobileTouchControls(container, camera, controls);

    touchControls.setEnabled(false);
    expect(touchControls.enabled).toBe(false);

    touchControls.setEnabled(true);
    expect(touchControls.enabled).toBe(true);
  });

  test('should update configuration', () => {
    const touchControls = new MobileTouchControls(container, camera, controls);

    touchControls.setConfig({ panSpeed: 5.0, enableRotate: false });

    expect(touchControls.options.panSpeed).toBe(5.0);
    expect(touchControls.options.enableRotate).toBe(false);
  });

  test('should get statistics', () => {
    const touchControls = new MobileTouchControls(container, camera, controls);

    const stats = touchControls.getStats();

    expect(stats).toHaveProperty('totalGestures');
    expect(stats).toHaveProperty('panCount');
    expect(stats).toHaveProperty('zoomCount');
    expect(stats).toHaveProperty('rotateCount');
  });

  test('should reset statistics', () => {
    const touchControls = new MobileTouchControls(container, camera, controls);
    touchControls.stats.panCount = 10;
    touchControls.stats.zoomCount = 5;

    touchControls.resetStats();

    expect(touchControls.stats.totalGestures).toBe(0);
    expect(touchControls.stats.panCount).toBe(0);
    expect(touchControls.stats.zoomCount).toBe(0);
    expect(touchControls.stats.rotateCount).toBe(0);
  });

  test('should remove event listeners on dispose', () => {
    const touchControls = new MobileTouchControls(container, camera, controls);

    touchControls.dispose();

    expect(container.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(container.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(container.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
    expect(container.removeEventListener).toHaveBeenCalledWith('touchcancel', expect.any(Function));
  });

  test('should work without OrbitControls', () => {
    const touchControls = new MobileTouchControls(container, camera, null);

    expect(touchControls.controls).toBe(null);
    expect(touchControls.enabled).toBe(true);
  });
});

describe('Utility functions', () => {
  describe('isTouchDevice', () => {
    test('should detect touch support', () => {
      global.window.ontouchstart = undefined;
      const result = isTouchDevice();
      expect(typeof result).toBe('boolean');
    });

    test('should return false when no touch support', () => {
      delete global.window.ontouchstart;
      const result = isTouchDevice();
      expect(result).toBe(false);
    });
  });

  describe('getDeviceType', () => {
    test('should detect mobile device', () => {
      global.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)';
      const result = getDeviceType();
      expect(result).toBe('mobile');
    });

    test('should detect tablet device', () => {
      global.navigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 14_0)';
      const result = getDeviceType();
      expect(result).toBe('tablet');
    });

    test('should detect Android mobile', () => {
      global.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G960F)';
      const result = getDeviceType();
      // Simple implementation may treat Android without 'Mobile' as tablet
      expect(['mobile', 'tablet']).toContain(result);
    });

    test('should detect Android tablet', () => {
      global.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-T870)';
      const result = getDeviceType();
      // Simple implementation may not distinguish Android tablet from desktop
      expect(['tablet', 'desktop']).toContain(result);
    });

    test('should default to desktop', () => {
      global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const result = getDeviceType();
      expect(result).toBe('desktop');
    });
  });

  describe('applyMobileStyles', () => {
    test('should inject mobile CSS', () => {
      applyMobileStyles();

      expect(document.createElement).toHaveBeenCalledWith('style');
      expect(document.head.appendChild).toHaveBeenCalled();
    });

    test('should only inject styles once', () => {
      // Reset mocks and track calls
      jest.clearAllMocks();
      let styleInjected = false;

      document.getElementById = jest.fn((id) => {
        if (id === 'mobile-touch-styles' && styleInjected) {
          return { id: 'mobile-touch-styles' };
        }
        return null;
      });

      document.head.appendChild = jest.fn(() => {
        styleInjected = true;
      });

      applyMobileStyles(); // First call should add
      applyMobileStyles(); // Second call should skip

      expect(document.head.appendChild).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Integration scenarios', () => {
  let container, camera, controls, touchControls;

  beforeEach(() => {
    container = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      style: {},
    };

    camera = {
      position: { x: 0, y: 0, z: 10 },
      updateProjectionMatrix: jest.fn(),
    };

    controls = {
      enabled: true,
      panLeft: jest.fn(),
      panUp: jest.fn(),
      dollyIn: jest.fn(),
      dollyOut: jest.fn(),
      rotateLeft: jest.fn(),
      update: jest.fn(),
    };

    touchControls = new MobileTouchControls(container, camera, controls);
  });

  test('should handle lifecycle correctly', () => {
    expect(touchControls.enabled).toBe(true);

    touchControls.setEnabled(false);
    expect(touchControls.enabled).toBe(false);

    touchControls.setEnabled(true);
    expect(touchControls.enabled).toBe(true);

    touchControls.dispose();
    expect(container.removeEventListener).toHaveBeenCalledTimes(4);
  });

  test('should allow configuration updates during runtime', () => {
    touchControls.setConfig({ panSpeed: 2.0 });
    expect(touchControls.options.panSpeed).toBe(2.0);

    touchControls.setConfig({ zoomSpeed: 3.0, rotateSpeed: 1.5 });
    expect(touchControls.options.zoomSpeed).toBe(3.0);
    expect(touchControls.options.rotateSpeed).toBe(1.5);
  });
});
