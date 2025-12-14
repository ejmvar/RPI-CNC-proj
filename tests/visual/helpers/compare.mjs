import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Compare two image buffers and return diff statistics
 * @param {Buffer} baselineBuffer Baseline PNG buffer
 * @param {Buffer} currentBuffer Current PNG buffer
 * @param {string} diffPath Path to save diff image (optional)
 * @returns {Object} Comparison results
 */
function compareImages(baselineBuffer, currentBuffer, diffPath) {
  const baseline = PNG.sync.read(baselineBuffer);
  const current = PNG.sync.read(currentBuffer);

  const { width, height } = baseline;

  // Check dimensions match
  if (current.width !== width || current.height !== height) {
    return {
      numDiffPixels: -1,
      totalPixels: width * height,
      diffPercentage: 100,
      passed: false,
      error: `Image dimensions don't match: ${width}x${height} vs ${current.width}x${current.height}`,
    };
  }

  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(baseline.data, current.data, diff.data, width, height, {
    threshold: 0.1, // Sensitivity (0-1)
    includeAA: false, // Ignore anti-aliasing
    diffColor: [255, 0, 0], // Red diff markers
    diffColorAlt: [0, 255, 0], // Alt color for removed pixels
  });

  // Save diff image if there are differences and path provided
  if (numDiffPixels > 0 && diffPath) {
    const dir = path.dirname(diffPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  const totalPixels = width * height;
  const diffPercentage = (numDiffPixels / totalPixels) * 100;

  return {
    numDiffPixels,
    totalPixels,
    diffPercentage: parseFloat(diffPercentage.toFixed(4)),
    passed: diffPercentage < 0.1, // <0.1% difference = pass
  };
}

/**
 * Save a PNG buffer to file
 * @param {Buffer} buffer PNG buffer
 * @param {string} snapshotPath Path to save to
 */
function saveSnapshot(buffer, snapshotPath) {
  const dir = path.dirname(snapshotPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(snapshotPath, buffer);
}

/**
 * Load a PNG file as buffer
 * @param {string} snapshotPath Path to load from
 * @returns {Buffer|null} PNG buffer or null if not found
 */
function loadSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }
  return fs.readFileSync(snapshotPath);
}

export { compareImages, saveSnapshot, loadSnapshot };
