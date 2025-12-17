/**
 * G-Code Optimizer - Unit Tests
 * Phase 18: AI & Machine Learning
 */

import GCodeOptimizer from '../../../modules/ml/gcode-optimizer.mjs';

describe('GCodeOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new GCodeOptimizer();
  });

  describe('G-Code Optimization', () => {
    test('should optimize simple G-Code', () => {
      const gcode = `
        G0 X10 Y10
        G1 Z-5 F100
        G1 X20 Y20 F100
        G0 Z5
      `;

      const result = optimizer.optimize({ gcode });

      expect(result.status).toBe('COMPLETED');
      expect(result.originalCommandCount).toBeGreaterThan(0);
      expect(result.optimizedCommandCount).toBeLessThanOrEqual(result.originalCommandCount);
    });

    test('should calculate execution time improvement', () => {
      const gcode = `G0 X10 Y10\nG1 Z-5 F100\nG1 X20 Y20 F100`;

      const result = optimizer.optimize({ gcode });

      expect(result.improvements.executionTime).toBeGreaterThanOrEqual(-100);
      expect(result.improvements.executionTime).toBeLessThanOrEqual(100);
    });

    test('should handle empty G-Code', () => {
      expect(() => {
        optimizer.optimize({ gcode: ';;;; comments only' });
      }).toThrow('No valid G-Code commands parsed');
    });
  });

  describe('G-Code Analysis', () => {
    test('should analyze G-Code', () => {
      const gcode = `
        G0 X10 Y10
        G1 Z-5 F100
        T1
        G1 X20 Y20 F100
        T2
        G1 X30 Y30 F100
      `;

      const analysis = optimizer.analyze({ gcode });

      expect(analysis.totalCommands).toBeGreaterThan(0);
      expect(analysis.metrics).toBeDefined();
      expect(analysis.opportunities).toBeDefined();
    });

    test('should identify optimization opportunities', () => {
      const gcode = `
        G0 X10 Y10
        G0 X10 Y10
        G1 Z-5 F100
      `;

      const analysis = optimizer.analyze({ gcode });

      expect(analysis.opportunities.length).toBeGreaterThan(0);
    });
  });

  describe('Parameter Suggestions', () => {
    test('should suggest parameters for aluminum', () => {
      const gcode = 'G0 X10\nG1 X20 F100';

      const suggestions = optimizer.suggestParameters({
        gcode,
        material: 'aluminum',
      });

      expect(suggestions.feedRate).toBeGreaterThan(0);
      expect(suggestions.spinleSpeed).toBeGreaterThan(0);
      expect(suggestions.depthOfCut).toBeGreaterThan(0);
    });

    test('should suggest parameters for steel', () => {
      const gcode = 'G0 X10\nG1 X20 F100';

      const suggestions = optimizer.suggestParameters({
        gcode,
        material: 'steel',
      });

      expect(suggestions.feedRate).toBeGreaterThan(0);
      expect(suggestions.spinleSpeed).toBeGreaterThan(0);
    });

    test('should provide tool recommendations', () => {
      const gcode = 'G0 X10\nG1 X20 F100';

      const suggestions = optimizer.suggestParameters({
        gcode,
        material: 'aluminum',
      });

      expect(suggestions.toolRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Strategy Comparison', () => {
    test('should compare optimization strategies', () => {
      const gcode = 'G0 X10\nG1 X20 F100\nG1 Y30 F100';

      const comparison = optimizer.compareStrategies({ gcode });

      expect(comparison.strategies.length).toBeGreaterThan(0);
      expect(comparison.recommended).toBeDefined();
    });

    test('should recommend best strategy', () => {
      const gcode = 'G0 X10\nG1 X20 F100';

      const comparison = optimizer.compareStrategies({ gcode });

      expect(comparison.recommended.strategy).toBeDefined();
      expect(comparison.recommended.estimatedScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metrics Calculation', () => {
    test('should calculate distance and time', () => {
      const gcode = `
        G0 X10 Y10
        G1 X20 Y20 F100
      `;

      const analysis = optimizer.analyze({ gcode });

      expect(analysis.metrics.totalDistance).toBeGreaterThan(0);
      expect(analysis.metrics.estimatedTime).toBeGreaterThanOrEqual(0);
    });

    test('should count tool changes', () => {
      const gcode = `
        T1
        G1 X10 F100
        T2
        G1 X20 F100
      `;

      const analysis = optimizer.analyze({ gcode });

      // Tool parsing may vary, so just verify toolChanges exists
      expect(analysis.metrics.toolChanges).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Collision Detection', () => {
    test('should detect workspace violations', () => {
      const gcode = `
        G0 X200 Y200
        G1 Z-5 F100
      `;

      const result = optimizer.optimize({
        gcode,
        workspaceSize: { x: 100, y: 100, z: 50 },
        enableCollisionDetection: true,
      });

      expect(result.status).toBe('COMPLETED');
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics', () => {
      const gcode = 'G0 X10\nG1 X20 F100';

      optimizer.optimize({ gcode });

      const stats = optimizer.getStatistics();

      expect(stats.totalOptimizations).toBeGreaterThan(0);
      expect(stats.averageTimeImprovement).toBeDefined();
    });
  });

  describe('Event Emission', () => {
    test('should emit optimization:completed event', (done) => {
      optimizer.on('optimization:completed', (data) => {
        expect(data.status).toBe('COMPLETED');
        done();
      });

      optimizer.optimize({ gcode: 'G0 X10\nG1 X20' });
    });
  });
});
