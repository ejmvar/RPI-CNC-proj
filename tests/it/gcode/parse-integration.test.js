const parser = require('../../../modules/gcode/parser');

describe('G-Code parser (integration)', () => {
  test('parses multiple lines and keeps sequence', () => {
    const multi = 'G0 X0 Y0\nG1 X10 Y10 F300\n; ignore me\nG1 X20 Y20';
    const res = parser.parse(multi);
    expect(res.length).toBe(3);
    expect(res[0].params.G).toBe(0);
    expect(res[1].params.F).toBe(300);
    expect(res[2].params.X).toBe(20);
  });
});
