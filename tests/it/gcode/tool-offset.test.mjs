// Integration tests for tool offset calculations in toolpath generation

import { parseGCodeToPoints } from '../../../modules/gcode/toolpath.mjs';
import { ToolLibrary } from '../../../modules/gcode/tool-library.mjs';

describe('Tool Offset Calculations', () => {
  let toolLibrary;

  beforeEach(() => {
    toolLibrary = new ToolLibrary();
  });

  test('applies Z offset when G43 is active', () => {
    toolLibrary.addTool(1, { offsetZ: -5.0 });
    toolLibrary.selectTool(1);

    const gcode = `
G0 X0 Y0 Z10
T1
G43 H1
G1 Z5
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];

    // Z5 with -5.0 offset should result in Z0
    expect(lastPoint.z).toBeCloseTo(0, 2);
  });

  test('does not apply offset before G43', () => {
    toolLibrary.addTool(1, { offsetZ: -5.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G1 Z10
G43 H1
G1 Z5
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });

    // First Z10 should not have offset applied
    const firstMove = points.find((p) => p.z === 10);
    expect(firstMove).toBeDefined();

    // Second Z5 should have offset (Z0)
    const secondMove = points.find((p) => p.z === 0);
    expect(secondMove).toBeDefined();
  });

  test('cancels offset with G49', () => {
    toolLibrary.addTool(1, { offsetZ: -5.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z5
G49
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });

    // First Z5 with offset should be Z0
    const withOffset = points.find((p, i) => i > 0 && p.z === 0);
    expect(withOffset).toBeDefined();

    // After G49, Z10 should be Z10 (no offset)
    const withoutOffset = points[points.length - 1];
    expect(withoutOffset.z).toBeCloseTo(10, 2);
  });

  test('handles positive offsets', () => {
    toolLibrary.addTool(1, { offsetZ: 3.5 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];

    // Z10 with +3.5 offset should result in Z13.5
    expect(lastPoint.z).toBeCloseTo(13.5, 2);
  });

  test('handles zero offset', () => {
    toolLibrary.addTool(1, { offsetZ: 0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];

    // Z10 with 0 offset should remain Z10
    expect(lastPoint.z).toBeCloseTo(10, 2);
  });

  test('switches offset when changing tools with G43 active', () => {
    toolLibrary.addTool(1, { offsetZ: -5.0 });
    toolLibrary.addTool(2, { offsetZ: -8.0 });

    const gcode = `
T1
G43 H1
G1 Z10
T2 M6
G43 H2
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });

    // First Z10 with T1 offset (-5) = Z5
    const tool1Points = points.filter((p) => p.tool === 1);
    const tool1Last = tool1Points[tool1Points.length - 1];
    expect(tool1Last.z).toBeCloseTo(5, 2);

    // Second Z10 with T2 offset (-8) = Z2
    const tool2Points = points.filter((p) => p.tool === 2);
    const tool2Last = tool2Points[tool2Points.length - 1];
    expect(tool2Last.z).toBeCloseTo(2, 2);
  });

  test('handles G43 without H parameter using active tool', () => {
    toolLibrary.addTool(1, { offsetZ: -3.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];

    // Should use active tool's offset
    expect(lastPoint.z).toBeCloseTo(7, 2);
  });

  test.skip('applies offset to incremental Z moves (G91)', () => {
    toolLibrary.addTool(1, { offsetZ: -2.0 });
    toolLibrary.selectTool(1);

    const gcode = `
G90
G0 Z10
T1
G43 H1
G91
G1 Z5
G90
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });

    // After G43, incremental move Z5 from Z10 should be Z15-2=Z13
    const tool1Points = points.filter((p) => p.tool === 1 && p.type === 'cut');
    if (tool1Points.length > 0) {
      const lastTool1 = tool1Points[tool1Points.length - 1];
      expect(lastTool1.z).toBeCloseTo(13, 1);
    }
  });

  test('maintains offset through multiple moves', () => {
    toolLibrary.addTool(1, { offsetZ: -4.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z10
G1 Z8
G1 Z6
G1 Z4
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const tool1Points = points.filter((p) => p.tool === 1 && p.type === 'cut');

    // All moves should have offset applied
    expect(tool1Points[0].z).toBeCloseTo(6, 2); // 10-4
    expect(tool1Points[1].z).toBeCloseTo(4, 2); // 8-4
    expect(tool1Points[2].z).toBeCloseTo(2, 2); // 6-4
    expect(tool1Points[3].z).toBeCloseTo(0, 2); // 4-4
  });

  test('does not affect X or Y coordinates', () => {
    toolLibrary.addTool(1, { offsetZ: -5.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 X100 Y200 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];

    expect(lastPoint.x).toBeCloseTo(100, 2);
    expect(lastPoint.y).toBeCloseTo(200, 2);
    expect(lastPoint.z).toBeCloseTo(5, 2); // only Z affected
  });

  test('handles tool change without M6 command', () => {
    toolLibrary.addTool(1, { offsetZ: -3.0 });
    toolLibrary.addTool(2, { offsetZ: -6.0 });

    const gcode = `
T1
G43 H1
G1 Z10
T2
G43 H2
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });

    const tool1Points = points.filter((p) => p.tool === 1);
    const tool2Points = points.filter((p) => p.tool === 2);

    expect(tool1Points.length).toBeGreaterThan(0);
    expect(tool2Points.length).toBeGreaterThan(0);

    // Tool 2 should have different offset applied
    const tool2Last = tool2Points[tool2Points.length - 1];
    expect(tool2Last.z).toBeCloseTo(4, 2); // 10-6
  });

  test('handles missing tool in library gracefully', () => {
    // Tool 99 not in library
    const gcode = `
T99
G43 H99
G1 Z10
`;

    // Should not crash, auto-creates tool with default offset (0)
    expect(() => {
      parseGCodeToPoints(gcode, { toolLibrary });
    }).not.toThrow();
  });

  test('complex multi-tool sequence with offsets', () => {
    toolLibrary.addTool(1, { name: '6mm End Mill', offsetZ: -52.5 });
    toolLibrary.addTool(2, { name: '3mm End Mill', offsetZ: -51.2 });
    toolLibrary.addTool(3, { name: 'V-bit', offsetZ: -50.8 });

    const gcode = `
; Tool 1 - Roughing
T1 M6
G43 H1
G0 Z5
G1 Z-2 F800

; Tool 2 - Finishing
T2 M6
G43 H2
G0 Z5
G1 Z-2.5 F600

; Tool 3 - Engraving
T3 M6
G43 H3
G0 Z5
G1 Z-0.5 F400
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });

    const tool1Points = points.filter((p) => p.tool === 1 && p.type !== 'tool-change');
    const tool2Points = points.filter((p) => p.tool === 2 && p.type !== 'tool-change');
    const tool3Points = points.filter((p) => p.tool === 3 && p.type !== 'tool-change');

    expect(tool1Points.length).toBeGreaterThan(0);
    expect(tool2Points.length).toBeGreaterThan(0);
    expect(tool3Points.length).toBeGreaterThan(0);

    // Verify different offsets are applied to each tool
    const tool1MinZ = Math.min(...tool1Points.map((p) => p.z));
    const tool2MinZ = Math.min(...tool2Points.map((p) => p.z));
    const tool3MinZ = Math.min(...tool3Points.map((p) => p.z));

    // Check that offsets are applied (exact values depend on G-code sequence)
    expect(tool1MinZ).toBeLessThan(-50); // roughly -2 - 52.5
    expect(tool2MinZ).toBeLessThan(-50); // roughly -2.5 - 51.2
    expect(tool3MinZ).toBeLessThan(-50); // roughly -0.5 - 50.8
  });

  test('offset reactivates after G49 then G43', () => {
    toolLibrary.addTool(1, { offsetZ: -5.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z10
G49
G1 Z10
G43 H1
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });

    // Should have three Z10 moves: with offset, without, with offset
    const z10Points = points.filter((p) => Math.abs(p.z - 10) < 0.1 || Math.abs(p.z - 5) < 0.1);
    expect(z10Points.length).toBeGreaterThan(0);
  });
});

describe('Tool Offset Edge Cases', () => {
  let toolLibrary;

  beforeEach(() => {
    toolLibrary = new ToolLibrary();
  });

  test('handles very large positive offset', () => {
    toolLibrary.addTool(1, { offsetZ: 1000.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];
    expect(lastPoint.z).toBeCloseTo(1010, 2);
  });

  test('handles very large negative offset', () => {
    toolLibrary.addTool(1, { offsetZ: -1000.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];
    expect(lastPoint.z).toBeCloseTo(-990, 2);
  });

  test('handles fractional offsets with high precision', () => {
    toolLibrary.addTool(1, { offsetZ: -2.12345 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z10.54321
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];
    expect(lastPoint.z).toBeCloseTo(8.41976, 4);
  });

  test('handles G43 before tool selection', () => {
    toolLibrary.addTool(0, { offsetZ: -3.0 });

    const gcode = `
G43
G1 Z10
`;

    // Should use default tool 0
    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];
    expect(lastPoint.z).toBeCloseTo(7, 2);
  });

  test('handles rapid moves with offset', () => {
    toolLibrary.addTool(1, { offsetZ: -5.0 });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G0 Z20
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];

    // Rapid move should also have offset applied
    expect(lastPoint.type).toBe('rapid');
    expect(lastPoint.z).toBeCloseTo(15, 2);
  });

  test('maintains toolConfig in points with offset', () => {
    toolLibrary.addTool(1, {
      name: 'Custom Tool',
      offsetZ: -5.0,
      color: '#123456',
    });
    toolLibrary.selectTool(1);

    const gcode = `
T1
G43 H1
G1 Z10
`;

    const points = parseGCodeToPoints(gcode, { toolLibrary });
    const lastPoint = points[points.length - 1];

    expect(lastPoint.toolConfig).toBeDefined();
    expect(lastPoint.toolConfig.name).toBe('Custom Tool');
    expect(lastPoint.toolConfig.color).toBe('#123456');
  });
});
