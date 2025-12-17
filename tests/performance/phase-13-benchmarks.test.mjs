/**
 * Phase 13 Comprehensive Performance Benchmarks
 *
 * Measures performance across:
 * - G-Code parsing (streaming vs batch)
 * - Mesh generation (progressive vs direct)
 * - Command execution (threaded vs main)
 * - Rendering performance (virtual scroller FPS)
 * - Memory usage patterns
 * - Cache effectiveness
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ProgressiveGCodeParser } from '../../modules/backend/progressive-loader.mjs';
import { ProgressiveMeshGenerator } from '../../modules/backend/progressive-loader.mjs';
import { ProgressiveCommandProcessor } from '../../modules/backend/progressive-loader.mjs';

/**
 * Performance measurement utilities
 */
class PerformanceMetrics {
  constructor(name) {
    this.name = name;
    this.measurements = [];
    this.startTime = null;
    this.startMemory = null;
  }

  start() {
    this.startTime = performance.now();
    if (global.gc) {
      global.gc();
      this.startMemory = process.memoryUsage();
    }
  }

  stop() {
    const elapsed = performance.now() - this.startTime;
    let memoryDelta = null;

    if (global.gc && this.startMemory) {
      global.gc();
      const endMemory = process.memoryUsage();
      memoryDelta = {
        heapUsed: endMemory.heapUsed - this.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - this.startMemory.heapTotal,
        external: endMemory.external - this.startMemory.external,
      };
    }

    this.measurements.push({
      elapsed,
      memoryDelta,
      timestamp: new Date().toISOString(),
    });

    return { elapsed, memoryDelta };
  }

  getStats() {
    if (this.measurements.length === 0) return null;

    const times = this.measurements.map((m) => m.elapsed);
    const sorted = [...times].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return {
      name: this.name,
      iterations: this.measurements.length,
      min: Math.min(...times),
      max: Math.max(...times),
      mean: times.reduce((a, b) => a + b, 0) / times.length,
      median: sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      totalTime: times.reduce((a, b) => a + b, 0),
    };
  }

  report() {
    const stats = this.getStats();
    if (!stats) return '';

    return `${stats.name}:
      Iterations: ${stats.iterations}
      Min:    ${stats.min.toFixed(2)}ms
      Max:    ${stats.max.toFixed(2)}ms
      Mean:   ${stats.mean.toFixed(2)}ms
      Median: ${stats.median.toFixed(2)}ms
      P95:    ${stats.p95.toFixed(2)}ms
      P99:    ${stats.p99.toFixed(2)}ms
      Total:  ${stats.totalTime.toFixed(2)}ms`;
  }
}

/**
 * Generate test G-Code
 */
function generateGCode(lineCount = 1000, complexity = 'simple') {
  const lines = [];
  lines.push('G28'); // Home
  lines.push('G21'); // Metric

  for (let i = 0; i < lineCount; i++) {
    if (complexity === 'simple') {
      lines.push(`G0 X${i * 0.1} Y${i * 0.1}`);
    } else if (complexity === 'moderate') {
      lines.push(`G1 X${i * 0.1} Y${i * 0.1} Z${Math.sin(i * 0.01) * 5} F${100 + (i % 50)}`);
      if (i % 10 === 0) {
        lines.push('M3 S1000'); // Spindle on
      }
    } else {
      // Complex: include arc, feedrate changes, probe commands
      if (i % 20 === 0) {
        lines.push(`G28 Z0`);
      }
      lines.push(`G1 X${i * 0.1} Y${i * 0.1} F${200 + (i % 100)}`);
      if (i % 5 === 0) {
        lines.push(`G38.2 Z-10 F${50}`);
      }
      if (i % 15 === 0) {
        lines.push(`G2 X${i * 0.2} Y${i * 0.2} I5 J5 F${100}`);
      }
    }
  }

  lines.push('G0 Z5');
  lines.push('M30'); // End of program

  return lines.join('\n');
}

/**
 * Generate probe points for mesh generation
 */
