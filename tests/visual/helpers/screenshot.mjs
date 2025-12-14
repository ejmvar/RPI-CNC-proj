import puppeteer from 'puppeteer';

/**
 * Capture a screenshot of the simulator with given G-Code and tools
 * @param {Object} options Configuration options
 * @returns {Promise<Buffer>} PNG screenshot buffer
 */
async function captureSimulator(options = {}) {
  const {
    gcode = '',
    tools = [],
    viewport = { width: 1280, height: 720 },
    waitFor = 2000,
    serverUrl = 'http://localhost:8000',
  } = options;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    // Navigate to simulator
    const url = `${serverUrl}/front.html`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait for canvas/Three.js to initialize by checking for the renderer canvas
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(2000); // Additional wait for Three.js initialization

    // Load tools if provided
    if (tools.length > 0) {
      await page.evaluate((toolsData) => {
        if (window.toolLibrary) {
          toolsData.forEach((tool) => {
            window.toolLibrary.addTool(tool);
          });
        }
      }, tools);
    }

    // Load G-Code if provided
    if (gcode) {
      await page.evaluate((gcodeText) => {
        const textarea = document.getElementById('gcode-input');
        if (textarea) {
          textarea.value = gcodeText;
        }
        // Trigger load and simulate
        if (window.loadGCode) {
          window.loadGCode();
        }
      }, gcode);

      // Wait for simulation to complete
      await page.waitForTimeout(waitFor);
    }

    // Hide UI elements that might cause flakiness (timestamps, etc.)
    await page.evaluate(() => {
      // Hide any elements with timestamps or dynamic content
      const log = document.getElementById('probing-log');
      if (log) log.style.display = 'none';
    });

    // Capture screenshot of canvas area
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    return screenshot;
  } finally {
    await browser.close();
  }
}

/**
 * Capture a screenshot of a specific element
 * @param {string} selector CSS selector
 * @param {Object} options Configuration options
 * @returns {Promise<Buffer>} PNG screenshot buffer
 */
async function captureElement(selector, options = {}) {
  const { viewport = { width: 1280, height: 720 }, serverUrl = 'http://localhost:8000' } = options;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    await page.goto(`${serverUrl}/front.html`, { waitUntil: 'networkidle0' });

    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element ${selector} not found`);
    }

    const screenshot = await element.screenshot({ type: 'png' });
    return screenshot;
  } finally {
    await browser.close();
  }
}

export { captureSimulator, captureElement };
