/**
 * Responsive Layout Manager
 * Phase 15.2: Mobile Optimization
 *
 * Manages responsive layout for different screen sizes and devices
 */

/* global window, navigator */

export class ResponsiveLayout {
  constructor(options = {}) {
    this.options = {
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
      ...options,
    };

    this.currentBreakpoint = null;
    this.listeners = {};
    this.layoutConfig = {
      mobile: {
        name: 'mobile',
        maxWidth: 640,
        columns: 1,
        spacing: 8,
        padding: 12,
        fontSize: 14,
      },
      tablet: {
        name: 'tablet',
        minWidth: 640,
        maxWidth: 1024,
        columns: 2,
        spacing: 16,
        padding: 20,
        fontSize: 16,
      },
      desktop: {
        name: 'desktop',
        minWidth: 1024,
        columns: 3,
        spacing: 20,
        padding: 24,
        fontSize: 16,
      },
    };

    this.setupResizeListener();
    this.detectBreakpoint();
  }

  /**
   * Setup resize listener
   */
  setupResizeListener() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('resize', () => {
      const newBreakpoint = this.detectBreakpoint();
      if (newBreakpoint !== this.currentBreakpoint) {
        this.emit('breakpointchange', {
          oldBreakpoint: this.currentBreakpoint,
          newBreakpoint,
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    });
  }

  /**
   * Detect current breakpoint
   */
  detectBreakpoint() {
    if (typeof window === 'undefined') {
      this.currentBreakpoint = 'desktop';
      return 'desktop';
    }

    const width = window.innerWidth;

    if (width < this.options.mobileBreakpoint) {
      this.currentBreakpoint = 'mobile';
    } else if (width < this.options.tabletBreakpoint) {
      this.currentBreakpoint = 'tablet';
    } else {
      this.currentBreakpoint = 'desktop';
    }

    return this.currentBreakpoint;
  }

  /**
   * Get current breakpoint
   */
  getBreakpoint() {
    return this.currentBreakpoint;
  }

  /**
   * Get breakpoint config
   */
  getConfig(breakpoint = null) {
    const bp = breakpoint || this.currentBreakpoint;
    return { ...this.layoutConfig[bp] };
  }

  /**
   * Get all configs
   */
  getAllConfigs() {
    return {
      mobile: this.getConfig('mobile'),
      tablet: this.getConfig('tablet'),
      desktop: this.getConfig('desktop'),
    };
  }

  /**
   * Check if mobile
   */
  isMobile() {
    return this.currentBreakpoint === 'mobile';
  }

  /**
   * Check if tablet
   */
  isTablet() {
    return this.currentBreakpoint === 'tablet';
  }

  /**
   * Check if desktop
   */
  isDesktop() {
    return this.currentBreakpoint === 'desktop';
  }

  /**
   * Check if touch device
   */
  static isTouchDevice() {
    return (
      (typeof window !== 'undefined' && 'ontouchstart' in window) ||
      (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
    );
  }

  /**
   * Get device orientation
   */
  static getOrientation() {
    if (typeof window === 'undefined') {
      return 'unknown';
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    return width > height ? 'landscape' : 'portrait';
  }

  /**
   * Get pixel ratio
   */
  static getPixelRatio() {
    return typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  }

  /**
   * Get viewport dimensions
   */
  static getViewportDimensions() {
    if (typeof window === 'undefined') {
      return { width: 0, height: 0 };
    }

    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  /**
   * Update layout config
   */
  updateConfig(breakpoint, config) {
    if (this.layoutConfig[breakpoint]) {
      this.layoutConfig[breakpoint] = {
        ...this.layoutConfig[breakpoint],
        ...config,
      };
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
}
