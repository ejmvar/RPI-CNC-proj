const { spawnSync } = require('child_process');
const path = require('path');

describe('collision detection', () => {
  test('detects out-of-bounds points', () => {
    const filepath = path.resolve(__dirname, '../../../modules/simulation/collision.mjs');
    const code = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify(m.detectCollisions([{x:0,y:0,z:0},{x:100,y:0,z:0}], { minX:-10, maxX:10, minY:-10, maxY:10, minZ:-5, maxZ:5 }))))`;
    const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].axis).toBe('X');
  });
});
