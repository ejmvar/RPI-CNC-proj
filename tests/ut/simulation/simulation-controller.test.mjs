/**
 * Simulation Controller Tests
 * Phase 14.3: Simulation Enhancements
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  Bookmark,
  SimulationStatistics,
  SimulationState,
  SimulationController,
  TimeBasedSimulationRunner,
} from '../../../modules/simulation/simulation-controller.mjs';

describe('Bookmark', () => {
  test('should create bookmark with position data', () => {
    const bookmark = new Bookmark('Start', 0, { x: 0, y: 0, z: 0 }, 100, 1000);

    expect(bookmark.name).toBe('Start');
    expect(bookmark.commandIndex).toBe(0);
    expect(bookmark.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(bookmark.feedRate).toBe(100);
    expect(bookmark.spindleSpeed).toBe(1000);
  });

  test('should clone position independently', () => {
    const position = { x: 1, y: 2, z: 3 };
    const bookmark = new Bookmark('Test', 0, position, 100, 1000);

    position.x = 999;

    expect(bookmark.position.x).toBe(1);
  });

  test('should provide description', () => {
    const bookmark = new Bookmark('Pocket', 42, { x: 10.5, y: 20.75, z: 5.25 }, 100, 1000);
    const desc = bookmark.getDescription();

    expect(desc).toContain('Pocket');
    expect(desc).toContain('42');
    expect(desc).toContain('10.50');
  });

  test('should record timestamp', () => {
    const before = Date.now();
    const bookmark = new Bookmark('Test', 0, { x: 0, y: 0, z: 0 }, 100, 1000);
    const after = Date.now();

    expect(bookmark.timestamp).toBeGreaterThanOrEqual(before);
    expect(bookmark.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('SimulationStatistics', () => {
  let stats;

  beforeEach(() => {
    stats = new SimulationStatistics();
  });

  test('should initialize with zeros', () => {
    expect(stats.totalDistance).toBe(0);
    expect(stats.cuttingDistance).toBe(0);
    expect(stats.rapidDistance).toBe(0);
    expect(stats.totalTime).toBe(0);
    expect(stats.commandCount).toBe(0);
  });

  test('should add cutting distance', () => {
    stats.addDistance(10, true);
    stats.addDistance(5, true);

    expect(stats.totalDistance).toBe(15);
    expect(stats.cuttingDistance).toBe(15);
    expect(stats.rapidDistance).toBe(0);
  });

  test('should add rapid distance', () => {
    stats.addDistance(20, false);
    stats.addDistance(10, false);

    expect(stats.totalDistance).toBe(30);
    expect(stats.rapidDistance).toBe(30);
    expect(stats.cuttingDistance).toBe(0);
  });

  test('should track mixed moves', () => {
    stats.addDistance(15, true);
    stats.addDistance(25, false);

    expect(stats.totalDistance).toBe(40);
    expect(stats.cuttingDistance).toBe(15);
    expect(stats.rapidDistance).toBe(25);
  });

  test('should add time tracking', () => {
    stats.addTime(5, true);
    stats.addTime(10, false);

    expect(stats.totalTime).toBe(15);
    expect(stats.cuttingTime).toBe(5);
    expect(stats.rapidTime).toBe(10);
  });

  test('should track feed rate ranges', () => {
    stats.recordFeedRate(50);
    stats.recordFeedRate(150);
    stats.recordFeedRate(100);

    expect(stats.minFeedRate).toBe(50);
    expect(stats.maxFeedRate).toBe(150);
  });

  test('should track spindle speed ranges', () => {
    stats.recordSpindleSpeed(500);
    stats.recordSpindleSpeed(2000);
    stats.recordSpindleSpeed(1000);

    expect(stats.minSpindleSpeed).toBe(500);
    expect(stats.maxSpindleSpeed).toBe(2000);
  });

  test('should finalize averages', () => {
    stats.recordFeedRate(100);
    stats.recordFeedRate(200);
    stats.finalize(300, 2, 1500, 2);

    expect(stats.averageFeedRate).toBe(150);
    expect(stats.averageSpindleSpeed).toBe(750);
  });

  test('should format summary', () => {
    stats.totalDistance = 100;
    stats.cuttingDistance = 75;
    stats.rapidDistance = 25;
    stats.totalTime = 120; // 2 minutes
    stats.commandCount = 50;
    stats.toolChanges = 2;
    stats.finalize(100, 1, 1000, 1);

    const summary = stats.getSummary();

    expect(summary.totalDistance).toBe('100.00');
    expect(summary.commandCount).toBe(50);
    expect(summary.toolChanges).toBe(2);
    expect(summary.totalTime).toContain(':');
  });

  test('should format time correctly', () => {
    expect(stats.formatTime(0)).toBe('00:00:00');
    expect(stats.formatTime(60)).toBe('00:01:00');
    expect(stats.formatTime(3661)).toBe('01:01:01');
    expect(stats.formatTime(86399)).toBe('23:59:59');
  });
});

describe('SimulationState', () => {
  let state;

  beforeEach(() => {
    state = new SimulationState();
  });

  test('should initialize with defaults', () => {
    expect(state.currentCommandIndex).toBe(0);
    expect(state.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(state.feedRate).toBe(0);
    expect(state.spindleSpeed).toBe(0);
    expect(state.isRunning).toBe(false);
    expect(state.playbackSpeed).toBe(1.0);
  });

  test('should clone state independently', () => {
    state.currentCommandIndex = 10;
    state.position = { x: 5, y: 10, z: 15 };
    state.feedRate = 100;

    const clone = state.clone();

    clone.currentCommandIndex = 99;
    clone.position.x = 999;

    expect(state.currentCommandIndex).toBe(10);
    expect(state.position.x).toBe(5);
  });

  test('should preserve command reference in clone', () => {
    state.currentCommand = { code: 'G0', x: 10 };
    const clone = state.clone();

    expect(clone.currentCommand).toEqual({ code: 'G0', x: 10 });
    expect(clone.currentCommand).not.toBe(state.currentCommand);
  });
});

describe('SimulationController', () => {
  let controller;

  beforeEach(() => {
    controller = new SimulationController();
  });

  describe('Initialization', () => {
    test('should create with default options', () => {
      expect(controller.commands).toEqual([]);
      expect(controller.bookmarks.size).toBe(0);
      expect(controller.state).toBeInstanceOf(SimulationState);
    });

    test('should initialize with commands', () => {
      const commands = [{ code: 'G0' }, { code: 'G1' }, { code: 'G0' }];
      controller.initialize(commands);

      expect(controller.commands.length).toBe(3);
      expect(controller.getProgress()).toBe(0);
    });

    test('should reject non-array commands', () => {
      expect(() => controller.initialize('not-an-array')).toThrow();
    });
  });

  describe('Playback Speed', () => {
    test('should set playback speed', () => {
      controller.setPlaybackSpeed(2.0);
      expect(controller.getPlaybackSpeed()).toBe(2.0);
    });

    test('should clamp playback speed to min', () => {
      const speed = controller.setPlaybackSpeed(0.05);
      expect(speed).toBe(0.1);
    });

    test('should clamp playback speed to max', () => {
      const speed = controller.setPlaybackSpeed(15.0);
      expect(speed).toBe(10.0);
    });

    test('should emit playback speed change event', () => {
      const callback = jest.fn();
      controller.addEventListener('playbackSpeedChanged', callback);

      controller.setPlaybackSpeed(2.0);

      expect(callback).toHaveBeenCalledWith({ speed: 2.0 });
    });
  });

  describe('Bookmarks', () => {
    beforeEach(() => {
      controller.initialize([{ code: 'G0' }, { code: 'G1' }]);
    });

    test('should add bookmark', () => {
      const bookmark = controller.addBookmark('Start');

      expect(bookmark.name).toBe('Start');
      expect(controller.bookmarks.size).toBe(1);
    });

    test('should reject empty bookmark name', () => {
      expect(() => controller.addBookmark('')).toThrow();
      expect(() => controller.addBookmark(null)).toThrow();
    });

    test('should get bookmark by name', () => {
      controller.addBookmark('Test');
      const bookmark = controller.getBookmark('Test');

      expect(bookmark).not.toBeNull();
      expect(bookmark.name).toBe('Test');
    });

    test('should return null for non-existent bookmark', () => {
      const bookmark = controller.getBookmark('NonExistent');
      expect(bookmark).toBeNull();
    });

    test('should list all bookmarks', () => {
      controller.addBookmark('First');
      controller.addBookmark('Second');

      const bookmarks = controller.listBookmarks();

      expect(bookmarks.length).toBe(2);
      expect(bookmarks[0].name).toBe('First');
    });

    test('should remove bookmark', () => {
      controller.addBookmark('ToDelete');
      expect(controller.bookmarks.size).toBe(1);

      const removed = controller.removeBookmark('ToDelete');

      expect(removed).toBe(true);
      expect(controller.bookmarks.size).toBe(0);
    });

    test('should return false when removing non-existent bookmark', () => {
      const removed = controller.removeBookmark('NonExistent');
      expect(removed).toBe(false);
    });

    test('should jump to bookmark', () => {
      controller.state.currentCommandIndex = 0;
      controller.addBookmark('Marker');
      controller.jumpToCommand(1);

      controller.jumpToBookmark('Marker');

      expect(controller.state.currentCommandIndex).toBe(0);
    });

    test('should emit bookmark events', () => {
      const addedCallback = jest.fn();
      const removedCallback = jest.fn();

      controller.addEventListener('bookmarkAdded', addedCallback);
      controller.addEventListener('bookmarkRemoved', removedCallback);

      controller.addBookmark('Test');
      controller.removeBookmark('Test');

      expect(addedCallback).toHaveBeenCalled();
      expect(removedCallback).toHaveBeenCalledWith({ name: 'Test' });
    });
  });

  describe('Snapshots', () => {
    beforeEach(() => {
      controller.initialize([{ code: 'G0' }, { code: 'G1' }]);
    });

    test('should save state snapshot', () => {
      controller.state.position = { x: 10, y: 20, z: 30 };
      controller.saveSnapshot();

      expect(controller.stateSnapshots.size).toBe(1);
    });

    test('should retrieve snapshot', () => {
      controller.state.position = { x: 5, y: 5, z: 5 };
      controller.saveSnapshot();

      const snapshot = controller.getSnapshot(0);

      expect(snapshot).not.toBeNull();
      expect(snapshot.position).toEqual({ x: 5, y: 5, z: 5 });
    });

    test('should return null for non-existent snapshot', () => {
      const snapshot = controller.getSnapshot(999);
      expect(snapshot).toBeNull();
    });
  });

  describe('Position and State Updates', () => {
    test('should update position', () => {
      const callback = jest.fn();
      controller.addEventListener('positionUpdated', callback);

      controller.updatePosition(10, 20, 30);

      expect(controller.state.position).toEqual({ x: 10, y: 20, z: 30 });
      expect(callback).toHaveBeenCalled();
    });

    test('should update feed rate', () => {
      const callback = jest.fn();
      controller.addEventListener('feedRateUpdated', callback);

      controller.updateFeedRate(100);

      expect(controller.state.feedRate).toBe(100);
      expect(callback).toHaveBeenCalledWith({ feedRate: 100 });
    });

    test('should update spindle speed', () => {
      const callback = jest.fn();
      controller.addEventListener('spindleUpdated', callback);

      controller.updateSpindleSpeed(1000, true);

      expect(controller.state.spindleSpeed).toBe(1000);
      expect(controller.state.spindleRunning).toBe(true);
      expect(callback).toHaveBeenCalled();
    });

    test('should track spindle start/stop', () => {
      controller.updateSpindleSpeed(0, true);
      controller.updateSpindleSpeed(1000, true);
      controller.updateSpindleSpeed(1000, false);

      expect(controller.statistics.spindleStartStops).toBe(2);
    });
  });

  describe('Simulation Advancement', () => {
    test('should advance simulation by distance', () => {
      const callback = jest.fn();
      controller.addEventListener('simulationAdvanced', callback);

      controller.advanceSimulation(10, true, 100);

      expect(controller.statistics.totalDistance).toBe(10);
      expect(callback).toHaveBeenCalled();
    });

    test('should calculate time from distance and feed rate', () => {
      // Feed rate 60 units/min = 1 unit/sec
      controller.advanceSimulation(10, true, 60);

      expect(controller.statistics.totalTime).toBe(10);
    });

    test('should differentiate cutting vs rapid', () => {
      controller.advanceSimulation(5, true, 100);
      controller.advanceSimulation(10, false, 200);

      expect(controller.statistics.cuttingDistance).toBe(5);
      expect(controller.statistics.rapidDistance).toBe(10);
    });
  });

  describe('Command Navigation', () => {
    beforeEach(() => {
      controller.initialize([{ code: 'G0' }, { code: 'G1' }, { code: 'G0' }]);
    });

    test('should navigate to next command', () => {
      controller.nextCommand();

      expect(controller.state.currentCommandIndex).toBe(1);
      expect(controller.statistics.commandCount).toBe(1);
    });

    test('should navigate to previous command', () => {
      controller.state.currentCommandIndex = 2;
      controller.previousCommand();

      expect(controller.state.currentCommandIndex).toBe(1);
    });

    test('should jump to command by index', () => {
      controller.jumpToCommand(2);

      expect(controller.state.currentCommandIndex).toBe(2);
    });

    test('should reject invalid command index', () => {
      expect(() => controller.jumpToCommand(999)).toThrow();
    });

    test('should get current command', () => {
      const cmd = controller.getCurrentCommand();
      expect(cmd.code).toBe('G0');
    });

    test('should get command at index', () => {
      const cmd = controller.getCommand(1);
      expect(cmd.code).toBe('G1');
    });
  });

  describe('Simulation Control', () => {
    beforeEach(() => {
      controller.initialize([{ code: 'G0' }]);
    });

    test('should start simulation', () => {
      const callback = jest.fn();
      controller.addEventListener('simulationStarted', callback);

      controller.start();

      expect(controller.state.isRunning).toBe(true);
      expect(controller.state.isPaused).toBe(false);
      expect(callback).toHaveBeenCalled();
    });

    test('should pause simulation', () => {
      controller.start();
      controller.pause();

      expect(controller.state.isPaused).toBe(true);
    });

    test('should resume simulation', () => {
      controller.start();
      controller.pause();
      controller.resume();

      expect(controller.state.isPaused).toBe(false);
    });

    test('should stop simulation', () => {
      const callback = jest.fn();
      controller.addEventListener('simulationStopped', callback);

      controller.start();
      controller.stop();

      expect(controller.state.isRunning).toBe(false);
      expect(callback).toHaveBeenCalled();
    });

    test('should reset simulation', () => {
      controller.start();
      controller.state.currentCommandIndex = 10;
      controller.updatePosition(5, 5, 5);

      controller.reset();

      expect(controller.state.currentCommandIndex).toBe(0);
      expect(controller.state.position).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('Progress and Statistics', () => {
    beforeEach(() => {
      controller.initialize([{ code: 'G0' }, { code: 'G1' }, { code: 'G0' }]);
    });

    test('should calculate progress percentage', () => {
      expect(controller.getProgress()).toBe(0);

      controller.jumpToCommand(1);
      expect(controller.getProgress()).toBeCloseTo(33.33, 1);

      controller.jumpToCommand(3);
      expect(controller.getProgress()).toBe(100);
    });

    test('should get statistics summary', () => {
      controller.advanceSimulation(100, true, 100);
      controller.statistics.commandCount = 5;
      controller.statistics.finalize(100, 1, 1000, 1);

      const summary = controller.getStatistics();

      expect(summary.commandCount).toBe(5);
      expect(summary.totalDistance).toBe('100.00');
    });

    test('should get all commands', () => {
      const commands = controller.getCommands();

      expect(commands.length).toBe(3);
      expect(commands).not.toBe(controller.commands);
    });
  });

  describe('Events', () => {
    test('should emit initialization event', () => {
      const callback = jest.fn();
      controller.addEventListener('simulationInitialized', callback);

      controller.initialize([]);

      expect(callback).toHaveBeenCalled();
    });

    test('should support multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      controller.addEventListener('positionUpdated', callback1);
      controller.addEventListener('positionUpdated', callback2);

      controller.updatePosition(1, 2, 3);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should remove listeners', () => {
      const callback = jest.fn();
      controller.addEventListener('positionUpdated', callback);
      controller.removeEventListener('positionUpdated', callback);

      controller.updatePosition(1, 2, 3);

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('TimeBasedSimulationRunner', () => {
  let controller;
  let runner;
  let commandExecutor;

  beforeEach(() => {
    controller = new SimulationController();
    controller.initialize([{ code: 'G0' }, { code: 'G1' }]);

    commandExecutor = jest.fn().mockReturnValue({
      timeRequired: 0.1,
      distance: 10,
      isCutting: true,
      feedRate: 100,
    });

    runner = new TimeBasedSimulationRunner(controller, commandExecutor);
  });

  test('should create runner', () => {
    expect(runner).toBeDefined();
    expect(runner.controller).toBe(controller);
  });

  test('should execute time step', () => {
    controller.start();
    runner.executeTimeStep(100); // 100ms

    expect(commandExecutor).toHaveBeenCalled();
  });

  test('should handle zero playback speed', () => {
    controller.start();
    controller.setPlaybackSpeed(0); // Should be clamped to 0.1
    runner.executeTimeStep(100);

    // With min speed of 0.1x, should still execute
    expect(commandExecutor).toHaveBeenCalled();
  });

  test('should stop when reaching end of commands', () => {
    controller.initialize([{ code: 'G0' }]);
    controller.start();

    commandExecutor = jest.fn().mockReturnValue({
      timeRequired: 0.1,
      distance: 10,
      isCutting: true,
      feedRate: 100,
    });

    runner = new TimeBasedSimulationRunner(controller, commandExecutor);

    runner.executeTimeStep(1000); // Large time step

    expect(controller.state.isRunning).toBe(false);
  });
});
