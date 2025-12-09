const { spawnSync } = require('child_process');
const path = require('path');

describe('Presentation mesh runtime behavior (unit)', () => {
  test('render functions work with a minimal mocked THREE and scene', () => {
    const filepath = path.resolve(__dirname, '../../../modules/presentation/mesh.mjs');
    // Build a small inline node module script that defines a minimal THREE mock and a scene object
    const script = `
      global.THREE = {
        Group: class { constructor(){ this.children=[]; } add(o){ this.children.push(o); } },
        SphereGeometry: function(r){ this.r=r; },
        MeshStandardMaterial: function(o){ this.opts = o; },
        Mesh: class { constructor(g,m){ this.geometry=g; this.material=m; this.position={ set:(x,y,z)=>{ this._pos=[x,y,z]; } }; this.name = 'mesh'; } },
        BufferGeometry: class { constructor(){ this._attrs = {}; } setAttribute(k,v){ this._attrs[k]=v; } },
        Float32BufferAttribute: class { constructor(arr, size){ this.array = arr; this.itemSize = size; } },
        PointsMaterial: function(o){ this.opts = o; },
        Points: class { constructor(g,m){ this.geometry=g; this.material=m; this.name = ''; } }
      };

      const scene = { added: [], add(obj) { this.added.push(obj); } };

      import('./${path.relative(process.cwd(), filepath).replace(/\\/g, '/')}').then(async m=>{
        const probe = m.renderProbePoints(scene, [{ x: 1, y: 2, z: 3 }], { name: 'p-test', radius: 0.1, color: 0xffaa00 });
        const meshVals = { bounds: { minX: -1, maxX: 1, minY: -1, maxY: 1 }, size: 2, values: [[0,1],[2,3]] };
        const overlay = m.renderMeshOverlay(scene, meshVals, { name: 'm-test', pointSize: 0.2, color: 0x00ff00 });
        console.log(JSON.stringify({ probeName: probe.name, overlayName: overlay.name, sceneAdded: scene.added.length }));
      }).catch(e=>{ console.error(e); process.exit(2); });
    `;

    const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8', maxBuffer: 2000000 });
    if (r.status !== 0) { console.error(r.stderr); throw new Error('Subprocess failed'); }
    const out = JSON.parse(r.stdout.trim());
    expect(out.probeName).toBe('p-test');
    expect(out.overlayName).toBe('m-test');
    expect(Number(out.sceneAdded)).toBeGreaterThanOrEqual(2);
  });
});
