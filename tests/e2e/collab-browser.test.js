const http = require('http');
const path = require('path');
const fs = require('fs');

// Simple end-to-end test using Playwright — will skip if Playwright isn't installed.
let playwrightAvailable = true;
try { require.resolve('playwright'); } catch (e) { playwrightAvailable = false; }
let wsAvailable = true;
try { require.resolve('ws'); } catch (e) { wsAvailable = false; }

const { createCollabServer } = require('../../modules/backend/collab/index.js');
const { createWsCollabServer } = require('../../modules/backend/collab/ws-server');

describe('browser collab e2e (headless browser)', () => {
  if (!playwrightAvailable) {
    test.skip('Playwright not installed — skipping browser e2e', () => {});
    return;
  }
  if (!wsAvailable) {
    test.skip('ws library not installed — skipping browser e2e', () => {});
    return;
  }

  const { chromium } = require('playwright');

  jest.setTimeout(20000);

  test('demo page connects to WS and receives sessionUpdated', async () => {
    // start HTTP server that serves demo.html and /js/* from Simulator/web
    const server = http.createServer((req, res) => {
      const u = req.url || '/';
      if (u === '/' || u === '/demo' || u === '/demo.html') {
        const html = fs.readFileSync(path.join(process.cwd(), 'Simulator', 'web', 'demo.html'), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      if (u.startsWith('/js/') || u.startsWith('/static/')) {
        const p = path.join(process.cwd(), 'Simulator', 'web', u);
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p);
          res.writeHead(200, { 'Content-Type': u.endsWith('.mjs') ? 'application/javascript' : 'text/plain' });
          res.end(content);
          return;
        }
      }
      res.writeHead(404);
      res.end('not found');
    });

    await new Promise((r) => server.listen(0, r));
    const port = server.address().port;

    const collab = createCollabServer();
    const wss = createWsCollabServer(collab, { server, path: '/c' });
    if (!wss) throw new Error('ws bridge not available for e2e');

    // Launch headless browser
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const demoUrl = `http://127.0.0.1:${port}/demo`;
    await page.goto(demoUrl);

    // connect
    await page.locator('#connect').click();
    // wait for connect log entry
    await page.waitForFunction(() => document.getElementById('log').textContent.includes('open'), { timeout: 5000 });

    // create session
    await page.locator('#create').click();
    await page.waitForFunction(() => document.getElementById('log').textContent.includes('created') || document.getElementById('log').textContent.includes('create sent'), { timeout: 2000 });

    // join
    await page.locator('#join').click();
    // update
    await page.locator('#update').click();

    // wait for sessionUpdated message in log
    await page.waitForFunction(() => document.getElementById('log').textContent.includes('sessionUpdated'), { timeout: 5000 });

    await page.close();
    await browser.close();

    wss.close();
    await new Promise((r) => server.close(r));
  });
});
