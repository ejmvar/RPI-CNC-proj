describe.skip('visual regression (manual setup)', () => {
  test('capture and compare Three.js scene snapshot', () => {
    // Visual regression tests require a headless browser and image comparison
    // tools (e.g., Playwright/Puppeteer + jest-image-snapshot). This test is a
    // placeholder and is intentionally skipped in CI until the project adds a
    // visual regression pipeline and baseline images.
    // To enable: install Playwright and jest-image-snapshot, capture PNG
    // renderings of the scene and compare against committed baselines.
  });
});
