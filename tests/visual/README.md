# Visual Regression Testing Framework

**Status:** 🚧 Framework Setup (Not Yet Implemented)  
**Priority:** Low (polish feature)  
**Complexity:** High (requires Puppeteer + image comparison)

---

## Purpose

Visual regression testing helps ensure that UI changes don't break the visual appearance of the simulator. This is particularly important for:

- Multi-tool color rendering
- Tool change markers (spheres)
- Toolpath line styles (solid vs dashed)
- UI layout changes
- Three.js scene rendering

---

## Proposed Architecture

### Tool Stack

```
Puppeteer (headless Chrome)
    ↓
Capture screenshots of simulator
    ↓
Pixelmatch (image comparison)
    ↓
Generate diff images
    ↓
Report visual changes
```

### Dependencies

```json
{
  "devDependencies": {
    "puppeteer": "^21.0.0",
    "pixelmatch": "^5.3.0",
    "pngjs": "^7.0.0"
  }
}
```

---

## Test Scenarios

### 1. Single Tool Rendering

**Test:** Load single-tool G-Code and verify color

**Steps:**

1. Load Tool 0 (red)
2. Load simple G-Code (square)
3. Simulate
4. Capture screenshot
5. Compare with baseline

**Expected:**

- Red toolpath
- No tool change markers
- Grid visible
- Axes visible

---

### 2. Multi-Tool Color Transitions

**Test:** Verify each tool renders in correct color

**Steps:**

1. Load 3 tools (red, blue, green)
2. Load G-Code with 2 tool changes
3. Simulate
4. Capture screenshot
5. Compare with baseline

**Expected:**

- Red section for Tool 0
- Blue section for Tool 1
- Green section for Tool 2
- 2 colored spheres at tool changes

---

### 3. Tool Offset Visualization

**Test:** Verify Z offset changes toolpath position

**Steps:**

1. Load Tool 1 with -10mm offset
2. Load G-Code with G43 H1
3. Simulate
4. Capture screenshot
5. Compare with baseline (no offset)

**Expected:**

- Toolpath shifted down by 10mm
- No collisions with grid
- Correct Z position

---

### 4. Line Style Differences

**Test:** Verify G0 rapids are dashed, G1 moves are solid

**Steps:**

1. Load G-Code with G0 and G1 commands
2. Simulate
3. Capture screenshot
4. Compare with baseline

**Expected:**

- Dashed lines for G0
- Solid lines for G1
- Correct opacity differences

---

### 5. UI Layout

**Test:** Verify Tool Library panel renders correctly

**Steps:**

1. Load default tools
2. Capture screenshot of UI
3. Compare with baseline

**Expected:**

- Tool dropdown visible
- Add/Update/Remove buttons present
- Statistics panel empty initially

---

## Implementation Plan

### Phase 1: Setup (1-2 hours)

**Tasks:**

1. Install dependencies

   ```bash
   npm install --save-dev puppeteer pixelmatch pngjs
   ```

2. Create test directory structure

   ```
   tests/visual/
   ├── __snapshots__/      # Baseline images
   ├── __diffs__/          # Diff images (gitignored)
   ├── helpers/
   │   ├── screenshot.js   # Puppeteer screenshot helper
   │   └── compare.js      # Pixelmatch comparison
   └── specs/
       ├── single-tool.test.js
       ├── multi-tool.test.js
       ├── offsets.test.js
       └── ui-layout.test.js
   ```

3. Add npm scripts
   ```json
   {
     "scripts": {
       "test:visual": "jest tests/visual/specs/",
       "test:visual:update": "UPDATE_SNAPSHOTS=1 npm run test:visual"
     }
   }
   ```

---

### Phase 2: Helper Functions (2-3 hours)

**File: `tests/visual/helpers/screenshot.js`**

