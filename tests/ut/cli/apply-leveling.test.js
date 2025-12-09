const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('CLI apply-leveling script', () => {
  test('applies mesh compensation to gcode', () => {
    const binscript = path.resolve(__dirname, '../../../modules/cli/bin/apply-leveling.js');

    const gcode = 'G1 X0 Y0 Z0\nG1 X10 Y0 Z-1\nG1 X20 Y10 Z-2';
    const gfile = path.join(__dirname, 'tmp-test-gcode.nc');
    fs.writeFileSync(gfile, gcode, 'utf8');

    const mesh = {
      bounds: { minX: -10, maxX: 30, minY: -10, maxY: 30 },
      size: 2,
      values: [[0,0],[0,0]]
    };
    const mfile = path.join(__dirname, 'tmp-test-mesh.json');
    fs.writeFileSync(mfile, JSON.stringify(mesh), 'utf8');

    const r = spawnSync('node', [binscript, gfile, mfile], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    // since mesh zeros, numerically Z should remain equivalent (string formatting may differ)
    const out = r.stdout.trim().split(/\r?\n/).map(l => l.trim());
    const inL = gcode.trim().split(/\r?\n/).map(l => l.trim());
    expect(out.length).toBe(inL.length);
    for (let i = 0; i < out.length; i++) {
      const inZ = (inL[i].match(/Z(-?\d+(?:\.\d+)?)/) || [])[1];
      const outZ = (out[i].match(/Z(-?\d+(?:\.\d+)?)/) || [])[1];
      expect(Number(outZ)).toBeCloseTo(Number(inZ), 4);
    }

    fs.unlinkSync(gfile);
    fs.unlinkSync(mfile);
  });
});
