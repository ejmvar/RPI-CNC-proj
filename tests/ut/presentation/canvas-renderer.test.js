const { spawnSync } = require('child_process');
const path = require('path');

describe('ASCII canvas renderer', () => {
  test('renders points as ASCII grid', () => {
    const filepath = path.resolve(__dirname, '../../../modules/presentation/canvas-renderer.mjs');
    const code = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(m.renderToolpathToAscii([{x:0,y:0},{x:10,y:10}], { gridSize: 5 }))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = r.stdout.trim();
    expect(out.length).toBeGreaterThan(0);
    expect(out).toMatch(/\*/);
  });
});
