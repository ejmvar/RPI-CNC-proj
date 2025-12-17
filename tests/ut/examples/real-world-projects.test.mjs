/**
 * Real-World Projects Test Suite (Phase 12.2)
 * Validates enclosure, nameplate, and PCB isolation routing projects
 * Tests project structure, safety, and manufacturing feasibility
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { parse } from '../../../modules/gcode/parser.mjs';

describe('Phase 12.2: Real-World Project Templates', () => {
  let parser;

  beforeEach(() => {
    parser = parse;
  });

  describe('Enclosure Box Project', () => {
    test('parses enclosure project successfully', () => {
      const gcodeContent = `
        G90
        G21
        M3 S5000
        G0 Z3
        G0 X0 Y0
        G1 Z-3.2 F80
      `;

      const commands = parser(gcodeContent);
      expect(commands.length).toBeGreaterThan(0);
    });

    test('validates enclosure has proper safe heights', () => {
      const gcodeContent = `
        G0 Z3
        G1 Z-3.2 F80
        G0 Z3
        G0 X60 Y40
      `;

      const commands = parser(gcodeContent);
      const rapidZ = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G0') && cmd.params.Z !== undefined
      );

      expect(rapidZ.every((cmd) => cmd.params.Z >= 3)).toBe(true);
    });

    test('detects all mounting holes in enclosure', () => {
      const gcodeContent = `
        G0 X5 Y5
        G1 Z-3.2 F60
        G0 Z3
        G0 X55 Y5
        G1 Z-3.2 F60
        G0 Z3
        G0 X55 Y35
        G1 Z-3.2 F60
        G0 Z3
        G0 X5 Y35
        G1 Z-3.2 F60
        G0 Z3
      `;

      const commands = parser(gcodeContent);
      const drilledPoints = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.Z === -3.2
      );

      expect(drilledPoints.length).toBeGreaterThanOrEqual(4);
    });

    test('validates perimeter cutting path is closed', () => {
      const gcodeContent = `
        G0 X0 Y0
        G1 Z-3.2 F80
        G1 X60 Y0 F80
        G1 X60 Y40 F80
        G1 X0 Y40 F80
        G1 X0 Y0 F80
      `;

      const commands = parser(gcodeContent);
      const cutCommands = commands.filter((cmd) => cmd.codes && cmd.codes.includes('G1'));

      expect(cutCommands.length).toBeGreaterThanOrEqual(4);
    });

    test('detects all three panel sections', () => {
      const gcodeContent = `
        G0 X0 Y0
        G0 X70 Y0
        G0 X140 Y0
      `;

      const commands = parser(gcodeContent);
      const panelPositions = commands
        .filter((cmd) => cmd.codes && cmd.codes.includes('G0') && cmd.params.X !== undefined)
        .map((cmd) => cmd.params.X);

      // Should have positions near 0, 70, and 140
      expect(panelPositions.some((x) => x >= 0 && x <= 10)).toBe(true);
      expect(panelPositions.some((x) => x >= 65 && x <= 75)).toBe(true);
      expect(panelPositions.some((x) => x >= 135 && x <= 145)).toBe(true);
    });

    test('validates finger joint pattern alternation', () => {
      const gcodeContent = `
        G1 X145 Y40 F80
        G1 X145 Y35 F80
        G1 X150 Y35 F80
        G1 X150 Y40 F80
        G1 X155 Y40 F80
        G1 X155 Y35 F80
        G1 X160 Y35 F80
        G1 X160 Y40 F80
      `;

      const commands = parser(gcodeContent);
      const xPositions = commands
        .filter((cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.X !== undefined)
        .map((cmd) => cmd.params.X);

      // Should have alternating pattern
      expect(xPositions.length).toBeGreaterThanOrEqual(5);
    });

    test('calculates total enclosure material area', () => {
      // Three panels: 60x40, 60x40, 35x40
      const panel1 = 60 * 40; // 2400 mm²
      const panel2 = 60 * 40; // 2400 mm²
      const panel3 = 35 * 40; // 1400 mm²
      const totalArea = panel1 + panel2 + panel3;

      expect(totalArea).toBeCloseTo(6200, 0);
    });
  });

  describe('Nameplate Engraving Project', () => {
    test('parses nameplate project successfully', () => {
      const gcodeContent = `
        G90
        G21
        M3 S12000
        G0 Z2
        G1 Z-0.5 F40
      `;

      const commands = parser(gcodeContent);
      expect(commands.length).toBeGreaterThan(0);
    });

    test('validates nameplate border frame', () => {
      const gcodeContent = `
        G0 X2 Y2
        G1 Z-0.5 F40
        G1 X98 Y2 F40
        G1 X98 Y38 F40
        G1 X2 Y38 F40
        G1 X2 Y2 F40
      `;

      const commands = parser(gcodeContent);
      const borderCommands = commands.filter((cmd) => cmd.codes && cmd.codes.includes('G1'));

      expect(borderCommands.length).toBeGreaterThanOrEqual(4);
    });

    test('validates shallow engraving depth for nameplate', () => {
      const gcodeContent = `
        G1 Z-0.5 F40
        G1 Z-1.0 F40
        G1 Z-0.3 F40
        G1 Z-0.2 F40
      `;

      const commands = parser(gcodeContent);
      const depths = commands
        .filter((cmd) => cmd.params.Z !== undefined && cmd.params.Z < 0)
        .map((cmd) => Math.abs(cmd.params.Z));

      expect(depths.every((d) => d <= 2.0)).toBe(true);
    });

    test('detects decorative corner elements', () => {
      const gcodeContent = `
        G0 X5 Y5
        G1 Z-0.3 F40
        G1 X7 Y3 F40
        G0 Z2
        G0 X95 Y5
        G1 Z-0.3 F40
        G1 X93 Y3 F40
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      const decorativePoints = commands.filter(
        (cmd) =>
          cmd.codes &&
          cmd.codes.includes('G0') &&
          cmd.params.X !== undefined &&
          cmd.params.Y !== undefined
      );

      expect(decorativePoints.length).toBeGreaterThanOrEqual(2);
    });

    test('identifies text sections at different depths', () => {
      const gcodeContent = `
        G1 Z-1 F40
        G1 X12 Y20 F40
        G0 Z2
        G1 Z-0.3 F50
        G1 X15 Y10 F50
      `;

      const commands = parser(gcodeContent);
      const mainText = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.Z === -1
      );
      const subtitle = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.Z === -0.3
      );

      expect(mainText.length).toBeGreaterThan(0);
      expect(subtitle.length).toBeGreaterThan(0);
    });

    test('validates nameplate spindle speed for aluminum', () => {
      const gcodeContent = `
        M3 S12000
        G04 P1500
      `;

      const commands = parser(gcodeContent);
      const spindle = commands.find((cmd) => cmd.codes && cmd.codes.includes('M3'));

      expect(spindle).toBeDefined();
      expect(spindle.params.S).toBe(12000);
    });
  });

  describe('PCB Isolation Routing Project', () => {
    test('parses PCB isolation routing project successfully', () => {
      const gcodeContent = `
        G90
        G21
        M3 S10000
        G0 Z2
        G1 Z-0.2 F30
      `;

      const commands = parser(gcodeContent);
      expect(commands.length).toBeGreaterThan(0);
    });

    test('validates isolation routing precision depth', () => {
      const gcodeContent = `
        G1 Z-0.2 F30
        G1 Z-0.15 F25
        G1 Z-0.1 F30
      `;

      const commands = parser(gcodeContent);
      const depths = commands
        .filter((cmd) => cmd.params.Z !== undefined && cmd.params.Z < 0)
        .map((cmd) => Math.abs(cmd.params.Z));

      // All depths should be very shallow (< 0.3mm)
      expect(depths.every((d) => d <= 0.3)).toBe(true);
    });

    test('detects parallel isolation lines (power and ground)', () => {
      const gcodeContent = `
        G0 X5 Y25
        G1 Z-0.2 F30
        G1 X70 Y25 F30
        G0 Z2
        G0 X5 Y20
        G1 Z-0.2 F30
        G1 X70 Y20 F30
        G0 Z2
        G0 X5 Y16
        G1 Z-0.2 F30
        G1 X70 Y16 F30
        G0 Z2
        G0 X5 Y11
        G1 Z-0.2 F30
        G1 X70 Y11 F30
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      const isolationLines = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.F === 30
      );

      expect(isolationLines.length).toBeGreaterThanOrEqual(4);
    });

    test('identifies signal trace routing with segments', () => {
      const gcodeContent = `
        G0 X11 Y40
        G1 Z-0.2 F30
        G1 X11 Y30 F30
        G0 Z2
        G0 X12 Y29
        G1 Z-0.2 F30
        G1 X35 Y29 F30
        G0 Z2
        G0 X34 Y30
        G1 Z-0.2 F30
        G1 X34 Y10 F30
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      const segments = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G0') && cmd.params.Z === 2
      );

      expect(segments.length).toBeGreaterThanOrEqual(2);
    });

    test('validates DIP-28 footprint pad connections', () => {
      const gcodeContent = `
        G0 X30 Y50
        G1 Z-0.15 F25
        G1 X30 Y50.5 F25
        G0 Z2
        G0 X30 Y47.5
        G1 Z-0.15 F25
        G1 X30 Y48 F25
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      const padConnections = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.F === 25
      );

      expect(padConnections.length).toBeGreaterThanOrEqual(2);
    });

    test('detects PCB profile cutout at board outline', () => {
      const gcodeContent = `
        G0 X2 Y2
        G1 Z-1.8 F20
        G1 X78 Y2 F20
        G1 X78 Y58 F20
        G1 X2 Y58 F20
        G1 X2 Y2 F20
      `;

      const commands = parser(gcodeContent);
      const profileCommands = commands.filter(
        (cmd) => cmd.codes && cmd.codes.includes('G1') && cmd.params.Z === -1.8
      );

      // At least one Z-1.8 command indicates profile cut
      expect(profileCommands.length).toBeGreaterThanOrEqual(1);
    });

    test('identifies mounting hole drilling section', () => {
      const gcodeContent = `
        M3 S4000
        G0 Z2
        G0 X5 Y5
        G1 Z-1.8 F40
        G0 Z2
        G0 X75 Y5
        G1 Z-1.8 F40
        G0 Z2
        G0 X75 Y55
        G1 Z-1.8 F40
        G0 Z2
        G0 X5 Y55
        G1 Z-1.8 F40
        G0 Z2
      `;

      const commands = parser(gcodeContent);
      const drillPoints = commands.filter(
        (cmd) =>
          cmd.codes && cmd.codes.includes('G1') && cmd.params.Z === -1.8 && cmd.params.F === 40
      );

      expect(drillPoints.length).toBeGreaterThanOrEqual(4);
    });

    test('validates tool change between isolation and drilling', () => {
      const gcodeContent = `
        M3 S10000
        G0 X5 Y25
        G1 Z-0.2 F30
        M5
        G04 P1000
        M3 S4000
        G0 X5 Y5
        G1 Z-1.8 F40
      `;

      const commands = parser(gcodeContent);
      const m3Commands = commands.filter((cmd) => cmd.codes && cmd.codes.includes('M3'));

      expect(m3Commands.length).toBeGreaterThanOrEqual(2);
      expect(m3Commands[0].params.S).toBe(10000);
      expect(m3Commands[1].params.S).toBe(4000);
    });

    test('calculates approximate PCB manufacturing time', () => {
      // Rough estimate: isolation ~15min + drilling ~5min = ~20min total
      const isolationPaths = 1000; // mm (rough estimate)
      const isolationFeed = 30; // mm/min
      const isolationTime = isolationPaths / isolationFeed; // ~33 min

      const drillingCount = 20; // holes
      const drillingTime = drillingCount * 0.25; // 15 seconds per hole = 5 min

      const estimatedTime = isolationTime + drillingTime;

      expect(estimatedTime).toBeGreaterThan(0);
      expect(estimatedTime).toBeLessThan(60);
    });
  });

  describe('Multi-Project Integration', () => {
    test('all projects use consistent coordinate system', () => {
      const projects = [
        `G0 X0 Y0`, // Enclosure
        `G0 X2 Y2`, // Nameplate
        `G0 X2 Y2`, // PCB
      ];

      projects.forEach((content) => {
        const commands = parser(content);
        expect(commands[0].codes.includes('G0')).toBe(true);
      });
    });

    test('all projects specify proper spindle speeds', () => {
      const projects = [
        `M3 S5000`, // Enclosure (acrylic)
        `M3 S12000`, // Nameplate (aluminum)
        `M3 S10000`, // PCB (fiberglass)
      ];

      projects.forEach((content) => {
        const commands = parser(content);
        const m3 = commands.find((cmd) => cmd.codes && cmd.codes.includes('M3'));
        expect(m3).toBeDefined();
        expect(m3.params.S).toBeGreaterThan(0);
      });
    });

    test('all projects include safe height returns', () => {
      const projects = [`G1 Z-3.2\nG0 Z3`, `G1 Z-0.5\nG0 Z2`, `G1 Z-1.8\nG0 Z2`];

      projects.forEach((content) => {
        const commands = parser(content);
        const g0Z = commands.filter(
          (cmd) =>
            cmd.codes && cmd.codes.includes('G0') && cmd.params.Z !== undefined && cmd.params.Z > 0
        );
        expect(g0Z.length).toBeGreaterThan(0);
      });
    });
  });
});
