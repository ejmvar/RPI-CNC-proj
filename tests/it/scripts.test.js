const fs = require('fs');
const path = require('path');

describe('Dev scripts and README', () => {
  test('serve.sh exists and contains python http.server', () => {
    const p = path.join(process.cwd(), 'scripts/serve.sh');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toMatch(/python3 -m http.server/);
  });

  test('root README exists and mentions front.html', () => {
    const p = path.join(process.cwd(), 'README.md');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toMatch(/front.html/);
  });
});
