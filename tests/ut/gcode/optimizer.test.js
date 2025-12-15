const { spawnSync } = require('child_process');
const path = require('path');

describe('gcode optimizer', () => {
  test('removes redundant movement lines', () => {
    const filepath = path.resolve(__dirname, '../../../modules/gcode/optimizer.mjs');
    const code = `import('./${path
      .relative(process.cwd(), filepath)
      .replace(
        /\\/g,
        '/'
      )}').then(m=>{const result=m.optimizeGCode('G1 X0 Y0 Z0\\nG1 X0 Y0 Z0\\nG1 X5 Y5 Z-1');console.log(JSON.stringify(result))}).catch(e=>{console.error(e);process.exit(2)})`;
    const r = spawnSync('node', ['--input-type=module', '-e', code], { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(r.stderr);
      throw new Error('Subprocess failed');
    }
    const result = JSON.parse(r.stdout.trim());
    expect(result).toHaveProperty('gcode');
    expect(result).toHaveProperty('stats');
    expect(result.stats.redundantMovesRemoved).toBeGreaterThan(0);
  });
});
