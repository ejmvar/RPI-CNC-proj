const fs = require('fs');
const path = require('path');

describe('Front-end three-helper integration', () => {
  test('front.html references the three-helper browser module', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/\.\/js\/three-helper\.mjs/);
  });
});
