const { spawnSync } = require('child_process');
const path = require('path');

describe('simulate-batch module', () => {
  test('parses a few commands and returns summary', () => {
    const filepath = path.resolve(__dirname, '../../../modules/cli/simulate-batch.mjs');
      const code = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify(m.simulateBatchFromText('G1 X0 Y0 Z0\\nG1 X10 Y10 Z-1')))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.summary.commands).toBe(2);
    expect(out.points.length).toBe(2);
  });
});
