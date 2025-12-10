const fs = require('fs');
const path = require('path');
const http = require('http');

let playwrightAvailable = true;
try { require.resolve('playwright'); } catch (e) { playwrightAvailable = false; }
let snapshotAvailable = true;
try { require.resolve('jest-image-snapshot'); } catch (e) { snapshotAvailable = false; }

describe('visual regression (Playwright + jest-image-snapshot)', () => {
  if (!playwrightAvailable || !snapshotAvailable) {
    test.skip('Playwright or jest-image-snapshot not installed - skipping visual snapshot tests', () => {});
    return;
  }

  const { chromium } = require('playwright');
  const { toMatchImageSnapshot } = require('jest-image-snapshot');
  expect.extend({ toMatchImageSnapshot });

  jest.setTimeout(20000);

  test('front.html renders and matches baseline', async () => {
    // serve the front.html file via a small server to allow Playwright to load local assets
    const server = http.createServer((req, res) => {
      const url = req.url === '/' ? '/front.html' : req.url;
      const p = path.join(process.cwd(), 'Simulator', 'web', url);
      if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
      const body = fs.readFileSync(p);
      const type = p.endsWith('.html') ? 'text/html' : (p.endsWith('.js') ? 'application/javascript' : 'text/plain');
      res.writeHead(200, { 'Content-Type': type });
      res.end(body);
    });

    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/front.html`);

    // wait for the main canvas or toolpath to appear (dom specific to front.html)
    await page.waitForSelector('#threejs-canvas, canvas', { timeout: 5000 }).catch(() => {});

    // screenshot the full page (or the canvas if present)
    const canvas = await page.$('#threejs-canvas') || await page.$('canvas');
    const image = canvas ? await canvas.screenshot() : await page.screenshot({ fullPage: true });

    // Compare to baseline; if none exists, write baseline so reviewers can approve in CI
    const baselineDir = path.join(process.cwd(), 'tests', '__image_snapshots__');
    if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });

    expect(image).toMatchImageSnapshot({ failureThreshold: 0.05, failureThresholdType: 'percent' });

    await browser.close();
    await new Promise(r => server.close(r));
  });
});
