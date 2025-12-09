const fs = require('fs');
const path = require('path');

describe('Front-end mesh rendering hooks', () => {
  test('front.html calls THREE_MESH render helpers after probing', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/THREE_MESH\.renderProbePoints/);
    expect(html).toMatch(/THREE_MESH\.renderMeshOverlay/);
  });
});
