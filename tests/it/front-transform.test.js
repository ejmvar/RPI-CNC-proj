const fs = require('fs');
const path = require('path');

describe('Front-end gcode transform integration', () => {
  test('front.html imports gcode-transform browser module', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/\.\/js\/gcode-transform\.mjs/);
  });
});
