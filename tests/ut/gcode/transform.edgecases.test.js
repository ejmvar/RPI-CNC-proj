const { spawnSync } = require('child_process');
const path = require('path');

describe('transform bilinear interpolation edge cases', () => {
  test('interpolates corners and clamping', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/transform.mjs');
    const mesh = {
      bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 },
      size: 2,
      values: [[0, 1],[2, 3]]
    };
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify({a:m.bilinearInterpolate(${JSON.stringify(mesh)}, 0, 0), b:m.bilinearInterpolate(${JSON.stringify(mesh)}, 10, 10), c:m.bilinearInterpolate(${JSON.stringify(mesh)}, -5, 50)}))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.a).toBeCloseTo(0);
    expect(out.b).toBeCloseTo(3);
    expect(out.c).toBeCloseTo(3);
  });
});
