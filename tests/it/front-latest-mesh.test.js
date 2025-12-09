const fs = require('fs');
const path = require('path');

describe('Front-end mesh integration', () => {
  test('front.html sets LATEST_MESH when probing', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/LATEST_MESH/);
  });
});
