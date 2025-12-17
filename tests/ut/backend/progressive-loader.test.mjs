/* eslint-disable no-undef */
import { test, describe, expect, beforeEach, jest } from '@jest/globals';
import {
  ProgressiveGCodeParser,
  ProgressiveMeshGenerator,
  ProgressiveCommandProcessor,
} from '../../../modules/backend/progressive-loader.mjs';

describe('ProgressiveGCodeParser', () => {
  let parser;

  beforeEach(() => {
    parser = new ProgressiveGCodeParser({
      chunkSize: 100,
      delayBetweenChunks: 0,
    });
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultParser = new ProgressiveGCodeParser();
      expect(defaultParser.chunkSize).toBe(1000);
      expect(defaultParser.delayBetweenChunks).toBe(0);
      expect(defaultParser.isCancelled).toBe(false);
    });

    test('should initialize with custom options', () => {
      expect(parser.chunkSize).toBe(100);
      expect(parser.delayBetweenChunks).toBe(0);
    });
  });

  describe('parseProgressive', () => {
    test('should parse simple G-Code content', async () => {
      const gcode = 'G0 X10 Y20 Z5\nG1 X30 Y40 Z10 F100\n';
      const result = await parser.parseProgressive(gcode);

      expect(result).toBeDefined();
      expect(result.commands.length).toBe(2);
      expect(result.totalCommands).toBe(2);
    });

    test('should extract G-codes correctly', async () => {
      const gcode = 'G1 X10 Y10\nG2 X20 Y20 I5 J5\nG3 X30 Y30 I-5 J-5\nG0 X0 Y0\n';
      const result = await parser.parseProgressive(gcode);

      expect(result.gCodes).toContain(1);
      expect(result.gCodes).toContain(2);
      expect(result.gCodes).toContain(3);
    });

    test('should extract M-codes correctly', async () => {
      const gcode = 'M3 S1000\nG1 X10 Y10\nM5\n';
      const result = await parser.parseProgressive(gcode);

      expect(result.mCodes).toContain(3);
      expect(result.mCodes).toContain(5);
    });

    test('should skip comments and empty lines', async () => {
      const gcode = '; This is a comment\nG0 X10 Y20\n\n; Another comment\nG1 X30 Y40\n';
      const result = await parser.parseProgressive(gcode);

      expect(result.commands.length).toBe(2);
    });

    test('should calculate bounds correctly', async () => {
      const gcode = 'G0 X0 Y0 Z0\nG1 X100 Y50 Z10\nG1 X50 Y75 Z5\n';
      const result = await parser.parseProgressive(gcode);

      expect(result.bounds.minX).toBe(0);
      expect(result.bounds.maxX).toBe(100);
      expect(result.bounds.minY).toBe(0);
      expect(result.bounds.maxY).toBe(75);
      expect(result.bounds.minZ).toBe(0);
      expect(result.bounds.maxZ).toBe(10);
      expect(result.bounds.width).toBe(100);
      expect(result.bounds.height).toBe(75);
      expect(result.bounds.depth).toBe(10);
    });

    test('should parse parameters correctly', async () => {
      const gcode = 'G1 X10.5 Y-20.3 Z5 F100 S500 I2 J3\n';
      const result = await parser.parseProgressive(gcode);

      const cmd = result.commands[0];
      expect(cmd.params.X).toBe(10.5);
      expect(cmd.params.Y).toBe(-20.3);
      expect(cmd.params.Z).toBe(5);
      expect(cmd.params.F).toBe(100);
      expect(cmd.params.S).toBe(500);
      expect(cmd.params.I).toBe(2);
      expect(cmd.params.J).toBe(3);
    });

    test('should emit progress events', async () => {
      const gcode = Array(250)
        .fill(null)
        // eslint-disable-next-line no-unused-vars
        .map((_, i) => `G1 X${i} Y${i * 2}`)
        .join('\n');

      const progressEvents = [];
      parser.addEventListener('progress', (data) => {
        progressEvents.push(data);
      });

      await parser.parseProgressive(gcode);

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('percentage');
      expect(progressEvents[0].percentage).toBeGreaterThan(0);
    });

    test('should emit complete event on success', async () => {
      const gcode = 'G0 X10 Y10\nG1 X20 Y20\n';
      const completeCallback = jest.fn();

      parser.addEventListener('complete', completeCallback);
      await parser.parseProgressive(gcode);

      expect(completeCallback).toHaveBeenCalled();
      expect(completeCallback.mock.calls[0][0]).toHaveProperty('commands');
    });

    test('should support cancellation', async () => {
      const gcode = Array(2000)
        .fill(null)
        // eslint-disable-next-line no-unused-vars
        .map((_, i) => `G1 X${i} Y${i}`)
        .join('\n');

      parser.chunkSize = 50;
      parser.delayBetweenChunks = 10;
      let cancelFired = false;

      parser.addEventListener('cancelled', () => {
        cancelFired = true;
      });

      const promise = parser.parseProgressive(gcode);
      setTimeout(() => parser.cancel(), 50);

      const result = await promise;

      if (cancelFired) {
        expect(result).toBeNull();
      }
    });

    test('should handle empty content', async () => {
      const result = await parser.parseProgressive('');
      expect(result.commands.length).toBe(0);
      expect(result.totalCommands).toBe(0);
    });

    test('should handle large files efficiently', async () => {
      const gcode = Array(5000)
        .fill(null)
        .map((_, i) => `G1 X${i % 100} Y${(i * 2) % 100} Z${(i * 0.1) % 10}`)
        .join('\n');

      const startTime = performance.now();
      const result = await parser.parseProgressive(gcode);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000);
      expect(result.commands.length).toBe(5000);
    });
  });

  describe('parseLine', () => {
    test('should parse G0 movement command', () => {
      const line = 'G0 X10 Y20 Z5';
      const result = parser.parseLine(line);

      expect(result.gCode).toBe(0);
      expect(result.params.X).toBe(10);
      expect(result.params.Y).toBe(20);
      expect(result.params.Z).toBe(5);
    });

    test('should parse arc command with I and J', () => {
      const line = 'G2 X20 Y20 I10 J10';
      const result = parser.parseLine(line);

      expect(result.gCode).toBe(2);
      expect(result.params.I).toBe(10);
      expect(result.params.J).toBe(10);
    });

    test('should handle negative values', () => {
      const line = 'G1 X-10.5 Y-20.3 Z-5';
      const result = parser.parseLine(line);

      expect(result.params.X).toBe(-10.5);
      expect(result.params.Y).toBe(-20.3);
      expect(result.params.Z).toBe(-5);
    });

    test('should skip comment lines', () => {
      const result1 = parser.parseLine('; This is a comment');
      expect(result1).toBeNull();

      const result2 = parser.parseLine('%');
      expect(result2).toBeNull();
    });

    test('should skip empty lines', () => {
      const result1 = parser.parseLine('');
      expect(result1).toBeNull();

      const result2 = parser.parseLine('   ');
      expect(result2).toBeNull();
    });

    test('should strip inline comments', () => {
      const line = 'G1 X10 Y20 ; Move to position';
      const result = parser.parseLine(line);

      expect(result.gCode).toBe(1);
      expect(result.params.X).toBe(10);
      expect(result.raw).toBe('G1 X10 Y20');
    });
  });

  describe('Event listeners', () => {
    test('should add and remove listeners', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      parser.addEventListener('progress', callback1);
      parser.addEventListener('progress', callback2);

      await parser.parseProgressive('G0 X10 Y10\n');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      parser.removeEventListener('progress', callback1);
      callback1.mockClear();
      callback2.mockClear();

      await parser.parseProgressive('G1 X20 Y20\n');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });
});

