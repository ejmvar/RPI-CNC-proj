// Convert parsed G-code into ordered toolpath points

import { parse } from './parser.mjs';

/**
 * Parse G-Code into toolpath points with tool tracking
 * @param {string|Array} input - G-Code text or parsed command objects
 * @param {object} options - Options including toolLibrary
 * @returns {Array} Array of {x, y, z, type, tool, toolConfig} objects
 */
export function parseGCodeToPoints(input, options = {}) {
  const cmds = Array.isArray(input) ? input : parse(input);
  const toolLibrary = options.toolLibrary || null;
  let pos = { x: 0, y: 0, z: 0 };
  let currentTool = 0;
  let toolOffsetActive = false;
  const points = [];

  cmds.forEach((c) => {
    // c can be { raw, params, toolSelect, toolChange, toolLengthOffset, etc. }
    const params = c.params || {};

    // Handle tool selection
    if (c.toolSelect !== undefined) {
      currentTool = c.toolSelect;
      if (toolLibrary) {
        toolLibrary.selectTool(currentTool);
      }
    }

    // Handle tool change (M6)
    if (c.toolChange) {
      const toolConfig = toolLibrary ? toolLibrary.getTool(currentTool) : null;
      points.push({
        ...pos,
        type: 'tool-change',
        tool: currentTool,
        toolConfig,
      });
    }

    // Handle tool length offset enable (G43)
    if (c.toolLengthOffset) {
      toolOffsetActive = true;
      // If H parameter specified, it overrides the current tool
      if (c.toolOffsetIndex !== undefined) {
        currentTool = c.toolOffsetIndex;
        if (toolLibrary) {
          toolLibrary.selectTool(currentTool);
        }
      }
    }

    // Handle tool offset cancel (G49)
    if (c.cancelToolOffset) {
      toolOffsetActive = false;
    }

    // Update position
    if ('X' in params) pos.x = params.X;
    if ('Y' in params) pos.y = params.Y;
    if ('Z' in params) pos.z = params.Z;

    // Apply tool offset if active
    let adjustedPos = { ...pos };
    if (toolOffsetActive && toolLibrary) {
      const activeTool = toolLibrary.getTool(currentTool);
      if (activeTool && activeTool.offsetZ) {
        adjustedPos.z += activeTool.offsetZ;
      }
    }

    // Determine move type: G0 = rapid, G1 = feed/cut
    const g = params.G === true ? 0 : params.G !== undefined ? params.G : null;
    const type = g === 0 ? 'rapid' : g === 1 ? 'cut' : (c.raw || '').split(/\s+/)[0] || 'unknown';

    // Add point with tool information
    const toolConfig = toolLibrary ? toolLibrary.getTool(currentTool) : null;
    points.push({
      ...adjustedPos,
      type,
      tool: currentTool,
      toolConfig,
    });
  });

  return points;
}

// Simple linear subdivision between consecutive points
// points: [{x,y,z,type,tool,toolConfig}, ...]
// subdivisions: number of segments to add between each pair (1 means keep original points as-is)
export function interpolatePoints(points, subdivisions = 1) {
  if (!Array.isArray(points) || points.length <= 1) return points;
  if (subdivisions <= 1) return points;

  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    out.push(a);

    // Skip interpolation for tool-change points
    if (a.type === 'tool-change' || b.type === 'tool-change') {
      continue;
    }

    for (let s = 1; s < subdivisions; s++) {
      const t = s / subdivisions;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        type: a.type,
        tool: a.tool,
        toolConfig: a.toolConfig,
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export default { parseGCodeToPoints };
