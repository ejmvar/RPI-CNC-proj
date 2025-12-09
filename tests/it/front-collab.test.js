const fs = require('fs');
const path = require('path');

describe('Front-end collab integration', () => {
  test('front.html references collab-client browser module', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/\.\/js\/collab-client\.mjs/);
  });
});
