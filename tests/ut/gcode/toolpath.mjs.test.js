const { spawnSync } = require('child_process');
const path = require('path');

describe('G-code toolpath ES module (unit)', () => {
  test('parseGCodeToPoints converts G-Code to point list', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/toolpath.mjs');
    const code = "G1 X0 Y0 Z0\nG1 X10 Y10 Z-1\nG0 X20 Y20 Z5";
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\\\/g, '/')}').then(m=>console.log(JSON.stringify({p:m.parseGCodeToPoints(${JSON.stringify(code)})}))).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const { p } = JSON.parse(r.stdout.trim());
    expect(Array.isArray(p)).toBe(true);
    expect(p.length).toBe(3);
    expect(p[0].x).toBe(0);
    expect(p[1].x).toBe(10);
    expect(p[2].type).toBe('G0');
  });

  test('interpolatePoints increases point count for subdivisions > 1', () => {
    const filepath = require('path').resolve(__dirname, '../../../modules/gcode/toolpath.mjs');
    const script = `import('./${require('path').relative(process.cwd(), filepath).replace(/\\\\/g, '/')}').then(m=>console.log(JSON.stringify({i:m.interpolatePoints([{x:0,y:0,z:0},{x:10,y:0,z:0}],4).length}))).catch(e=>{console.error(e);process.exit(2)})`;
    const { spawnSync } = require('child_process');
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const { i } = JSON.parse(r.stdout.trim());
    // two endpoints + (subdivisions-1) = 2 + 3 = 5
    expect(i).toBe(5);
  });
});
