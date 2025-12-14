import path from 'path';
import { captureSimulator } from '../helpers/screenshot.mjs';
import { compareImages, saveSnapshot, loadSnapshot } from '../helpers/compare.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOTS_DIR = path.join(__dirname, '../__snapshots__');
const DIFFS_DIR = path.join(__dirname, '../__diffs__');

describe('Visual: Single Tool Rendering', () => {
  test('renders red square with Tool 0', async () => {
    const gcode = `
G21
G90
T0
G1 X0 Y0 Z0
G1 X50 Y0 F1000
G1 X50 Y50
G1 X0 Y50
G1 X0 Y0
    `.trim();

    const tools = [
      {
        name: 'PLA Red',
        diameter: 0.4,
        color: '#ff0000',
        zOffset: 0,
        speed: 200,
        temperature: 210,
      },
    ];

    const screenshot = await captureSimulator({ gcode, tools, waitFor: 3000 });

    const snapshotPath = path.join(SNAPSHOTS_DIR, 'single-tool-red-square.png');
    const diffPath = path.join(DIFFS_DIR, 'single-tool-red-square-diff.png');

    const baseline = loadSnapshot(snapshotPath);

    if (!baseline || process.env.UPDATE_SNAPSHOTS) {
      saveSnapshot(screenshot, snapshotPath);
      console.log('✅ Baseline snapshot created/updated:', snapshotPath);
      return;
    }

    const result = compareImages(baseline, screenshot, diffPath);

    if (!result.passed) {
      console.error(`❌ Visual regression detected: ${result.diffPercentage}% difference`);
      console.error(`   Diff pixels: ${result.numDiffPixels}/${result.totalPixels}`);
      console.error(`   Diff saved to: ${diffPath}`);
    }

    expect(result.passed).toBe(true);
    expect(result.diffPercentage).toBeLessThan(0.1);
  }, 30000); // 30s timeout for Puppeteer

  test('renders blue circle with Tool 1', async () => {
    const gcode = `
G21
G90
T1
G1 X25 Y25 Z0
G2 X25 Y25 I25 J0 F800
    `.trim();

    const tools = [
      {
        name: 'PETG Blue',
        diameter: 0.4,
        color: '#0000ff',
        zOffset: 0,
        speed: 250,
        temperature: 240,
      },
    ];

    const screenshot = await captureSimulator({ gcode, tools, waitFor: 3000 });

    const snapshotPath = path.join(SNAPSHOTS_DIR, 'single-tool-blue-circle.png');
    const diffPath = path.join(DIFFS_DIR, 'single-tool-blue-circle-diff.png');

    const baseline = loadSnapshot(snapshotPath);

    if (!baseline || process.env.UPDATE_SNAPSHOTS) {
      saveSnapshot(screenshot, snapshotPath);
      console.log('✅ Baseline snapshot created/updated:', snapshotPath);
      return;
    }

    const result = compareImages(baseline, screenshot, diffPath);

    expect(result.passed).toBe(true);
  }, 30000);
});
