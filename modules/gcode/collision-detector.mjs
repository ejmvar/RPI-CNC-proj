/**
 * G-Code Collision Detection & Bounds Checking Module
 * Validates G-Code for safety issues: collisions, bounds violations, unsafe moves
 *
 * @module modules/gcode/collision-detector
 */

import { parse } from './parser.mjs';

/**
 * Default machine configuration
 */
const DEFAULT_CONFIG = {
  // Machine work envelope (mm)
  xMin: 0,
  xMax: 200,
  yMin: 0,
  yMax: 200,
  zMin: -50,
  zMax: 50,

  // Safety limits
  maxFeedRate: 3000, // mm/min
  maxSpindleSpeed: 24000, // RPM
  maxRapidPlunge: 10, // mm (Z movement in G0)
  minSafeZ: 5, // mm above workpiece for safe travel

  // Tool dimensions (can be overridden per tool)
  toolDiameter: 6, // mm
  toolLength: 50, // mm

  // Collision detection
  workpieceWidth: 100, // mm
  workpieceDepth: 100, // mm
  workpieceHeight: 25, // mm
  workpieceX: 50, // mm (center position)
  workpieceY: 50, // mm (center position)
  workpieceZ: 0, // mm (top surface)
};

/**
 * Warning severity levels
 */
export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Warning types
 */
export const WARNING_TYPE = {
  BOUNDS_X: 'bounds_x',
  BOUNDS_Y: 'bounds_y',
  BOUNDS_Z: 'bounds_z',
  RAPID_PLUNGE: 'rapid_plunge',
  FEED_RATE_HIGH: 'feed_rate_high',
  FEED_RATE_MISSING: 'feed_rate_missing',
  SPINDLE_SPEED_HIGH: 'spindle_speed_high',
  UNSAFE_Z_HEIGHT: 'unsafe_z_height',
  WORKPIECE_COLLISION: 'workpiece_collision',
  NEGATIVE_Z_RAPID: 'negative_z_rapid',
};

/**
 * Check if position is within machine bounds
 */
function checkBounds(pos, config) {
  const warnings = [];

  if (pos.x < config.xMin || pos.x > config.xMax) {
    warnings.push({
      type: WARNING_TYPE.BOUNDS_X,
      severity: SEVERITY.CRITICAL,
      message: `X position ${pos.x.toFixed(3)} outside machine bounds [${config.xMin}, ${
        config.xMax
      }]`,
      position: { ...pos },
    });
  }

  if (pos.y < config.yMin || pos.y > config.yMax) {
    warnings.push({
      type: WARNING_TYPE.BOUNDS_Y,
      severity: SEVERITY.CRITICAL,
      message: `Y position ${pos.y.toFixed(3)} outside machine bounds [${config.yMin}, ${
        config.yMax
      }]`,
      position: { ...pos },
    });
  }

  if (pos.z < config.zMin || pos.z > config.zMax) {
    warnings.push({
      type: WARNING_TYPE.BOUNDS_Z,
      severity: SEVERITY.CRITICAL,
      message: `Z position ${pos.z.toFixed(3)} outside machine bounds [${config.zMin}, ${
        config.zMax
      }]`,
      position: { ...pos },
    });
  }

  return warnings;
}

/**
 * Check for rapid plunge (large Z movement in G0)
 */
function checkRapidPlunge(prevPos, nextPos, config, isRapid) {
  if (!isRapid) return [];

  const zDelta = Math.abs(nextPos.z - prevPos.z);
  if (zDelta > config.maxRapidPlunge) {
    return [
      {
        type: WARNING_TYPE.RAPID_PLUNGE,
        severity: SEVERITY.ERROR,
        message: `Rapid plunge detected: ${zDelta.toFixed(3)}mm exceeds safe limit of ${
          config.maxRapidPlunge
        }mm`,
        position: { ...nextPos },
        delta: zDelta,
      },
    ];
  }

  // Warn about rapid moves going below zero
  if (nextPos.z < 0 && isRapid) {
    return [
      {
        type: WARNING_TYPE.NEGATIVE_Z_RAPID,
        severity: SEVERITY.WARNING,
        message: `Rapid move to Z=${nextPos.z.toFixed(3)} (below zero) - potential collision risk`,
        position: { ...nextPos },
      },
    ];
  }

  return [];
}

/**
 * Check feed rate validity
 */
function checkFeedRate(feedRate, config, isMovement, lineNumber) {
  if (isMovement && feedRate === null) {
    return [
      {
        type: WARNING_TYPE.FEED_RATE_MISSING,
        severity: SEVERITY.WARNING,
        message: `Feed rate not set for movement at line ${lineNumber}`,
        line: lineNumber,
      },
    ];
  }

  if (feedRate !== null && feedRate > config.maxFeedRate) {
    return [
      {
        type: WARNING_TYPE.FEED_RATE_HIGH,
        severity: SEVERITY.ERROR,
        message: `Feed rate ${feedRate} exceeds maximum ${config.maxFeedRate} mm/min`,
        line: lineNumber,
        value: feedRate,
      },
    ];
  }

  return [];
}

/**
 * Check spindle speed validity
 */
function checkSpindleSpeed(spindleSpeed, config, lineNumber) {
  if (spindleSpeed > config.maxSpindleSpeed) {
    return [
      {
        type: WARNING_TYPE.SPINDLE_SPEED_HIGH,
        severity: SEVERITY.ERROR,
        message: `Spindle speed ${spindleSpeed} RPM exceeds maximum ${config.maxSpindleSpeed} RPM`,
        line: lineNumber,
        value: spindleSpeed,
      },
    ];
  }
  return [];
}