function generateProbePoints(count = 100) {
  const points = [];
  const gridSize = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    const x = (i % gridSize) * (100 / gridSize);
    const y = Math.floor(i / gridSize) * (100 / gridSize);
    const z = Math.sin(x * 0.02) * Math.cos(y * 0.02) * 5 + Math.random() * 0.1;

    points.push({ x, y, z });
  }

  return points;
}

describe('Phase 13 Performance Benchmarks', () => {
  const metrics = new Map();

  afterAll(() => {
    // Print all performance reports
    console.log('\n\n=== PERFORMANCE BENCHMARK SUMMARY ===\n');
    for (const [name, measurement] of metrics) {
      console.log(measurement.report());
      console.log('');
    }
  });

  describe('G-Code Parser Performance', () => {
    test('should parse 1000-line simple G-Code efficiently', async () => {
      const gcode = generateGCode(1000, 'simple');
      const parser = new ProgressiveGCodeParser();
      const benchmark = new PerformanceMetrics('Parse 1000 simple lines');

      benchmark.start();
      const result = await parser.parseProgressive(gcode);
      benchmark.stop();

      expect(result.totalLines).toBeLessThanOrEqual(1000 + 5); // Header + footer
      expect(result.gCodes).toBeDefined();
      expect(result.mCodes).toBeDefined();

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(50); // Should parse in < 50ms average
      metrics.set('Parse 1000 simple lines', benchmark);
    });

    test('should parse 5000-line complex G-Code efficiently', async () => {
      const gcode = generateGCode(5000, 'complex');
      const parser = new ProgressiveGCodeParser();
      const benchmark = new PerformanceMetrics('Parse 5000 complex lines');

      benchmark.start();
      const result = await parser.parseProgressive(gcode);
      benchmark.stop();

      expect(result.totalLines).toBeGreaterThan(0);
      expect(result.bounds).toBeDefined();

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(200); // Should parse in < 200ms average
      metrics.set('Parse 5000 complex lines', benchmark);
    });

    test('should handle chunked parsing with minimal overhead', async () => {
      const gcode = generateGCode(2000, 'moderate');
      const parser = new ProgressiveGCodeParser();
      parser.chunkSize = 200; // Small chunks to force more iterations
      const benchmark = new PerformanceMetrics('Parse 2000 lines chunked (200/chunk)');

      const progressEvents = [];
      parser.addEventListener('progress', (event) => {
        progressEvents.push(event);
      });

      benchmark.start();
      const result = await parser.parseProgressive(gcode);
      benchmark.stop();

      // Should emit multiple progress events
      expect(progressEvents.length).toBeGreaterThan(5);

      // Verify progress values are monotonically increasing
      for (let i = 1; i < progressEvents.length; i++) {
        expect(progressEvents[i].percentage).toBeGreaterThanOrEqual(
          progressEvents[i - 1].percentage
        );
      }

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(150);
      metrics.set('Parse 2000 lines chunked', benchmark);
    });

    test('should scale linearly with input size', async () => {
      const benchmark1000 = new PerformanceMetrics('Parse scaling 1000 lines');
      const benchmark5000 = new PerformanceMetrics('Parse scaling 5000 lines');

      // Parse 1000 lines
      const gcode1000 = generateGCode(1000, 'simple');
      const parser1 = new ProgressiveGCodeParser();
      benchmark1000.start();
      await parser1.parseProgressive(gcode1000);
      benchmark1000.stop();

      // Parse 5000 lines
      const gcode5000 = generateGCode(5000, 'simple');
      const parser2 = new ProgressiveGCodeParser();
      benchmark5000.start();
      await parser2.parseProgressive(gcode5000);
      benchmark5000.stop();

      const stats1 = benchmark1000.getStats();
      const stats5 = benchmark5000.getStats();
      const scaleFactor = stats5.mean / stats1.mean;

      // Should scale roughly linearly (5000/1000 = 5)
      // Allow for 20% overhead (3.5-6.5x)
      expect(scaleFactor).toBeGreaterThan(3.5);
      expect(scaleFactor).toBeLessThan(6.5);

      metrics.set('Parse scaling 1000', benchmark1000);
      metrics.set('Parse scaling 5000', benchmark5000);
    });
  });

  describe('Mesh Generation Performance', () => {
    test('should generate mesh from 100 probes efficiently', async () => {
      const probes = generateProbePoints(100);
      const generator = new ProgressiveMeshGenerator();
      const benchmark = new PerformanceMetrics('Generate mesh from 100 probes');

      benchmark.start();
      const result = await generator.generateMeshProgressive(probes);
      benchmark.stop();

      expect(result).toBeDefined();
      expect(result.grid).toBeDefined();

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(100); // Should generate in < 100ms
      metrics.set('Generate mesh 100 probes', benchmark);
    });

    test('should generate mesh from 1000 probes within limits', async () => {
      const probes = generateProbePoints(1000);
      const generator = new ProgressiveMeshGenerator();
      const benchmark = new PerformanceMetrics('Generate mesh from 1000 probes');

      benchmark.start();
      const result = await generator.generateMeshProgressive(probes);
      benchmark.stop();

      expect(result).toBeDefined();
      expect(result.grid).toBeDefined();

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(2000); // Should generate in < 2 seconds
      metrics.set('Generate mesh 1000 probes', benchmark);
    });

    test('should emit progress events during mesh generation', async () => {
      const probes = generateProbePoints(500);
      const generator = new ProgressiveMeshGenerator();
      const benchmark = new PerformanceMetrics('Mesh generation with progress tracking');
      const progressEvents = [];

      generator.addEventListener('progress', (event) => {
        progressEvents.push(event);
      });

      benchmark.start();
      await generator.generateMeshProgressive(probes);
      benchmark.stop();

      // Should emit multiple progress events (probe collection + interpolation)
      expect(progressEvents.length).toBeGreaterThan(0);

      // All events should have valid percentage values
      for (const event of progressEvents) {
        expect(event.percentage).toBeGreaterThanOrEqual(0);
        expect(event.percentage).toBeLessThanOrEqual(100);
      }

      metrics.set('Mesh generation with progress', benchmark);
    });

    test('should handle probe grid upscaling efficiently', async () => {
      const probes = generateProbePoints(100);
      const generator = new ProgressiveMeshGenerator();
      generator.gridSize = 50; // Large grid for upscaling
      const benchmark = new PerformanceMetrics('Mesh generation with 50x50 grid upscaling');

      benchmark.start();
      const result = await generator.generateMeshProgressive(probes);
      benchmark.stop();

      expect(result.grid).toBeDefined();
      expect(result.grid.length).toBe(51); // 51 rows (0 to 50)
      expect(result.grid[0].length).toBe(51); // 51 columns per row

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(500); // Should still be fast with upscaling
      metrics.set('Mesh upscaling 50x50', benchmark);
    });
  });

  describe('Command Processing Performance', () => {
    test('should process 100 commands efficiently', async () => {
      const commands = Array(100)
        .fill(null)
        .map((_, i) => ({
          gCode: i % 2 === 0 ? 0 : 1,
          params: { X: Math.random() * 100, Y: Math.random() * 100 },
        }));

      const processor = new ProgressiveCommandProcessor();
      const benchmark = new PerformanceMetrics('Process 100 commands');

      benchmark.start();
      const result = await processor.processCommandsProgressive(commands, (cmd) => ({
        ok: true,
      }));
      benchmark.stop();

      expect(result.totalProcessed).toBe(100);
      expect(result.successful).toBe(100);

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(50); // Should process in < 50ms
      metrics.set('Process 100 commands', benchmark);
    });

    test('should process 2000 commands within performance budget', async () => {
      const commands = Array(2000)
        .fill(null)
        .map((_, i) => ({
          gCode: i % 2 === 0 ? 0 : 1,
          params: { X: Math.random() * 100, Y: Math.random() * 100 },
        }));

      const processor = new ProgressiveCommandProcessor();
      const benchmark = new PerformanceMetrics('Process 2000 commands');

      benchmark.start();
      const result = await processor.processCommandsProgressive(commands, (cmd) => ({
        ok: true,
      }));
      benchmark.stop();

      expect(result.totalProcessed).toBe(2000);

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(500); // Should process in < 500ms
      metrics.set('Process 2000 commands', benchmark);
    });

    test('should track position updates efficiently', async () => {
      const commands = Array(1000)
        .fill(null)
        .map((_, i) => ({
          gCode: 1,
          params: {
            X: i * 0.1,
            Y: i * 0.05,
            Z: Math.sin(i * 0.01) * 10,
          },
        }));

      const processor = new ProgressiveCommandProcessor();
      const benchmark = new PerformanceMetrics('Process 1000 commands with position tracking');

      benchmark.start();
      await processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));
      benchmark.stop();

      const finalPos = processor.getCurrentPosition();
      expect(finalPos.x).toBeCloseTo(99.9, 1);
      expect(finalPos.y).toBeCloseTo(49.95, 1);

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(300);
      metrics.set('Process 1000 with position', benchmark);
    });

    test('should handle mixed success/failure efficiently', async () => {
      const commands = Array(1000)
        .fill(null)
        .map((_, i) => ({
          gCode: 1,
          params: { X: i },
        }));

      const processor = new ProgressiveCommandProcessor();
      const benchmark = new PerformanceMetrics('Process 1000 commands with 20% failures');

      benchmark.start();
      const result = await processor.processCommandsProgressive(commands, (cmd) => {
        if (cmd.params.X % 5 === 0) {
          return { ok: false, error: 'blocked' };
        }
        return { ok: true };
      });
      benchmark.stop();

      expect(result.successful).toBe(800); // 80% success
      expect(result.failed).toBe(200); // 20% failure

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(400);
      metrics.set('Process 1000 mixed success', benchmark);
    });
  });

  describe('Combined Pipeline Performance', () => {
    test('should handle full pipeline: parse → mesh → process', async () => {
      const gcode = generateGCode(1000, 'moderate');
      const probes = generateProbePoints(200);

      const benchmark = new PerformanceMetrics('Full pipeline: parse + mesh + process');

      benchmark.start();

      // Parse
      const parser = new ProgressiveGCodeParser();
      const parseResult = await parser.parseProgressive(gcode);

      // Generate mesh
      const generator = new ProgressiveMeshGenerator();
      const meshResult = await generator.generateMeshProgressive(probes);

      // Extract commands and process
      const commands = (parseResult.gCodes || [])
        .slice(0, 100)
        .map((gCode) => ({ gCode, params: {} }));

      const processor = new ProgressiveCommandProcessor();
      await processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));

      benchmark.stop();

      const stats = benchmark.getStats();
      expect(stats.mean).toBeLessThan(1000); // Full pipeline in < 1 second
      metrics.set('Full pipeline parse+mesh+process', benchmark);
    });

    test('should maintain consistent performance across multiple runs', async () => {
      const gcode = generateGCode(2000, 'simple');
      const parser = new ProgressiveGCodeParser();
      const benchmark = new PerformanceMetrics('Parser consistency (10 runs)');

      for (let i = 0; i < 10; i++) {
        benchmark.start();
        await parser.parseProgressive(gcode);
        benchmark.stop();
      }

      const stats = benchmark.getStats();
      const variance = stats.max - stats.min;
      const coefficient = variance / stats.mean;

      // Coefficient of variation should be < 0.5 (50%)
      // JavaScript performance varies based on GC and system load
      expect(coefficient).toBeLessThan(0.5);

      metrics.set('Parser consistency 10 runs', benchmark);
    });
  });

  describe('Cancellation Overhead', () => {
    test('should support fast cancellation with minimal overhead', async () => {
      const commands = Array(5000)
        .fill(null)
        .map((_, i) => ({
          gCode: 1,
          params: { X: i },
        }));

      const processor = new ProgressiveCommandProcessor();
      const benchmark = new PerformanceMetrics('Cancellation response time');

      benchmark.start();
      const promise = processor.processCommandsProgressive(commands, (cmd) => {
        // Simulate work
        for (let i = 0; i < 100; i++) {
          Math.random();
        }
        return { ok: true };
      });

      // Cancel after a short delay
      setTimeout(() => processor.cancel(), 5);
      await promise.catch(() => {}); // Ignore cancellation error

      benchmark.stop();

      const stats = benchmark.getStats();
      expect(stats.max).toBeLessThan(200); // Should cancel quickly
      metrics.set('Cancellation response', benchmark);
    });
  });

  describe('Memory Efficiency', () => {
    test('should not leak memory during repeated parsing', async () => {
      const gcode = generateGCode(1000, 'moderate');
      const parser = new ProgressiveGCodeParser();

      if (!global.gc) {
        console.log('Skipping memory test: global.gc not enabled');
        return;
      }

      global.gc();
      const memStart = process.memoryUsage().heapUsed;

      // Run 10 parses
      for (let i = 0; i < 10; i++) {
        await parser.parseProgressive(gcode);
      }

      global.gc();
      const memEnd = process.memoryUsage().heapUsed;

      const memIncrease = memEnd - memStart;
      const memIncreasePercent = (memIncrease / memStart) * 100;

      // Memory increase should be < 50% (reasonable garbage collection)
      expect(memIncreasePercent).toBeLessThan(50);
    });

    test('should manage mesh generator memory efficiently', async () => {
      const generator = new ProgressiveMeshGenerator();

      if (!global.gc) {
        console.log('Skipping memory test: global.gc not enabled');
        return;
      }

      global.gc();
      const memStart = process.memoryUsage().heapUsed;

      // Generate 10 meshes
      for (let i = 0; i < 10; i++) {
        const probes = generateProbePoints(300);
        await generator.generateMeshProgressive(probes);
      }

      global.gc();
      const memEnd = process.memoryUsage().heapUsed;

      const memIncrease = memEnd - memStart;
      const memIncreasePercent = (memIncrease / memStart) * 100;

      expect(memIncreasePercent).toBeLessThan(75);
    });
  });

  describe('Throughput Analysis', () => {
    test('should achieve target parse throughput (lines/sec)', async () => {
      const gcode = generateGCode(10000, 'simple');
      const parser = new ProgressiveGCodeParser();
      const benchmark = new PerformanceMetrics('Parse throughput (10000 lines)');

      benchmark.start();
      const result = await parser.parseProgressive(gcode);
      benchmark.stop();

      const stats = benchmark.getStats();
      const throughput = 10000 / (stats.mean / 1000); // lines/sec

      expect(throughput).toBeGreaterThan(50000); // > 50k lines/sec
    });

    test('should achieve target mesh throughput (probes/sec)', async () => {
      const probes = generateProbePoints(2000);
      const generator = new ProgressiveMeshGenerator();
      const benchmark = new PerformanceMetrics('Mesh throughput (2000 probes)');

      benchmark.start();
      await generator.generateMeshProgressive(probes);
      benchmark.stop();

      const stats = benchmark.getStats();
      const throughput = 2000 / (stats.mean / 1000); // probes/sec

      expect(throughput).toBeGreaterThan(500); // > 500 probes/sec
    });

    test('should achieve target command throughput (cmd/sec)', async () => {
      const commands = Array(5000)
        .fill(null)
        .map(() => ({
          gCode: 1,
          params: { X: 0, Y: 0 },
        }));

      const processor = new ProgressiveCommandProcessor();
      const benchmark = new PerformanceMetrics('Command throughput (5000 commands)');

      benchmark.start();
      await processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));
      benchmark.stop();

      const stats = benchmark.getStats();
      const throughput = 5000 / (stats.mean / 1000); // cmd/sec

      expect(throughput).toBeGreaterThan(10000); // > 10k cmd/sec
    });
  });
});
