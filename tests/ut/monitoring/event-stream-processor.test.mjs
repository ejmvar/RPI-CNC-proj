import { EventStreamProcessor } from '../../../modules/monitoring/event-stream-processor.mjs';

describe('EventStreamProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new EventStreamProcessor({
      windowSize: 60000,
      maxEventsPerWindow: 1000,
      anomalyThreshold: 2.0,
    });
  });

  test('should initialize with default options', () => {
    const stats = processor.getStatistics();
    expect(stats.totalEventsProcessed).toBe(0);
    expect(stats.currentBufferedEvents).toBe(0);
  });

  test('should process events', () => {
    const event = {
      type: 'metric',
      metric: 'cpu_usage',
      value: 50,
      timestamp: Date.now(),
    };

    const processed = processor.processEvent(event);
    expect(processed.id).toBeDefined();
    expect(processed.sequenceNumber).toBe(0);
  });

  test('should emit event processed event', (done) => {
    let eventProcessed = false;
    processor.on('eventProcessed', () => {
      eventProcessed = true;
    });

    processor.processEvent({
      type: 'metric',
      metric: 'cpu_usage',
      value: 50,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      expect(eventProcessed).toBe(true);
      done();
    }, 50);
  });

  test('should assign sequence numbers', () => {
    const event1 = processor.processEvent({
      type: 'metric',
      value: 50,
      timestamp: Date.now(),
    });
    const event2 = processor.processEvent({
      type: 'metric',
      value: 55,
      timestamp: Date.now(),
    });
    const event3 = processor.processEvent({
      type: 'metric',
      value: 60,
      timestamp: Date.now(),
    });

    expect(event1.sequenceNumber).toBe(0);
    expect(event2.sequenceNumber).toBe(1);
    expect(event3.sequenceNumber).toBe(2);
  });

  test('should create sliding windows', () => {
    for (let i = 0; i < 5; i++) {
      processor.processEvent({
        type: 'metric',
        value: i * 10,
        timestamp: Date.now(),
      });
    }

    const windows = processor.getWindows();
    expect(windows.length).toBeGreaterThan(0);
  });

  test('should update window statistics', () => {
    processor.processEvent({
      type: 'metric',
      value: 50,
      timestamp: Date.now(),
    });
    processor.processEvent({
      type: 'error',
      message: 'Test error',
      timestamp: Date.now(),
    });

    const window = processor.getCurrentWindow();
    expect(window).not.toBeNull();
    expect(window.stats.eventCount).toBeGreaterThan(0);
    expect(window.stats.errorCount).toBe(1);
  });

  test('should emit window updated event', (done) => {
    let windowUpdated = false;
    processor.on('windowUpdated', () => {
      windowUpdated = true;
    });

    processor.processEvent({
      type: 'metric',
      value: 50,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      expect(windowUpdated).toBe(true);
      done();
    }, 50);
  });

  test('should identify rapid errors pattern', (done) => {
    let patternDetected = false;
    processor.on('patternDetected', (data) => {
      if (data.pattern === 'rapid_errors') {
        patternDetected = true;
      }
    });

    processor.processEvent({
      type: 'error',
      message: 'Error 1',
      timestamp: Date.now(),
    });

    setTimeout(() => {
      expect(patternDetected).toBe(true);
      done();
    }, 50);
  });

  test('should identify high temperature pattern', (done) => {
    let patternDetected = false;
    processor.on('patternDetected', (data) => {
      if (data.pattern === 'high_temperature') {
        patternDetected = true;
      }
    });

    processor.processEvent({
      type: 'metric',
      metric: 'temperature',
      value: 65,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      expect(patternDetected).toBe(true);
      done();
    }, 50);
  });

  test('should identify feed instability pattern', (done) => {
    let patternDetected = false;
    processor.on('patternDetected', (data) => {
      if (data.pattern === 'feed_instability') {
        patternDetected = true;
      }
    });

    processor.processEvent({
      type: 'metric',
      metric: 'feed_rate_stability',
      value: 80,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      expect(patternDetected).toBe(true);
      done();
    }, 50);
  });

  test('should identify high spindle load pattern', (done) => {
    let patternDetected = false;
    processor.on('patternDetected', (data) => {
      if (data.pattern === 'high_spindle_load') {
        patternDetected = true;
      }
    });

    processor.processEvent({
      type: 'metric',
      metric: 'spindle_load',
      value: 85,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      expect(patternDetected).toBe(true);
      done();
    }, 50);
  });

  test('should get pattern statistics', (done) => {
    processor.processEvent({
      type: 'metric',
      metric: 'temperature',
      value: 65,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      const patterns = processor.getPatternStatistics();
      expect(Array.isArray(patterns)).toBe(true);
      done();
    }, 50);
  });

  test('should detect anomalies using statistical analysis', (done) => {
    let anomalyDetected = false;
    processor.on('anomalyDetected', () => {
      anomalyDetected = true;
    });

    // Record baseline
    for (let i = 0; i < 10; i++) {
      processor.processEvent({
        type: 'metric',
        metric: 'cpu_usage',
        value: 50,
        timestamp: Date.now(),
      });
    }

    // Anomaly: much higher than baseline
    processor.processEvent({
      type: 'metric',
      metric: 'cpu_usage',
      value: 95,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      expect(anomalyDetected).toBe(true);
      done();
    }, 50);
  });

  test('should get anomalies', (done) => {
    processor.processEvent({
      type: 'metric',
      metric: 'cpu_usage',
      value: 50,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      const anomalies = processor.getAnomalies();
      expect(Array.isArray(anomalies)).toBe(true);
      done();
    }, 50);
  });

  test('should get events by time range', () => {
    const now = Date.now();
    processor.processEvent({
      type: 'metric',
      value: 50,
      timestamp: now,
    });
    processor.processEvent({
      type: 'metric',
      value: 60,
      timestamp: now + 1000,
    });

    const events = processor.getEventsByTimeRange(now, now + 2000);
    expect(events.length).toBe(2);
  });

  test('should get events by type', () => {
    processor.processEvent({
      type: 'metric',
      value: 50,
      timestamp: Date.now(),
    });
    processor.processEvent({
      type: 'error',
      message: 'Error',
      timestamp: Date.now(),
    });
    processor.processEvent({
      type: 'warning',
      message: 'Warning',
      timestamp: Date.now(),
    });

    const metricEvents = processor.getEventsByType('metric');
    const errorEvents = processor.getEventsByType('error');

    expect(metricEvents.length).toBeGreaterThan(0);
    expect(errorEvents.length).toBeGreaterThan(0);
  });

  test('should get current window', () => {
    processor.processEvent({
      type: 'metric',
      value: 50,
      timestamp: Date.now(),
    });

    const window = processor.getCurrentWindow();
    expect(window).not.toBeNull();
    expect(window.id).toBeDefined();
  });

  test('should replay events', () => {
    const now = Date.now();
    processor.processEvent({
      type: 'metric',
      metric: 'temperature',
      value: 65,
      timestamp: now,
    });

    const results = processor.replayEvents(now, now + 10000);
    expect(results.eventsReplayed).toBeGreaterThan(0);
  });

  test('should get statistics', () => {
    for (let i = 0; i < 5; i++) {
      processor.processEvent({
        type: 'metric',
        value: 50,
        timestamp: Date.now(),
      });
    }

    const stats = processor.getStatistics();
    expect(stats.totalEventsProcessed).toBe(5);
    expect(stats.currentBufferedEvents).toBeGreaterThan(0);
  });

  test('should clear old events', () => {
    processor.processEvent({
      type: 'metric',
      value: 50,
      timestamp: Date.now() - 120000, // 2 minutes old
    });
    processor.processEvent({
      type: 'metric',
      value: 60,
      timestamp: Date.now(), // recent
    });

    const cleared = processor.clearOldEvents(60000); // clear older than 1 minute
    expect(cleared).toBeGreaterThan(0);
  });

  test('should track pattern occurrences', (done) => {
    processor.processEvent({
      type: 'metric',
      metric: 'temperature',
      value: 65,
      timestamp: Date.now(),
    });
    processor.processEvent({
      type: 'metric',
      metric: 'temperature',
      value: 67,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      const patterns = processor.getPatternStatistics();
      const highTemp = patterns.find((p) => p.name === 'high_temperature');
      if (highTemp) {
        expect(highTemp.occurrences).toBeGreaterThan(0);
      }
      done();
    }, 50);
  });

  test('should count warning events in window', () => {
    processor.processEvent({
      type: 'warning',
      message: 'Test warning',
      timestamp: Date.now(),
    });
    processor.processEvent({
      type: 'warning',
      message: 'Another warning',
      timestamp: Date.now(),
    });

    const window = processor.getCurrentWindow();
    expect(window.stats.warningCount).toBeGreaterThanOrEqual(2);
  });

  test('should count error events in window', () => {
    processor.processEvent({
      type: 'error',
      message: 'Test error',
      timestamp: Date.now(),
    });

    const window = processor.getCurrentWindow();
    expect(window.stats.errorCount).toBeGreaterThan(0);
  });

  test('should handle high-throughput event streams', () => {
    for (let i = 0; i < 100; i++) {
      processor.processEvent({
        type: 'metric',
        metric: `metric_${i % 5}`,
        value: Math.random() * 100,
        timestamp: Date.now(),
      });
    }

    const stats = processor.getStatistics();
    expect(stats.totalEventsProcessed).toBe(100);
    expect(stats.currentBufferedEvents).toBeGreaterThan(0);
  });

  test('should limit buffered events', () => {
    const p = new EventStreamProcessor({
      windowSize: 60000,
      maxEventsPerWindow: 10,
    });

    for (let i = 0; i < 50; i++) {
      p.processEvent({
        type: 'metric',
        value: i,
        timestamp: Date.now(),
      });
    }

    const stats = p.getStatistics();
    // Buffer should be cleaned up
    expect(stats.currentBufferedEvents).toBeLessThan(50);
  });
});