```javascript
import puppeteer from 'puppeteer';
import path from 'path';

export async function captureSimulator(options = {}) {
  const {
    gcode = '',
    tools = [],
    viewport = { width: 1280, height: 720 },
    waitFor = 2000,
  } = options;

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport(viewport);

  // Navigate to simulator
  await page.goto('http://localhost:8000/front.html');

  // Load tools
  if (tools.length > 0) {
    await page.evaluate((toolsData) => {
      toolsData.forEach((tool) => {
        window.toolLibrary.addTool(tool);
      });
    }, tools);
  }

  // Load G-Code
  if (gcode) {
    await page.evaluate((gcodeText) => {
      document.getElementById('gcode-input').value = gcodeText;
      window.loadGCode();
    }, gcode);

    // Wait for simulation
    await page.waitForTimeout(waitFor);
  }

  // Capture screenshot
  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: false,
  });

  await browser.close();
  return screenshot;
}

export async function captureElement(selector, options = {}) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/front.html');

  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element ${selector} not found`);
  }

  const screenshot = await element.screenshot({ type: 'png' });
  await browser.close();
  return screenshot;
}
```

**File: `tests/visual/helpers/compare.js`**

```javascript
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export function compareImages(baselineBuffer, currentBuffer, diffPath) {
  const baseline = PNG.sync.read(baselineBuffer);
  const current = PNG.sync.read(currentBuffer);

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(baseline.data, current.data, diff.data, width, height, {
    threshold: 0.1, // Sensitivity (0-1)
    includeAA: false, // Ignore anti-aliasing
    diffColor: [255, 0, 0], // Red diff
  });

  // Save diff image
  if (numDiffPixels > 0 && diffPath) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  const totalPixels = width * height;
  const diffPercentage = (numDiffPixels / totalPixels) * 100;

  return {
    numDiffPixels,
    totalPixels,
    diffPercentage,
    passed: diffPercentage < 0.1, // <0.1% difference = pass
  };
}

export function saveSnapshot(buffer, snapshotPath) {
  const dir = path.dirname(snapshotPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(snapshotPath, buffer);
}

export function loadSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }
  return fs.readFileSync(snapshotPath);
}
```

---

### Phase 3: Test Specs (3-4 hours)

**File: `tests/visual/specs/single-tool.test.js`**

```javascript
import { captureSimulator } from '../helpers/screenshot.js';
import { compareImages, saveSnapshot, loadSnapshot } from '../helpers/compare.js';
import path from 'path';

const SNAPSHOTS_DIR = path.join(__dirname, '../__snapshots__');
const DIFFS_DIR = path.join(__dirname, '../__diffs__');

describe('Visual: Single Tool Rendering', () => {
  test('renders red square with Tool 0', async () => {
    const gcode = `
      G21
      G90
      T0
      G1 X0 Y0 Z0
      G1 X50 Y0
      G1 X50 Y50
      G1 X0 Y50
      G1 X0 Y0
    `;

    const tools = [{ name: 'PLA Red', diameter: 0.4, color: '#ff0000', zOffset: 0 }];

    const screenshot = await captureSimulator({ gcode, tools });

    const snapshotPath = path.join(SNAPSHOTS_DIR, 'single-tool-red-square.png');
    const diffPath = path.join(DIFFS_DIR, 'single-tool-red-square-diff.png');

    const baseline = loadSnapshot(snapshotPath);

    if (!baseline || process.env.UPDATE_SNAPSHOTS) {
      saveSnapshot(screenshot, snapshotPath);
      console.log('✅ Baseline snapshot created');
      return;
    }

    const result = compareImages(baseline, screenshot, diffPath);

    expect(result.passed).toBe(true);
    expect(result.diffPercentage).toBeLessThan(0.1);
  }, 30000); // 30s timeout for Puppeteer
});
```

**File: `tests/visual/specs/multi-tool.test.js`**

```javascript
import { captureSimulator } from '../helpers/screenshot.js';
import { compareImages, saveSnapshot, loadSnapshot } from '../helpers/compare.js';
import path from 'path';

const SNAPSHOTS_DIR = path.join(__dirname, '../__snapshots__');
const DIFFS_DIR = path.join(__dirname, '../__diffs__');

