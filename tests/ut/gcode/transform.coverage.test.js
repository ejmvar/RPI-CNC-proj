/**
 * Additional coverage tests for G-code transform module (using subprocess for ES modules)
 */

const { spawnSync } = require('child_process');
const path = require('path');

function runTransformFunction(funcName, args) {
  const filepath = path.resolve(__dirname, '../../../modules/gcode/transform.mjs');
  const argsJson = JSON.stringify(args);
  const script = `import('./${path
    .relative(process.cwd(), filepath)
    .replace(
      /\\/g,
      '/'
    )}').then(m=>{const result=m.${funcName}(...${argsJson});console.log(JSON.stringify(result))}).catch(e=>{console.error(e);process.exit(2)})`;
  const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error('Subprocess failed: ' + r.stderr);
  }
  return JSON.parse(r.stdout.trim());
}

describe('G-code transform coverage', () => {
  const testMesh = {
    bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    size: 2,
    values: [
      [0, 0.1],
      [0.1, 0.2],
    ],
  };

  it('bilinearInterpolate at corner', () => {
    const z = runTransformFunction('bilinearInterpolate', [testMesh, 0, 0]);
    expect(typeof z).toBe('number');
    expect(z).toBe(0);
  });

  it('bilinearInterpolate at center', () => {
    const z = runTransformFunction('bilinearInterpolate', [testMesh, 50, 50]);
    expect(typeof z).toBe('number');
    expect(z).toBeGreaterThanOrEqual(0);
    expect(z).toBeLessThanOrEqual(0.2);
  });

  it('bilinearInterpolate handles out of bounds', () => {
    const z = runTransformFunction('bilinearInterpolate', [testMesh, -10, -10]);
    expect(typeof z).toBe('number');
  });

  it('bilinearInterpolate handles null mesh', () => {
    const z = runTransformFunction('bilinearInterpolate', [null, 50, 50]);
    expect(z).toBe(0);
  });
});
