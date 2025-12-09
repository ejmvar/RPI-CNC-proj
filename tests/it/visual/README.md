Visual regression testing (manual setup)
=====================================

This directory contains scaffolding for visual regression tests of the Three.js simulator
(the `front.html` renderer). Visual tests are intentionally optional and require heavy
dev dependencies (Playwright or Puppeteer, and jest-image-snapshot) which are not
installed by default in CI for this lightweight demo project.

To enable visual regression testing locally:

1. Install Playwright and the jest-image-snapshot matcher:

   npm i -D playwright jest-image-snapshot

2. Capture a baseline: use `node capture-scene.js` (requires Playwright/browser installed).
   The script can be run manually to save baseline PNGs under `tests/it/visual/baselines/`.

3. Enable the skipped test (`visual-regression.test.js`) and run Jest to compare current
   renderings against saved baselines.

Notes:
- Baseline images are intentionally left out of the repository to keep this demo small.
- CI integration should only be added if the test environment supports headless browsers
  and image diffing (Playwright + jest-image-snapshot).
