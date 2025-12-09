const { spawnSync } = require('child_process');
const path = require('path');

describe('G-Code ES module parser (unit)', () => {
  test('imports and parses lines from modules/gcode/parser.mjs (using node subprocess)', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/parser.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\\\/g, '/')}').then(m=>console.log(JSON.stringify(m.parseLine('G1 X1.5 Y2.5 F1000')))).catch(e=>{console.error(e); process.exit(2)})`;

    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error('STDERR:', r.stderr);
      throw new Error('Failed to run Node subprocess for ES module test');
    }

    const obj = JSON.parse(r.stdout.trim());
    expect(obj.params.G).toBe(1);
    expect(obj.params.X).toBeCloseTo(1.5);
    expect(obj.params.F).toBe(1000);
  });
});
