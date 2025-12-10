const parser = require('../../../modules/gcode/parser');

describe('G-Code parser (unit)', () => {
  test('parses single movement line', () => {
    const line = 'G0 X10.5 Y-3 Z0';
    const res = parser.parseLine(line);
    expect(res).toBeTruthy();
    expect(res.params.G).toBe(0);
    expect(res.params.X).toBeCloseTo(10.5);
    expect(res.params.Y).toBe(-3);
    expect(res.params.Z).toBe(0);
  });

  test('parses lowercase and feedrate', () => {
    const text = 'g1 x1.5 y2.6 f500';
    const res = parser.parseLine(text);
    expect(res.params.G).toBe(1);
    expect(res.params.X).toBeCloseTo(1.5);
    expect(res.params.F).toBe(500);
  });

  test('ignores comments and empty lines', () => {
    const text = '\n; this is a comment\n(G-code comment)\nG1 X1 Y1\n';
    const arr = parser.parse(text);
    expect(arr.length).toBe(1);
    expect(arr[0].params.X).toBe(1);
  });

  test('handles tokens without numbers (e.g., M commands)', () => {
    const res = parser.parseLine('M3');
    expect(res.params.M).toBe(3);
  });

  // Edge cases
  test('handles malformed G-code with missing values', () => {
    const res = parser.parseLine('G1 X Y10');
    expect(res).toBeTruthy();
    expect(res.params.G).toBe(1);
    expect(res.params.Y).toBe(10);
    // X without value should be undefined or handled gracefully
  });

  test('handles very long decimal precision', () => {
    const res = parser.parseLine('G1 X123.456789012345 Y-987.654321098765');
    expect(res.params.X).toBeCloseTo(123.456789012345, 10);
    expect(res.params.Y).toBeCloseTo(-987.654321098765, 10);
  });

  test('handles scientific notation if supported', () => {
    const res = parser.parseLine('G1 X1.5e2 Y-3.2e-1');
    // parser may or may not support scientific notation
    if (res.params.X !== undefined) {
      expect(res.params.X).toBeCloseTo(150, 5);
    }
    if (res.params.Y !== undefined) {
      expect(res.params.Y).toBeCloseTo(-0.32, 5);
    }
  });

  test('handles mixed case commands', () => {
    const res = parser.parseLine('g0 X10 y20 Z30');
    expect(res.params.G).toBe(0);
    expect(res.params.X).toBe(10);
    expect(res.params.Y).toBe(20);
    expect(res.params.Z).toBe(30);
  });

  test('handles whitespace variations', () => {
    const res1 = parser.parseLine('  G1   X10   Y20  ');
    expect(res1.params.G).toBe(1);
    expect(res1.params.X).toBe(10);
    expect(res1.params.Y).toBe(20);

    const res2 = parser.parseLine('G1 X10 Y20');
    expect(res2.params.G).toBe(1);
    expect(res2.params.X).toBe(10);
    expect(res2.params.Y).toBe(20);
  });

  test('handles line numbers (N prefix)', () => {
    const res = parser.parseLine('N10 G1 X5 Y10');
    if (res.params.N !== undefined) {
      expect(res.params.N).toBe(10);
    }
    expect(res.params.G).toBe(1);
    expect(res.params.X).toBe(5);
  });

  test('handles checksum (asterisk suffix)', () => {
    const res = parser.parseLine('G1 X10 Y20 *42');
    // parser should extract commands, checksum handling varies
    expect(res.params.G).toBe(1);
    expect(res.params.X).toBe(10);
    expect(res.params.Y).toBe(20);
  });

  test('handles empty string', () => {
    const res = parser.parseLine('');
    expect(res).toBeFalsy();
  });

  test('handles only whitespace', () => {
    const res = parser.parseLine('   \t  \n  ');
    // Parser may return empty or null for whitespace-only lines
    if (res) {
      expect(Object.keys(res.params).length).toBe(0);
    }
  });

  test('handles only comments', () => {
    const res = parser.parseLine('; full line comment');
    expect(res).toBeFalsy();
  });

  test('handles inline comments', () => {
    const res = parser.parseLine('G1 X10 ; move to X10');
    expect(res.params.G).toBe(1);
    expect(res.params.X).toBe(10);
  });

  test('handles parenthetical comments', () => {
    const res = parser.parseLine('G1 (rapid move) X10 Y20');
    expect(res.params.G).toBe(1);
    expect(res.params.X).toBe(10);
    expect(res.params.Y).toBe(20);
  });

  test('handles multiple G-codes on one line', () => {
    const res = parser.parseLine('G90 G1 X10 Y20 F500');
    // behavior depends on parser implementation
    expect(res.params.X).toBe(10);
    expect(res.params.F).toBe(500);
  });

  test('handles arc commands (G2/G3)', () => {
    const res = parser.parseLine('G2 X10 Y10 I5 J0 F500');
    expect(res.params.G).toBe(2);
    expect(res.params.X).toBe(10);
    expect(res.params.Y).toBe(10);
    expect(res.params.I).toBe(5);
    expect(res.params.J).toBe(0);
  });

  test('handles dwell commands (G4)', () => {
    const res = parser.parseLine('G4 P1000');
    expect(res.params.G).toBe(4);
    expect(res.params.P).toBe(1000);
  });

  test('handles zero values', () => {
    const res = parser.parseLine('G0 X0 Y0 Z0 F0');
    expect(res.params.X).toBe(0);
    expect(res.params.Y).toBe(0);
    expect(res.params.Z).toBe(0);
    expect(res.params.F).toBe(0);
  });

  test('handles negative zero', () => {
    const res = parser.parseLine('G1 X-0 Y-0.0');
    // -0 === 0 in JavaScript, but Object.is(-0, 0) is false
    expect(Math.abs(res.params.X)).toBe(0);
    expect(Math.abs(res.params.Y)).toBe(0);
  });
});