describe('Visual: Multi-Tool Rendering', () => {
  test('renders three-color toolpath', async () => {
    const gcode = `
      G21
      G90
      T0
      G1 X0 Y0 Z0
      G1 X20 Y0
      T1 M6
      G1 X20 Y20
      G1 X40 Y20
      T2 M6
      G1 X40 Y40
      G1 X0 Y40
    `;

    const tools = [
      { name: 'Red', diameter: 0.4, color: '#ff0000', zOffset: 0 },
      { name: 'Blue', diameter: 0.4, color: '#0000ff', zOffset: 0 },
      { name: 'Green', diameter: 0.4, color: '#00ff00', zOffset: 0 },
    ];

    const screenshot = await captureSimulator({ gcode, tools, waitFor: 3000 });

    const snapshotPath = path.join(SNAPSHOTS_DIR, 'multi-tool-three-colors.png');
    const diffPath = path.join(DIFFS_DIR, 'multi-tool-three-colors-diff.png');

    const baseline = loadSnapshot(snapshotPath);

    if (!baseline || process.env.UPDATE_SNAPSHOTS) {
      saveSnapshot(screenshot, snapshotPath);
      console.log('✅ Baseline snapshot created');
      return;
    }

    const result = compareImages(baseline, screenshot, diffPath);

    expect(result.passed).toBe(true);
  }, 45000);

  test('shows tool change markers', async () => {
    // Test that colored spheres appear at tool changes
    // Similar to above but focuses on marker positions
  });
});
```

---

### Phase 4: CI Integration (1 hour)

**File: `.github/workflows/visual-regression.yml`**

```yaml
name: Visual Regression Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Start simulator server
        run: |
          cd Simulator/web
          python3 -m http.server 8000 &
          sleep 3

      - name: Run visual regression tests
        run: npm run test:visual

      - name: Upload diff images (if failed)
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diffs
          path: tests/visual/__diffs__/

      - name: Comment PR with results
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Visual regression tests failed. Check artifacts for diff images.'
            })
```

---

## Usage

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Start simulator
cd Simulator/web && python3 -m http.server 8000 &

# 3. Create baseline snapshots
npm run test:visual:update

# 4. Verify snapshots created
ls tests/visual/__snapshots__/
```

### Running Tests

```bash
# Run all visual tests
npm run test:visual

# Run specific test file
npx jest tests/visual/specs/single-tool.test.js

# Update snapshots after intentional UI changes
npm run test:visual:update
```

### Reviewing Failures

```bash
# Check diff images
open tests/visual/__diffs__/single-tool-red-square-diff.png

# Compare baseline vs current
open tests/visual/__snapshots__/single-tool-red-square.png
```

---

## Limitations & Considerations

### Known Issues

1. **Three.js Rendering Variability**

   - GPU drivers can produce slightly different output
   - Anti-aliasing causes pixel differences
   - Solution: Use higher tolerance (0.1% diff acceptable)

2. **Timing Issues**

   - Animations may not complete before screenshot
   - Solution: Add `waitFor` delays or wait for specific elements

3. **Font Rendering**

   - System fonts differ between environments
   - Solution: Use web fonts or exclude text from comparison

4. **Performance**
   - Each test takes 10-15 seconds
   - Full suite may take 5+ minutes
   - Solution: Run in parallel or only on PR

### Best Practices

✅ **Do:**

- Use consistent viewport sizes
- Wait for animations to complete
- Test critical UI elements only
- Keep baselines in version control
- Review diffs before accepting changes

❌ **Don't:**

- Test every possible combination
- Use tight thresholds (<0.01%)
- Include dynamic content (timestamps, etc.)
- Run on different OS/browsers without separate baselines

---

## Roadmap

### Phase 1 (Not Started)

- ⬜ Install Puppeteer + Pixelmatch
- ⬜ Create helper functions
- ⬜ Write 3-5 basic tests

### Phase 2 (Future)

- ⬜ Add CI integration
- ⬜ Expand to 10+ test scenarios
- ⬜ Add UI component tests

### Phase 3 (Future)

- ⬜ Cross-browser testing (Firefox, Safari)
- ⬜ Mobile viewport testing
- ⬜ Animation frame capture

---

## Alternative Approaches

### Option 1: Playwright (instead of Puppeteer)

**Pros:**

- Faster
- Better debugging tools
- Built-in test runner

**Cons:**

- Larger dependency
- More complex setup

### Option 2: Percy.io (SaaS)

**Pros:**

- Hosted baseline storage
- Easy PR integration
- Advanced diff tools

**Cons:**

- Paid service
- External dependency

### Option 3: Jest Image Snapshot

**Pros:**

- Integrates with Jest
- Simpler API

**Cons:**

- Less control over comparison
- No Puppeteer integration

---

## Resources

- [Puppeteer Docs](https://pptr.dev/)
- [Pixelmatch](https://github.com/mapbox/pixelmatch)
- [Visual Regression Testing Guide](https://www.browserstack.com/guide/visual-regression-testing)

---

**Status:** Ready for implementation when time permits. Framework design complete, awaiting developer availability.
