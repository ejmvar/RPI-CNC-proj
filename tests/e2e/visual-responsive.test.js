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

describe('responsive layout visual regression', () => {
  if (!playwrightAvailable || !snapshotAvailable) {
    test.skip('Playwright or jest-image-snapshot not installed - skipping responsive tests', () => {});
    return;
  }

  const { chromium } = require('playwright');
  const { toMatchImageSnapshot } = require('jest-image-snapshot');
  expect.extend({ toMatchImageSnapshot });

  jest.setTimeout(20000);

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

  const viewports = [
    { name: 'mobile-portrait', width: 375, height: 667 },
    { name: 'mobile-landscape', width: 667, height: 375 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'ultrawide', width: 2560, height: 1440 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`front.html at ${name} (${width}x${height})`, async () => {
      const server = createStaticServer();
      await new Promise((r) => server.listen(0, r));
      const port = server.address().port;

      const browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`http://127.0.0.1:${port}/front.html`);

      await page.waitForSelector('#threejs-canvas, canvas', { timeout: 5000 }).catch(() => {});
      const image = await page.screenshot({ fullPage: true });

      expect(image).toMatchImageSnapshot({
        failureThreshold: 0.05,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: `front-${name}`,
      });

      await browser.close();
      await new Promise((r) => server.close(r));
    });

    test(`demo.html at ${name} (${width}x${height})`, async () => {
      const server = createStaticServer();
      await new Promise((r) => server.listen(0, r));
      const port = server.address().port;

      const browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`http://127.0.0.1:${port}/demo.html`);

      await page.waitForSelector('#client-id-input', { timeout: 5000 }).catch(() => {});
      const image = await page.screenshot({ fullPage: true });

      expect(image).toMatchImageSnapshot({
        failureThreshold: 0.05,
        failureThresholdType: 'percent',
        customSnapshotIdentifier: `demo-${name}`,
      });

      await browser.close();
      await new Promise((r) => server.close(r));
    });
  });
});
