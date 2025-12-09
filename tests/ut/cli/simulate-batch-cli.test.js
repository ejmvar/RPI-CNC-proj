const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('simulate-batch CLI', () => {
  test('runs and prints summary', () => {
    const script = path.resolve(__dirname, '../../../modules/cli/bin/simulate-batch.js');
    const gfile = path.join(__dirname, 'tmp-sim-gcode.nc');
    fs.writeFileSync(gfile, 'G1 X0 Y0 Z0\nG0 X10 Y0 Z2', 'utf8');
    const r = spawnSync('node', [script, gfile], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/commands:/);
    fs.unlinkSync(gfile);
  });
});
