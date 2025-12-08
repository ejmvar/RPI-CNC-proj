const fs = require('fs');
const path = require('path');

describe('Front-end smoke e2e', () => {
  test('front.html exists and contains simulator title', () => {
    // use the repository root as a reliable base (jest's cwd is project root)
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    expect(fs.existsSync(p)).toBe(true);
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/Simulador CNC/i);
  });
});
