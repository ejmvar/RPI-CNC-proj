/**
 * Unit tests for G-Code optimizer module
 */

import {
  optimizeGCode,
  analyzeOptimizationPotential,
  DEFAULT_OPTIONS,
} from '../../../modules/gcode/optimizer.mjs';

describe('G-Code Optimizer', () => {
  describe('optimizeGCode', () => {
    test('should handle empty input', () => {
      const result = optimizeGCode('');
      expect(result.gcode).toBe('');
      expect(result.stats).toBeDefined();
    });

    test('should handle null input', () => {
      const result = optimizeGCode(null);
      expect(result.gcode).toBe('');
    });

    test('should remove redundant moves', () => {
      const gcode = `G0 X10 Y10
G0 X10 Y10
G1 X20 Y20 F1000
G1 X20 Y20`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: true,
        combineCollinear: false,
        removeDuplicateCommands: false,
      });

      expect(result.stats.redundantMovesRemoved).toBe(2);
      expect(result.gcode).not.toContain('X10 Y10');
    });

    test('should preserve F and S commands from redundant moves', () => {
      const gcode = `G1 X10 Y10 F1000
G1 X10 Y10 F1500`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: true,
        combineCollinear: false,
        removeDuplicateCommands: false,
      });

      expect(result.gcode).toContain('F1500');
    });

    test('should combine collinear segments', () => {
      const gcode = `G1 X0 Y0
G1 X10 Y0 F1000
G1 X20 Y0
G1 X30 Y0`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: false,
        combineCollinear: true,
        removeDuplicateCommands: false,
      });

      expect(result.stats.collinearSegmentsCombined).toBeGreaterThan(0);
    });

    test('should not combine non-collinear segments', () => {
      const gcode = `G1 X0 Y0 F1000
G1 X10 Y0
G1 X10 Y10
G1 X20 Y10`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: false,
        combineCollinear: true,
        removeDuplicateCommands: false,
      });

      expect(result.gcode).toContain('X10.0000 Y10.0000');
    });

    test('should not combine segments with different feed rates', () => {
      const gcode = `G1 X0 Y0 F1000
G1 X10 Y0 F1000
G1 X20 Y0 F2000`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: false,
        combineCollinear: true,
        removeDuplicateCommands: false,
      });

      // Should not combine due to feed rate change
      expect(result.gcode).toContain('F2000');
    });

    test('should remove duplicate F commands', () => {
      const gcode = `G1 X10 Y10 F1000
G1 X20 Y20 F1000
G1 X30 Y30 F1000`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: false,
        combineCollinear: false,
        removeDuplicateCommands: true,
      });

      expect(result.stats.duplicateCommandsRemoved).toBeGreaterThan(0);
      const fCount = (result.gcode.match(/F1000/g) || []).length;
      expect(fCount).toBe(1);
    });

    test('should remove duplicate S commands', () => {
      const gcode = `M3 S12000
G1 X10 Y10
M3 S12000
G1 X20 Y20`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: false,
        combineCollinear: false,
        removeDuplicateCommands: true,
      });

      const sCount = (result.gcode.match(/S12000/g) || []).length;
      expect(sCount).toBe(1);
    });

    test('should preserve comments', () => {
      const gcode = `; This is a comment
G1 X10 Y10 F1000
; Another comment
G1 X10 Y10`;

      const result = optimizeGCode(gcode);

      expect(result.gcode).toContain('; This is a comment');
      expect(result.gcode).toContain('; Another comment');
    });

    test('should apply all optimizations by default', () => {
      const gcode = `G1 X0 Y0 F1000
G1 X10 Y0 F1000
G1 X20 Y0 F1000
G1 X20 Y0
G1 X30 Y10 F2000
G1 X30 Y10`;

      const result = optimizeGCode(gcode);

      expect(result.stats.redundantMovesRemoved).toBeGreaterThan(0);
      expect(result.stats.duplicateCommandsRemoved).toBeGreaterThan(0);
    });

    test('should calculate reduction percentage', () => {
      const gcode = `G1 X0 Y0 F1000
G1 X10 Y0 F1000
G1 X10 Y0
G1 X20 Y0 F1000`;

      const result = optimizeGCode(gcode);

      expect(result.stats.reductionPercent).toBeGreaterThan(0);
      expect(result.stats.originalCommands).toBeGreaterThan(result.stats.optimizedLines);
    });

    test('should handle 3D movements (with Z)', () => {
      const gcode = `G1 X10 Y10 Z5
G1 X10 Y10 Z5
G1 X20 Y20 Z10 F1000
G1 X30 Y30 Z15`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: true,
        combineCollinear: false,
        removeDuplicateCommands: false,
      });

      expect(result.stats.redundantMovesRemoved).toBe(1);
    });

    test('should respect position tolerance', () => {
      const gcode = `G1 X10.0000 Y10.0000
G1 X10.0005 Y10.0005`;

      const result = optimizeGCode(gcode, {
        removeRedundantMoves: true,
        positionTolerance: 0.001,
      });

      // Should not be considered redundant (outside tolerance)
      expect(result.stats.redundantMovesRemoved).toBe(0);
    });

    test('should respect collinear angle tolerance', () => {
      const gcode = `G1 X0 Y0 F1000
G1 X10 Y0
G1 X20 Y0.1`;

      const resultStrict = optimizeGCode(gcode, {
        combineCollinear: true,
        collinearTolerance: 0.1,
      });

      const resultLoose = optimizeGCode(gcode, {
        combineCollinear: true,
        collinearTolerance: 5.0,
      });

      // Loose tolerance should combine more
      expect(resultLoose.stats.collinearSegmentsCombined).toBeGreaterThanOrEqual(
        resultStrict.stats.collinearSegmentsCombined
      );
    });

    test('should handle G0 rapid moves', () => {
      const gcode = `G0 X10 Y10
G0 X10 Y10
G0 X20 Y20`;

      const result = optimizeGCode(gcode);

      expect(result.stats.redundantMovesRemoved).toBe(1);
    });

    test('should handle mixed G0 and G1 commands', () => {
      const gcode = `G0 X10 Y10
G1 X10 Y10 F1000
G0 X20 Y20
G1 X20 Y20`;

      const result = optimizeGCode(gcode);

      expect(result.stats.redundantMovesRemoved).toBe(2);
    });

    test('should preserve non-movement commands', () => {
      const gcode = `G21
G90
M3 S12000
G1 X10 Y10 F1000
M5`;

      const result = optimizeGCode(gcode);

      expect(result.gcode).toContain('G21');
      expect(result.gcode).toContain('G90');
      expect(result.gcode).toContain('M3');
      expect(result.gcode).toContain('M5');
    });

    test('should handle arc commands (G2/G3)', () => {
      const gcode = `G2 X10 Y10 I5 J0 F1000
G2 X10 Y10 I5 J0`;

      const result = optimizeGCode(gcode);

      // Redundant arc should be removed
      expect(result.stats.redundantMovesRemoved).toBe(1);
    });

    test('should provide accurate statistics', () => {
      const gcode = `G1 X0 Y0 F1000
G1 X10 Y0 F1000
G1 X20 Y0 F1000
G1 X20 Y0`;

      const result = optimizeGCode(gcode);

      expect(result.stats.originalLines).toBeDefined();
      expect(result.stats.originalCommands).toBeDefined();
      expect(result.stats.optimizedLines).toBeDefined();
      expect(result.stats.reductionPercent).toBeDefined();
      expect(result.stats.redundantMovesRemoved).toBeDefined();
      expect(result.stats.collinearSegmentsCombined).toBeDefined();
      expect(result.stats.duplicateCommandsRemoved).toBeDefined();
    });
  });

  describe('analyzeOptimizationPotential', () => {
    test('should analyze without modifying', () => {
      const gcode = `G1 X0 Y0 F1000
G1 X10 Y0 F1000
G1 X20 Y0 F1000
G1 X20 Y0`;

      const analysis = analyzeOptimizationPotential(gcode);

      expect(analysis.totalLines).toBeGreaterThan(0);
      expect(analysis.totalCommands).toBeGreaterThan(0);
      expect(analysis.potentialReduction).toBeGreaterThan(0);
    });

    test('should handle empty input', () => {
      const analysis = analyzeOptimizationPotential('');
      expect(analysis.totalLines).toBe(0);
      expect(analysis.potentialReduction).toBe(0);
    });

    test('should count all optimization types', () => {
      const gcode = `G1 X10 Y10 F1000
G1 X10 Y10 F1000
G1 X20 Y10 F1000
G1 X30 Y10`;

      const analysis = analyzeOptimizationPotential(gcode);

      expect(analysis.redundantMoves).toBeDefined();
      expect(analysis.collinearSegments).toBeDefined();
      expect(analysis.duplicateCommands).toBeDefined();
      expect(analysis.potentialReduction).toBeGreaterThan(0);
    });

    test('should respect options in analysis', () => {
      const gcode = `G1 X10 Y10
G1 X10 Y10`;

      const withOpt = analyzeOptimizationPotential(gcode, {
        removeRedundantMoves: true,
      });

      const withoutOpt = analyzeOptimizationPotential(gcode, {
        removeRedundantMoves: false,
      });

      expect(withOpt.potentialReduction).toBeGreaterThan(withoutOpt.potentialReduction);
    });
  });

  describe('DEFAULT_OPTIONS', () => {
    test('should have all required options', () => {
      expect(DEFAULT_OPTIONS.removeRedundantMoves).toBeDefined();
      expect(DEFAULT_OPTIONS.combineCollinear).toBeDefined();
      expect(DEFAULT_OPTIONS.removeDuplicateCommands).toBeDefined();
      expect(DEFAULT_OPTIONS.collinearTolerance).toBeDefined();
      expect(DEFAULT_OPTIONS.positionTolerance).toBeDefined();
    });

    test('should have sensible default values', () => {
      expect(DEFAULT_OPTIONS.removeRedundantMoves).toBe(true);
      expect(DEFAULT_OPTIONS.combineCollinear).toBe(true);
      expect(DEFAULT_OPTIONS.removeDuplicateCommands).toBe(true);
      expect(DEFAULT_OPTIONS.collinearTolerance).toBeGreaterThan(0);
      expect(DEFAULT_OPTIONS.positionTolerance).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle single command', () => {
      const result = optimizeGCode('G1 X10 Y10 F1000');
      expect(result.gcode).toBeTruthy();
    });

    test('should handle only comments', () => {
      const result = optimizeGCode('; Comment 1\n; Comment 2');
      expect(result.gcode).toContain('; Comment 1');
      expect(result.gcode).toContain('; Comment 2');
    });

    test('should handle commands without coordinates', () => {
      const result = optimizeGCode('G21\nG90\nM3 S12000');
      expect(result.gcode).toContain('G21');
      expect(result.gcode).toContain('G90');
      expect(result.gcode).toContain('M3');
    });

    test('should handle very small tolerance', () => {
      const gcode = `G1 X10.0000 Y10.0000
G1 X10.0001 Y10.0001`;

      const result = optimizeGCode(gcode, {
        positionTolerance: 0.0001,
      });

      expect(result.stats.redundantMovesRemoved).toBe(0);
    });

    test('should handle very large tolerance', () => {
      const gcode = `G1 X10 Y10
G1 X10.5 Y10.5`;

      const result = optimizeGCode(gcode, {
        positionTolerance: 1.0,
      });

      expect(result.stats.redundantMovesRemoved).toBe(1);
    });

    test('should handle zero-length moves', () => {
      const gcode = `G1 X0 Y0
G1 X0 Y0
G1 X0 Y0`;

      const result = optimizeGCode(gcode);
      expect(result.stats.redundantMovesRemoved).toBe(2);
    });
  });
});
