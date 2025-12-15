/**
 * 2D SVG/Canvas Renderer Module
 * Alternative lightweight renderer for low-end devices and 2D/2.5D projects
 *
 * Features:
 * - SVG path generation from G-Code toolpath
 * - Canvas 2D fallback for better performance
 * - Pan/zoom viewport controls
 * - Color coding by tool/layer
 * - Export to SVG/PNG
 */

/**
 * SVG Path Builder
 * Converts toolpath points to SVG path data
 */
export class SVGPathBuilder {
  constructor(options = {}) {
    this.options = {
      strokeWidth: 1,
      rapidColor: '#999999',
      rapidDashArray: '5,5',
      linearColor: '#00ff00',
      arcColor: '#00ffff',
      scale: 10, // pixels per mm
      invertY: true, // SVG Y grows down, CNC Y grows up
      ...options,
    };
    this.paths = [];
    this.bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  }

  /**
   * Add a toolpath segment to the SVG
   * @param {object} segment - { type, start, end, tool, feedRate, isRapid }
   */
  addSegment(segment) {
    const { start, end, type, tool = 0, isRapid = false } = segment;

    // Update bounds
    this._updateBounds(start);
    this._updateBounds(end);

    // Transform coordinates
    const p1 = this._transformPoint(start);
    const p2 = this._transformPoint(end);

    // Create path data
    let pathData = '';
    let strokeColor = isRapid ? this.options.rapidColor : this.options.linearColor;
    let strokeDasharray = isRapid ? this.options.rapidDashArray : 'none';

    if (type === 'line' || type === 'rapid') {
      pathData = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
    } else if (type === 'arc') {
      // For arcs, we need center, radius, and direction
      const { center, radius, clockwise } = segment;
      // Transform center point for SVG arc
      this._transformPoint(center);
      const sweepFlag = clockwise ? 1 : 0;
      pathData = `M ${p1.x} ${p1.y} A ${radius * this.options.scale} ${
        radius * this.options.scale
      } 0 0 ${sweepFlag} ${p2.x} ${p2.y}`;
      strokeColor = this.options.arcColor;
    }

    this.paths.push({
      data: pathData,
      stroke: strokeColor,
      strokeWidth: this.options.strokeWidth,
      strokeDasharray: strokeDasharray,
      fill: 'none',
      tool,
    });
  }

  /**
   * Transform a 3D point to 2D SVG coordinates
   */
  _transformPoint(point) {
    const x = point.x * this.options.scale;
    const y = this.options.invertY ? -point.y * this.options.scale : point.y * this.options.scale;
    return { x, y };
  }

  /**
   * Update bounds with a point
   */
  _updateBounds(point) {
    this.bounds.minX = Math.min(this.bounds.minX, point.x);
    this.bounds.minY = Math.min(this.bounds.minY, point.y);
    this.bounds.maxX = Math.max(this.bounds.maxX, point.x);
    this.bounds.maxY = Math.max(this.bounds.maxY, point.y);
  }

  /**
   * Get bounds in transformed coordinates
   */
  getTransformedBounds() {
    const min = this._transformPoint({ x: this.bounds.minX, y: this.bounds.minY, z: 0 });
    const max = this._transformPoint({ x: this.bounds.maxX, y: this.bounds.maxY, z: 0 });
    return {
      x: Math.min(min.x, max.x),
      y: Math.min(min.y, max.y),
      width: Math.abs(max.x - min.x),
      height: Math.abs(max.y - min.y),
    };
  }

  /**
   * Generate SVG string
   */
  toSVG() {
    const bounds = this.getTransformedBounds();
    const padding = 20;
    const viewBox = `${bounds.x - padding} ${bounds.y - padding} ${bounds.width + 2 * padding} ${
      bounds.height + 2 * padding
    }`;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">\n`;
    svg += `  <rect x="${bounds.x - padding}" y="${bounds.y - padding}" width="${
      bounds.width + 2 * padding
    }" height="${bounds.height + 2 * padding}" fill="#1a1a1a"/>\n`;

    for (const path of this.paths) {
      svg += `  <path d="${path.data}" stroke="${path.stroke}" stroke-width="${path.strokeWidth}" stroke-dasharray="${path.strokeDasharray}" fill="${path.fill}"/>\n`;
    }

    svg += '</svg>';
    return svg;
  }

  /**
   * Clear all paths
   */
  clear() {
    this.paths = [];
    this.bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  }
}

/**
 * 2D Viewport Controller
 * Handles pan/zoom for SVG or Canvas
 */
