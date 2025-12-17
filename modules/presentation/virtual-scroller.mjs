/**
 * Virtual Scroller Module
 * Phase 13.3: Performance Improvements - Virtual Scrolling Implementation
 *
 * Implements efficient virtual scrolling for large G-Code command lists
 * and toolpath visualization with windowing and lazy rendering
 */

export class VirtualScroller {
  constructor(options = {}) {
    this.items = [];
    this.itemHeight = options.itemHeight || 24;
    this.containerHeight = options.containerHeight || 400;
    this.bufferSize = options.bufferSize || 5; // Extra items to render above/below viewport
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.visibleItems = [];
    this.startIndex = 0;
    this.endIndex = 0;
    this.totalHeight = 0;
    this.listeners = {};
  }

  /**
   * Set items and update scroll calculations
   * @param {Array} items - Items to virtualize
   */
  setItems(items) {
    this.items = items || [];
    this.totalHeight = this.items.length * this.itemHeight;
    this.recalculateVisible();
  }

  /**
   * Recalculate visible items based on scroll position
   * @private
   */
  recalculateVisible() {
    if (this.items.length === 0) {
      this.visibleItems = [];
      this.startIndex = 0;
      this.endIndex = 0;
      return;
    }

    // Calculate visible range with buffer
    const firstVisibleIndex = Math.max(
      0,
      Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize
    );
    const lastVisibleIndex = Math.min(
      this.items.length - 1,
      Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) + this.bufferSize
    );

    this.startIndex = firstVisibleIndex;
    this.endIndex = lastVisibleIndex;

