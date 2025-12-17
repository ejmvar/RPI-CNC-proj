/**
 * Toolpath Comparison Module
 * Phase 14.4: Toolpath Comparison
 *
 * Features:
 * - Side-by-side toolpath visualization
 * - Diff view for before/after mesh compensation
 * - Tool change tracking and visualization
 * - Comparison statistics and metrics
 * - Export comparison reports
 */

/**
 * Tool Change Record - Represents a tool change event
 */
export class ToolChangeRecord {
  constructor(commandIndex, fromTool, toTool, position, timestamp) {
    this.commandIndex = commandIndex;
    this.fromTool = fromTool;
    this.toTool = toTool;
    this.position = { ...position };
    this.timestamp = timestamp;
  }

  /**
   * Get change description
   */
  getDescription() {
    const from = this.fromTool || 'None';
    const to = this.toTool || 'None';
    return `${from} → ${to}`;
  }
}

/**
 * Segment Diff - Represents difference between two segments
 */
export class SegmentDiff {
  constructor(index, originalSegment, modifiedSegment) {
    this.index = index;
    this.originalSegment = originalSegment ? { ...originalSegment } : null;
    this.modifiedSegment = modifiedSegment ? { ...modifiedSegment } : null;
    this.differenceType = this.calculateDifferenceType();
    this.metrics = this.calculateMetrics();
  }

  /**
   * Calculate type of difference
   */
  calculateDifferenceType() {
    if (!this.originalSegment && this.modifiedSegment) return 'added';
    if (this.originalSegment && !this.modifiedSegment) return 'removed';
    if (!this.originalSegment || !this.modifiedSegment) return 'unknown';

    const posChanged = this.positionChanged();
    const feedChanged = this.feedRateChanged();
    const spindleChanged = this.spindleSpeedChanged();

    if (posChanged && feedChanged && spindleChanged) return 'modified-all';
    if (posChanged && feedChanged) return 'modified-pos-feed';
    if (posChanged && spindleChanged) return 'modified-pos-spindle';
    if (feedChanged && spindleChanged) return 'modified-feed-spindle';
    if (posChanged) return 'modified-position';
    if (feedChanged) return 'modified-feed';
    if (spindleChanged) return 'modified-spindle';

    return 'identical';
  }

  /**
   * Check if position changed
   */
  positionChanged() {
    if (!this.originalSegment || !this.modifiedSegment) return false;
    const o = this.originalSegment;
    const m = this.modifiedSegment;

    // Check if segments have start/end or direct coordinates
    if (o.start && o.end && m.start && m.end) {
      return (
        o.start.x !== m.start.x ||
        o.start.y !== m.start.y ||
        o.start.z !== m.start.z ||
        o.end.x !== m.end.x ||
        o.end.y !== m.end.y ||
        o.end.z !== m.end.z
      );
    }

    // Fallback for direct coordinates
    return o.x !== m.x || o.y !== m.y || o.z !== m.z;
  }

  /**
   * Check if feed rate changed
   */
  feedRateChanged() {
    if (!this.originalSegment || !this.modifiedSegment) return false;
    return this.originalSegment.feedRate !== this.modifiedSegment.feedRate;
  }

  /**
   * Check if spindle speed changed
   */
  spindleSpeedChanged() {
    if (!this.originalSegment || !this.modifiedSegment) return false;
    return this.originalSegment.spindleSpeed !== this.modifiedSegment.spindleSpeed;
  }

  /**
   * Calculate metrics for this segment
   */
  calculateMetrics() {
    const metrics = {
      distanceDiff: 0,
      timeDiff: 0,
      feedDiff: 0,
      spindleDiff: 0,
    };

    if (this.originalSegment && this.modifiedSegment) {
      const origDist = this.getDistance(this.originalSegment);
      const modDist = this.getDistance(this.modifiedSegment);
      metrics.distanceDiff = modDist - origDist;

      metrics.feedDiff = this.modifiedSegment.feedRate - this.originalSegment.feedRate;
      metrics.spindleDiff = this.modifiedSegment.spindleSpeed - this.originalSegment.spindleSpeed;

      if (this.originalSegment.feedRate > 0 && this.modifiedSegment.feedRate > 0) {
        const origTime = origDist / this.originalSegment.feedRate;
        const modTime = modDist / this.modifiedSegment.feedRate;
        metrics.timeDiff = modTime - origTime;
      }
    }

    return metrics;
  }

  /**
   * Calculate segment distance
   */
  getDistance(segment) {
    if (!segment.start || !segment.end) return 0;
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const dz = segment.end.z - segment.start.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Get summary
   */
  getSummary() {
    return {
      index: this.index,
      type: this.differenceType,
      distance: this.metrics.distanceDiff.toFixed(3),
      time: this.metrics.timeDiff.toFixed(3),
      feed: this.metrics.feedDiff.toFixed(1),
      spindle: this.metrics.spindleDiff.toFixed(0),
    };
  }
}

/**
 * Toolpath Diff - Represents complete toolpath comparison
 */
export class ToolpathDiff {
  constructor(originalToolpath, modifiedToolpath, name = 'Comparison') {
    this.name = name;
    this.originalToolpath = originalToolpath || [];
    this.modifiedToolpath = modifiedToolpath || [];
    this.segments = [];
    this.statistics = {};
    this.toolChanges = { original: [], modified: [] };
    this.generateDiff();
  }

