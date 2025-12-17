/**
 * Gesture Detector
 * Phase 15.2: Mobile Optimization
 *
 * Detects multi-touch gestures (swipe, pinch, long-press, etc.)
 */

export class GestureDetector {
  constructor(options = {}) {
    this.options = {
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.5,
      pinchThreshold: 10,
      longPressDelay: 500,
      doubleTapDelay: 300,
      ...options,
    };

    this.touches = new Map();
    this.lastTap = 0;
    this.longPressTimer = null;
    this.listeners = {};
  }

  /**
   * Handle touch start
   */
  handleTouchStart(event) {
    // Store touch data
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      this.touches.set(touch.identifier, {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY,
      });
    }

    // Check for double-tap
    if (event.touches.length === 1) {
      const now = Date.now();
      if (now - this.lastTap < this.options.doubleTapDelay) {
        this.emit('doubletap', {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        });
        this.lastTap = 0; // Reset to prevent triple-tap
      } else {
        this.lastTap = now;
      }

      // Start long-press timer
      this.longPressTimer = setTimeout(() => {
        this.emit('longpress', {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        });
      }, this.options.longPressDelay);
    }
  }

  /**
   * Handle touch move
   */
  handleTouchMove(event) {
    // Clear long-press timer on move
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Update touch positions
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      const touchData = this.touches.get(touch.identifier);

      if (touchData) {
        touchData.currentX = touch.clientX;
        touchData.currentY = touch.clientY;
      }
    }

    // Detect pinch gesture (two fingers)
    if (event.touches.length === 2) {
      this.detectPinch();
    }
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(event) {
    // Clear long-press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // Detect swipe gesture (single finger)
    if (event.changedTouches.length === 1) {
      this.detectSwipe(event.changedTouches[0]);
    }

    // Remove ended touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      this.touches.delete(event.changedTouches[i].identifier);
    }
  }

  /**
   * Detect swipe gesture
   */
  detectSwipe(touch) {
    const touchData = Array.from(this.touches.values()).find((t) => t.id === touch.identifier);

    if (!touchData) {
      return;
    }

    const deltaX = touch.clientX - touchData.startX;
    const deltaY = touch.clientY - touchData.startY;
    const deltaTime = Date.now() - touchData.startTime;
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    // Check if swipe
    if (
      Math.abs(deltaX) > this.options.swipeThreshold ||
      Math.abs(deltaY) > this.options.swipeThreshold
    ) {
      // Determine direction
      let direction = '';

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      // Check velocity
      const velocity = Math.max(velocityX, velocityY);
      if (velocity > this.options.swipeVelocityThreshold) {
        this.emit('swipe', {
          direction,
          deltaX,
          deltaY,
          velocity,
          distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        });
      }
    }
  }

  /**
   * Detect pinch gesture
   */
  detectPinch() {
    const touches = Array.from(this.touches.values());
    if (touches.length !== 2) {
      return;
    }

    const [touch1, touch2] = touches;

    const currentDistance = Math.sqrt(
      Math.pow(touch2.currentX - touch1.currentX, 2) +
        Math.pow(touch2.currentY - touch1.currentY, 2)
    );

    const startDistance = Math.sqrt(
      Math.pow(touch2.startX - touch1.startX, 2) + Math.pow(touch2.startY - touch1.startY, 2)
    );

    const scale = currentDistance / startDistance;
    const delta = currentDistance - startDistance;

    // Emit only if change is significant
    if (Math.abs(delta) > this.options.pinchThreshold) {
      this.emit('pinch', {
        scale,
        delta,
        currentDistance,
        startDistance,
      });
    }
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
   * Cleanup
   */
  destroy() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }

    this.touches.clear();
    this.listeners = {};
  }
}
