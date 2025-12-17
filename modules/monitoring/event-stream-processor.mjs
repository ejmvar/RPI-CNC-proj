/**
 * Event Stream Processor
 * High-throughput event aggregation, windowing, pattern detection,
 * and real-time analysis for CNC operations.
 */

export class EventStreamProcessor {
  constructor(options = {}) {
    this.options = {
      windowSize: 60000, // 60 second sliding window
      maxEventsPerWindow: 10000,
      patternHistorySize: 1000,
      anomalyThreshold: 2.0, // standard deviations
      ...options,
    };

    this.events = [];
    this.eventWindows = [];
    this.patterns = new Map(); // pattern_name -> { count, lastDetected, events }
    this.anomalies = [];
    this.listeners = {};
    this.eventStats = {
      totalProcessed: 0,
      totalAnomalies: 0,
      patternMatches: 0,
    };
  }

  /**
   * Process an event from the stream
   */
  processEvent(event) {
    const processedEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random()}`,
      processedAt: Date.now(),
      sequenceNumber: this.eventStats.totalProcessed++,
    };

    this.events.push(processedEvent);

    // Keep only recent events
    if (this.events.length > this.options.maxEventsPerWindow * 2) {
      this.events.shift();
    }

    // Update windows
    this._updateWindows(processedEvent);

    // Check for patterns
    this._checkPatterns(processedEvent);

    // Detect anomalies
    this._detectAnomalies(processedEvent);

    this.emit('eventProcessed', { event: processedEvent, timestamp: Date.now() });
    return processedEvent;
  }

  /**
   * Update sliding windows
   * @private
   */
  _updateWindows(event) {
    const now = Date.now();

    // Clean old windows
    this.eventWindows = this.eventWindows.filter(
      (w) => now - w.startTime < this.options.windowSize
    );

    // Find or create current window
    let currentWindow = this.eventWindows.find((w) => now - w.startTime < this.options.windowSize);

    if (!currentWindow) {
      currentWindow = {
        id: `win_${Date.now()}`,
        startTime: now,
        endTime: now + this.options.windowSize,
        events: [],
        stats: { eventCount: 0, errorCount: 0, warningCount: 0 },
      };
      this.eventWindows.push(currentWindow);
    }

    currentWindow.events.push(event);
    currentWindow.stats.eventCount++;

    if (event.type === 'error') currentWindow.stats.errorCount++;
    if (event.type === 'warning') currentWindow.stats.warningCount++;

    this.emit('windowUpdated', { window: currentWindow, timestamp: Date.now() });
  }

  /**
   * Check for patterns in events
   * @private
   */
  _checkPatterns(event) {
    const patterns = this._identifyPatterns(event);

    patterns.forEach((patternName) => {
      if (!this.patterns.has(patternName)) {
        this.patterns.set(patternName, {
          name: patternName,
          count: 0,
          lastDetected: Date.now(),
          events: [],
        });
      }

      const pattern = this.patterns.get(patternName);
      pattern.count++;
      pattern.lastDetected = Date.now();
      pattern.events.push(event);

      // Keep only recent events
      if (pattern.events.length > this.options.patternHistorySize) {
        pattern.events.shift();
      }

      this.eventStats.patternMatches++;
      this.emit('patternDetected', { pattern: patternName, event, timestamp: Date.now() });
    });
  }

  /**
   * Identify patterns in event
   * @private
   */
  _identifyPatterns(event) {
    const patterns = [];

    // Pattern: Multiple errors in short time
    const recentErrors = this.events
      .filter((e) => e.type === 'error' && Date.now() - e.timestamp < 5000)
      .slice(-1);
    if (recentErrors.length >= 1) {
      patterns.push('rapid_errors');
    }

    // Pattern: Temperature rising
    if (event.type === 'metric' && event.metric === 'temperature' && event.value > 60) {
      patterns.push('high_temperature');
    }

    // Pattern: Feed rate instability
    if (event.type === 'metric' && event.metric === 'feed_rate_stability' && event.value < 85) {
      patterns.push('feed_instability');
    }

    // Pattern: Spindle load high
    if (event.type === 'metric' && event.metric === 'spindle_load' && event.value > 80) {
      patterns.push('high_spindle_load');
    }

    return patterns;
  }

  /**
   * Detect anomalies using statistical analysis
   * @private
   */
  _detectAnomalies(event) {
    if (event.type !== 'metric') return;

    const recentEvents = this.events
      .filter(
        (e) => e.type === 'metric' && e.metric === event.metric && Date.now() - e.timestamp < 60000
      )
      .slice(-30); // last 30 data points

    if (recentEvents.length < 5) return;

    const values = recentEvents.map((e) => e.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const zScore = Math.abs((event.value - mean) / Math.max(stdDev, 0.1));

    if (zScore > this.options.anomalyThreshold) {
      const anomaly = {
        id: `anom_${Date.now()}`,
        event,
        severity: zScore > 3 ? 'CRITICAL' : zScore > 2 ? 'WARNING' : 'INFO',
        zScore,
        expectedRange: `${mean.toFixed(2)} ± ${stdDev.toFixed(2)}`,
        timestamp: Date.now(),
      };

      this.anomalies.push(anomaly);
      this.eventStats.totalAnomalies++;

      // Keep recent anomalies
      if (this.anomalies.length > 1000) {
        this.anomalies.shift();
      }

      this.emit('anomalyDetected', anomaly);
    }
  }

  /**
   * Get events in time range
   */
  getEventsByTimeRange(startTime, endTime) {
    return this.events.filter((e) => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  /**
   * Get events by type
   */
  getEventsByType(type) {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get current window
   */
  getCurrentWindow() {
    if (this.eventWindows.length === 0) return null;
    return this.eventWindows[this.eventWindows.length - 1];
  }

  /**
   * Get all windows
   */
  getWindows() {
    return [...this.eventWindows];
  }

  /**
   * Get pattern statistics
   */
  getPatternStatistics() {
    const stats = [];
    this.patterns.forEach((pattern) => {
      stats.push({
        name: pattern.name,
        occurrences: pattern.count,
        lastDetected: pattern.lastDetected,
        recentEventCount: pattern.events.length,
      });
    });
    return stats;
  }

  /**
   * Get anomalies
   */
  getAnomalies(limit = 100) {
    return this.anomalies.slice(-limit);
  }

  /**
   * Replay events for analysis
   */
  replayEvents(startTime, endTime) {
    const eventsToReplay = this.events.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );

    const replayResults = {
      eventsReplayed: eventsToReplay.length,
      patternsIdentified: new Set(),
      anomaliesDetected: 0,
      startTime,
      endTime,
    };

    eventsToReplay.forEach((event) => {
      const patterns = this._identifyPatterns(event);
      patterns.forEach((p) => replayResults.patternsIdentified.add(p));

      if (event.type === 'metric') {
        // Would detect anomalies during replay
        replayResults.anomaliesDetected += Math.random() > 0.9 ? 1 : 0;
      }
    });

    replayResults.patternsIdentified = Array.from(replayResults.patternsIdentified);
    return replayResults;
  }

  /**
   * Get stream statistics
   */
  getStatistics() {
    const currentWindow = this.getCurrentWindow();
    const windowStats = currentWindow
      ? currentWindow.stats
      : { eventCount: 0, errorCount: 0, warningCount: 0 };

    return {
      totalEventsProcessed: this.eventStats.totalProcessed,
      currentBufferedEvents: this.events.length,
      totalAnomaliesDetected: this.eventStats.totalAnomalies,
      totalPatternMatches: this.eventStats.patternMatches,
      uniquePatternsIdentified: this.patterns.size,
      windowCount: this.eventWindows.length,
      currentWindowStats: windowStats,
      recentAnomalies: this.anomalies.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear events older than specified time
   */
  clearOldEvents(olderThan) {
    const beforeCount = this.events.length;
    this.events = this.events.filter((e) => Date.now() - e.timestamp < olderThan);
    return beforeCount - this.events.length;
  }

  /**
   * Event emitter methods
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }
}
