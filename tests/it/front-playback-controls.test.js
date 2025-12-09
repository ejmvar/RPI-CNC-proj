const fs = require('fs');
const path = require('path');

describe('Front-end playback controls wiring', () => {
  test('front.html has simulation speed input and step controls', () => {
    const p = path.join(process.cwd(), 'Simulator/web/front.html');
    const html = fs.readFileSync(p, 'utf8');
    expect(html).toMatch(/id="simulation-speed"/);
    expect(html).toMatch(/id="step-btn"/);
    expect(html).toMatch(/id="step-back-btn"/);
    expect(html).toMatch(/id="step-mode-btn"/);
    expect(html).toMatch(/id="command-index-label"/);
    expect(html).toMatch(/setSimulationSpeed\(/);
    expect(html).toMatch(/stepSimulation\(/);
    expect(html).toMatch(/toggleStepMode\(/);
    expect(html).toMatch(/stepBack\(/);
  });
});