export class Viewport2D {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      minZoom: 0.1,
      maxZoom: 10,
      zoomSpeed: 0.1,
      enablePan: true,
      enableZoom: true,
      ...options,
    };

    this.pan = { x: 0, y: 0 };
    this.zoom = 1.0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    this._setupEventListeners();
  }

  /**
   * Setup mouse/touch event listeners
   */
  _setupEventListeners() {
    if (this.options.enablePan) {
      this.container.addEventListener('mousedown', this._onMouseDown.bind(this));
      this.container.addEventListener('mousemove', this._onMouseMove.bind(this));
      this.container.addEventListener('mouseup', this._onMouseUp.bind(this));
      this.container.addEventListener('mouseleave', this._onMouseUp.bind(this));
    }

    if (this.options.enableZoom) {
      this.container.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    }
  }

  /**
   * Mouse down handler - start dragging
   */
  _onMouseDown(event) {
    if (event.button !== 0) return; // Only left button
    this.isDragging = true;
    this.dragStart = {
      x: event.clientX - this.pan.x,
      y: event.clientY - this.pan.y,
    };
    this.container.style.cursor = 'grabbing';
    event.preventDefault();
  }

  /**
   * Mouse move handler - pan viewport
   */
  _onMouseMove(event) {
    if (!this.isDragging) return;
    this.pan.x = event.clientX - this.dragStart.x;
    this.pan.y = event.clientY - this.dragStart.y;
    this._applyTransform();
  }

  /**
   * Mouse up handler - stop dragging
   */
  _onMouseUp() {
    this.isDragging = false;
    this.container.style.cursor = 'grab';
  }

  /**
   * Mouse wheel handler - zoom viewport
   */
  _onWheel(event) {
    event.preventDefault();
    const delta = -Math.sign(event.deltaY) * this.options.zoomSpeed;
    const newZoom = this.zoom * (1 + delta);
    this.setZoom(newZoom, event.clientX, event.clientY);
  }

  /**
   * Set zoom level with optional focus point
   */
  setZoom(zoom, focusX = null, focusY = null) {
    const oldZoom = this.zoom;
    this.zoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));

    // Adjust pan to zoom toward focus point
    if (focusX !== null && focusY !== null) {
      const rect = this.container.getBoundingClientRect();
      const relX = focusX - rect.left;
      const relY = focusY - rect.top;
      const zoomRatio = this.zoom / oldZoom;
      this.pan.x = focusX - (relX - this.pan.x) * zoomRatio;
      this.pan.y = focusY - (relY - this.pan.y) * zoomRatio;
    }

    this._applyTransform();
  }

  /**
   * Reset viewport to fit content
   */
  fitToView(bounds) {
    const rect = this.container.getBoundingClientRect();
    const scaleX = rect.width / (bounds.width + 40);
    const scaleY = rect.height / (bounds.height + 40);
    this.zoom = Math.min(scaleX, scaleY);
    this.pan.x = (rect.width - bounds.width * this.zoom) / 2 - bounds.x * this.zoom;
    this.pan.y = (rect.height - bounds.height * this.zoom) / 2 - bounds.y * this.zoom;
    this._applyTransform();
  }

  /**
   * Apply current transform to SVG element
   */
  _applyTransform() {
    const svg = this.container.querySelector('svg');
    if (svg) {
      svg.style.transform = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
      svg.style.transformOrigin = '0 0';
    }
  }

  /**
   * Get current viewport state
   */
  getState() {
    return {
      pan: { ...this.pan },
      zoom: this.zoom,
    };
  }

  /**
   * Set viewport state
   */
  setState(state) {
    this.pan = { ...state.pan };
    this.zoom = state.zoom;
    this._applyTransform();
  }

  /**
   * Cleanup
   */
  dispose() {
    this.container.removeEventListener('mousedown', this._onMouseDown);
    this.container.removeEventListener('mousemove', this._onMouseMove);
    this.container.removeEventListener('mouseup', this._onMouseUp);
    this.container.removeEventListener('mouseleave', this._onMouseUp);
    this.container.removeEventListener('wheel', this._onWheel);
  }
}

/**
 * 2D Renderer
 * Main class that coordinates SVG generation and viewport
 */
export class Renderer2D {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      backgroundColor: '#1a1a1a',
      mode: 'svg', // 'svg' or 'canvas'
      ...options,
    };

    this.pathBuilder = new SVGPathBuilder(options);
    this.viewport = null;
    this.svgElement = null;
  }

  /**
   * Render toolpath to SVG
   */
  renderToolpath(segments) {
    this.pathBuilder.clear();

    // Add all segments to the path builder
    for (const segment of segments) {
      this.pathBuilder.addSegment(segment);
    }

    // Generate SVG
    const svgString = this.pathBuilder.toSVG();

    // Insert into container
    this.container.innerHTML = svgString;
    this.svgElement = this.container.querySelector('svg');

    // Setup viewport controls
    if (this.viewport) {
      this.viewport.dispose();
    }
    this.viewport = new Viewport2D(this.container, this.options);

    // Fit to view
    const bounds = this.pathBuilder.getTransformedBounds();
    this.viewport.fitToView(bounds);

    return this.svgElement;
  }

  /**
   * Export to SVG file
   */
  exportSVG() {
    return this.pathBuilder.toSVG();
  }

  /**
   * Clear the renderer
   */
  clear() {
    this.container.innerHTML = '';
    this.pathBuilder.clear();
    if (this.viewport) {
      this.viewport.dispose();
      this.viewport = null;
    }
  }

  /**
   * Get renderer statistics
   */
  getStats() {
    return {
      pathCount: this.pathBuilder.paths.length,
      bounds: this.pathBuilder.bounds,
      zoom: this.viewport ? this.viewport.zoom : 1,
      pan: this.viewport ? this.viewport.pan : { x: 0, y: 0 },
    };
  }

  /**
   * Cleanup
   */
  dispose() {
    this.clear();
  }
}

/**
 * Convert G-Code toolpath to 2D renderer segments
 */
export function toolpathToSegments(toolpathPoints) {
  const segments = [];

  for (let i = 1; i < toolpathPoints.length; i++) {
    const prev = toolpathPoints[i - 1];
    const curr = toolpathPoints[i];

    segments.push({
      type: curr.isRapid ? 'rapid' : curr.isArc ? 'arc' : 'line',
      start: { x: prev.x, y: prev.y, z: prev.z },
      end: { x: curr.x, y: curr.y, z: curr.z },
      tool: curr.tool || 0,
      feedRate: curr.feedRate || 0,
      isRapid: curr.isRapid || false,
      center: curr.center || null,
      radius: curr.radius || 0,
      clockwise: curr.clockwise || false,
    });
  }

  return segments;
}

// Export all classes and functions
export default {
  SVGPathBuilder,
  Viewport2D,
  Renderer2D,
  toolpathToSegments,
};
