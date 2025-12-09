import { parse } from '../gcode/parser.mjs';

export function simulateBatchFromText(gcodeText) {
  const cmds = parse(gcodeText);
  const points = [];
  let pos = { x: 0, y: 0, z: 0 };
  cmds.forEach(c => {
    const params = c.params || {};
    if ('X' in params) pos.x = params.X;
    if ('Y' in params) pos.y = params.Y;
    if ('Z' in params) pos.z = params.Z;
    points.push({ x: pos.x, y: pos.y, z: pos.z, type: (c.params.G === 0 ? 'G0' : (c.params.G === 1 ? 'G1' : 'UNK')) });
  });

  const summary = {
    commands: cmds.length,
    lastPosition: pos,
    bounds: {
      minX: Math.min(...points.map(p => p.x)),
      maxX: Math.max(...points.map(p => p.x)),
      minY: Math.min(...points.map(p => p.y)),
      maxY: Math.max(...points.map(p => p.y))
    }
  };

  return { cmds, points, summary };
}

export default { simulateBatchFromText };
