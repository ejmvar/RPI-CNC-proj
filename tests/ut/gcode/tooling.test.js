const { spawnSync } = require('child_process');
const path = require('path');

describe('gcode tooling scanner', () => {
  test('finds T tool selections and M6 tool changes', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/tooling.mjs');
    const code = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify(m.scanToolChanges([{ raw: 'T1', params: { T:1 } }, { raw: 'G1 X0 Y0' }, { raw: 'T2 M6', params: { T:2 } }])))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out[0].tool).toBe(1);
    expect(out[1].tool).toBe(2);
  });
});
