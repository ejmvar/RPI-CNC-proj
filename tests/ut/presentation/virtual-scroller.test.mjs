/* eslint-disable no-undef */
import { test, describe, expect, beforeEach, jest } from '@jest/globals';
import {
  VirtualScroller,
  VirtualToolpathRenderer,
} from '../../../modules/presentation/virtual-scroller.mjs';

describe('VirtualScroller', () => {
  let scroller;

  beforeEach(() => {
    scroller = new VirtualScroller({
      itemHeight: 24,
      containerHeight: 400,
      bufferSize: 5,
    });
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultScroller = new VirtualScroller();
      expect(defaultScroller.itemHeight).toBe(24);
      expect(defaultScroller.containerHeight).toBe(400);
      expect(defaultScroller.bufferSize).toBe(5);
      expect(defaultScroller.items).toEqual([]);
    });

    test('should initialize with custom options', () => {
      expect(scroller.itemHeight).toBe(24);
      expect(scroller.containerHeight).toBe(400);
      expect(scroller.bufferSize).toBe(5);
    });

    test('should have empty items by default', () => {
      expect(scroller.items).toEqual([]);
      expect(scroller.visibleItems).toEqual([]);
    });
  });

  describe('setItems and recalculateVisible', () => {
    test('should set items and calculate total height', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i, text: `Item ${i}` }));
      scroller.setItems(items);

      expect(scroller.items).toEqual(items);
      expect(scroller.totalHeight).toBe(100 * 24);
    });

    test('should handle empty items array', () => {
      scroller.setItems([]);
      expect(scroller.items).toEqual([]);
      expect(scroller.totalHeight).toBe(0);
      expect(scroller.visibleItems).toEqual([]);
    });

    test('should calculate visible items at top of scroll', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(0);

      // With buffer of 5, should show items 0 to (containerHeight / itemHeight + buffer)
      // containerHeight = 400, itemHeight = 24, so ~16 items visible + 5 buffer = 21 items
      expect(scroller.visibleItems.length).toBeGreaterThan(10);
      expect(scroller.visibleItems[0].index).toBe(0);
    });

    test('should calculate visible items at middle of scroll', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      scroller.setItems(items);

      // Scroll to position ~500
      scroller.onScroll(500);

      const firstVisibleIndex = scroller.visibleItems[0].index;
      const lastVisibleIndex = scroller.visibleItems[scroller.visibleItems.length - 1].index;

      expect(firstVisibleIndex).toBeGreaterThan(0);
      expect(lastVisibleIndex).toBeLessThan(items.length - 1);
      expect(lastVisibleIndex - firstVisibleIndex).toBeGreaterThan(5); // Has buffer
    });

    test('should calculate visible items at bottom of scroll', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);

      // Scroll to bottom
      scroller.onScroll(scroller.totalHeight);

      const lastVisibleIndex = scroller.visibleItems[scroller.visibleItems.length - 1].index;
      expect(lastVisibleIndex).toBe(items.length - 1);
    });
  });

  describe('onScroll', () => {
    beforeEach(() => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
    });

    test('should clamp scroll position to valid range', () => {
      scroller.onScroll(-100);
      expect(scroller.scrollTop).toBe(0);

      scroller.onScroll(scroller.totalHeight + 1000);
      expect(scroller.scrollTop).toBeLessThanOrEqual(scroller.totalHeight);
    });

    test('should update scrollTop and scrollLeft', () => {
      scroller.onScroll(500, 100);
      expect(scroller.scrollTop).toBe(500);
      expect(scroller.scrollLeft).toBe(100);
    });

    test('should emit visibleRangeChanged event when range changes', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      const mockCallback = jest.fn();
      scroller.addEventListener('visibleRangeChanged', mockCallback);

      // Scroll far enough to change the visible range
      scroller.onScroll(500);
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0]).toHaveProperty('startIndex');
    });

    test('should not emit if range does not change', () => {
      const mockCallback = jest.fn();
      scroller.addEventListener('visibleRangeChanged', mockCallback);

      scroller.onScroll(0);
      mockCallback.mockClear();

      // Small scroll that doesn't change visible items
      scroller.onScroll(2);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('getVisibleItems', () => {
    test('should return visible items with layout information', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(0);

      const visibleItems = scroller.getVisibleItems();
      expect(visibleItems.length).toBeGreaterThan(0);

      const firstItem = visibleItems[0];
      expect(firstItem).toHaveProperty('index');
      expect(firstItem).toHaveProperty('item');
      expect(firstItem).toHaveProperty('offsetY');
      expect(firstItem).toHaveProperty('height');
    });

    test('should include correct offsetY for each item', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(0);

      const visibleItems = scroller.getVisibleItems();
      visibleItems.forEach((vItem) => {
        expect(vItem.offsetY).toBe(vItem.index * scroller.itemHeight);
      });
    });
  });

  describe('getItemOffset and getIndexAtOffset', () => {
    test('should calculate correct offset for item index', () => {
      expect(scroller.getItemOffset(0)).toBe(0);
      expect(scroller.getItemOffset(10)).toBe(240);
      expect(scroller.getItemOffset(100)).toBe(2400);
    });

    test('should calculate correct index from offset', () => {
      expect(scroller.getIndexAtOffset(0)).toBe(0);
      expect(scroller.getIndexAtOffset(240)).toBe(10);
      expect(scroller.getIndexAtOffset(2400)).toBe(100);
    });

    test('should handle fractional offsets', () => {
      expect(scroller.getIndexAtOffset(250)).toBe(10);
      expect(scroller.getIndexAtOffset(300)).toBe(12);
    });
  });

  describe('scrollToItem', () => {
    beforeEach(() => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
    });

    test('should scroll to item with start alignment', () => {
      scroller.scrollToItem(100, 'start');
      expect(scroller.scrollTop).toBe(100 * 24);
    });

    test('should scroll to item with center alignment', () => {
      scroller.scrollToItem(100, 'center');
      const expectedScroll = 100 * 24 - scroller.containerHeight / 2 + scroller.itemHeight / 2;
      expect(scroller.scrollTop).toBe(expectedScroll);
    });

    test('should scroll to item with end alignment', () => {
      scroller.scrollToItem(100, 'end');
      const expectedScroll = 100 * 24 - scroller.containerHeight + scroller.itemHeight;
      expect(scroller.scrollTop).toBe(expectedScroll);
    });

    test('should emit scrollToItem event', () => {
      const mockCallback = jest.fn();
      scroller.addEventListener('scrollToItem', mockCallback);

      scroller.scrollToItem(50);
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0].index).toBe(50);
    });
  });

  describe('getRangeInfo', () => {
    test('should return range information', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(0);

      const info = scroller.getRangeInfo();
      expect(info).toHaveProperty('startIndex');
      expect(info).toHaveProperty('endIndex');
      expect(info).toHaveProperty('totalItems');
      expect(info).toHaveProperty('visibleCount');
      expect(info).toHaveProperty('scrollPercentage');
    });

    test('should calculate scroll percentage correctly', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);

      scroller.onScroll(0);
      let info = scroller.getRangeInfo();
      expect(info.scrollPercentage).toBe(0);

      // Scroll to 50% of scrollable height
      const maxScroll = scroller.totalHeight - scroller.containerHeight;
      scroller.onScroll(maxScroll / 2);
      info = scroller.getRangeInfo();
      expect(info.scrollPercentage).toBeCloseTo(50, 0);
    });

    test('should report correct visible count', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(0);

      const info = scroller.getRangeInfo();
      expect(info.visibleCount).toBe(scroller.visibleItems.length);
    });
  });

  describe('setContainerHeight', () => {
    test('should update container height and recalculate visible items', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(0);

      const oldVisibleCount = scroller.visibleItems.length;
      scroller.setContainerHeight(800);

      expect(scroller.containerHeight).toBe(800);
      // With larger container, more items should be visible
      expect(scroller.visibleItems.length).toBeGreaterThanOrEqual(oldVisibleCount);
    });

    test('should handle negative height by setting to 0', () => {
      scroller.setContainerHeight(-100);
      expect(scroller.containerHeight).toBe(0);
    });
  });

  describe('setItemHeight', () => {
    test('should update item height and recalculate total height', () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);

      scroller.setItemHeight(48);
      expect(scroller.itemHeight).toBe(48);
      expect(scroller.totalHeight).toBe(100 * 48);
    });

    test('should prevent item height from being 0 or negative', () => {
      scroller.setItemHeight(0);
      expect(scroller.itemHeight).toBe(1);

      scroller.setItemHeight(-10);
      expect(scroller.itemHeight).toBe(1);
    });
  });

  describe('setBufferSize', () => {
    test('should update buffer size and recalculate visible items', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(500);

      const oldVisibleCount = scroller.visibleItems.length;
      scroller.setBufferSize(20);

      expect(scroller.bufferSize).toBe(20);
      // With larger buffer, more items should be visible
      expect(scroller.visibleItems.length).toBeGreaterThan(oldVisibleCount);
    });
  });

  describe('Event listeners', () => {
    test('should add and remove event listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      scroller.addEventListener('test', callback1);
      scroller.addEventListener('test', callback2);

      scroller.emit('test', { data: 'test' });
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      scroller.removeEventListener('test', callback1);
      callback1.mockClear();
      callback2.mockClear();

      scroller.emit('test', { data: 'test' });
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should support multiple event listeners', () => {
      const callbacks = [jest.fn(), jest.fn(), jest.fn()];

      callbacks.forEach((cb) => scroller.addEventListener('scroll', cb));
      scroller.emit('scroll', { offset: 100 });

      callbacks.forEach((cb) => {
        expect(cb).toHaveBeenCalledWith({ offset: 100 });
      });
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle large item lists efficiently', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      const startTime = performance.now();
      scroller.setItems(items);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(100); // Should be very fast
      expect(scroller.items.length).toBe(10000);
    });

    test('should maintain performance during rapid scrolling', () => {
      const items = Array.from({ length: 10000 }, (_, i) => ({ id: i }));
      scroller.setItems(items);

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        scroller.onScroll(i * 10);
      }
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(500); // 1000 scroll events in <500ms
    });

    test('should handle single item', () => {
      scroller.setItems([{ id: 0 }]);
      scroller.onScroll(0);

      expect(scroller.visibleItems.length).toBe(1);
      expect(scroller.visibleItems[0].index).toBe(0);
    });

    test('should handle very small item heights', () => {
      scroller.setItemHeight(1);
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(0);

      expect(scroller.visibleItems.length).toBeGreaterThan(0);
    });

    test('should handle very large item heights', () => {
      scroller.setItemHeight(1000);
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
      scroller.setItems(items);
      scroller.onScroll(0);

      expect(scroller.visibleItems.length).toBeGreaterThan(0);
    });
  });
});

