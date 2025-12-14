import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Capture console logs
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (error) => console.error('PAGE ERROR:', error.message));
  page.on('requestfailed', (request) =>
    console.error('REQUEST FAILED:', request.url(), request.failure().errorText)
  );

  console.log('Navigating to http://localhost:8080/Simulator/web/front.html...');
  await page.goto('http://localhost:8080/Simulator/web/front.html', {
    waitUntil: 'networkidle0',
    timeout: 15000,
  });

  console.log('Page loaded, waiting for container...');
  await page.waitForSelector('#visualization-container', { timeout: 10000 });
  console.log('Container found!');

  // Check what's in the container
  const containerInfo = await page.evaluate(() => {
    const container = document.getElementById('visualization-container');
    return {
      exists: !!container,
      innerHTML: container ? container.innerHTML.substring(0, 500) : null,
      hasCanvas: container ? container.querySelector('canvas') !== null : false,
      childrenCount: container ? container.children.length : 0,
    };
  });

  console.log('Container info:', JSON.stringify(containerInfo, null, 2));

  // Take a debug screenshot
  await page.screenshot({ path: '/tmp/debug-screenshot.png', fullPage: true });
  console.log('Screenshot saved to /tmp/debug-screenshot.png');

  // Wait a bit more to see if canvas appears
  console.log('Waiting 5 more seconds...');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const containerInfoAfter = await page.evaluate(() => {
    const container = document.getElementById('visualization-container');
    return {
      hasCanvas: container ? container.querySelector('canvas') !== null : false,
      childrenCount: container ? container.children.length : 0,
    };
  });

  console.log('Container info after wait:', JSON.stringify(containerInfoAfter, null, 2));

  await browser.close();
})();
