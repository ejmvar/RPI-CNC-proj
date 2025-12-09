const { spawnSync } = require('child_process');
const path = require('path');

describe('parseGCodeToPoints tool tracking', () => {
  test('emits `tool` property when T / M6 present', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/toolpath.mjs');
    const gcode = 'T1\nG1 X0 Y0\nT2 M6\nG1 X10 Y10';
    const code = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify({p:m.parseGCodeToPoints(${JSON.stringify(gcode)})}))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.p.length).toBeGreaterThanOrEqual(3);
    expect(out.p[0].tool).toBe(1);
    // after T2 M6 the following point should have tool 2
    expect(out.p[out.p.length-1].tool).toBe(2);
  });
});
