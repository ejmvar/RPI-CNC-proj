/**
 * Touch Handler
 * Phase 15.2: Mobile Optimization
 *
 * Manages touch events and basic touch handling for mobile devices
 */

/* global window */

export class TouchHandler {
  constructor(element = typeof window !== 'undefined' ? window : {}) {
    this.element = element;
    this.touches = new Map();
    this.listeners = {};
    this.setupTouchListeners();
  }

  /**
   * Setup touch event listeners
   */
  setupTouchListeners() {
    this.element.addEventListener('touchstart', (e) => this.handleTouchStart(e), false);
    this.element.addEventListener('touchmove', (e) => this.handleTouchMove(e), false);
    this.element.addEventListener('touchend', (e) => this.handleTouchEnd(e), false);
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    const timestamp = Date.now();

    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      const touchData = {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: timestamp,
        pressure: touch.force || 0,
      };

      this.touches.set(touch.identifier, touchData);
    }

    this.emit('touchstart', {
      touches: Array.from(this.touches.values()),
      touchCount: this.touches.size,
      timestamp,
    });
  }

  /**
   * Handle touch move
   */
  handleTouchMove(event) {
    const timestamp = Date.now();

    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      const touchData = this.touches.get(touch.identifier);

      if (touchData) {
        const deltaX = touch.clientX - touchData.startX;
        const deltaY = touch.clientY - touchData.startY;

        touchData.currentX = touch.clientX;
        touchData.currentY = touch.clientY;
        touchData.deltaX = deltaX;
        touchData.deltaY = deltaY;
        touchData.pressure = touch.force || 0;
      }
    }

    this.emit('touchmove', {
      touches: Array.from(this.touches.values()),
      touchCount: this.touches.size,
      timestamp,
    });
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    const timestamp = Date.now();
    const endedTouches = [];

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const touchData = this.touches.get(touch.identifier);

      if (touchData) {
        endedTouches.push(touchData);
        this.touches.delete(touch.identifier);
      }
    }

    this.emit('touchend', {
      endedTouches,
      remainingTouches: Array.from(this.touches.values()),
      timestamp,
    });
  }

  /**
   * Get current touches
   */
  getTouches() {
    return Array.from(this.touches.values());
  }

  /**
   * Get touch count
   */
  getTouchCount() {
    return this.touches.size;
  }

  /**
   * Check if touching
   */
  isTouching() {
    return this.touches.size > 0;
  }

  /**
   * Get distance between two touches
   */
  getDistance(touchId1, touchId2) {
    const touch1 = this.touches.get(touchId1);
    const touch2 = this.touches.get(touchId2);

    if (!touch1 || !touch2) {
      return 0;
    }

    const dx = touch2.currentX - touch1.currentX;
    const dy = touch2.currentY - touch1.currentY;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get center point of all touches
   */
  getCenterPoint() {
    if (this.touches.size === 0) {
      return null;
    }

    let sumX = 0;
    let sumY = 0;

    for (const touch of this.touches.values()) {
      sumX += touch.currentX;
      sumY += touch.currentY;
    }

    return {
      x: sumX / this.touches.size,
      y: sumY / this.touches.size,
    };
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
    return true;
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) {
      return false;
    }

    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }

  /**
   * Cleanup touch handler
   */
  destroy() {
    this.touches.clear();
    this.listeners = {};
  }
}
