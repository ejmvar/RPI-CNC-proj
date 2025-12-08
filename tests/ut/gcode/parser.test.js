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
});
