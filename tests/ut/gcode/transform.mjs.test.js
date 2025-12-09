const { spawnSync } = require('child_process');
const path = require('path');

describe('G-code transform ES module (unit)', () => {
  test('bilinearInterpolate returns correct interpolation for 2x2 mesh', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/transform.mjs');
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\\\/g, '/')}').then(m=>{console.log(JSON.stringify({v1:m.bilinearInterpolate({bounds:{minX:0,maxX:1,minY:0,maxY:1},size:2,values:[[0,1],[0,1]]},0.25,0.5)}))}).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const { v1 } = JSON.parse(r.stdout.trim());
    // For this mesh: values at (0,0)=0, (1,0)=1, (0,1)=0, (1,1)=1 => linear in X => expect about 0.25
    expect(v1).toBeCloseTo(0.25, 5);
  });

  test('applyMeshCompensationToGCode adjusts Z values using mesh', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/transform.mjs');
    const gcode = 'G1 X0.5 Y0.5 Z5\nG1 X1 Y1 Z10';
    const script = `import('./${path.relative(process.cwd(), filepath).replace(/\\\\/g, '/')}').then(m=>{const g=${JSON.stringify(gcode)};const mesh={bounds:{minX:0,maxX:1,minY:0,maxY:1},size:2,values:[[0,0],[0,1]]};console.log(JSON.stringify({out:m.applyMeshCompensationToGCode(g,mesh)}))}).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const { out } = JSON.parse(r.stdout.trim());
    // For the provided mesh the first point (0.5,0.5) has meshZ~=0.25 so Z becomes 4.75
    expect(out).toMatch(/Z4\.7500/);
    expect(out).toMatch(/Z9/);
  });
});
