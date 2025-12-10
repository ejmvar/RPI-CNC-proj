const fs = require('fs');
const path = require('path');

// Check if playwright is available
let playwrightAvailable = true;
try { require.resolve('playwright'); } catch (e) { playwrightAvailable = false; }

describe('G-Code export e2e', () => {
  if (!playwrightAvailable) {
    test.skip('Playwright not installed - skipping export e2e tests', () => {});
    return;
  }

  const { chromium } = require('playwright');
  const http = require('http');

  jest.setTimeout(15000);

  let server, browser, page, port;

  beforeAll(async () => {
    // Simple HTTP server for static assets
    server = http.createServer((req, res) => {
      const url = req.url === '/' ? '/front.html' : req.url;
      const p = path.join(process.cwd(), 'Simulator', 'web', url);
      if (!fs.existsSync(p)) { res.writeHead(404); res.end('not found'); return; }
      const body = fs.readFileSync(p);
      let type = 'text/plain';
      if (p.endsWith('.html')) type = 'text/html';
      else if (p.endsWith('.js') || p.endsWith('.mjs')) type = 'application/javascript';
      res.writeHead(200, { 'Content-Type': type });
      res.end(body);
    });

    await new Promise((r) => server.listen(0, r));
    port = server.address().port;

    browser = await chromium.launch();
  });

  afterAll(async () => {
    if (browser) await browser.close();
    if (server) await new Promise(r => server.close(r));
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/front.html`);
    await page.waitForSelector('#gcode-input', { timeout: 5000 });
  });

  afterEach(async () => {
    if (page) await page.close();
  });

  test('export button exists and is clickable', async () => {
    const exportBtn = await page.$('button:has-text("Export G-Code")');
    expect(exportBtn).toBeTruthy();
    expect(await exportBtn.isEnabled()).toBe(true);
  });

  test('export shows error when no G-Code is present', async () => {
    // Clear any default G-Code
    await page.fill('#gcode-input', '');
    
    // Click export button
    await page.click('button:has-text("Export G-Code")');
    
    // Wait for error message
    await page.waitForSelector('#probing-log:has-text("No G-Code to export")', { timeout: 2000 });
  });

  test('export triggers download when G-Code is present', async () => {
    // Add some G-Code
    const testGcode = 'G0 Z10\nG0 X50 Y50\nG1 Z-1 F100';
    await page.fill('#gcode-input', testGcode);

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('button:has-text("Export G-Code")');
    
    // Verify download was triggered
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/gcode-compensated-.*\.nc/);
  });

  test('export without mesh shows warning message', async () => {
    const testGcode = 'G0 Z10\nG0 X50 Y50';
    await page.fill('#gcode-input', testGcode);
    
    // Click export (no mesh loaded)
    await page.click('button:has-text("Export G-Code")');
    
    // Should show "without mesh compensation" message
    await page.waitForSelector('#probing-log:has-text("without mesh compensation")', { timeout: 2000 });
  });

  test('apply leveling then export applies compensation', async () => {
    const testGcode = 'G0 Z10\nG1 X50 Y50 Z0 F100';
    await page.fill('#gcode-input', testGcode);

    // Create a mock mesh in window.LATEST_MESH
    await page.evaluate(() => {
      window.LATEST_MESH = {
        bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
        size: 3,
        values: [[0, 0.1, 0.2], [0.1, 0.15, 0.25], [0.2, 0.25, 0.3]]
      };
    });

    // Apply leveling
    await page.click('button:has-text("Apply Leveling")');
    await page.waitForSelector('#probing-log:has-text("mesh compensation")', { timeout: 2000 });

    // Get modified G-Code
    const modifiedGcode = await page.inputValue('#gcode-input');
    expect(modifiedGcode).not.toBe(testGcode);

    // Export should show "with mesh compensation"
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Export G-Code")');
    
    await page.waitForSelector('#probing-log:has-text("with mesh compensation")', { timeout: 2000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/gcode-compensated-.*\.nc/);
  });
});