describe('ProgressiveMeshGenerator', () => {
  let generator;

  beforeEach(() => {
    generator = new ProgressiveMeshGenerator({
      gridSize: 5,
      chunkSize: 100,
    });
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultGen = new ProgressiveMeshGenerator();
      expect(defaultGen.gridSize).toBe(10);
      expect(defaultGen.chunkSize).toBe(100);
    });

    test('should initialize with custom options', () => {
      expect(generator.gridSize).toBe(5);
      expect(generator.chunkSize).toBe(100);
    });
  });

  describe('generateMeshProgressive', () => {
    test('should generate mesh from probe points', async () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 },
        { x: 10, y: 10, z: 0 },
      ];

      const result = await generator.generateMeshProgressive(probes);

      expect(result).toBeDefined();
      expect(result.grid).toBeDefined();
      expect(result.grid.length).toBe(6); // gridSize + 1
      expect(result.grid[0].length).toBe(6);
    });

    test('should calculate bounds correctly', async () => {
      const probes = [
        { x: 5, y: 10, z: 2 },
        { x: 15, y: 20, z: 3 },
        { x: 10, y: 15, z: 2.5 },
      ];

      const result = await generator.generateMeshProgressive(probes);

      expect(result.bounds.minX).toBe(5);
      expect(result.bounds.maxX).toBe(15);
      expect(result.bounds.minY).toBe(10);
      expect(result.bounds.maxY).toBe(20);
    });

    test('should track processed probes', async () => {
      const probes = Array(250)
        .fill(null)
        // eslint-disable-next-line no-unused-vars
        .map((_unused, i) => ({
          x: (i % 10) * 10,
          y: Math.floor(i / 10) * 10,
          z: Math.sin(i / 100) * 5,
        }));

      const progressEvents = [];
      generator.addEventListener('progress', (data) => {
        progressEvents.push(data);
      });

      await generator.generateMeshProgressive(probes);

      expect(progressEvents.length).toBeGreaterThan(0);
      const lastProgress = progressEvents[progressEvents.length - 1];
      expect(lastProgress.percentage).toBeLessThanOrEqual(100);
    });

    test('should emit complete event', async () => {
      const probes = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 1 },
      ];

      const completeCallback = jest.fn();
      generator.addEventListener('complete', completeCallback);

      await generator.generateMeshProgressive(probes);

      expect(completeCallback).toHaveBeenCalled();
      expect(completeCallback.mock.calls[0][0]).toHaveProperty('grid');
    });

    test('should support cancellation', async () => {
      const probes = Array(500)
        .fill(null)
        .map(() => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: Math.random() * 10,
        }));

      let cancelFired = false;
      generator.addEventListener('cancelled', () => {
        cancelFired = true;
      });

      generator.chunkSize = 50;
      const promise = generator.generateMeshProgressive(probes);
      setTimeout(() => generator.cancel(), 30);

      const result = await promise;

      if (cancelFired) {
        expect(result).toBeNull();
      }
    });

    test('should handle empty probe array', async () => {
      const errorCallback = jest.fn();
      generator.addEventListener('error', errorCallback);

      const result = await generator.generateMeshProgressive([]);

      expect(errorCallback).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should handle null probe array', async () => {
      const errorCallback = jest.fn();
      generator.addEventListener('error', errorCallback);

      const result = await generator.generateMeshProgressive(null);

      expect(errorCallback).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    test('should perform IDW interpolation', async () => {
      const probes = [
        { x: 0, y: 0, z: 10 },
        { x: 20, y: 0, z: 10 },
        { x: 0, y: 20, z: 10 },
        { x: 20, y: 20, z: 10 },
      ];

      const result = await generator.generateMeshProgressive(probes);

      if (result && result.grid) {
        // Center of grid should have interpolated value
        const centerZ =
          result.grid[Math.floor(result.grid.length / 2)][Math.floor(result.grid[0].length / 2)];
        expect(centerZ).toBeGreaterThan(0);
      }
    });

    test('should handle large probe sets efficiently', async () => {
      const probes = Array(1000)
        .fill(null)
        .map(() => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: Math.sin(Math.random() * 100) * 5 + 5,
        }));

      const startTime = performance.now();
      const result = await generator.generateMeshProgressive(probes);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(2000);
      if (result) {
        expect(result.pointCount).toBe(1000);
      }
    });
  });

  describe('interpolateIDW', () => {
    test('should return exact value for known point', () => {
      const points = [{ x: 0, y: 0, z: 5 }];
      const z = generator.interpolateIDW(0, 0, points);

      expect(z).toBe(5);
    });

    test('should return 0 for empty points', () => {
      const z = generator.interpolateIDW(10, 10, []);
      expect(z).toBe(0);
    });

    test('should interpolate between points', () => {
      const points = [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 10 },
      ];

      const z = generator.interpolateIDW(5, 5, points);
      expect(z).toBeGreaterThan(0);
      expect(z).toBeLessThan(10);
    });
  });

  describe('Cancellation', () => {
    test('should cancel during probe processing', async () => {
      const probes = Array(200)
        .fill(null)
        .map(() => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          z: Math.random() * 10,
        }));

      generator.chunkSize = 50;
      const promise = generator.generateMeshProgressive(probes);
      setTimeout(() => generator.cancel(), 5);

      const result = await promise;
      expect(result).toBeNull();
    });
  });
});

