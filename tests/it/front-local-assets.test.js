const fs = require('fs');
const path = require('path');

describe('Front-end local assets (integration)', () => {
  test('front.html references local three.min.js and tailwind', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/static\/three.min\.js/);
    expect(html).toMatch(/static\/tailwind\/3\.4\.17/);
  });
});
