/**
 * G-Code Optimizer Module
 * Optimizes G-Code by removing redundant moves, combining collinear segments,
 * removing duplicate commands, and improving path efficiency.
 *
 * @module modules/gcode/optimizer
 */

import { parse } from './parser.mjs';

/**
 * Default optimization options
 */
const DEFAULT_OPTIONS = {
  removeRedundantMoves: true,
  combineCollinear: true,
  removeDuplicateCommands: true,
  collinearTolerance: 0.5, // degrees
  positionTolerance: 0.001, // mm
};

/**
 * Check if two positions are equal within tolerance
 */
function positionsEqual(pos1, pos2, tolerance = 0.001) {
  const dx = Math.abs((pos1.x || 0) - (pos2.x || 0));
  const dy = Math.abs((pos1.y || 0) - (pos2.y || 0));
  const dz = Math.abs((pos1.z || 0) - (pos2.z || 0));
  return dx <= tolerance && dy <= tolerance && dz <= tolerance;
}

/**
 * Calculate angle between two vectors in degrees
 */
function vectorAngle(v1, v2) {
  const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (len1 < 0.0001 || len2 < 0.0001) return 0;

  const dot = (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / (len1 * len2);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
}

/**
 * Check if three points are collinear within tolerance
 */
function areCollinear(p1, p2, p3, angleTolerance = 0.5) {
  const v1 = {
    x: (p2.x || 0) - (p1.x || 0),
    y: (p2.y || 0) - (p1.y || 0),
    z: (p2.z || 0) - (p1.z || 0),
  };

  const v2 = {
    x: (p3.x || 0) - (p2.x || 0),
    y: (p3.y || 0) - (p2.y || 0),
    z: (p3.z || 0) - (p2.z || 0),
  };

  const angle = vectorAngle(v1, v2);
  return angle <= angleTolerance;
}

/**
 * Reconstruct G-Code line from parsed command
 */
function reconstructLine(cmd) {
  if (!cmd || !cmd.command) return cmd.raw || '';

  const parts = [cmd.command];
  const params = cmd.params || {};

  // Add parameters in standard order
  if ('X' in params) parts.push(`X${params.X.toFixed(4)}`);
  if ('Y' in params) parts.push(`Y${params.Y.toFixed(4)}`);
  if ('Z' in params) parts.push(`Z${params.Z.toFixed(4)}`);
  if ('I' in params) parts.push(`I${params.I.toFixed(4)}`);
  if ('J' in params) parts.push(`J${params.J.toFixed(4)}`);
  if ('K' in params) parts.push(`K${params.K.toFixed(4)}`);
  if ('F' in params) parts.push(`F${params.F}`);
  if ('S' in params) parts.push(`S${params.S}`);
  if ('T' in params) parts.push(`T${params.T}`);
  if ('P' in params) parts.push(`P${params.P}`);
  if ('R' in params) parts.push(`R${params.R}`);

  const line = parts.join(' ');
  return cmd.comment ? `${line} ; ${cmd.comment}` : line;
}

/**
 * Remove redundant moves (consecutive moves to same position)
 */
function removeRedundantMoves(commands, tolerance) {
  const optimized = [];
  let currentPos = { x: 0, y: 0, z: 0 };
  let removed = 0;

  for (const cmd of commands) {
    if (!cmd.command || cmd.command.startsWith(';') || cmd.command.startsWith('(')) {
      optimized.push(cmd);
      continue;
    }

    const params = cmd.params || {};
    const newPos = {
      x: 'X' in params ? params.X : currentPos.x,
      y: 'Y' in params ? params.Y : currentPos.y,
      z: 'Z' in params ? params.Z : currentPos.z,
    };

    // Check if it's a move command
    const isMove = cmd.command.match(/^G[0123]/);

    if (
      isMove &&
      ('X' in params || 'Y' in params || 'Z' in params) &&
      positionsEqual(currentPos, newPos, tolerance)
    ) {
      // Redundant move - skip if no F/S, else keep F/S only
      if ('F' in params || 'S' in params) {
        const reducedCmd = {
          ...cmd,
          params: {},
        };
        if ('F' in params) reducedCmd.params.F = params.F;
        if ('S' in params) reducedCmd.params.S = params.S;
        optimized.push(reducedCmd);
      } else {
        removed++;
      }
    } else {
      optimized.push(cmd);
      if (isMove) {
        currentPos = newPos;
      }
    }
  }

  return { commands: optimized, removed };
}

/**
 * Combine collinear segments
 */
function combineCollinearSegments(commands, angleTolerance) {
  const optimized = [];
  let combined = 0;
  let i = 0;

  while (i < commands.length) {
    const cmd = commands[i];

    if (!cmd.command || cmd.command !== 'G1') {
      optimized.push(cmd);
      i++;
      continue;
    }

    // Found G1, look for collinear segments
    const segment = [cmd];
    const feedRate = cmd.params?.F || null;
    let j = i + 1;

    while (j < commands.length) {
      const next = commands[j];

      if (!next.command) {
        j++;
        continue;
      }

      if (next.command !== 'G1') break;

      // Check feed rate matches
      const nextFeed = next.params?.F || null;
      if (feedRate !== null && nextFeed !== null && feedRate !== nextFeed) break;

      // Check collinearity
      if (segment.length >= 2) {
        const p1 = {
          x: segment[segment.length - 2].params?.X || 0,
          y: segment[segment.length - 2].params?.Y || 0,
          z: segment[segment.length - 2].params?.Z || 0,
        };
        const p2 = {
          x: segment[segment.length - 1].params?.X || 0,
          y: segment[segment.length - 1].params?.Y || 0,
          z: segment[segment.length - 1].params?.Z || 0,
        };
        const p3 = {
          x: next.params?.X || 0,
          y: next.params?.Y || 0,
          z: next.params?.Z || 0,
        };

        if (!areCollinear(p1, p2, p3, angleTolerance)) break;
      }

      segment.push(next);
      j++;
    }

    if (segment.length > 2) {
      // Combine into single move
      const lastCmd = segment[segment.length - 1];
      const combinedCmd = {
        ...segment[0],
        params: { ...lastCmd.params },
        comment: `optimized: ${segment.length} segments`,
      };
      optimized.push(combinedCmd);
      combined += segment.length - 1;
      i = j;
    } else {
      optimized.push(cmd);
      i++;
    }
  }

  return { commands: optimized, combined };
}

/**
 * Remove duplicate F/S/T commands
 */
function removeDuplicateCommands(commands) {
  const optimized = [];
  let lastF = null;
  let lastS = null;
  let removed = 0;

  for (const cmd of commands) {
    if (!cmd.command) {
      optimized.push(cmd);
      continue;
    }

    const params = { ...(cmd.params || {}) };
    let modified = false;

    if ('F' in params) {
      if (params.F === lastF) {
        delete params.F;
        modified = true;
      } else {
        lastF = params.F;
      }
    }

    if ('S' in params) {
      if (params.S === lastS) {
        delete params.S;
        modified = true;
      } else {
        lastS = params.S;
      }
    }

    // If command becomes empty, skip it
    if (modified && Object.keys(params).length === 0 && !cmd.command.match(/^[GMT]/)) {
      removed++;
    } else {
      optimized.push({ ...cmd, params });
    }
  }

  return { commands: optimized, removed };
}

/**
 * Optimize G-Code with specified options
 * @param {string} gcode - Input G-Code string
 * @param {Object} options - Optimization options
 * @returns {Object} Optimized G-Code and statistics
 */
export function optimizeGCode(gcode, options = {}) {
  if (!gcode) return { gcode: '', stats: {} };

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let commands = parse(gcode);

  const stats = {
    originalLines: gcode.split('\n').length,
    originalCommands: commands.length,
    redundantMovesRemoved: 0,
    collinearSegmentsCombined: 0,
    duplicateCommandsRemoved: 0,
    optimizedLines: 0,
    reductionPercent: 0,
  };

  // Apply optimizations
  if (opts.removeRedundantMoves) {
    const result = removeRedundantMoves(commands, opts.positionTolerance);
    commands = result.commands;
    stats.redundantMovesRemoved = result.removed;
  }

  if (opts.combineCollinear) {
    const result = combineCollinearSegments(commands, opts.collinearTolerance);
    commands = result.commands;
    stats.collinearSegmentsCombined = result.combined;
  }

  if (opts.removeDuplicateCommands) {
    const result = removeDuplicateCommands(commands);
    commands = result.commands;
    stats.duplicateCommandsRemoved = result.removed;
  }

  // Reconstruct G-Code
  const optimizedGCode = commands.map((cmd) => reconstructLine(cmd)).join('\n');
  stats.optimizedLines = commands.length;
  stats.reductionPercent =
    ((stats.originalCommands - commands.length) / stats.originalCommands) * 100;

  return {
    gcode: optimizedGCode,
    stats,
  };
}

/**
 * Analyze optimization potential without actually optimizing
 * @param {string} gcode - Input G-Code string
 * @param {Object} options - Optimization options
 * @returns {Object} Analysis results
 */
export function analyzeOptimizationPotential(gcode, options = {}) {
  if (!gcode) return { totalLines: 0, potentialReduction: 0 };

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const commands = parse(gcode);

  const analysis = {
    totalLines: gcode.split('\n').length,
    totalCommands: commands.length,
    redundantMoves: 0,
    collinearSegments: 0,
    duplicateCommands: 0,
    potentialReduction: 0,
  };

  if (opts.removeRedundantMoves) {
    const result = removeRedundantMoves(commands, opts.positionTolerance);
    analysis.redundantMoves = result.removed;
  }

  if (opts.combineCollinear) {
    const result = combineCollinearSegments(commands, opts.collinearTolerance);
    analysis.collinearSegments = result.combined;
  }

  if (opts.removeDuplicateCommands) {
    const result = removeDuplicateCommands(commands);
    analysis.duplicateCommands = result.removed;
  }

  analysis.potentialReduction =
    analysis.redundantMoves + analysis.collinearSegments + analysis.duplicateCommands;

  return analysis;
}

export default { optimizeGCode, analyzeOptimizationPotential, DEFAULT_OPTIONS };