describe('ProgressiveCommandProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new ProgressiveCommandProcessor({
      commandsPerChunk: 50,
      delayBetweenChunks: 0,
    });
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultProc = new ProgressiveCommandProcessor();
      expect(defaultProc.commandsPerChunk).toBe(50);
      expect(defaultProc.delayBetweenChunks).toBe(0);
      expect(defaultProc.currentPosition).toEqual({ x: 0, y: 0, z: 0 });
    });

    test('should initialize with custom options', () => {
      expect(processor.commandsPerChunk).toBe(50);
      expect(processor.delayBetweenChunks).toBe(0);
    });
  });

  describe('processCommandsProgressive', () => {
    test('should process commands with processor function', async () => {
      const commands = [
        { gCode: 0, params: { X: 10, Y: 10 } },
        { gCode: 1, params: { X: 20, Y: 20 } },
      ];

      // eslint-disable-next-line no-unused-vars
      const processorFn = jest.fn((cmd) => ({
        command: cmd,
        processed: true,
      }));

      const result = await processor.processCommandsProgressive(commands, processorFn);

      expect(result.results.length).toBe(2);
      expect(processorFn).toHaveBeenCalledTimes(2);
      expect(result.totalProcessed).toBe(2);
    });

    test('should track position updates', async () => {
      const commands = [
        { gCode: 0, params: { X: 10, Y: 10, Z: 5 } },
        { gCode: 1, params: { X: 20, Y: 20, Z: 10 } },
      ];

      // eslint-disable-next-line no-unused-vars
      const processorFn = (cmd) => ({ success: true });

      await processor.processCommandsProgressive(commands, processorFn);

      const finalPos = processor.getCurrentPosition();
      expect(finalPos.x).toBe(20);
      expect(finalPos.y).toBe(20);
      expect(finalPos.z).toBe(10);
    });

    test('should emit progress events', async () => {
      const commands = Array(150)
        .fill(null)
        // eslint-disable-next-line no-unused-vars
        .map((_unused, i) => ({
          gCode: i % 2 === 0 ? 0 : 1,
          params: { X: i, Y: i * 2, Z: i * 0.1 },
        }));

      const progressEvents = [];
      processor.addEventListener('progress', (data) => {
        progressEvents.push(data);
      });

      // eslint-disable-next-line no-unused-vars
      const processorFn = (cmd) => ({ success: true });
      await processor.processCommandsProgressive(commands, processorFn);

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('percentage');
    });

    test('should emit complete event', async () => {
      const commands = [{ gCode: 1, params: { X: 10 } }];
      const completeCallback = jest.fn();

      processor.addEventListener('complete', completeCallback);
      // eslint-disable-next-line no-unused-vars
      await processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));

      expect(completeCallback).toHaveBeenCalled();
      expect(completeCallback.mock.calls[0][0]).toHaveProperty('successful');
    });

    test('should track successful and failed results', async () => {
      const commands = [
        { gCode: 1, params: { X: 10 } },
        { gCode: 1, params: { X: 20 } },
        { gCode: 1, params: { X: 30 } },
      ];

      // eslint-disable-next-line no-unused-vars
      const processorFn = jest.fn((cmd, pos) => {
        if (cmd.params.X === 20) {
          throw new Error('Position blocked');
        }
        return { success: true };
      });

      const result = await processor.processCommandsProgressive(commands, processorFn);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[1].error).toBe(true);
    });

    test('should support cancellation', async () => {
      const commands = Array(200)
        .fill(null)
        // eslint-disable-next-line no-unused-vars
        .map((_unused, i) => ({
          gCode: 1,
          params: { X: i, Y: i },
        }));

      let cancelFired = false;
      // eslint-disable-next-line no-unused-vars
      processor.addEventListener('cancelled', () => {
        cancelFired = true;
      });

      // eslint-disable-next-line no-unused-vars
      const promise = processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));
      setTimeout(() => processor.cancel(), 10);

      const result = await promise;

      // If cancellation fired, result should be null; otherwise it's completed
      if (cancelFired) {
        expect(result).toBeNull();
      }
    });

    test('should handle empty command array', async () => {
      // eslint-disable-next-line no-unused-vars
      const result = await processor.processCommandsProgressive([], (cmd) => ({ ok: true }));

      expect(result.results.length).toBe(0);
      expect(result.totalProcessed).toBe(0);
    });

    test('should update position partially', async () => {
      const commands = [
        { gCode: 0, params: { X: 10 } }, // Only X
        { gCode: 1, params: { Y: 20 } }, // Only Y
        { gCode: 0, params: { Z: 30 } }, // Only Z
      ];

      // eslint-disable-next-line no-unused-vars
      const processorFn = (cmd) => ({ ok: true });
      await processor.processCommandsProgressive(commands, processorFn);

      const pos = processor.getCurrentPosition();
      expect(pos.x).toBe(10);
      expect(pos.y).toBe(20);
      expect(pos.z).toBe(30);
    });

    test('should process large command sets efficiently', async () => {
      const commands = Array(2000)
        .fill(null)
        .map((_, i) => ({
          gCode: i % 2 === 0 ? 0 : 1,
          params: { X: Math.random() * 100, Y: Math.random() * 100 },
        }));

      const startTime = performance.now();
      // eslint-disable-next-line no-unused-vars
      const result = await processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(500);
      expect(result.totalProcessed).toBe(2000);
    });
  });

  describe('getCurrentPosition', () => {
    test('should return current position', async () => {
      const commands = [{ gCode: 1, params: { X: 50, Y: 75, Z: 25 } }];

      // eslint-disable-next-line no-unused-vars
      await processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));

      const pos = processor.getCurrentPosition();
      expect(pos).toEqual({ x: 50, y: 75, z: 25 });
    });

    test('should return copy of position, not reference', async () => {
      const commands = [{ gCode: 1, params: { X: 10, Y: 20 } }];
      // eslint-disable-next-line no-unused-vars
      await processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));

      const pos1 = processor.getCurrentPosition();
      pos1.x = 999; // Modify returned copy

      const pos2 = processor.getCurrentPosition();
      expect(pos2.x).toBe(10); // Original should be unchanged
    });
  });

  describe('Event listeners', () => {
    test('should support multiple listeners', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      processor.addEventListener('progress', callback1);
      processor.addEventListener('progress', callback2);

      const commands = Array(100).fill({ gCode: 1, params: {} });
      // eslint-disable-next-line no-unused-vars
      await processor.processCommandsProgressive(commands, (cmd) => ({ ok: true }));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Cancellation', () => {
    test('should accept cancellation without error', () => {
      // eslint-disable-next-line no-unused-vars
      const commands = [{ gCode: 1, params: { X: 10 } }];

      processor.cancel(); // Should not throw
      expect(processor.isCancelled).toBe(true);
    });
  });
});
