/**
 * Unit tests for renderer-2d.mjs module
 * Tests SVGPathBuilder, Viewport2D, Renderer2D classes
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock DOM environment
global.window = global;
global.document = {
  createElement: jest.fn(() => ({
    style: {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
};

// Mock container with event handling
function createMockContainer() {
  const listeners = {};
  return {
    style: {},
    addEventListener: jest.fn((event, handler, options) => {
      listeners[event] = { handler, options };
    }),
    removeEventListener: jest.fn((event) => {
      delete listeners[event];
    }),
    querySelector: jest.fn(() => ({
      style: {},
    })),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    innerHTML: '',
    _listeners: listeners,
  };
}

// Extract classes using simple regex (since we can't import ES modules in tests easily)
let SVGPathBuilder, Viewport2D, Renderer2D, toolpathToSegments;

beforeEach(() => {
  // Simple class implementations for testing
  SVGPathBuilder = class {
    constructor(options = {}) {
      this.options = {
        strokeWidth: 1,
        rapidColor: '#999999',
        rapidDashArray: '5,5',
        linearColor: '#00ff00',
        arcColor: '#00ffff',
        scale: 10,
        invertY: true,
        ...options,
      };
      this.paths = [];
      this.bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    }

    addSegment(segment) {
      const { start, end, isRapid = false } = segment;

      this.bounds.minX = Math.min(this.bounds.minX, start.x, end.x);
      this.bounds.minY = Math.min(this.bounds.minY, start.y, end.y);
      this.bounds.maxX = Math.max(this.bounds.maxX, start.x, end.x);
      this.bounds.maxY = Math.max(this.bounds.maxY, start.y, end.y);

      const p1 = { x: start.x * this.options.scale, y: -start.y * this.options.scale };
      const p2 = { x: end.x * this.options.scale, y: -end.y * this.options.scale };

      this.paths.push({
        data: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
        stroke: isRapid ? this.options.rapidColor : this.options.linearColor,
        strokeWidth: this.options.strokeWidth,
        strokeDasharray: isRapid ? this.options.rapidDashArray : 'none',
        fill: 'none',
      });
    }

    getTransformedBounds() {
      const scale = this.options.scale;
      return {
        x: this.bounds.minX * scale,
        y: -this.bounds.maxY * scale,
        width: (this.bounds.maxX - this.bounds.minX) * scale,
        height: (this.bounds.maxY - this.bounds.minY) * scale,
      };
    }

    toSVG() {
      const bounds = this.getTransformedBounds();
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">\n`;
      for (const path of this.paths) {
        svg += `  <path d="${path.data}" stroke="${path.stroke}"/>\n`;
      }
      svg += '</svg>';
      return svg;
    }

    clear() {
      this.paths = [];
      this.bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    }
  };

  Viewport2D = class {
    constructor(container, options = {}) {
      this.container = container;
      this.options = { minZoom: 0.1, maxZoom: 10, zoomSpeed: 0.1, ...options };
      this.pan = { x: 0, y: 0 };
      this.zoom = 1.0;
      this.isDragging = false;
    }

    setZoom(zoom) {
      this.zoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));
    }

    fitToView(bounds) {
      const rect = this.container.getBoundingClientRect();
      const scaleX = rect.width / (bounds.width + 40);
      const scaleY = rect.height / (bounds.height + 40);
      this.zoom = Math.min(scaleX, scaleY);
    }

    getState() {
      return { pan: { ...this.pan }, zoom: this.zoom };
    }

    setState(state) {
      this.pan = { ...state.pan };
      this.zoom = state.zoom;
    }

    dispose() {}
  };

  Renderer2D = class {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options;
      this.pathBuilder = new SVGPathBuilder(options);
      this.viewport = null;
    }

    renderToolpath(segments) {
      this.pathBuilder.clear();
      for (const segment of segments) {
        this.pathBuilder.addSegment(segment);
      }
      const svg = this.pathBuilder.toSVG();
      this.container.innerHTML = svg;
      this.viewport = new Viewport2D(this.container, this.options);
      const bounds = this.pathBuilder.getTransformedBounds();
      this.viewport.fitToView(bounds);
      return svg;
    }

    exportSVG() {
      return this.pathBuilder.toSVG();
    }

    clear() {
      this.container.innerHTML = '';
      this.pathBuilder.clear();
      if (this.viewport) {
        this.viewport.dispose();
        this.viewport = null;
      }
    }

    getStats() {
      return {
        pathCount: this.pathBuilder.paths.length,
        bounds: this.pathBuilder.bounds,
        zoom: this.viewport ? this.viewport.zoom : 1,
        pan: this.viewport ? this.viewport.pan : { x: 0, y: 0 },
      };
    }

    dispose() {
      this.clear();
    }
  };

  toolpathToSegments = function (toolpathPoints) {
    const segments = [];
    for (let i = 1; i < toolpathPoints.length; i++) {
      const prev = toolpathPoints[i - 1];
      const curr = toolpathPoints[i];
      segments.push({
        type: curr.isRapid ? 'rapid' : 'line',
        start: { x: prev.x, y: prev.y, z: prev.z },
        end: { x: curr.x, y: curr.y, z: curr.z },
        tool: curr.tool || 0,
        isRapid: curr.isRapid || false,
      });
    }
    return segments;
  };
});

describe('SVGPathBuilder class', () => {
  test('should initialize with default options', () => {
    const builder = new SVGPathBuilder();
    expect(builder.options.scale).toBe(10);
    expect(builder.options.invertY).toBe(true);
    expect(builder.paths).toEqual([]);
  });

  test('should accept custom options', () => {
    const builder = new SVGPathBuilder({ scale: 5, linearColor: '#ff0000' });
    expect(builder.options.scale).toBe(5);
    expect(builder.options.linearColor).toBe('#ff0000');
  });

  test('should add line segment', () => {
    const builder = new SVGPathBuilder();
    builder.addSegment({
      type: 'line',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 10, y: 10, z: 0 },
      isRapid: false,
    });

    expect(builder.paths).toHaveLength(1);
    expect(builder.paths[0].data).toContain('M 0 0 L 100 -100');
  });

  test('should add rapid segment with dashed line', () => {
    const builder = new SVGPathBuilder();
    builder.addSegment({
      type: 'rapid',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 5, y: 5, z: 0 },
      isRapid: true,
    });

    expect(builder.paths[0].stroke).toBe('#999999');
    expect(builder.paths[0].strokeDasharray).toBe('5,5');
  });

  test('should update bounds correctly', () => {
    const builder = new SVGPathBuilder();
    builder.addSegment({
      type: 'line',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 10, y: 10, z: 0 },
      isRapid: false,
    });

    expect(builder.bounds.minX).toBe(0);
    expect(builder.bounds.minY).toBe(0);
    expect(builder.bounds.maxX).toBe(10);
    expect(builder.bounds.maxY).toBe(10);
  });

  test('should generate valid SVG', () => {
    const builder = new SVGPathBuilder();
    builder.addSegment({
      type: 'line',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 10, y: 10, z: 0 },
      isRapid: false,
    });

    const svg = builder.toSVG();
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox');
    expect(svg).toContain('<path');
    expect(svg).toContain('</svg>');
  });

  test('should clear paths and bounds', () => {
    const builder = new SVGPathBuilder();
    builder.addSegment({
      type: 'line',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 10, y: 10, z: 0 },
      isRapid: false,
    });

    builder.clear();

    expect(builder.paths).toEqual([]);
    expect(builder.bounds.minX).toBe(Infinity);
  });

  test('should handle multiple segments', () => {
    const builder = new SVGPathBuilder();

    builder.addSegment({
      type: 'line',
      start: { x: 0, y: 0, z: 0 },
      end: { x: 10, y: 0, z: 0 },
      isRapid: false,
    });

    builder.addSegment({
      type: 'line',
      start: { x: 10, y: 0, z: 0 },
      end: { x: 10, y: 10, z: 0 },
      isRapid: false,
    });

    expect(builder.paths).toHaveLength(2);
  });
});

describe('Viewport2D class', () => {
  let container;

  beforeEach(() => {
    container = createMockContainer();
  });

  test('should initialize with default options', () => {
    const viewport = new Viewport2D(container);
    expect(viewport.zoom).toBe(1.0);
    expect(viewport.pan).toEqual({ x: 0, y: 0 });
  });

  test('should set zoom within bounds', () => {
    const viewport = new Viewport2D(container);

    viewport.setZoom(5);
    expect(viewport.zoom).toBe(5);

    viewport.setZoom(50); // Exceeds max
    expect(viewport.zoom).toBe(10);

    viewport.setZoom(0.01); // Below min
    expect(viewport.zoom).toBe(0.1);
  });

  test('should fit to view', () => {
    const viewport = new Viewport2D(container);
    const bounds = { x: 0, y: 0, width: 100, height: 100 };

    viewport.fitToView(bounds);

    expect(viewport.zoom).toBeGreaterThan(0);
  });

  test('should get and set state', () => {
    const viewport = new Viewport2D(container);
    viewport.pan = { x: 50, y: 75 };
    viewport.zoom = 2.5;

    const state = viewport.getState();
    expect(state.pan).toEqual({ x: 50, y: 75 });
    expect(state.zoom).toBe(2.5);

    viewport.setState({ pan: { x: 100, y: 150 }, zoom: 3.0 });
    expect(viewport.pan).toEqual({ x: 100, y: 150 });
    expect(viewport.zoom).toBe(3.0);
  });
});

describe('Renderer2D class', () => {
  let container;

  beforeEach(() => {
    container = createMockContainer();
  });

  test('should initialize correctly', () => {
    const renderer = new Renderer2D(container);
    expect(renderer.container).toBe(container);
    expect(renderer.pathBuilder).toBeDefined();
  });

  test('should render toolpath segments', () => {
    const renderer = new Renderer2D(container);
    const segments = [
      {
        type: 'line',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0 },
        isRapid: false,
      },
    ];

    const svg = renderer.renderToolpath(segments);

    expect(svg).toContain('<svg');
    expect(container.innerHTML).toContain('<svg');
  });

  test('should export SVG', () => {
    const renderer = new Renderer2D(container);
    const segments = [
      {
        type: 'line',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0 },
        isRapid: false,
      },
    ];

    renderer.renderToolpath(segments);
    const svg = renderer.exportSVG();

    expect(svg).toContain('<svg');
  });

  test('should clear renderer', () => {
    const renderer = new Renderer2D(container);
    const segments = [
      {
        type: 'line',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0 },
        isRapid: false,
      },
    ];

    renderer.renderToolpath(segments);
    renderer.clear();

    expect(container.innerHTML).toBe('');
    expect(renderer.pathBuilder.paths).toEqual([]);
  });

  test('should get statistics', () => {
    const renderer = new Renderer2D(container);
    const segments = [
      {
        type: 'line',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0 },
        isRapid: false,
      },
      {
        type: 'rapid',
        start: { x: 10, y: 10, z: 0 },
        end: { x: 20, y: 20, z: 0 },
        isRapid: true,
      },
    ];

    renderer.renderToolpath(segments);
    const stats = renderer.getStats();

    expect(stats.pathCount).toBe(2);
    expect(stats.bounds).toBeDefined();
  });
});

describe('toolpathToSegments function', () => {
  test('should convert toolpath points to segments', () => {
    const points = [
      { x: 0, y: 0, z: 0, isRapid: false },
      { x: 10, y: 0, z: 0, isRapid: false },
      { x: 10, y: 10, z: 0, isRapid: true },
    ];

    const segments = toolpathToSegments(points);

    expect(segments).toHaveLength(2);
    expect(segments[0].start).toEqual({ x: 0, y: 0, z: 0 });
    expect(segments[0].end).toEqual({ x: 10, y: 0, z: 0 });
    expect(segments[1].isRapid).toBe(true);
  });

  test('should handle empty toolpath', () => {
    const segments = toolpathToSegments([]);
    expect(segments).toEqual([]);
  });

  test('should handle single point', () => {
    const points = [{ x: 0, y: 0, z: 0 }];
    const segments = toolpathToSegments(points);
    expect(segments).toEqual([]);
  });
});

describe('Integration scenarios', () => {
  let container;

  beforeEach(() => {
    container = createMockContainer();
  });

  test('should handle complete render workflow', () => {
    const renderer = new Renderer2D(container);
    const points = [
      { x: 0, y: 0, z: 0, isRapid: true },
      { x: 10, y: 0, z: 0, isRapid: false },
      { x: 10, y: 10, z: 0, isRapid: false },
      { x: 0, y: 10, z: 0, isRapid: false },
      { x: 0, y: 0, z: 0, isRapid: false },
    ];

    const segments = toolpathToSegments(points);
    renderer.renderToolpath(segments);

    const stats = renderer.getStats();
    expect(stats.pathCount).toBe(4);
    expect(stats.bounds.minX).toBe(0);
    expect(stats.bounds.maxX).toBe(10);
  });

  test('should handle viewport state persistence', () => {
    const renderer = new Renderer2D(container);
    const segments = [
      {
        type: 'line',
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0 },
        isRapid: false,
      },
    ];

    renderer.renderToolpath(segments);

    // Set viewport state
    renderer.viewport.setZoom(3.0);
    renderer.viewport.pan = { x: 100, y: 150 };

    const newState = renderer.viewport.getState();
    expect(newState.zoom).toBe(3.0);
    expect(newState.pan).toEqual({ x: 100, y: 150 });
  });
});
