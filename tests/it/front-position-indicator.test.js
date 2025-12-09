const fs = require('fs');
const path = require('path');

describe('Front-end position indicator wiring', () => {
  test('front.html creates CURRENT_POSITION_INDICATOR after init', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/CURRENT_POSITION_INDICATOR/);
    expect(html).toMatch(/createPositionIndicator/);
  });
});
