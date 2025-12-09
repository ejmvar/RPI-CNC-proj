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

    // Launch headless browser and open two pages to simulate two clients
    const browser = await chromium.launch();
    const page1 = await browser.newPage();
    const page2 = await browser.newPage();

    const demoUrl = `http://127.0.0.1:${port}/demo`;
    await page1.goto(demoUrl);
    await page2.goto(demoUrl);

    // set client ids and connect
    await page1.fill('#client-id', 'p1');
    await page2.fill('#client-id', 'p2');
    await page1.locator('#connect').click();
    await page2.locator('#connect').click();
    // wait for connect log entry
    await page.waitForFunction(() => document.getElementById('log').textContent.includes('open'), { timeout: 5000 });

    // create session and ensure it appears in the session list
    // create session from client1 (owner should be p1)
    await page1.locator('#create').click();
    await page.waitForFunction(() => document.getElementById('log').textContent.includes('created') || document.getElementById('log').textContent.includes('create sent'), { timeout: 2000 });
    await page1.waitForFunction(() => document.getElementById('sessions').textContent.includes('s1'), { timeout: 2000 });

    // join
    // client2 joins and updates the session
    await page2.locator('#join').click();
    await page2.locator('#update').click();

    // wait for sessionUpdated message in log and that sessions UI shows updated state
    // ensure both pages observe the update
    await page1.waitForFunction(() => document.getElementById('log').textContent.includes('sessionUpdated'), { timeout: 5000 });
    await page2.waitForFunction(() => document.getElementById('log').textContent.includes('sessionUpdated'), { timeout: 5000 });
    // sessions should show updated state and owner/present client list
    await page1.waitForFunction(() => document.getElementById('sessions').textContent.includes('a":2') || document.getElementById('sessions').textContent.includes('a:2'), { timeout: 2000 });
    await page1.waitForFunction(() => document.getElementById('sessions').textContent.includes('owner: p1') && document.getElementById('sessions').textContent.includes('clients: 2'), { timeout: 2000 });

    // reload the page and verify the session list persists in localStorage
    // reload one page and verify session list persists in localStorage
    await page1.reload();
    // ensure demo page loaded and session is present after reload
    await page1.waitForSelector('#sessions');
    await page1.waitForFunction(() => document.getElementById('sessions').textContent.includes('s1') && (document.getElementById('sessions').textContent.includes('a":2') || document.getElementById('sessions').textContent.includes('a:2')), { timeout: 2000 });

    // verify editing from page1 updates page2: click edit, set new state, save
    const sessionItem = await page1.locator('#sessions li', { hasText: 's1' }).first();
    await sessionItem.locator('button', { hasText: 'Edit' }).click();
    // find the input and set new JSON
    const input = sessionItem.locator('input').first();
    await input.fill('{"a":3,"note":"edited"}');
    await sessionItem.locator('button', { hasText: 'Save' }).click();

    // ensure page2 sees the edited state
    await page2.waitForFunction(() => document.getElementById('sessions').textContent.includes('a":3') || document.getElementById('sessions').textContent.includes('a:3'), { timeout: 2000 });

    await page1.close();
    await page2.close();
    await browser.close();

    wss.close();
    await new Promise((r) => server.close(r));
  });
});
