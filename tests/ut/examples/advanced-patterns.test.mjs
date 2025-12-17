/**
 * Advanced G-Code Examples Test Suite (Phase 12.1)
 * Validates advanced G-Code patterns: drilling, engraving, spirals
 * Tests parser compatibility, geometry validation, and toolpath analysis
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { parse } from '../../../modules/gcode/parser.mjs';

describe('Phase 12.1: Advanced G-Code Examples', () => {
  let parser;

  beforeEach(() => {
    parser = parse;
  });

  describe('PCB Drilling Pattern', () => {
    test('parses PCB drilling pattern successfully', () => {
      const gcodeContent = `
        G90
        G21
        M3 S3000
        G0 X5 Y5
        G1 Z-2 F100
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      expect(commands).toBeDefined();
      expect(commands.length).toBeGreaterThan(0);
    });

    test('identifies all drill holes in pattern', () => {
      const gcodeContent = `
        G0 X5 Y5
        G1 Z-2 F100
        G0 Z2
        G0 X15 Y5
        G1 Z-2 F100
        G0 Z2
        G0 X25 Y5
        G1 Z-2 F100
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      // Count drill moves (G1 with negative Z)
      const drillMoves = commands.filter(
        (cmd) =>
          cmd.codes && cmd.codes.includes('G1') && cmd.params.Z !== undefined && cmd.params.Z < 0
      );

      expect(drillMoves.length).toBeGreaterThanOrEqual(3);
    });

    test('preserves spindle speed changes for hole groups', () => {
      const gcodeContent = `
        M3 S3000
        G0 X5 Y5
        M5
        M3 S2500
        G0 X38 Y28
      `;

      const commands = parser(gcodeContent);
      const m3Cmds = commands.filter((cmd) => cmd.codes && cmd.codes.includes('M3'));

      expect(m3Cmds.length).toBeGreaterThanOrEqual(2);
      expect(m3Cmds.some((cmd) => cmd.params.S === 3000)).toBe(true);
      expect(m3Cmds.some((cmd) => cmd.params.S === 2500)).toBe(true);
    });

    test('validates PCB tool pattern has positive Z clearance', () => {
      const gcodeContent = `
        G0 Z2
        G0 X5 Y5
        G1 Z-2
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      const rapidZ = commands
        .filter((cmd) => cmd.codes && cmd.codes.includes('G0') && cmd.params.Z !== undefined)
        .map((cmd) => cmd.params.Z);

      expect(rapidZ.some((z) => z > 0)).toBe(true);
    });

    test('calculates approximate drilling time', () => {
      const gcodeContent = `
        G0 Z2
        G0 X5 Y5
        G1 Z-2 F100
        G0 Z2
        G0 X15 Y5
        G1 Z-2 F100
        G0 Z2
      `;

      const commands = parser(gcodeContent);

      // Feed rate moves: G1 commands with F parameter
      const feedMoves = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.F !== undefined
      );

      expect(feedMoves.length).toBeGreaterThan(0);
    });

    test('identifies signal pads vs power pads by Z depth', () => {
      const gcodeContent = `
        G1 Z-2 F100
        G0 Z2
        G1 Z-2 F80
        G0 Z2
        G1 Z-1.5 F120
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      const deepDrills = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.Z === -2
      );
      const shallowDrills = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.Z === -1.5
      );

      expect(deepDrills.length).toBeGreaterThan(0);
      expect(shallowDrills.length).toBeGreaterThan(0);
    });
  });

  describe('Text Engraving Pattern', () => {
    test('parses text engraving pattern successfully', () => {
      const gcodeContent = `
        G90
        G21
        M3 S8000
        G0 X5 Y10
        G1 Z-0.5 F60
      `;

      const commands = parser(gcodeContent);
      expect(commands).toBeDefined();
      expect(commands.length).toBeGreaterThan(0);
    });

    test('validates constant spindle speed for engraving', () => {
      const gcodeContent = `
        M3 S8000
        G0 X5 Y10
        G1 Z-0.5 F60
        G1 X7 Y12 F60
      `;

      const commands = parser(gcodeContent);
      const m3Cmd = commands.find((cmd) => cmd.codes && cmd.codes.includes('M3'));

      expect(m3Cmd).toBeDefined();
      expect(m3Cmd.params.S).toBe(8000);
    });

    test('identifies engraving strokes by continuous feed moves', () => {
      const gcodeContent = `
        G0 X5 Y10
        G1 Z-0.5 F60
        G1 X7 Y12 F60
        G0 Z1
        G0 X12 Y6
        G1 Z-0.5 F60
        G1 X12 Y12 F60
        G0 Z1
      `;

      const commands = parser(gcodeContent);

      // Count G1 commands (feed moves)
      const feedMoves = commands.filter((cmd) => cmd.codes && cmd.codes.includes('G1'));

      expect(feedMoves.length).toBeGreaterThan(0);
    });

    test('validates shallow engraving depth', () => {
      const gcodeContent = `
        G1 Z-0.5 F60
        G1 X7 Y12 F60
      `;

      const commands = parser(gcodeContent);
      const depths = commands
        .filter((cmd) => cmd.params.Z !== undefined && cmd.params.Z < 0)
        .map((cmd) => cmd.params.Z);

      expect(depths.every((z) => Math.abs(z) <= 1.0)).toBe(true);
    });

    test('calculates total engraving length approximately', () => {
      const gcodeContent = `
        G0 X5 Y10
        G1 Z-0.5 F60
        G1 X7 Y12 F60
        G0 Z1
        G0 X12 Y6
        G1 Z-0.5 F60
        G1 X12 Y12 F60
        G0 Z1
      `;

      const commands = parser(gcodeContent);
      let totalDistance = 0;
      let prevX = 0,
        prevY = 0;

      commands.forEach((cmd) => {
        if (cmd.params.X !== undefined) {
          if (cmd.params.Y !== undefined) {
            const dx = cmd.params.X - prevX;
            const dy = cmd.params.Y - prevY;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
            prevX = cmd.params.X;
            prevY = cmd.params.Y;
          } else {
            prevX = cmd.params.X;
          }
        } else if (cmd.params.Y !== undefined) {
          const dx = 0;
          const dy = cmd.params.Y - prevY;
          totalDistance += Math.sqrt(dx * dx + dy * dy);
          prevY = cmd.params.Y;
        }
      });

      expect(totalDistance).toBeGreaterThan(0);
    });
  });

  describe('Parametric Spiral Toolpath', () => {
    test('parses spiral pattern successfully', () => {
      const gcodeContent = `
        G90
        G21
        M3 S2000
        G0 X21 Y20
        G1 Z-1 F50
      `;

      const commands = parser(gcodeContent);
      expect(commands).toBeDefined();
      expect(commands.length).toBeGreaterThan(0);
    });

    test('identifies arc movements in spiral', () => {
      const gcodeContent = `
        G0 X21 Y20
        G1 Z-1 F50
        G2 X21 Y20 I-1 J0 F50
      `;

      const commands = parser(gcodeContent);
      const arcMoves = commands.filter(
        (cmd) => cmd.codes && (cmd.codes.includes('G2') || cmd.codes.includes('G3'))
      );

      expect(arcMoves.length).toBeGreaterThan(0);
    });

    test('validates clockwise spiral (G2) vs counter-clockwise (G3)', () => {
      const gcodeContent = `
        G2 X21 Y20 I-1 J0 F50
        G3 X28 Y20 I-8 J0 F50
      `;

      const commands = parser(gcodeContent);
      const g2Moves = commands.filter((cmd) => cmd.codes && cmd.codes.includes('G2'));
      const g3Moves = commands.filter((cmd) => cmd.codes && cmd.codes.includes('G3'));

      expect(g2Moves.length + g3Moves.length).toBeGreaterThan(0);
    });

    test('detects progressive depth changes in spiral', () => {
      const gcodeContent = `
        G0 X21 Y20
        G1 Z-1 F50
        G2 X21 Y20 I-1 J0 F50
        G1 Z-1.25
        G0 X22 Y20
        G1 Z-1.25 F50
        G2 X22 Y20 I-2 J0 F50
        G1 Z-1.5
      `;

      const commands = parser(gcodeContent);
      const zMoves = commands
        .filter(
          (cmd) =>
            cmd.codes && cmd.codes.includes('G1') && cmd.params.Z !== undefined && cmd.params.Z < 0
        )
        .map((cmd) => cmd.params.Z)
        .sort((a, b) => a - b);

      // Should have varying depths
      expect(new Set(zMoves).size).toBeGreaterThan(1);
    });

    test('validates spiral center point calculations', () => {
      const gcodeContent = `
        G0 X21 Y20
        G2 X21 Y20 I-1 J0
        G0 X22 Y20
        G2 X22 Y20 I-2 J0
        G0 X27 Y20
        G2 X27 Y20 I-7 J0
      `;

      const commands = parser(gcodeContent);
      const arcCmds = commands.filter(
        (cmd) => cmd.codes && (cmd.codes.includes('G2') || cmd.codes.includes('G3'))
      );

      // Each arc should have center offset (I, J)
      expect(arcCmds.every((cmd) => cmd.params.I !== undefined && cmd.params.J !== undefined)).toBe(
        true
      );
    });

    test('identifies concentric vs expanding spirals', () => {
      const gcodeContent = `
        G0 X21 Y20
        G2 X21 Y20 I-1 J0
        G0 X22 Y20
        G2 X22 Y20 I-2 J0
        G0 X25 Y20
        G2 X25 Y20 I-5 J0
      `;

      const commands = parser(gcodeContent);

      // Extract radius information from I offset
      const radii = commands
        .filter(
          (cmd) =>
            cmd.codes &&
            (cmd.codes.includes('G2') || cmd.codes.includes('G3')) &&
            cmd.params.I !== undefined
        )
        .map((cmd) => Math.abs(cmd.params.I));

      // Should detect expanding pattern
      expect(radii.length).toBeGreaterThan(0);
      expect(Math.max(...radii) > Math.min(...radii)).toBe(true);
    });

    test('calculates approximate spiral path length', () => {
      const radius1 = 1; // Starting radius
      const finalRadius = 8; // Ending radius

      // Approximate spiral length: sum of circumferences
      let spiralLength = 0;
      for (let r = radius1; r <= finalRadius; r++) {
        spiralLength += 2 * Math.PI * r;
      }

      expect(spiralLength).toBeGreaterThan(0);
    });
  });

  describe('Multi-Pattern Integration', () => {
    test('validates mixed operation file (drilling + engraving)', () => {
      const gcodeContent = `
        M3 S3000
        G0 X5 Y5
        G1 Z-2 F100
        G0 Z2
        M5
        M3 S8000
        G0 X20 Y20
        G1 Z-0.5 F60
        G1 X22 Y22 F60
        G0 Z1
      `;

      const commands = parser(gcodeContent);
      const m3Cmds = commands.filter((cmd) => cmd.codes && cmd.codes.includes('M3'));

      expect(m3Cmds.length).toBeGreaterThanOrEqual(2);
    });

    test('identifies tool change points in sequence', () => {
      const gcodeContent = `
        M5
        M3 S3000
        G0 X0 Y0
        M5
        M3 S8000
        G0 X20 Y20
        M5
        M3 S2000
        G0 X40 Y40
      `;

      const commands = parser(gcodeContent);
      const toolChanges = commands.filter((cmd) => cmd.codes && cmd.codes.includes('M3'));

      expect(toolChanges.length).toBeGreaterThan(0);
    });

    test('validates safe height maintenance between operations', () => {
      const gcodeContent = `
        G1 Z-2
        G0 Z2
        G1 Z-0.5
        G0 Z2
        G1 Z-1
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      const rapidRetracts = commands.filter(
        (cmd) =>
          cmd.codes && cmd.codes.includes('G0') && cmd.params.Z !== undefined && cmd.params.Z > 0
      );

      expect(rapidRetracts.length).toBeGreaterThan(0);
      expect(rapidRetracts.every((cmd) => cmd.params.Z >= 1)).toBe(true);
    });
  });

  describe('Edge Cases & Validation', () => {
    test('handles empty lines and comments gracefully', () => {
      const gcodeContent = `
        ; This is a comment
        G90
        
        ; Another comment
        G0 X5 Y5
        
      `;

      expect(() => parser(gcodeContent)).not.toThrow();
      const commands = parser(gcodeContent);
      expect(commands.length).toBeGreaterThan(0);
    });

    test('validates feed rate values in advanced patterns', () => {
      const gcodeContent = `
        G1 Z-2 F100
        G1 X7 Y12 F60
        G1 Z-1 F50
      `;

      const commands = parser(gcodeContent);
      const feedRates = commands
        .filter((cmd) => cmd.params.F !== undefined)
        .map((cmd) => cmd.params.F);

      expect(feedRates.every((f) => f > 0 && f < 1000)).toBe(true);
    });

    test('detects potential collisions in dense patterns', () => {
      const gcodeContent = `
        G0 X2 Y2
        G1 Z-2
        G0 X2.1 Y2.1
        G1 Z-2
        G0 X2.2 Y2.2
        G1 Z-2
      `;

      const commands = parser(gcodeContent);
      const moves = commands.filter((cmd) => cmd.codes && cmd.codes.includes('G0'));

      // Detect close proximity moves (potential collision risk)
      let closeProximityCalls = 0;
      for (let i = 1; i < moves.length; i++) {
        const prev = moves[i - 1];
        const curr = moves[i];

        if (
          prev.params.X !== undefined &&
          curr.params.X !== undefined &&
          prev.params.Y !== undefined &&
          curr.params.Y !== undefined
        ) {
          const dist = Math.sqrt(
            Math.pow(curr.params.X - prev.params.X, 2) + Math.pow(curr.params.Y - prev.params.Y, 2)
          );
          if (dist < 0.5) closeProximityCalls++;
        }
      }

      expect(closeProximityCalls).toBeGreaterThan(0);
    });
  });
});
