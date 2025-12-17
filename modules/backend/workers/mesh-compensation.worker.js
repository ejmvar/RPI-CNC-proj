/* eslint-disable no-undef */
/**
 * Mesh Compensation Worker
 * Phase 13.2: Performance Improvements - WebWorker Implementation
 *
 * Background worker for auto-leveling mesh compensation calculations
 * Processes probe points and generates height adjustment grid
 */

/**
 * Create interpolated mesh from probe points
 * @param {Array} probePoints - Array of {x, y, z} probe measurements
 * @param {number} gridSize - Size of interpolation grid
 * @returns {Object} Mesh data with interpolated heights
 */
function createMeshFromProbes(probePoints, gridSize = 10) {
  if (!probePoints || probePoints.length === 0) {
    return { grid: [], minZ: 0, maxZ: 0, points: [] };
  }

  // Find mesh bounds
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const point of probePoints) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }

  const grid = [];
  const stepX = (maxX - minX) / (gridSize - 1);
  const stepY = (maxY - minY) / (gridSize - 1);

  // Interpolate Z values for grid points using IDW (Inverse Distance Weighting)
  for (let i = 0; i < gridSize; i++) {
    const row = [];
    for (let j = 0; j < gridSize; j++) {
      const gridX = minX + i * stepX;
      const gridY = minY + j * stepY;

      // Calculate weighted average Z
      let weightedZ = 0;
      let totalWeight = 0;

      for (const point of probePoints) {
        const dist = Math.sqrt((gridX - point.x) ** 2 + (gridY - point.y) ** 2);

        // Use inverse distance weighting, avoid division by zero
        if (dist < 0.001) {
          weightedZ = point.z;
          totalWeight = 1;
          break;
        }

        const weight = 1 / (dist * dist);
        weightedZ += weight * point.z;
        totalWeight += weight;
      }

      row.push(weightedZ / totalWeight);
    }
    grid.push(row);
  }

  return {
    grid,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
    gridSize,
    stepX,
    stepY,
    pointCount: probePoints.length,
  };
}

/**
 * Interpolate Z height at specific XY position
 * @param {Array} grid - Height grid
 * @param {Object} bounds - Mesh bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number} Interpolated Z height
 */
function interpolateHeightAtPoint(grid, bounds, x, y) {
  const { minX, minY, maxX, maxY } = bounds;
  const gridSize = grid.length;

  // Clamp to bounds
  const clampedX = Math.max(minX, Math.min(maxX, x));
  const clampedY = Math.max(minY, Math.min(maxY, y));

  // Find grid cell
  const iFloat = ((clampedX - minX) / (maxX - minX)) * (gridSize - 1);
  const jFloat = ((clampedY - minY) / (maxY - minY)) * (gridSize - 1);

  const i = Math.floor(iFloat);
  const j = Math.floor(jFloat);

  const fracI = iFloat - i;
  const fracJ = jFloat - j;

  // Bilinear interpolation
  if (i + 1 < gridSize && j + 1 < gridSize) {
    const z00 = grid[i][j];
    const z10 = grid[i + 1][j];
    const z01 = grid[i][j + 1];
    const z11 = grid[i + 1][j + 1];

    const z0 = z00 + (z10 - z00) * fracI;
    const z1 = z01 + (z11 - z01) * fracI;

    return z0 + (z1 - z0) * fracJ;
  }

  // Fallback to nearest neighbor
  return grid[Math.min(i, gridSize - 1)][Math.min(j, gridSize - 1)];
}

/**
 * Generate compensation vectors for G-Code commands
 * @param {Array} commands - Parsed G-Code commands
 * @param {Array} grid - Height mesh grid
 * @param {Object} bounds - Mesh bounds
 * @returns {Array} Commands with Z compensation
 */
function compensateCommands(commands, grid, bounds) {
  const compensated = [];

  for (const cmd of commands) {
    const comp = { ...cmd };

    // Apply compensation to G0/G1 (movement commands)
    if ((cmd.gCode === 0 || cmd.gCode === 1) && cmd.params.X && cmd.params.Y) {
      const originalZ = cmd.params.Z || 0;
      const meshZ = interpolateHeightAtPoint(grid, bounds, cmd.params.X, cmd.params.Y);
      const compensation = meshZ - (bounds.minZ || 0);

      // Copy params to avoid mutation
      comp.params = { ...cmd.params };
      comp.params.Z = originalZ + compensation;
      comp.originalZ = originalZ;
      comp.meshZ = meshZ;
      comp.compensation = compensation;
    }

    compensated.push(comp);
  }

  return compensated;
}

/**
 * Worker message handler
 */
self.addEventListener('message', (event) => {
  const { command, data } = event.data;

  try {
    let result;

    switch (command) {
      case 'createMesh': {
        const { probePoints, gridSize } = data;
        result = createMeshFromProbes(probePoints, gridSize || 10);
        break;
      }

      case 'interpolateHeight': {
        const { grid, bounds, x, y } = data;
        result = {
          z: interpolateHeightAtPoint(grid, bounds, x, y),
          x,
          y,
        };
        break;
      }

      case 'interpolateHeights': {
        const { grid, bounds, points } = data;
        result = points.map((point) => ({
          ...point,
          z: interpolateHeightAtPoint(grid, bounds, point.x, point.y),
        }));
        break;
      }

      case 'compensateCommands': {
        const { commands, grid, bounds } = data;
        result = compensateCommands(commands, grid, bounds);
        break;
      }

      case 'validateMesh': {
        const { grid, gridSize } = data;
        const valid = Array.isArray(grid) && grid.length === gridSize;
        result = {
          valid,
          gridSize: grid ? grid.length : 0,
          expectedSize: gridSize,
        };
        break;
      }

      default:
        throw new Error(`Unknown mesh worker command: ${command}`);
    }

    self.postMessage({
      success: true,
      result,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
    });
  }
});
