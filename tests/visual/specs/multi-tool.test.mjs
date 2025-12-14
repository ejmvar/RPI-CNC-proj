import path from 'path';
import { captureSimulator } from '../helpers/screenshot.mjs';
import { compareImages, saveSnapshot, loadSnapshot } from '../helpers/compare.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SNAPSHOTS_DIR = path.join(__dirname, '../__snapshots__');
const DIFFS_DIR = path.join(__dirname, '../__diffs__');

describe('Visual: Multi-Tool Rendering', () => {
  test('renders three-color toolpath', async () => {
    const gcode = `
G21
G90
T0
G1 X0 Y0 Z0 F1000
G1 X20 Y0
T1 M6
G1 X20 Y20
G1 X40 Y20
T2 M6
G1 X40 Y40
G1 X0 Y40
    `.trim();

    const tools = [
      { name: 'Red', diameter: 0.4, color: '#ff0000', zOffset: 0, speed: 200 },
      { name: 'Blue', diameter: 0.4, color: '#0000ff', zOffset: 0, speed: 250 },
      { name: 'Green', diameter: 0.4, color: '#00ff00', zOffset: 0, speed: 220 },
    ];

    const screenshot = await captureSimulator({
      gcode,
      tools,
      waitFor: 4000,
      serverUrl: 'http://localhost:8080/Simulator/web',
    });

    const snapshotPath = path.join(SNAPSHOTS_DIR, 'multi-tool-three-colors.png');
    const diffPath = path.join(DIFFS_DIR, 'multi-tool-three-colors-diff.png');

    const baseline = loadSnapshot(snapshotPath);

    if (!baseline || process.env.UPDATE_SNAPSHOTS) {
      saveSnapshot(screenshot, snapshotPath);
      console.log('✅ Baseline snapshot created/updated:', snapshotPath);
      return;
    }

    const result = compareImages(baseline, screenshot, diffPath);

    if (!result.passed) {
      console.error(`❌ Visual regression: ${result.diffPercentage}% diff`);
      console.error(`   Diff image: ${diffPath}`);
    }

    expect(result.passed).toBe(true);
    expect(result.diffPercentage).toBeLessThan(0.1);
  }, 45000);

  test('shows tool change markers at correct positions', async () => {
    const gcode = `
G21
G90
T0
G1 X10 Y10 Z5 F1000
T1 M6
G1 X30 Y30 Z5
T2 M6
G1 X50 Y50 Z5
    `.trim();

    const tools = [
      { name: 'Tool 0', diameter: 1.0, color: '#ff0000', zOffset: 0 },
      { name: 'Tool 1', diameter: 1.0, color: '#0000ff', zOffset: -1.5 },
      { name: 'Tool 2', diameter: 1.0, color: '#00ff00', zOffset: -2.0 },
    ];

    const screenshot = await captureSimulator({
      gcode,
      tools,
      waitFor: 4000,
      serverUrl: 'http://localhost:8080/Simulator/web',
    });

    const snapshotPath = path.join(SNAPSHOTS_DIR, 'multi-tool-change-markers.png');
    const diffPath = path.join(DIFFS_DIR, 'multi-tool-change-markers-diff.png');

    const baseline = loadSnapshot(snapshotPath);

    if (!baseline || process.env.UPDATE_SNAPSHOTS) {
      saveSnapshot(screenshot, snapshotPath);
      console.log('✅ Baseline snapshot created/updated:', snapshotPath);
      return;
    }

    const result = compareImages(baseline, screenshot, diffPath);

    expect(result.passed).toBe(true);
  }, 45000);

  test('applies Z offsets correctly', async () => {
    const gcode = `
G21
G90
T1 M6
G43 H1
G1 X0 Y0 Z-10 F500
G1 X50 Y0
G1 X50 Y50
G1 X0 Y50
G1 X0 Y0
G49
    `.trim();

    const tools = [
      { name: 'Tool 1', diameter: 3.0, color: '#ff8800', zOffset: -52.5, speed: 12000 },
    ];

    const screenshot = await captureSimulator({
      gcode,
      tools,
      waitFor: 4000,
      serverUrl: 'http://localhost:8080/Simulator/web',
    });

    const snapshotPath = path.join(SNAPSHOTS_DIR, 'multi-tool-z-offset.png');
    const diffPath = path.join(DIFFS_DIR, 'multi-tool-z-offset-diff.png');

    const baseline = loadSnapshot(snapshotPath);

    if (!baseline || process.env.UPDATE_SNAPSHOTS) {
      saveSnapshot(screenshot, snapshotPath);
      console.log('✅ Baseline snapshot created/updated:', snapshotPath);
      return;
    }

    const result = compareImages(baseline, screenshot, diffPath);

    expect(result.passed).toBe(true);
  }, 45000);
});
