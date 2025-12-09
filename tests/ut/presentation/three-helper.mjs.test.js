const { spawnSync } = require('child_process');
const path = require('path');

describe('Three helper ES module (unit)', () => {
  test('modules/presentation/three-helper.mjs exports initThreeJS', () => {
    const filepath = path.resolve(__dirname, '../../../modules/presentation/three-helper.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\\\/g, '/')}').then(m=>console.log(JSON.stringify(Object.keys(m)))).catch(e=>{console.error(e); process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const keys = JSON.parse(r.stdout.trim());
    expect(keys).toEqual(expect.arrayContaining(['initThreeJS','createSceneDefaults']));
  });

  test('modules/presentation/three-helper.mjs exports createPositionIndicator', () => {
    const filepath = path.resolve(__dirname, '../../../modules/presentation/three-helper.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify(Object.keys(m)))).catch(e=>{console.error(e); process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const keys = JSON.parse(r.stdout.trim());
    expect(keys).toEqual(expect.arrayContaining(['createPositionIndicator']));
  });
});
