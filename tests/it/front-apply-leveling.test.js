const fs = require('fs');
const path = require('path');

describe('Front-end apply leveling integration', () => {
  test('front.html contains Apply Leveling button', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/Apply Leveling/);
  });
});
