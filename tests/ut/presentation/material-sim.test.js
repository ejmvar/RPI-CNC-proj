const { spawnSync } = require('child_process');
const path = require('path');

describe('material removal simulation', () => {
  test('lowers mesh values near toolpath points', () => {
    const filepath = path.resolve(__dirname, '../../../modules/presentation/material-sim.mjs');
    const mesh = { bounds: { minX: 0, maxX: 10, minY: 0, maxY: 10 }, size: 3, values: [ [0,0,0],[0,0,0],[0,0,0] ] };
    const pts = [{ x: 5, y: 5, z: 0 }];
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify(m.applyToolpathToMesh(${JSON.stringify(mesh)}, ${JSON.stringify(pts)}, { radius: 3, removalPerPass: 0.2 }))))`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    const flattened = out.values.flat();
    expect(flattened.some(v => Number(v) < 0)).toBe(true);
  });
});
