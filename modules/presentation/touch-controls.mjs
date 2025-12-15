/* global window, document, navigator */

/**
 * Mobile Touch Controls Module
 * Provides touch gesture support for Three.js scene manipulation
 * Supports: pinch-to-zoom, two-finger rotation, single-finger pan
 *
 * @module modules/presentation/touch-controls
 */

/**
 * Touch gesture state
 */
class TouchState {
  constructor() {
    this.touches = [];
    this.prevDistance = 0;
    this.prevAngle = 0;
    this.prevMidpoint = { x: 0, y: 0 };
    this.isDragging = false;
    this.isRotating = false;
    this.isPinching = false;
  }

  reset() {
    this.prevDistance = 0;
    this.prevAngle = 0;
    this.prevMidpoint = { x: 0, y: 0 };
    this.isDragging = false;
    this.isRotating = false;
    this.isPinching = false;
  }

  updateTouches(touchList) {
    this.touches = Array.from(touchList).map((t) => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
    }));
  }

  getTouchCount() {
    return this.touches.length;
  }

  getTouch(index) {
    return this.touches[index] || null;
  }

  getDistance() {
    if (this.touches.length < 2) return 0;
    const dx = this.touches[0].x - this.touches[1].x;
    const dy = this.touches[0].y - this.touches[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getAngle() {
    if (this.touches.length < 2) return 0;
    const dx = this.touches[1].x - this.touches[0].x;
    const dy = this.touches[1].y - this.touches[0].y;
    return Math.atan2(dy, dx);
  }

  getMidpoint() {
    if (this.touches.length < 2) {
      return this.touches[0] ? { x: this.touches[0].x, y: this.touches[0].y } : { x: 0, y: 0 };
    }
    return {
      x: (this.touches[0].x + this.touches[1].x) / 2,
      y: (this.touches[0].y + this.touches[1].y) / 2,
    };
  }
}

/**
 * Mobile Touch Controls Manager
 */
export class MobileTouchControls {
  constructor(container, camera, controls, options = {}) {
    this.container = container;
    this.camera = camera;
    this.controls = controls;
    this.state = new TouchState();

    this.config = {
      enablePan: true,
      enableZoom: true,
      enableRotate: true,
      panSpeed: 0.5,
      zoomSpeed: 0.02,
      rotateSpeed: 0.01,
      minDistance: 10,
      maxDistance: 500,
      ...options,
    };

    this.stats = {
      totalGestures: 0,
      panCount: 0,
      zoomCount: 0,
      rotateCount: 0,
    };

    this.enabled = true;
    this._boundHandlers = {};
    this._setupEventListeners();
  }

  _setupEventListeners() {
    this._boundHandlers.touchStart = this._onTouchStart.bind(this);
    this._boundHandlers.touchMove = this._onTouchMove.bind(this);
    this._boundHandlers.touchEnd = this._onTouchEnd.bind(this);
    this._boundHandlers.touchCancel = this._onTouchCancel.bind(this);

    this.container.addEventListener('touchstart', this._boundHandlers.touchStart, {
      passive: false,
    });
    this.container.addEventListener('touchmove', this._boundHandlers.touchMove, { passive: false });
    this.container.addEventListener('touchend', this._boundHandlers.touchEnd);
    this.container.addEventListener('touchcancel', this._boundHandlers.touchCancel);
  }

  _onTouchStart(event) {
    if (!this.enabled) return;

    event.preventDefault();
    this.state.updateTouches(event.touches);

    const touchCount = this.state.getTouchCount();

    if (touchCount === 1) {
      this.state.isDragging = true;
      this.state.prevMidpoint = this.state.getMidpoint();
    } else if (touchCount === 2) {
      this.state.isPinching = true;
      this.state.isRotating = true;
      this.state.prevDistance = this.state.getDistance();
      this.state.prevAngle = this.state.getAngle();
      this.state.prevMidpoint = this.state.getMidpoint();
      this.state.isDragging = false;
    }

    this.stats.totalGestures++;
  }

  _onTouchMove(event) {
    if (!this.enabled) return;

    event.preventDefault();
    this.state.updateTouches(event.touches);

    const touchCount = this.state.getTouchCount();

    if (touchCount === 1 && this.state.isDragging) {
      this._handlePan();
    } else if (touchCount === 2) {
      if (this.config.enableZoom && this.state.isPinching) {
        this._handlePinchZoom();
      }
      if (this.config.enableRotate && this.state.isRotating) {
        this._handleRotate();
      }
    }
  }

  _onTouchEnd(event) {
    if (!this.enabled) return;

    this.state.updateTouches(event.touches);

    if (this.state.getTouchCount() === 0) {
      this.state.reset();
    } else if (this.state.getTouchCount() === 1) {
      this.state.isDragging = true;
      this.state.isPinching = false;
      this.state.isRotating = false;
      this.state.prevMidpoint = this.state.getMidpoint();
    }
  }

  _onTouchCancel(event) {
    this._onTouchEnd(event);
  }

  _handlePan() {
    if (!this.config.enablePan || !this.controls) return;

    const currentMidpoint = this.state.getMidpoint();
    const dx = (currentMidpoint.x - this.state.prevMidpoint.x) * this.config.panSpeed;
    const dy = (currentMidpoint.y - this.state.prevMidpoint.y) * this.config.panSpeed;

    if (typeof this.controls.panLeft === 'function') {
      this.controls.panLeft(-dx * 0.01, this.controls.object.matrix);
      this.controls.panUp(dy * 0.01, this.controls.object.matrix);
      this.controls.update();
    }

    this.state.prevMidpoint = currentMidpoint;
    this.stats.panCount++;
  }

  _handlePinchZoom() {
    if (!this.config.enableZoom || !this.controls) return;

    const currentDistance = this.state.getDistance();
    const delta = (currentDistance - this.state.prevDistance) * this.config.zoomSpeed;

    if (typeof this.controls.dollyIn === 'function') {
      if (delta > 0) {
        this.controls.dollyOut(1 + Math.abs(delta) * 0.01);
      } else {
        this.controls.dollyIn(1 + Math.abs(delta) * 0.01);
      }
      this.controls.update();
    }

    this.state.prevDistance = currentDistance;
    this.stats.zoomCount++;
  }

  _handleRotate() {
    if (!this.config.enableRotate || !this.controls) return;

    const currentAngle = this.state.getAngle();
    const deltaAngle = (currentAngle - this.state.prevAngle) * this.config.rotateSpeed;

    if (typeof this.controls.rotateLeft === 'function') {
      this.controls.rotateLeft(-deltaAngle);
      this.controls.update();
    }

    this.state.prevAngle = currentAngle;
    this.stats.rotateCount++;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.state.reset();
    }
  }

  setConfig(config) {
    this.config = { ...this.config, ...config };
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
    this.container.removeEventListener('touchstart', this._boundHandlers.touchStart);
    this.container.removeEventListener('touchmove', this._boundHandlers.touchMove);
    this.container.removeEventListener('touchend', this._boundHandlers.touchEnd);
    this.container.removeEventListener('touchcancel', this._boundHandlers.touchCancel);

    this.state.reset();
    this._boundHandlers = {};
  }
}

/**
 * Detect if device has touch capability
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

/**
 * Get device type
 */
export function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Apply mobile-optimized styles
 */
export function applyMobileStyles() {
  if (!isTouchDevice()) return;

  const style = document.createElement('style');
  style.id = 'mobile-touch-styles';
  style.textContent = `
    @media (max-width: 768px) {
      button, .control-btn {
        min-height: 44px !important;
        font-size: 14px !important;
        padding: 10px !important;
      }
      
      textarea, input {
        font-size: 16px !important;
      }
      
      #visualization-container {
        touch-action: none;
        user-select: none;
      }
    }
  `;
  document.head.appendChild(style);
}

// Legacy compatibility
export function createTouchControls({ onPan, onPinch } = {}) {
  let isAttached = false;
  return {
    attach: () => {
      isAttached = true;
      return true;
    },
    detach: () => {
      isAttached = false;
      return true;
    },
    isAttached: () => isAttached,
    simulatePan: (dx, dy) => {
      if (onPan) onPan(dx, dy);
    },
    simulatePinch: (scale) => {
      if (onPinch) onPinch(scale);
    },
  };
}

export default {
  MobileTouchControls,
  isTouchDevice,
  getDeviceType,
  applyMobileStyles,
  createTouchControls,
};
