/**
 * Jog Controls for Manual Machine Movement
 * Phase 15.4: Hardware Integration
 *
 * Provides manual control interface:
 * - Directional jog commands (X/Y/Z axes)
 * - Variable feed rate control
 * - Incremental vs continuous movement
 * - Keyboard and gamepad input handling
 */

/* global window */

export class JogControls {
  constructor(options = {}) {
    this.options = {
      rapidFeed: options.rapidFeed || 500,
      normalFeed: options.normalFeed || 100,
      increments: options.increments || [0.1, 0.5, 1.0, 5.0, 10.0],
      currentIncrement: options.currentIncrement || 1.0,
      enableGamepad: options.enableGamepad !== false,
      enableKeyboard: options.enableKeyboard !== false,
      ...options,
    };

    this.currentFeed = this.options.normalFeed;
    this.isJogging = false;
    this.jogAxis = null;
    this.jogDirection = null;
    this.listeners = {};
    this.keyState = {};
    this.gamepadState = {};
  }

  /**
   * Jog in a direction (X, Y, or Z)
   */
  jog(axis, direction, distance = null, feedRate = null) {
    if (!axis || !['X', 'Y', 'Z'].includes(axis.toUpperCase())) {
      throw new Error('Invalid axis: use X, Y, or Z');
    }

    if (!direction || ![-1, 1, 'negative', 'positive'].includes(direction)) {
      throw new Error('Invalid direction: use -1/negative or 1/positive');
    }

    const dir = typeof direction === 'string' ? (direction === 'positive' ? 1 : -1) : direction;
    const dist = distance !== null ? distance : this.options.currentIncrement;
    const feed = feedRate || this.currentFeed;

    const command = {
      axis: axis.toUpperCase(),
      direction: dir > 0 ? 'positive' : 'negative',
      distance: Math.abs(dist),
      feedRate: feed,
      timestamp: Date.now(),
    };

    this.emit('jog:initiated', command);

    return {
      command: `$J=G91 ${axis}${dir * Math.abs(dist)} F${feed}`,
      ...command,
    };
  }

  /**
   * Rapid jog (high speed)
   */
  rapidJog(axis, direction) {
    return this.jog(axis, direction, this.options.currentIncrement, this.options.rapidFeed);
  }

  /**
   * Set current jog increment
   */
  setIncrement(increment) {
    if (!this.options.increments.includes(increment)) {
      throw new Error(`Invalid increment: ${increment}`);
    }

    const previous = this.options.currentIncrement;
    this.options.currentIncrement = increment;

    this.emit('increment:changed', { previous, current: increment });

    return { increment, current: increment, previous };
  }

  /**
   * Get available increments
   */
  getIncrements() {
    return [...this.options.increments];
  }

  /**
   * Set current feed rate
   */
  setFeedRate(feed) {
    if (feed <= 0) {
      throw new Error('Feed rate must be positive');
    }

    const previous = this.currentFeed;
    this.currentFeed = feed;

    this.emit('feedRate:changed', { previous, current: feed });

    return { feedRate: feed, previous };
  }

  /**
   * Start continuous jog
   */
  startContinuousJog(axis, direction, feedRate = null) {
    if (this.isJogging) {
      throw new Error('Already jogging');
    }

    const feed = feedRate || this.currentFeed;

    this.isJogging = true;
    this.jogAxis = axis.toUpperCase();
    this.jogDirection = direction > 0 ? 1 : -1;

    this.emit('jog:started', {
      axis: this.jogAxis,
      direction: this.jogDirection,
      feedRate: feed,
    });

    return {
      jogging: true,
      axis: this.jogAxis,
      direction: this.jogDirection,
      command: `$J=G93 ${this.jogAxis}${this.jogDirection} F${feed}`,
    };
  }

  /**
   * Stop continuous jog
   */
  stopContinuousJog() {
    if (!this.isJogging) {
      return { jogging: false };
    }

    this.isJogging = false;
    const lastAxis = this.jogAxis;

    this.emit('jog:stopped', {
      axis: lastAxis,
      timestamp: Date.now(),
    });

    return { jogging: false, axis: lastAxis, command: '\x85' }; // Jog cancel (0x85)
  }

  /**
   * Setup keyboard jog controls
   */
  setupKeyboardControls() {
    if (typeof window === 'undefined' || !this.options.enableKeyboard) {
      return { success: false, reason: 'keyboard not available' };
    }

    const keyMap = {
      ArrowUp: { axis: 'Y', direction: 1 },
      ArrowDown: { axis: 'Y', direction: -1 },
      ArrowLeft: { axis: 'X', direction: -1 },
      ArrowRight: { axis: 'X', direction: 1 },
      w: { axis: 'Z', direction: 1 },
      s: { axis: 'Z', direction: -1 },
    };

    const handleKeyDown = (e) => {
      const mapping = keyMap[e.key];
      if (mapping && !this.keyState[e.key]) {
        this.keyState[e.key] = true;
        this.jog(mapping.axis, mapping.direction);
      }
    };

    const handleKeyUp = (e) => {
      if (keyMap[e.key]) {
        this.keyState[e.key] = false;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }

    this.emit('keyboard:enabled', { keyMap: Object.keys(keyMap) });

    return { success: true, type: 'keyboard' };
  }

  /**
   * Get jog status
   */
  getStatus() {
    return {
      jogging: this.isJogging,
      axis: this.jogAxis,
      direction: this.jogDirection,
      feedRate: this.currentFeed,
      increment: this.options.currentIncrement,
    };
  }

  /**
   * Event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }
}
