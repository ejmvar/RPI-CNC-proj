import { parse } from './parser.mjs';

// Remove redundant movement commands (no positional change)
export function optimizeGCode(text) {
  if (!text) return '';
  const cmds = parse(text);
  let lastPos = { x: null, y: null, z: null };
  const outLines = [];
  for (const c of cmds) {
    const params = c.params || {};
    const x = ('X' in params) ? params.X : lastPos.x;
    const y = ('Y' in params) ? params.Y : lastPos.y;
    const z = ('Z' in params) ? params.Z : lastPos.z;
    // If movement command and position same as last, skip
    if (('X' in params || 'Y' in params || 'Z' in params) && x === lastPos.x && y === lastPos.y && z === lastPos.z) {
      // redundant move
      continue;
    }
    outLines.push(c.raw);
    lastPos = { x, y, z };
  }
  return outLines.join('\n');
}

export default { optimizeGCode };
