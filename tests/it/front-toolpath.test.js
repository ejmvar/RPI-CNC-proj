const fs = require('fs');
const path = require('path');

describe('Front-end toolpath integration', () => {
  test('front.html imports toolpath browser module', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/\.\/js\/toolpath\.mjs/);
  });
});
