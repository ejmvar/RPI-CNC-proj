const fs = require('fs');
const path = require('path');
const http = require('http');

let playwrightAvailable = true;
try {
  require.resolve('playwright');
} catch (e) {
  playwrightAvailable = false;
}
let snapshotAvailable = true;
try {
  require.resolve('jest-image-snapshot');
} catch (e) {
  snapshotAvailable = false;
}

describe('visual regression (Playwright + jest-image-snapshot)', () => {
  if (!playwrightAvailable || !snapshotAvailable) {
    test.skip('Playwright or jest-image-snapshot not installed - skipping visual snapshot tests', () => {});
    return;
  }

  const { chromium } = require('playwright');
  const { toMatchImageSnapshot } = require('jest-image-snapshot');
  expect.extend({ toMatchImageSnapshot });

  jest.setTimeout(20000);

  // Helper: simple HTTP server for static assets
  function createStaticServer() {
    return http.createServer((req, res) => {
      const url = req.url === '/' ? '/front.html' : req.url;
      const p = path.join(process.cwd(), 'Simulator', 'web', url);
      if (!fs.existsSync(p)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const body = fs.readFileSync(p);
      let type = 'text/plain';
      if (p.endsWith('.html')) type = 'text/html';
      else if (p.endsWith('.js') || p.endsWith('.mjs')) type = 'application/javascript';
      else if (p.endsWith('.css')) type = 'text/css';
      res.writeHead(200, { 'Content-Type': type });
      res.end(body);
    });
  }

  test('front.html renders and matches baseline', async () => {
    const server = createStaticServer();
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/front.html`);

    // wait for the main canvas or toolpath to appear (dom specific to front.html)
    await page.waitForSelector('#threejs-canvas, canvas', { timeout: 5000 }).catch(() => {});

    // screenshot the full page (or the canvas if present)
    const canvas = (await page.$('#threejs-canvas')) || (await page.$('canvas'));
    const image = canvas ? await canvas.screenshot() : await page.screenshot({ fullPage: true });

    // Compare to baseline; if none exists, write baseline so reviewers can approve in CI
    const baselineDir = path.join(process.cwd(), 'tests', '__image_snapshots__');
    if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });

    expect(image).toMatchImageSnapshot({ failureThreshold: 0.05, failureThresholdType: 'percent' });

    await browser.close();
    await new Promise((r) => server.close(r));
  });

  test('demo.html renders and matches baseline', async () => {
    const server = createStaticServer();
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/demo.html`);

    // wait for the demo UI to load (client ID input and session list)
    await page.waitForSelector('#client-id-input', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('#session-list', { timeout: 5000 }).catch(() => {});

    // screenshot the full page to capture the demo UI
    const image = await page.screenshot({ fullPage: true });

    expect(image).toMatchImageSnapshot({ failureThreshold: 0.05, failureThresholdType: 'percent' });

    await browser.close();
    await new Promise((r) => server.close(r));
  });

  test('dashboard.html renders and matches baseline', async () => {
    const server = createStaticServer();
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/dashboard.html`);

    // wait for the dashboard elements to load
    await page.waitForSelector('#session-list', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('#activity-log', { timeout: 5000 }).catch(() => {});

    // screenshot the full page to capture the dashboard UI
    const image = await page.screenshot({ fullPage: true });

    expect(image).toMatchImageSnapshot({ failureThreshold: 0.05, failureThresholdType: 'percent' });

    await browser.close();
    await new Promise((r) => server.close(r));
  });

  test('front.html error state - no transform module', async () => {
    const server = createStaticServer();
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/front.html`);

    await page.waitForSelector('#gcode-input', { timeout: 5000 }).catch(() => {});

    // Trigger error by trying to apply leveling without mesh
    await page.click('button:has-text("Apply Leveling")');
    await page.waitForSelector('#probing-log', { timeout: 2000 }).catch(() => {});

    const image = await page.screenshot({ fullPage: true });
    expect(image).toMatchImageSnapshot({ failureThreshold: 0.05, failureThresholdType: 'percent' });

    await browser.close();
    await new Promise((r) => server.close(r));
  });

  test('front.html error state - export without gcode', async () => {
    const server = createStaticServer();
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/front.html`);

    await page.waitForSelector('#gcode-input', { timeout: 5000 }).catch(() => {});
    await page.fill('#gcode-input', '');

    // Trigger error by trying to export without G-Code
    await page.click('button:has-text("Export G-Code")');
    await page.waitForSelector('#probing-log', { timeout: 2000 }).catch(() => {});

    const image = await page.screenshot({ fullPage: true });
    expect(image).toMatchImageSnapshot({ failureThreshold: 0.05, failureThresholdType: 'percent' });

    await browser.close();
    await new Promise((r) => server.close(r));
  });

  test('demo.html error state - connection failed', async () => {
    const server = createStaticServer();
    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/demo.html`);

    await page.waitForSelector('#client-id-input', { timeout: 5000 }).catch(() => {});

    // Try to connect to non-existent server to trigger connection error
    await page.evaluate(() => {
      // eslint-disable-next-line no-undef
      const event = new CustomEvent('connection-error');
      // eslint-disable-next-line no-undef
      document.dispatchEvent(event);
    });

    await page.waitForTimeout(500);
    const image = await page.screenshot({ fullPage: true });
    expect(image).toMatchImageSnapshot({ failureThreshold: 0.05, failureThresholdType: 'percent' });

    await browser.close();
    await new Promise((r) => server.close(r));
  });
});
