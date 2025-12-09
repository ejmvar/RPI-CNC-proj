const { spawnSync } = require('child_process');
const path = require('path');

describe('CLI gcode validator (esm)', () => {
  test('validates a short gcode string', () => {
    const filepath = path.resolve(__dirname, '../../../modules/cli/gcode-validate.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\\\/g, '/')}').then(m=>console.log(JSON.stringify(m.validateGCode('G1 X0 Y0\\nG0 Z5')))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.ok).toBe(true);
  });

  test('reports errors for unknown tokens', () => {
    const filepath = path.resolve(__dirname, '../../../modules/cli/gcode-validate.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\\\/g, '/')}').then(m=>console.log(JSON.stringify(m.validateGCode('ZAB +++')))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.ok).toBe(false);
    expect(out.errors.length).toBeGreaterThanOrEqual(1);
  });
});
