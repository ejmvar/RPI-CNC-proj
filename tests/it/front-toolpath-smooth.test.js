const fs = require('fs');
const path = require('path');

describe('Front-end toolpath smoothing integration', () => {
  test('front.html includes a toolpath smoothing control and uses subdivisions', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/id="toolpath-smooth"/);
    // ensure the code uses interpolatePoints with subdivisions
    expect(html).toMatch(/interpolatePoints\(toolpathPoints, subdivisions\)/);
  });
});
