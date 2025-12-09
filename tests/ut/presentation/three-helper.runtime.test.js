const { spawnSync } = require('child_process');
const path = require('path');

describe('Three helper position indicator runtime (unit)', () => {
  test('createPositionIndicator can be called with minimal DOM and THREE mocks', () => {
    const filepath = path.resolve(__dirname, '../../../modules/presentation/three-helper.mjs');
    const script = `
      // Minimal global DOM-like primitives
      global.document = {
        createElement: (tag) => {
          return { style: {}, innerText: '', remove: () => {}, setAttribute: () => {} };
        }
      };
      global.getComputedStyle = (el) => ({ position: 'static' });
      // Minimal container element
      const container = { appendChild: () => {}, style: {}, clientWidth: 200, clientHeight: 120 };
      // Minimal THREE mock
      global.THREE = {
        SphereGeometry: function(r){ this.r=r; },
        MeshBasicMaterial: function(o){ this.o=o; },
        Mesh: class { constructor(g,m){ this.geometry=g; this.material=m; this.children=[]; this.add=(x)=>this.children.push(x); this.name=''; } }
      };

      (async ()=>{
        const m = await import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}');
        const scene = { add: () => {} };
        const tool = new THREE.Mesh();
        const indicator = m.createPositionIndicator(container, scene, tool, { color: 0x00ff00 });
        indicator.update({ x: 1.2, y: 3.4, z: 5.6 });
        console.log(JSON.stringify({ overlayExists: !!indicator.overlay, markerExists: !!indicator.marker }));
      })().catch(e=>{ console.error(e); process.exit(2); });
    `;

    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8', maxBuffer: 2000000 });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.overlayExists).toBeTruthy();
    expect(out.markerExists).toBeTruthy();
  });
});
