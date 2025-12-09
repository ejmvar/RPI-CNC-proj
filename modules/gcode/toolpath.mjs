// Convert parsed G-code into ordered toolpath points

import { parse } from './parser.mjs';

// parseGCodeToPoints(text)
// - Accepts gcode text (string) or an array of parsed command objects
// - Returns an array of { x, y, z, type } where type is 'G0' or 'G1' or the G-code command
export function parseGCodeToPoints(input) {
  const cmds = Array.isArray(input) ? input : parse(input);
  let pos = { x: 0, y: 0, z: 0 };
  const points = [];

  cmds.forEach(c => {
    // c can be { raw, params }
    const params = c.params || {};
    if ('X' in params) pos.x = params.X;
    if ('Y' in params) pos.y = params.Y;
    if ('Z' in params) pos.z = params.Z;

    // decide type: G0 = rapid, G1 = feed/cut, default to other
    const g = params.G === true ? 0 : params.G || null;
    const type = (g === 0 ? 'G0' : g === 1 ? 'G1' : (c.raw || '').split(/\s+/)[0] || 'UNK');

    points.push({ x: pos.x, y: pos.y, z: pos.z, type });
  });

  return points;
}

// Simple linear subdivision between consecutive points
// points: [{x,y,z,type}, ...]
// subdivisions: number of segments to add between each pair (1 means keep original points as-is)
export function interpolatePoints(points, subdivisions = 1) {
  if (!Array.isArray(points) || points.length <= 1) return points;
  if (subdivisions <= 1) return points;

  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i+1];
    out.push(a);
    for (let s = 1; s < subdivisions; s++) {
      const t = s / subdivisions;
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        type: a.type
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export default { parseGCodeToPoints };
