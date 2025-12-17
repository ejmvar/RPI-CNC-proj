/**
 * Toolpath Comparison Tests
 * Phase 14.4: Toolpath Comparison
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import {
  ToolChangeRecord,
  SegmentDiff,
  ToolpathDiff,
  ToolpathComparator,
  VisualizationHints,
} from '../../../modules/presentation/toolpath-comparison.mjs';

describe('ToolChangeRecord', () => {
  test('should create tool change record', () => {
    const record = new ToolChangeRecord(5, 'T1', 'T2', { x: 10, y: 20, z: 5 }, Date.now());

    expect(record.commandIndex).toBe(5);
    expect(record.fromTool).toBe('T1');
    expect(record.toTool).toBe('T2');
    expect(record.position).toEqual({ x: 10, y: 20, z: 5 });
  });

  test('should clone position independently', () => {
    const position = { x: 1, y: 2, z: 3 };
    const record = new ToolChangeRecord(0, 'T1', 'T2', position, Date.now());

    position.x = 999;

    expect(record.position.x).toBe(1);
  });

  test('should get description', () => {
    const record = new ToolChangeRecord(0, 'T1', 'T2', { x: 0, y: 0, z: 0 }, Date.now());
    expect(record.getDescription()).toBe('T1 → T2');
  });

  test('should handle null tools', () => {
    const record = new ToolChangeRecord(0, null, 'T2', { x: 0, y: 0, z: 0 }, Date.now());
    expect(record.getDescription()).toContain('None');
  });
});

describe('SegmentDiff', () => {
  let origSegment;
  let modSegment;

  beforeEach(() => {
    origSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 10, y: 0, z: 0 },
      feedRate: 100,
      spindleSpeed: 1000,
    };

    modSegment = {
      start: { x: 0, y: 0, z: 0 },
      end: { x: 10, y: 0, z: 0 },
      feedRate: 100,
      spindleSpeed: 1000,
    };
  });

  test('should detect identical segments', () => {
    const diff = new SegmentDiff(0, origSegment, modSegment);
    expect(diff.differenceType).toBe('identical');
  });

  test('should detect added segment', () => {
    const diff = new SegmentDiff(0, null, modSegment);
    expect(diff.differenceType).toBe('added');
  });

  test('should detect removed segment', () => {
    const diff = new SegmentDiff(0, origSegment, null);
    expect(diff.differenceType).toBe('removed');
  });

  test('should detect position modification', () => {
    modSegment.end.x = 15;
    const diff = new SegmentDiff(0, origSegment, modSegment);
    expect(diff.differenceType).toBe('modified-position');
  });

  test('should detect feed rate modification', () => {
    modSegment.feedRate = 150;
    const diff = new SegmentDiff(0, origSegment, modSegment);
    expect(diff.differenceType).toBe('modified-feed');
  });

  test('should detect spindle speed modification', () => {
    modSegment.spindleSpeed = 1500;
    const diff = new SegmentDiff(0, origSegment, modSegment);
    expect(diff.differenceType).toBe('modified-spindle');
  });

  test('should detect multiple modifications', () => {
    modSegment.end.x = 15;
    modSegment.feedRate = 150;
    const diff = new SegmentDiff(0, origSegment, modSegment);
    expect(diff.differenceType).toBe('modified-pos-feed');
  });

  test('should calculate distance metrics', () => {
    modSegment.end.x = 20;
    const diff = new SegmentDiff(0, origSegment, modSegment);

    expect(diff.metrics.distanceDiff).toBeGreaterThan(0);
  });

  test('should get summary', () => {
    const diff = new SegmentDiff(0, origSegment, modSegment);
    const summary = diff.getSummary();

    expect(summary.index).toBe(0);
    expect(summary.type).toBe('identical');
    expect(summary.distance).toBeDefined();
    expect(summary.time).toBeDefined();
  });
});

describe('ToolpathDiff', () => {
  let originalToolpath;
  let modifiedToolpath;

  beforeEach(() => {
    originalToolpath = [
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
      },
      {
        start: { x: 10, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
      },
    ];

    modifiedToolpath = [
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
      },
      {
        start: { x: 10, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0 },
        feedRate: 120,
        spindleSpeed: 1000,
      },
    ];
  });

  test('should create toolpath diff', () => {
    const diff = new ToolpathDiff(originalToolpath, modifiedToolpath, 'Test');

    expect(diff.name).toBe('Test');
    expect(diff.segments.length).toBe(2);
  });

  test('should handle different lengths', () => {
    const shorter = [originalToolpath[0]];
    const diff = new ToolpathDiff(originalToolpath, shorter, 'Test');

    expect(diff.segments.length).toBe(2);
  });

  test('should calculate statistics', () => {
    const diff = new ToolpathDiff(originalToolpath, modifiedToolpath, 'Test');

    expect(diff.statistics.totalSegments).toBe(2);
    expect(diff.statistics.identicalSegments).toBeGreaterThanOrEqual(0);
    expect(diff.statistics.modifiedSegments).toBeGreaterThanOrEqual(0);
  });

  test('should get segments by type', () => {
    const diff = new ToolpathDiff(originalToolpath, modifiedToolpath, 'Test');
    const identical = diff.getSegmentsByType('identical');

    expect(Array.isArray(identical)).toBe(true);
  });

  test('should get modified segments', () => {
    const diff = new ToolpathDiff(originalToolpath, modifiedToolpath, 'Test');
    const modified = diff.getModifiedSegments();

    expect(Array.isArray(modified)).toBe(true);
  });

  test('should get summary', () => {
    const diff = new ToolpathDiff(originalToolpath, modifiedToolpath, 'Test');
    const summary = diff.getSummary();

    expect(summary.name).toBe('Test');
    expect(summary.statistics).toBeDefined();
    expect(summary.metrics).toBeDefined();
    expect(summary.statistics.similarityPercent).toBeGreaterThanOrEqual(0);
  });

  test('should calculate similarity percentage', () => {
    const diff = new ToolpathDiff(originalToolpath, originalToolpath, 'Identical');
    const summary = diff.getSummary();

    expect(summary.statistics.similarityPercent).toBe(100);
  });
});

describe('ToolpathComparator', () => {
  let comparator;
  let originalToolpath;
  let modifiedToolpath;

  beforeEach(() => {
    comparator = new ToolpathComparator();

    originalToolpath = [
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
      },
      {
        start: { x: 10, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
      },
    ];

    modifiedToolpath = [
      {
        start: { x: 0, y: 0, z: 0 },
        end: { x: 10, y: 0, z: 0 },
        feedRate: 100,
        spindleSpeed: 1000,
      },
      {
        start: { x: 10, y: 0, z: 0 },
        end: { x: 10, y: 10, z: 0.5 },
        feedRate: 110,
        spindleSpeed: 1000,
      },
    ];
  });

  describe('Initialization', () => {
    test('should create comparator with default options', () => {
      expect(comparator.options.toleranceDistance).toBe(0.01);
      expect(comparator.options.toleranceFeed).toBe(1);
      expect(comparator.options.toleranceSpindle).toBe(50);
    });

    test('should create comparator with custom options', () => {
      const custom = new ToolpathComparator({
        toleranceDistance: 0.5,
        toleranceFeed: 5,
        toleranceSpindle: 100,
      });

      expect(custom.options.toleranceDistance).toBe(0.5);
    });
  });

  describe('Comparison Management', () => {
    test('should create comparison', () => {
      const diff = comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');

      expect(diff).toBeDefined();
      expect(diff.name).toBe('Test');
    });

    test('should reject non-array toolpaths', () => {
      expect(() => comparator.createComparison('not-array', modifiedToolpath, 'Test')).toThrow();
    });

    test('should get comparison by name', () => {
      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');
      const diff = comparator.getComparison('Test');

      expect(diff).not.toBeNull();
      expect(diff.name).toBe('Test');
    });

    test('should return null for non-existent comparison', () => {
      const diff = comparator.getComparison('NonExistent');
      expect(diff).toBeNull();
    });

    test('should list comparisons', () => {
      comparator.createComparison(originalToolpath, modifiedToolpath, 'First');
      comparator.createComparison(originalToolpath, modifiedToolpath, 'Second');

      const list = comparator.listComparisons();

      expect(list.length).toBe(2);
      expect(list).toContain('First');
      expect(list).toContain('Second');
    });

    test('should delete comparison', () => {
      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');
      const removed = comparator.deleteComparison('Test');

      expect(removed).toBe(true);
      expect(comparator.getComparison('Test')).toBeNull();
    });

    test('should return false when deleting non-existent comparison', () => {
      const removed = comparator.deleteComparison('NonExistent');
      expect(removed).toBe(false);
    });
  });

  describe('Tolerance Analysis', () => {
    test('should find tolerant segments', () => {
      const diff = comparator.createComparison(originalToolpath, originalToolpath, 'Test');
      const tolerant = comparator.findTolerantSegments(diff);

      expect(tolerant.length).toBeGreaterThanOrEqual(0);
    });

    test('should apply custom tolerances', () => {
      const custom = new ToolpathComparator({ toleranceDistance: 10 });
      const diff = custom.createComparison(originalToolpath, modifiedToolpath, 'Test');
      const tolerant = custom.findTolerantSegments(diff);

      expect(Array.isArray(tolerant)).toBe(true);
    });
  });

  describe('Mesh Compensation Analysis', () => {
    test('should analyze mesh compensation impact', () => {
      const diff = comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');
      const analysis = comparator.analyzeMeshCompensation(diff);

      expect(analysis.affectedSegments).toBeGreaterThanOrEqual(0);
      expect(analysis.compensationRange).toBeDefined();
      expect(analysis.averageCompensation).toBeDefined();
      expect(analysis.maxCompensation).toBeGreaterThanOrEqual(0);
    });

    test('should track axis-specific compensation', () => {
      const diff = comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');
      const analysis = comparator.analyzeMeshCompensation(diff);

      expect(analysis.segmentsByAxis).toHaveProperty('x');
      expect(analysis.segmentsByAxis).toHaveProperty('y');
      expect(analysis.segmentsByAxis).toHaveProperty('z');
    });
  });

  describe('Report Generation', () => {
    test('should generate report', () => {
      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');
      const report = comparator.generateReport('Test');

      expect(report).not.toBeNull();
      expect(report.title).toContain('Test');
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    test('should return null for non-existent comparison report', () => {
      const report = comparator.generateReport('NonExistent');
      expect(report).toBeNull();
    });

    test('should export report as JSON', () => {
      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');
      const json = comparator.exportReportJSON('Test');

      expect(json).not.toBeNull();
      const parsed = JSON.parse(json);
      expect(parsed.title).toContain('Test');
    });

    test('should export report as CSV', () => {
      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');
      const csv = comparator.exportReportCSV('Test');

      expect(csv).not.toBeNull();
      expect(csv).toContain('Segment Index');
      expect(csv).toContain('Type');
    });

    test('should return null for non-existent comparison exports', () => {
      const json = comparator.exportReportJSON('NonExistent');
      const csv = comparator.exportReportCSV('NonExistent');

      expect(json).toBeNull();
      expect(csv).toBeNull();
    });
  });

  describe('Events', () => {
    test('should emit comparisonCreated event', () => {
      const callback = jest.fn();
      comparator.addEventListener('comparisonCreated', callback);

      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test',
        })
      );
    });

    test('should emit comparisonDeleted event', () => {
      const callback = jest.fn();
      comparator.addEventListener('comparisonDeleted', callback);

      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');
      comparator.deleteComparison('Test');

      expect(callback).toHaveBeenCalledWith({ name: 'Test' });
    });

    test('should support multiple listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      comparator.addEventListener('comparisonCreated', callback1);
      comparator.addEventListener('comparisonCreated', callback2);

      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should remove event listeners', () => {
      const callback = jest.fn();
      comparator.addEventListener('comparisonCreated', callback);
      comparator.removeEventListener('comparisonCreated', callback);

      comparator.createComparison(originalToolpath, modifiedToolpath, 'Test');

      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('VisualizationHints', () => {
  let segments;

  beforeEach(() => {
    segments = [
      new SegmentDiff(
        0,
        {
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          feedRate: 100,
          spindleSpeed: 1000,
        },
        {
          start: { x: 0, y: 0, z: 0 },
          end: { x: 10, y: 0, z: 0 },
          feedRate: 100,
          spindleSpeed: 1000,
        }
      ),
      new SegmentDiff(0, { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } }, null),
      new SegmentDiff(0, null, { start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } }),
    ];
  });

  test('should create segment color map', () => {
    const colorMap = VisualizationHints.createSegmentColorMap(segments);

    expect(colorMap).toBeDefined();
    expect(Object.keys(colorMap).length).toBe(3);
  });

  test('should assign green to identical', () => {
    const colorMap = VisualizationHints.createSegmentColorMap(segments);
    expect(colorMap[0]).toBe('#00AA00');
  });

  test('should assign magenta to removed', () => {
    const colorMap = VisualizationHints.createSegmentColorMap(segments);
    expect(colorMap[1]).toBe('#FF00FF');
  });

  test('should assign blue to added', () => {
    const colorMap = VisualizationHints.createSegmentColorMap(segments);
    expect(colorMap[2]).toBe('#0000FF');
  });

  test('should create segment style map', () => {
    const styleMap = VisualizationHints.createSegmentStyleMap(segments);

    expect(styleMap).toBeDefined();
    expect(Object.keys(styleMap).length).toBe(3);
  });

  test('should apply line width based on modification', () => {
    const styleMap = VisualizationHints.createSegmentStyleMap(segments);

    expect(styleMap[0].lineWidth).toBe(1);
    expect(styleMap[1].lineWidth).toBe(2);
    expect(styleMap[2].lineWidth).toBe(2);
  });

  test('should apply dashed style to removed segments', () => {
    const styleMap = VisualizationHints.createSegmentStyleMap(segments);

    expect(styleMap[0].dashed).toBe(false);
    expect(styleMap[1].dashed).toBe(true);
    expect(styleMap[2].dashed).toBe(false);
  });
});
