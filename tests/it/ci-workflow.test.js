const fs = require('fs');
const path = require('path');

describe('CI workflow', () => {
  test('CI workflow file exists', () => {
    const p = path.join(process.cwd(), '.github/workflows/ci.yml');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toMatch(/name: CI/);
  });
});
