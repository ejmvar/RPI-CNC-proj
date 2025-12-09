const { spawnSync } = require('child_process');
const path = require('path');

describe('toolpath statistics', () => {
  test('computes distance and estimated time', () => {
    const filepath = path.resolve(__dirname, '../../../modules/cli/toolpath-stats.mjs');
    const code = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify(m.computeToolpathStats([{x:0,y:0,z:0},{x:10,y:0,z:0},{x:10,y:10,z:0}], { feed: 600 }))))`;
    const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.totalDistance).toBeGreaterThan(0);
    expect(out.estimatedTimeSec).toBeCloseTo(2.0, 2);
  });
});
