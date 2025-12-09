const { spawnSync } = require('child_process');
const path = require('path');

describe('touch controls helper', () => {
  test('exports createTouchControls and simulates gestures', () => {
    const filepath = path.resolve(__dirname, '../../../modules/presentation/touch-controls.mjs');
    const code = `import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(m=>{ const t = m.createTouchControls({ onPan:(dx,dy)=>console.log('pan:'+dx+','+dy), onPinch:(s)=>console.log('pinch:'+s) }); t.simulatePan(2,3); t.simulatePinch(1.2); console.log('ok'); }).catch(e=>{ console.error(e); process.exit(2) })`;
    const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    expect(r.stdout).toMatch(/pan:2,3/);
    expect(r.stdout).toMatch(/pinch:1.2/);
  });
});
