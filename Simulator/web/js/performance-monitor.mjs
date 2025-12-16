/**
 * Performance Monitor
 * Track and report application performance metrics
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      fps: [],
      frameTime: [],
      memoryUsage: [],
      renderCalls: 0,
      triangles: 0,
      drawCalls: 0,
    };
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.isMonitoring = false;
    this.displayElement = null;
  }

  /**
   * Initialize performance monitoring
   */
  init(options = {}) {
    this.options = {
      showOverlay: options.showOverlay !== false,
      sampleSize: options.sampleSize || 60,
      updateInterval: options.updateInterval || 1000,
      ...options,
    };

    if (this.options.showOverlay) {
      this.createOverlay();
    }

    this.start();
  }

  /**
   * Start monitoring
   */
  start() {
    this.isMonitoring = true;
    this.lastUpdateTime = performance.now();
    this.frameCount = 0;
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isMonitoring = false;
  }

  /**
   * Update metrics (call once per frame)
   */
  update(renderer) {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    const fps = 1000 / frameTime;

    // Store metrics
    this.metrics.fps.push(fps);
    this.metrics.frameTime.push(frameTime);

    if (this.metrics.fps.length > this.options.sampleSize) {
      this.metrics.fps.shift();
      this.metrics.frameTime.shift();
    }

    // Get renderer info
    if (renderer && renderer.info) {
      this.metrics.renderCalls = renderer.info.render.calls;
      this.metrics.triangles = renderer.info.render.triangles;
      this.metrics.drawCalls = renderer.info.render.calls;
    }

    // Get memory usage (if available)
    if (performance.memory) {
      const memoryMB = performance.memory.usedJSHeapSize / 1048576;
      this.metrics.memoryUsage.push(memoryMB);
      if (this.metrics.memoryUsage.length > this.options.sampleSize) {
        this.metrics.memoryUsage.shift();
      }
    }

    this.lastFrameTime = now;
    this.frameCount++;

    // Update display
    if (now - this.lastUpdateTime >= this.options.updateInterval) {
      this.updateDisplay();
      this.lastUpdateTime = now;
    }
  }

  /**
   * Get average FPS
   */
  getAverageFPS() {
    if (this.metrics.fps.length === 0) return 0;
    return this.metrics.fps.reduce((a, b) => a + b) / this.metrics.fps.length;
  }

  /**
   * Get average frame time
   */
  getAverageFrameTime() {
    if (this.metrics.frameTime.length === 0) return 0;
    return this.metrics.frameTime.reduce((a, b) => a + b) / this.metrics.frameTime.length;
  }

  /**
   * Get current memory usage
   */
  getCurrentMemory() {
    if (this.metrics.memoryUsage.length === 0) return 0;
    return this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
  }

  /**
   * Get performance report
   */
  getReport() {
    return {
      fps: {
        current: this.metrics.fps[this.metrics.fps.length - 1] || 0,
        average: this.getAverageFPS(),
        min: Math.min(...this.metrics.fps),
        max: Math.max(...this.metrics.fps),
      },
      frameTime: {
        current: this.metrics.frameTime[this.metrics.frameTime.length - 1] || 0,
        average: this.getAverageFrameTime(),
        min: Math.min(...this.metrics.frameTime),
        max: Math.max(...this.metrics.frameTime),
      },
      memory: {
        current: this.getCurrentMemory(),
        average:
          this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length ||
          0,
      },
      rendering: {
        calls: this.metrics.renderCalls,
        triangles: this.metrics.triangles,
        drawCalls: this.metrics.drawCalls,
      },
    };
  }

  /**
   * Create overlay display
   */
  createOverlay() {
    if (this.displayElement) return;

    this.displayElement = document.createElement('div');
    this.displayElement.id = 'performance-monitor';
    this.displayElement.className = 'performance-monitor';
    this.displayElement.innerHTML = `
      <div class="perf-header">
        <span>⚡ Performance</span>
        <button class="perf-close" title="Close">×</button>
      </div>
      <div class="perf-content">
        <div class="perf-metric">
          <span class="perf-label">FPS:</span>
          <span class="perf-value" id="perf-fps">--</span>
        </div>
        <div class="perf-metric">
          <span class="perf-label">Frame:</span>
          <span class="perf-value" id="perf-frame">-- ms</span>
        </div>
        <div class="perf-metric">
          <span class="perf-label">Memory:</span>
          <span class="perf-value" id="perf-memory">-- MB</span>
        </div>
        <div class="perf-metric">
          <span class="perf-label">Draw Calls:</span>
          <span class="perf-value" id="perf-calls">--</span>
        </div>
        <div class="perf-metric">
          <span class="perf-label">Triangles:</span>
          <span class="perf-value" id="perf-triangles">--</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.displayElement);

    // Close button
    this.displayElement.querySelector('.perf-close').addEventListener('click', () => {
      this.displayElement.style.display = 'none';
    });
  }

  /**
   * Update display
   */
  updateDisplay() {
    if (!this.displayElement) return;

    const report = this.getReport();

    document.getElementById('perf-fps').textContent = report.fps.average.toFixed(1);
    document.getElementById('perf-frame').textContent = `${report.frameTime.average.toFixed(2)} ms`;
    document.getElementById('perf-memory').textContent = `${report.memory.current.toFixed(1)} MB`;
    document.getElementById('perf-calls').textContent = report.rendering.calls;
    document.getElementById('perf-triangles').textContent = this.formatNumber(
      report.rendering.triangles
    );

    // Color code FPS
    const fpsElement = document.getElementById('perf-fps');
    const fps = report.fps.average;
    if (fps >= 55) {
      fpsElement.style.color = '#10b981'; // Green
    } else if (fps >= 30) {
      fpsElement.style.color = '#f59e0b'; // Yellow
    } else {
      fpsElement.style.color = '#ef4444'; // Red
    }
  }

  /**
   * Format large numbers
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  /**
   * Log performance metrics to console
   */
  logMetrics() {
    const report = this.getReport();
    console.group('Performance Metrics');
    console.log('FPS:', report.fps);
    console.log('Frame Time:', report.frameTime);
    console.log('Memory:', report.memory);
    console.log('Rendering:', report.rendering);
    console.groupEnd();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics() {
    const report = this.getReport();
    const data = {
      timestamp: new Date().toISOString(),
      ...report,
      rawMetrics: this.metrics,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export
if (typeof window !== 'undefined') {
  window.PerformanceMonitor = PerformanceMonitor;
}

export default PerformanceMonitor;
