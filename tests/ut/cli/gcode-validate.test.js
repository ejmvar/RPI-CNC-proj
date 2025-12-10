const { spawnSync } = require('child_process');
const path = require('path');

// Helper to run ES module functions
function runValidation(code) {
  const filepath = path.resolve(__dirname, '../../../modules/cli/gcode-validate.mjs');
  const escapedCode = code.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const script = `import('./${path
    .relative(process.cwd(), filepath)
    .replace(
      /\\/g,
      '/'
    )}').then(m=>console.log(JSON.stringify(m.validateGCode('${escapedCode}')))).catch(e=>{console.error(e);process.exit(2)})`;
  const r = spawnSync('node', ['--input-type=module', '-e', script], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error('Subprocess failed: ' + r.stderr);
  }
  return JSON.parse(r.stdout.trim());
}

describe('G-Code validation CLI', () => {
  it('accepts valid G-code with common commands', () => {
    const input = 'G21\nG90\nG0 X0 Y0 Z5\nG1 X10 Y10 F500\nM3 S1000';
    const result = runValidation(input);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects invalid command letters', () => {
    const input = 'H123 Y5'; // H is not valid
    const result = runValidation(input);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('allows comments', () => {
    const input = '; Comment\nG21\n(Another)\nG0 X10';
    const result = runValidation(input);
    expect(result.ok).toBe(true);
  });

  it('detects malformed tokens', () => {
    const input = 'G0 XYZ123ABC';
    const result = runValidation(input);
    expect(result.ok).toBe(false);
  });

  it('handles empty input', () => {
    const result = runValidation('');
    expect(result.ok).toBe(true);
  });

  it('validates coordinates with decimals', () => {
    const input = 'G1 X10.5 Y-20.3 Z0.0 F1000';
    const result = runValidation(input);
    expect(result.ok).toBe(true);
  });
});