  /**
   * Generate diff between toolpaths
   */
  generateDiff() {
    this.segments = [];
    const maxLength = Math.max(this.originalToolpath.length, this.modifiedToolpath.length);

    for (let i = 0; i < maxLength; i++) {
      const origSeg = this.originalToolpath[i] || null;
      const modSeg = this.modifiedToolpath[i] || null;
      const diff = new SegmentDiff(i, origSeg, modSeg);
      this.segments.push(diff);
    }

    this.calculateStatistics();
  }

  /**
   * Calculate comparison statistics
   */
  calculateStatistics() {
    this.statistics = {
      totalSegments: this.segments.length,
      identicalSegments: 0,
      modifiedSegments: 0,
      addedSegments: 0,
      removedSegments: 0,
      totalDistanceDiff: 0,
      totalTimeDiff: 0,
      averageFeedDiff: 0,
      averageSpindleDiff: 0,
      maxDistanceDiff: 0,
      maxTimeDiff: 0,
    };

    let feedDiffSum = 0;
    let spindleDiffSum = 0;
    let diffCount = 0;

    this.segments.forEach((seg) => {
      if (seg.differenceType === 'identical') {
        this.statistics.identicalSegments++;
      } else if (seg.differenceType.startsWith('modified')) {
        this.statistics.modifiedSegments++;
        diffCount++;
      } else if (seg.differenceType === 'added') {
        this.statistics.addedSegments++;
      } else if (seg.differenceType === 'removed') {
        this.statistics.removedSegments++;
      }

      this.statistics.totalDistanceDiff += seg.metrics.distanceDiff;
      this.statistics.totalTimeDiff += seg.metrics.timeDiff;
      this.statistics.maxDistanceDiff = Math.max(
        this.statistics.maxDistanceDiff,
        Math.abs(seg.metrics.distanceDiff)
      );
      this.statistics.maxTimeDiff = Math.max(
        this.statistics.maxTimeDiff,
        Math.abs(seg.metrics.timeDiff)
      );

      if (seg.differenceType.includes('feed') || seg.differenceType === 'identical') {
        feedDiffSum += seg.metrics.feedDiff;
      }
      if (seg.differenceType.includes('spindle') || seg.differenceType === 'identical') {
        spindleDiffSum += seg.metrics.spindleDiff;
      }
    });

    if (diffCount > 0) {
      this.statistics.averageFeedDiff = feedDiffSum / diffCount;
      this.statistics.averageSpindleDiff = spindleDiffSum / diffCount;
    }
  }

  /**
   * Get segments by difference type
   */
  getSegmentsByType(type) {
    return this.segments.filter((seg) => seg.differenceType === type);
  }

  /**
   * Get all modified segments
   */
  getModifiedSegments() {
    return this.segments.filter((seg) => seg.differenceType !== 'identical');
  }

  /**
   * Get comparison summary
   */
  getSummary() {
    return {
      name: this.name,
      statistics: {
        totalSegments: this.statistics.totalSegments,
        identical: this.statistics.identicalSegments,
        modified: this.statistics.modifiedSegments,
        added: this.statistics.addedSegments,
        removed: this.statistics.removedSegments,
        similarityPercent:
          ((this.statistics.identicalSegments / Math.max(this.statistics.totalSegments, 1)) * 100) |
          0,
      },
      metrics: {
        totalDistanceDiff: this.statistics.totalDistanceDiff.toFixed(3),
        totalTimeDiff: this.statistics.totalTimeDiff.toFixed(3),
        maxDistanceDiff: this.statistics.maxDistanceDiff.toFixed(3),
        maxTimeDiff: this.statistics.maxTimeDiff.toFixed(3),
        averageFeedDiff: this.statistics.averageFeedDiff.toFixed(1),
        averageSpindleDiff: this.statistics.averageSpindleDiff.toFixed(0),
      },
    };
  }
}

/**
 * Toolpath Comparator - Main comparison engine
 */
export class ToolpathComparator {
  constructor(options = {}) {
    this.comparisons = new Map(); // name -> ToolpathDiff
    this.eventListeners = {};
    this.options = {
      toleranceDistance: options.toleranceDistance || 0.01,
      toleranceFeed: options.toleranceFeed || 1,
      toleranceSpindle: options.toleranceSpindle || 50,
    };
  }

  /**
   * Create new comparison
   */
  createComparison(originalToolpath, modifiedToolpath, name = 'Comparison') {
    if (!Array.isArray(originalToolpath) || !Array.isArray(modifiedToolpath)) {
      throw new Error('Toolpaths must be arrays');
    }

    const diff = new ToolpathDiff(originalToolpath, modifiedToolpath, name);
    this.comparisons.set(name, diff);
    this.emit('comparisonCreated', { name, statistics: diff.statistics });
    return diff;
  }

