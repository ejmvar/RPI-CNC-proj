const { spawnSync } = require('child_process');
const path = require('path');

describe('gcode converter', () => {
  test('convert to 2-digit G-codes', () => {
    const filepath = path.resolve(__dirname, '../../../modules/cli/gcode-convert.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify({a:m.convertToTwoDigitGCodes('G1 X0 Y0\\nG2 X1 Y1\\nG0 Z5')}))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.a).toMatch(/G01/);
    expect(out.a).toMatch(/G02/);
    expect(out.a).toMatch(/G00/);
  });

  test('convert() dispatches to format', () => {
    const filepath = path.resolve(__dirname, '../../../modules/cli/gcode-convert.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>console.log(JSON.stringify({a:m.convert('G1 X0 Y0', { format: '2-digit' })}))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.a).toMatch(/G01/);
  });
});
