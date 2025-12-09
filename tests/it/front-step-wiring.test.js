const fs = require('fs');
const path = require('path');

describe('Front-end step mode wiring', () => {
  test('front.html exposes goToCommand, applyCommandAtIndex and stepBack/stepSimulation functions', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/applyCommandAtIndex\(/);
    expect(html).toMatch(/goToCommand\(/);
    expect(html).toMatch(/stepBack\(/);
    expect(html).toMatch(/stepSimulation\(/);
    expect(html).toMatch(/updateCommandIndexLabel\(/);
  });
});