describe('VirtualToolpathRenderer', () => {
  let renderer;

  beforeEach(() => {
    renderer = new VirtualToolpathRenderer({
      segmentsPerCommand: 10,
      visibleSegmentCount: 1000,
      segmentBuffer: 500,
    });
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const defaultRenderer = new VirtualToolpathRenderer();
      expect(defaultRenderer.segmentsPerCommand).toBe(10);
      expect(defaultRenderer.visibleSegmentCount).toBe(1000);
      expect(defaultRenderer.segmentBuffer).toBe(500);
    });

    test('should have empty commands by default', () => {
      expect(renderer.commands).toEqual([]);
      expect(renderer.visibleSegments).toEqual([]);
    });
  });

  describe('loadCommands and updateVisibleSegments', () => {
    test('should load commands and calculate total segments', () => {
      const commands = Array.from({ length: 100 }, (_, i) => ({
        gCode: i % 2 === 0 ? 0 : 1,
        params: {},
        startPos: { x: 0, y: 0, z: 0 },
        endPos: { x: i, y: i, z: 0 },
      }));

      renderer.loadCommands(commands);
      expect(renderer.commands.length).toBe(100);
      expect(renderer.getTotalSegmentCount()).toBe(100 * 10);
    });

    test('should calculate visible segments at start', () => {
      const commands = Array.from({ length: 100 }, (_, i) => ({
        gCode: 1,
        params: {},
        startPos: { x: 0, y: 0, z: 0 },
        endPos: { x: i, y: i, z: 0 },
      }));

      renderer.loadCommands(commands);
      const visibleSegments = renderer.getVisibleSegments();

      expect(visibleSegments.length).toBeGreaterThan(0);
      expect(visibleSegments[0].globalSegmentIndex).toBeGreaterThanOrEqual(0);
    });

    test('should handle empty commands', () => {
      renderer.loadCommands([]);
      expect(renderer.getTotalSegmentCount()).toBe(0);
      expect(renderer.getVisibleSegments()).toEqual([]);
    });
  });

  describe('getCommandSegments', () => {
    test('should generate line segments for G0/G1 commands', () => {
      const command = {
        gCode: 1,
        params: {},
        startPos: { x: 0, y: 0, z: 0 },
        endPos: { x: 10, y: 10, z: 5 },
      };

      const segments = renderer.getCommandSegments(command);
      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0].type).toBe('line');
      expect(segments[0].gCode).toBe(1);
    });

    test('should generate arc segments for G2/G3 commands', () => {
      const command = {
        gCode: 2,
        params: { I: 5, J: 5 },
        startPos: { x: 0, y: 0, z: 0 },
        endPos: { x: 10, y: 10, z: 0 },
      };

      const segments = renderer.getCommandSegments(command);
      expect(segments[0].type).toBe('arc');
      expect(segments[0].center).toEqual({ x: 5, y: 5 });
    });

    test('should handle missing parameters', () => {
      const command = {
        gCode: 1,
        params: {},
      };

      const segments = renderer.getCommandSegments(command);
      expect(segments.length).toBeGreaterThan(0);
      // Should use defaults for missing positions
      expect(segments[0].start).toBeDefined();
      expect(segments[0].end).toBeDefined();
    });
  });

  describe('getTotalSegmentCount', () => {
    test('should calculate correct segment count', () => {
      const commands = Array.from({ length: 50 }, (_, i) => ({
        gCode: 1,
        params: {},
      }));

      renderer.loadCommands(commands);
      expect(renderer.getTotalSegmentCount()).toBe(50 * 10);
    });

    test('should return 0 for empty commands', () => {
      renderer.loadCommands([]);
      expect(renderer.getTotalSegmentCount()).toBe(0);
    });
  });

  describe('advanceSegments', () => {
    beforeEach(() => {
      const commands = Array.from({ length: 500 }, (_, i) => ({
        gCode: 1,
        params: {},
        startPos: { x: i, y: i, z: 0 },
        endPos: { x: i + 1, y: i + 1, z: 0 },
      }));
      renderer.loadCommands(commands);
    });

    test('should advance segment index', () => {
      expect(renderer.currentSegmentIndex).toBe(0);
      renderer.advanceSegments(100);
      expect(renderer.currentSegmentIndex).toBe(100);
    });

    test('should clamp to valid range', () => {
      renderer.advanceSegments(-1000);
      expect(renderer.currentSegmentIndex).toBeGreaterThanOrEqual(0);

      renderer.advanceSegments(100000);
      expect(renderer.currentSegmentIndex).toBeLessThanOrEqual(renderer.getTotalSegmentCount());
    });

    test('should emit segmentRangeChanged event', () => {
      const mockCallback = jest.fn();
      renderer.addEventListener('segmentRangeChanged', mockCallback);

      renderer.advanceSegments(500);
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0].currentSegment).toBe(500);
    });

    test('should calculate progress percentage', () => {
      const mockCallback = jest.fn();
      renderer.addEventListener('segmentRangeChanged', mockCallback);

      renderer.advanceSegments(renderer.getTotalSegmentCount() / 2);
      const eventData = mockCallback.mock.calls[0][0];
      expect(eventData.progress).toBeCloseTo(50, 1);
    });
  });

  describe('jumpToSegment', () => {
    beforeEach(() => {
      const commands = Array.from({ length: 100 }, (_, i) => ({
        gCode: 1,
        params: {},
      }));
      renderer.loadCommands(commands);
    });

    test('should jump to specific segment', () => {
      renderer.jumpToSegment(500);
      expect(renderer.currentSegmentIndex).toBe(500);
    });

    test('should clamp to valid range', () => {
      renderer.jumpToSegment(-100);
      expect(renderer.currentSegmentIndex).toBe(0);

      renderer.jumpToSegment(100000);
      expect(renderer.currentSegmentIndex).toBeLessThanOrEqual(renderer.getTotalSegmentCount());
    });

    test('should emit segmentJump event', () => {
      const mockCallback = jest.fn();
      renderer.addEventListener('segmentJump', mockCallback);

      renderer.jumpToSegment(250);
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0].currentSegment).toBe(250);
    });
  });

  describe('getStats', () => {
    test('should return renderer statistics', () => {
      const commands = Array.from({ length: 100 }, (_, i) => ({
        gCode: 1,
        params: {},
      }));
      renderer.loadCommands(commands);
      renderer.jumpToSegment(500);

      const stats = renderer.getStats();
      expect(stats).toHaveProperty('totalCommands');
      expect(stats).toHaveProperty('totalSegments');
      expect(stats).toHaveProperty('visibleSegments');
      expect(stats).toHaveProperty('currentSegmentIndex');
      expect(stats).toHaveProperty('renderProgress');

      expect(stats.totalCommands).toBe(100);
      expect(stats.totalSegments).toBe(1000);
    });

    test('should calculate render progress correctly', () => {
      const commands = Array.from({ length: 100 }, (_, i) => ({
        gCode: 1,
        params: {},
      }));
      renderer.loadCommands(commands);

      renderer.jumpToSegment(500);
      const stats = renderer.getStats();
      expect(stats.renderProgress).toBe(50);
    });
  });

  describe('Event listeners', () => {
    test('should support event listeners', () => {
      const callback = jest.fn();
      renderer.addEventListener('test', callback);

      renderer.emit('test', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should support multiple listeners for same event', () => {
      const callbacks = [jest.fn(), jest.fn()];
      callbacks.forEach((cb) => renderer.addEventListener('update', cb));

      renderer.emit('update', { segment: 100 });
      callbacks.forEach((cb) => {
        expect(cb).toHaveBeenCalledWith({ segment: 100 });
      });
    });
  });

  describe('Performance', () => {
    test('should handle large command lists efficiently', () => {
      const commands = Array.from({ length: 10000 }, (_, i) => ({
        gCode: i % 4 < 2 ? 1 : 2,
        params: i % 4 >= 2 ? { I: 5, J: 5 } : {},
        startPos: { x: i, y: i, z: 0 },
        endPos: { x: i + 1, y: i + 1, z: 0 },
      }));

      const startTime = performance.now();
      renderer.loadCommands(commands);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(200);
      expect(renderer.getTotalSegmentCount()).toBe(10000 * 10);
    });

    test('should maintain performance during segment navigation', () => {
      const commands = Array.from({ length: 5000 }, (_, i) => ({
        gCode: 1,
        params: {},
      }));
      renderer.loadCommands(commands);

      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        renderer.jumpToSegment(Math.random() * renderer.getTotalSegmentCount());
      }
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(1000); // More generous timeout for CI
    });

    test('should update visible segments efficiently', () => {
      const commands = Array.from({ length: 2000 }, (_, i) => ({
        gCode: 1,
        params: {},
      }));
      renderer.loadCommands(commands);

      const startTime = performance.now();
      for (let i = 0; i < 500; i++) {
        renderer.advanceSegments(100);
      }
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(300);
    });
  });

  describe('Edge cases', () => {
    test('should handle single command', () => {
      renderer.loadCommands([
        {
          gCode: 1,
          params: {},
          startPos: { x: 0, y: 0, z: 0 },
          endPos: { x: 10, y: 10, z: 0 },
        },
      ]);

      expect(renderer.getTotalSegmentCount()).toBe(10);
      expect(renderer.getStats().totalCommands).toBe(1);
    });

    test('should handle mixed command types', () => {
      const commands = [
        { gCode: 0, params: {}, startPos: { x: 0, y: 0, z: 0 }, endPos: { x: 10, y: 10, z: 5 } },
        { gCode: 1, params: {}, startPos: { x: 10, y: 10, z: 5 }, endPos: { x: 20, y: 20, z: 0 } },
        {
          gCode: 2,
          params: { I: 5, J: 5 },
          startPos: { x: 20, y: 20, z: 0 },
          endPos: { x: 30, y: 30, z: 0 },
        },
        {
          gCode: 3,
          params: { I: -5, J: -5 },
          startPos: { x: 30, y: 30, z: 0 },
          endPos: { x: 40, y: 40, z: 0 },
        },
      ];

      renderer.loadCommands(commands);
      expect(renderer.getStats().totalCommands).toBe(4);
    });

    test('should handle invalid segment indices gracefully', () => {
      const commands = Array.from({ length: 10 }, (_, i) => ({
        gCode: 1,
        params: {},
      }));
      renderer.loadCommands(commands);

      renderer.jumpToSegment(-1000);
      expect(renderer.currentSegmentIndex).toBe(0);

      renderer.jumpToSegment(Number.POSITIVE_INFINITY);
      expect(renderer.currentSegmentIndex).toBe(100);
    });
  });
});