    // Build visible items array with position info
    this.visibleItems = [];
    for (let i = firstVisibleIndex; i <= lastVisibleIndex; i++) {
      if (i < this.items.length) {
        this.visibleItems.push({
          index: i,
          item: this.items[i],
          offsetY: i * this.itemHeight,
          height: this.itemHeight,
        });
      }
    }
  }

  /**
   * Handle scroll event
   * @param {number} scrollTop - New scroll top position
   * @param {number} scrollLeft - New scroll left position
   */
  onScroll(scrollTop, scrollLeft = 0) {
    const oldStartIndex = this.startIndex;
    this.scrollTop = Math.max(0, Math.min(scrollTop, this.totalHeight - this.containerHeight));
    this.scrollLeft = scrollLeft;

    this.recalculateVisible();

    // Only emit if range changed
    if (oldStartIndex !== this.startIndex) {
      this.emit('visibleRangeChanged', {
        startIndex: this.startIndex,
        endIndex: this.endIndex,
        items: this.visibleItems,
      });
    }
  }

  /**
   * Get visible items in current viewport
   * @returns {Array} Array of visible items with layout info
   */
  getVisibleItems() {
    return this.visibleItems;
  }

  /**
   * Get offset for item at index
   * @param {number} index - Item index
   * @returns {number} Y offset in pixels
   */
  getItemOffset(index) {
    return index * this.itemHeight;
  }

  /**
   * Get index of item at Y position
   * @param {number} offsetY - Y position in pixels
   * @returns {number} Item index
   */
  getIndexAtOffset(offsetY) {
    return Math.floor(offsetY / this.itemHeight);
  }

  /**
   * Scroll to specific item
   * @param {number} index - Item index
   * @param {string} align - Alignment: 'start', 'center', 'end'
   */
  scrollToItem(index, align = 'start') {
    const itemOffset = this.getItemOffset(index);
    let newScrollTop;

    switch (align) {
      case 'center':
        newScrollTop = itemOffset - this.containerHeight / 2 + this.itemHeight / 2;
        break;
      case 'end':
        newScrollTop = itemOffset - this.containerHeight + this.itemHeight;
        break;
      case 'start':
      default:
        newScrollTop = itemOffset;
    }

    this.onScroll(newScrollTop);
    this.emit('scrollToItem', { index, scrollTop: this.scrollTop });
  }

  /**
   * Get range info for current viewport
   * @returns {Object} {startIndex, endIndex, totalItems, visibleCount}
   */
  getRangeInfo() {
    return {
      startIndex: this.startIndex,
      endIndex: this.endIndex,
      totalItems: this.items.length,
      visibleCount: this.visibleItems.length,
      scrollPercentage:
        this.totalHeight > 0
          ? (this.scrollTop / (this.totalHeight - this.containerHeight)) * 100
          : 0,
    };
  }

  /**
   * Update container height
   * @param {number} height - New height in pixels
   */
  setContainerHeight(height) {
    this.containerHeight = Math.max(0, height);
    this.recalculateVisible();
  }

  /**
   * Update item height
   * @param {number} height - New item height
   */
  setItemHeight(height) {
    this.itemHeight = Math.max(1, height);
    this.totalHeight = this.items.length * this.itemHeight;
    this.recalculateVisible();
  }

  /**
   * Update buffer size
   * @param {number} size - New buffer size
   */
  setBufferSize(size) {
    this.bufferSize = Math.max(0, size);
    this.recalculateVisible();
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  removeEventListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  /**
   * Emit event
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        callback(data);
      });
    }
  }
}

/**
 * Virtual Toolpath Renderer
 * Manages efficient rendering of large toolpaths with windowing
 */
export class VirtualToolpathRenderer {
  constructor(options = {}) {
    this.commands = [];
    this.segmentsPerCommand = options.segmentsPerCommand || 10;
    this.visibleSegmentCount = options.visibleSegmentCount || 1000;
    this.segmentBuffer = options.segmentBuffer || 500;
    this.currentSegmentIndex = 0;
    this.visibleSegments = [];
    this.listeners = {};
  }

  /**
   * Load commands for rendering
   * @param {Array} commands - G-Code commands with positions
   */
  loadCommands(commands) {
    this.commands = commands || [];
    this.currentSegmentIndex = 0;
    this.updateVisibleSegments();
  }

  /**
   * Calculate segments for current viewport
   * @private
   */
  updateVisibleSegments() {
    if (this.commands.length === 0) {
      this.visibleSegments = [];
      return;
    }

    const startSegment = Math.max(0, this.currentSegmentIndex - this.segmentBuffer);
    const endSegment = Math.min(
      this.getTotalSegmentCount(),
      this.currentSegmentIndex + this.visibleSegmentCount + this.segmentBuffer
    );

    this.visibleSegments = [];

    let currentSegment = 0;
    for (let i = 0; i < this.commands.length; i++) {
      const cmd = this.commands[i];
      const commandSegments = this.getCommandSegments(cmd);

      for (let j = 0; j < commandSegments.length; j++) {
        if (currentSegment >= startSegment && currentSegment <= endSegment) {
          this.visibleSegments.push({
            commandIndex: i,
            segmentIndex: j,
            segment: commandSegments[j],
            globalSegmentIndex: currentSegment,
          });
        }
        currentSegment += 1;
      }
    }
  }

  /**
   * Get segments for a command
   * @param {Object} command - G-Code command
   * @returns {Array} Array of line segments
   */
  getCommandSegments(command) {
    const segments = [];

    // Interpolate based on command type
    if (command.gCode === 0 || command.gCode === 1) {
      // Linear movement - create subdivisions
      segments.push({
        type: 'line',
        start: command.startPos || { x: 0, y: 0, z: 0 },
        end: command.endPos || { x: 0, y: 0, z: 0 },
        gCode: command.gCode,
      });
    } else if (command.gCode === 2 || command.gCode === 3) {
      // Arc movement
      segments.push({
        type: 'arc',
        start: command.startPos || { x: 0, y: 0, z: 0 },
        end: command.endPos || { x: 0, y: 0, z: 0 },
        center: { x: command.params.I || 0, y: command.params.J || 0 },
        gCode: command.gCode,
      });
    }

    return segments;
  }

  /**
   * Get total number of segments
   * @returns {number} Total segment count
   */
  getTotalSegmentCount() {
    return this.commands.length * this.segmentsPerCommand;
  }

  /**
   * Get visible segments
   * @returns {Array} Array of visible segments
   */
  getVisibleSegments() {
    return this.visibleSegments;
  }

  /**
   * Advance viewport by n segments
   * @param {number} delta - Number of segments to advance
   */
  advanceSegments(delta) {
    this.currentSegmentIndex = Math.max(
      0,
      Math.min(this.currentSegmentIndex + delta, this.getTotalSegmentCount())
    );
    this.updateVisibleSegments();

    this.emit('segmentRangeChanged', {
      currentSegment: this.currentSegmentIndex,
      visibleSegments: this.visibleSegments,
      progress: (this.currentSegmentIndex / this.getTotalSegmentCount()) * 100,
    });
  }

  /**
   * Jump to specific segment
   * @param {number} index - Segment index
   */
  jumpToSegment(index) {
    this.currentSegmentIndex = Math.max(0, Math.min(index, this.getTotalSegmentCount()));
    this.updateVisibleSegments();

    this.emit('segmentJump', {
      currentSegment: this.currentSegmentIndex,
      visibleSegments: this.visibleSegments,
    });
  }

  /**
   * Get renderer statistics
   * @returns {Object} Renderer stats
   */
  getStats() {
    return {
      totalCommands: this.commands.length,
      totalSegments: this.getTotalSegmentCount(),
      visibleSegments: this.visibleSegments.length,
      currentSegmentIndex: this.currentSegmentIndex,
      renderProgress: (this.currentSegmentIndex / this.getTotalSegmentCount()) * 100,
    };
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Emit event
   * @private
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => {
        callback(data);
      });
    }
  }
}

export default {
  VirtualScroller,
  VirtualToolpathRenderer,
};