/**
 * Check for potential workpiece collision
 */
function checkWorkpieceCollision(pos, config) {
  const warnings = [];

  // Calculate workpiece boundaries
  const wpXMin = config.workpieceX - config.workpieceWidth / 2;
  const wpXMax = config.workpieceX + config.workpieceWidth / 2;
  const wpYMin = config.workpieceY - config.workpieceDepth / 2;
  const wpYMax = config.workpieceY + config.workpieceDepth / 2;
  const wpZMin = config.workpieceZ - config.workpieceHeight;
  const wpZMax = config.workpieceZ;

  // If tool is below workpiece surface, it's cutting (not a collision)
  if (pos.z <= wpZMax) {
    return [];
  }

  // Check for side collision (tool hitting side of workpiece above surface)
  // Only warn if tool is ABOVE the workpiece surface but below safe height
  const toolRadius = config.toolDiameter / 2;
  const insideXRange = pos.x + toolRadius > wpXMin && pos.x - toolRadius < wpXMax;
  const insideYRange = pos.y + toolRadius > wpYMin && pos.y - toolRadius < wpYMax;
  const inUnsafeZone = pos.z > wpZMax && pos.z < wpZMax + config.minSafeZ;

  if ((insideXRange || insideYRange) && inUnsafeZone) {
    warnings.push({
      type: WARNING_TYPE.WORKPIECE_COLLISION,
      severity: SEVERITY.WARNING,
      message: `Tool may collide with workpiece edge at Z=${pos.z.toFixed(3)}mm (not safe height)`,
      position: { ...pos },
    });
  }

  return warnings;
}

/**
 * Detect collisions and safety issues in G-Code
 */
export function detectCollisions(gcode, config = {}) {
  if (!gcode || !gcode.trim()) {
    return {
      warnings: [],
      summary: {
        total: 0,
        critical: 0,
        error: 0,
        warning: 0,
        info: 0,
      },
      safe: true,
    };
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };
  const commands = parse(gcode);
  const warnings = [];

  let currentPos = { x: 0, y: 0, z: 0 };
  let currentFeedRate = null;
  let currentSpindleSpeed = 0;
  let spindleRunning = false;

  commands.forEach((cmd, index) => {
    if (!cmd.params) return;

    const params = cmd.params;
    const lineNumber = index + 1;

    // Update position
    const nextPos = {
      x: 'X' in params ? params.X : currentPos.x,
      y: 'Y' in params ? params.Y : currentPos.y,
      z: 'Z' in params ? params.Z : currentPos.z,
    };

    // Update feed rate
    if ('F' in params) {
      currentFeedRate = params.F;
    }

    // Update spindle speed
    if ('S' in params) {
      currentSpindleSpeed = params.S;
      warnings.push(...checkSpindleSpeed(currentSpindleSpeed, cfg, lineNumber));
    }

    // Track spindle state
    if ('M' in params) {
      if (params.M === 3 || params.M === 4) {
        spindleRunning = true;
      } else if (params.M === 5) {
        spindleRunning = false;
      }
    }

    // Check movement commands
    if ('G' in params) {
      const gCode = params.G;
      const isRapid = gCode === 0;
      const isFeed = gCode === 1;
      const isMovement = isRapid || isFeed || gCode === 2 || gCode === 3;

      if (isMovement) {
        // Check bounds
        warnings.push(...checkBounds(nextPos, cfg));

        // Check rapid plunge
        warnings.push(...checkRapidPlunge(currentPos, nextPos, cfg, isRapid));

        // Check feed rate
        warnings.push(...checkFeedRate(currentFeedRate, cfg, isFeed, lineNumber));

        // Check workpiece collision
        if (spindleRunning) {
          warnings.push(...checkWorkpieceCollision(nextPos, cfg));
        }

        // Update position
        currentPos = nextPos;
      }
    }
  });

  // Calculate summary
  const summary = {
    total: warnings.length,
    critical: warnings.filter((w) => w.severity === SEVERITY.CRITICAL).length,
    error: warnings.filter((w) => w.severity === SEVERITY.ERROR).length,
    warning: warnings.filter((w) => w.severity === SEVERITY.WARNING).length,
    info: warnings.filter((w) => w.severity === SEVERITY.INFO).length,
  };

  const safe = summary.critical === 0 && summary.error === 0;

  return {
    warnings,
    summary,
    safe,
  };
}

/**
 * Get human-readable summary of collision detection results
 */
export function getSummaryText(result) {
  if (result.safe && result.warnings.length === 0) {
    return '✅ G-Code is safe - no issues detected';
  }

  const lines = [];

  if (result.summary.critical > 0) {
    lines.push(`🔴 CRITICAL: ${result.summary.critical} issue(s) - DO NOT RUN`);
  }
  if (result.summary.error > 0) {
    lines.push(`🟠 ERROR: ${result.summary.error} issue(s) - Review required`);
  }
  if (result.summary.warning > 0) {
    lines.push(`🟡 WARNING: ${result.summary.warning} issue(s) - Proceed with caution`);
  }
  if (result.summary.info > 0) {
    lines.push(`ℹ️ INFO: ${result.summary.info} note(s)`);
  }

  return lines.join('\n');
}

export { DEFAULT_CONFIG };