  /**
   * Get comparison by name
   */
  getComparison(name) {
    return this.comparisons.get(name) || null;
  }

  /**
   * List all comparisons
   */
  listComparisons() {
    return Array.from(this.comparisons.keys());
  }

  /**
   * Delete comparison
   */
  deleteComparison(name) {
    const existed = this.comparisons.has(name);
    this.comparisons.delete(name);
    if (existed) {
      this.emit('comparisonDeleted', { name });
    }
    return existed;
  }

  /**
   * Find segments within tolerance
   */
  findTolerantSegments(comparison) {
    return comparison.segments.filter((seg) => {
      const distWithin = Math.abs(seg.metrics.distanceDiff) <= this.options.toleranceDistance;
      const feedWithin = Math.abs(seg.metrics.feedDiff) <= this.options.toleranceFeed;
      const spindleWithin = Math.abs(seg.metrics.spindleDiff) <= this.options.toleranceSpindle;
      return distWithin && feedWithin && spindleWithin;
    });
  }

  /**
   * Analyze mesh compensation impact
   */
  analyzeMeshCompensation(comparison) {
    const analysis = {
      affectedSegments: 0,
      compensationRange: { min: Infinity, max: -Infinity },
      averageCompensation: 0,
      maxCompensation: 0,
      segmentsByAxis: { x: 0, y: 0, z: 0 },
    };

    let totalDiff = 0;

    comparison.getModifiedSegments().forEach((seg) => {
      if (!seg.originalSegment || !seg.modifiedSegment) return;

      analysis.affectedSegments++;
      const diff = seg.metrics.distanceDiff;

      analysis.compensationRange.min = Math.min(analysis.compensationRange.min, diff);
      analysis.compensationRange.max = Math.max(analysis.compensationRange.max, diff);
      analysis.maxCompensation = Math.max(analysis.maxCompensation, Math.abs(diff));
      totalDiff += diff;

      // Track which axes changed most
      const orig = seg.originalSegment;
      const mod = seg.modifiedSegment;
      if (Math.abs(mod.x - orig.x) > Math.abs(mod.y - orig.y)) analysis.segmentsByAxis.x++;
      if (Math.abs(mod.y - orig.y) > Math.abs(mod.z - orig.z)) analysis.segmentsByAxis.y++;
      if (Math.abs(mod.z - orig.z) > 0) analysis.segmentsByAxis.z++;
    });

    if (analysis.affectedSegments > 0) {
      analysis.averageCompensation = totalDiff / analysis.affectedSegments;
    }

    return analysis;
  }

  /**
   * Generate HTML report
   */
  generateReport(comparisonName) {
    const comparison = this.getComparison(comparisonName);
    if (!comparison) return null;

    const summary = comparison.getSummary();
    const meshAnalysis = this.analyzeMeshCompensation(comparison);

    const report = {
      title: `Toolpath Comparison: ${comparisonName}`,
      timestamp: new Date().toISOString(),
      summary: summary,
      meshCompensationAnalysis: meshAnalysis,
      detailedSegments: comparison.getModifiedSegments().map((seg) => seg.getSummary()),
    };

    return report;
  }

  /**
   * Export report as JSON
   */
  exportReportJSON(comparisonName) {
    const report = this.generateReport(comparisonName);
    if (!report) return null;
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report as CSV
   */
  exportReportCSV(comparisonName) {
    const comparison = this.getComparison(comparisonName);
    if (!comparison) return null;

    const lines = [];
    lines.push('Segment Index,Type,Distance Diff,Time Diff,Feed Diff,Spindle Diff');

    comparison.getModifiedSegments().forEach((seg) => {
      const summary = seg.getSummary();
      lines.push(
        `${summary.index},${summary.type},${summary.distance},${summary.time},${summary.feed},${summary.spindle}`
      );
    });

    return lines.join('\n');
  }

  /**
   * Event listener management
   */
  addEventListener(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach((callback) => callback(data));
  }
}

/**
 * Visualization Hints - Data for rendering comparisons
 */
export class VisualizationHints {
  static createSegmentColorMap(segments) {
    const colorMap = {};
    const colors = {
      identical: '#00AA00', // Green
      'modified-all': '#FF0000', // Red
      'modified-position': '#FFA500', // Orange
      'modified-feed': '#FFFF00', // Yellow
      'modified-spindle': '#00FFFF', // Cyan
      added: '#0000FF', // Blue
      removed: '#FF00FF', // Magenta
    };

    segments.forEach((seg, idx) => {
      colorMap[idx] = colors[seg.differenceType] || '#CCCCCC';
    });

    return colorMap;
  }

  static createSegmentStyleMap(segments) {
    const styleMap = {};

    segments.forEach((seg, idx) => {
      styleMap[idx] = {
        color: VisualizationHints.createSegmentColorMap([seg])[0],
        lineWidth: seg.differenceType === 'identical' ? 1 : 2,
        opacity: seg.differenceType === 'identical' ? 0.5 : 1.0,
        dashed: seg.differenceType === 'removed',
      };
    });

    return styleMap;
  }
}
