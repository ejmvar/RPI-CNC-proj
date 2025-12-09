const { spawnSync } = require('child_process');
const path = require('path');

describe('G-code parser edge cases', () => {
  test('ignores comments and blank lines', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/parser.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify({p:m.parse('; this is a comment\\n\\nG1 X0 Y0')}))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.p.length).toBe(1);
  });

  test('parses tokens without numeric values correctly', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/parser.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify(m.parseLine('G M X10 Y')))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const cmd = JSON.parse(r.stdout.trim());
    expect(cmd.params.M).toBe(true);
    expect(cmd.params.Y).toBe(true);
    expect(cmd.params.X).toBe(10);
  });

  test('handles lower/upper case and spaces', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/parser.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify(m.parseLine('  g1   x1.5   y-2.3 ')))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const cmd = JSON.parse(r.stdout.trim());
    expect(cmd.params.X).toBeCloseTo(1.5, 6);
    expect(cmd.params.Y).toBeCloseTo(-2.3, 6);
  });
});
