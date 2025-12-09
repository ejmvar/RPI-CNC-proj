// G-code transformation utilities — bed leveling & tool offsets

// Mesh format (recommended):
// {
//   bounds: { minX, maxX, minY, maxY },
//   size: N, // grid is N x N
//   values: [ [z00, z01, ...], [z10, z11, ...], ... ] // row-major Y then X
// }

export function bilinearInterpolate(mesh, x, y) {
  if (!mesh || !mesh.bounds || !mesh.values) return 0;
  const { minX, maxX, minY, maxY } = mesh.bounds;
  const N = mesh.size;
  const xs = (x - minX) / (maxX - minX);
  const ys = (y - minY) / (maxY - minY);
  // clamp
  const u = Math.max(0, Math.min(1, xs));
  const v = Math.max(0, Math.min(1, ys));

  const sx = u * (N - 1);
  const sy = v * (N - 1);
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(N - 1, x0 + 1);
  const y1 = Math.min(N - 1, y0 + 1);

  const q11 = Number(mesh.values[y0][x0]);
  const q21 = Number(mesh.values[y0][x1]);
  const q12 = Number(mesh.values[y1][x0]);
  const q22 = Number(mesh.values[y1][x1]);

  const tx = sx - x0;
  const ty = sy - y0;

  // bilinear interpolation
  const a = q11 * (1 - tx) + q21 * tx;
  const b = q12 * (1 - tx) + q22 * tx;
  const value = a * (1 - ty) + b * ty;

  return value;
}

// Apply mesh compensation values (e.g., adjust Z by subtracting mesh Z at XY)
// gcodeText: input G-code text
// mesh: mesh object as above
// returns transformed G-code text
export function applyMeshCompensationToGCode(gcodeText, mesh) {
  if (!gcodeText) return '';
  return gcodeText.split(/\r?\n/).map(line => {
    let l = String(line).trim();
    if (l === '' || l.startsWith(';') || l.startsWith('(')) return line;

    // simple token match for X Y Z values
    const tokens = line.split(/\s+/);
    const params = {};
    tokens.forEach(tok => {
      const m = tok.match(/^([XYZF])(-?\d+(?:\.\d+)?)$/i);
      if (m) params[m[1].toUpperCase()] = Number(m[2]);
    });

    if ('Z' in params && ('X' in params || 'Y' in params)) {
      const x = params.X ?? 0;
      const y = params.Y ?? 0;
      const meshZ = bilinearInterpolate(mesh, x, y);
      // subtract meshZ from Z to compensate the surface height
      const newZ = params.Z - meshZ;
      // replace Z token in line
      const newLine = line.replace(/(Z)(-?\d+(?:\.\d+)?)/i, `$1${newZ.toFixed(4)}`);
      return newLine;
    }

    return line;
  }).join('\n');
}

export default { bilinearInterpolate, applyMeshCompensationToGCode };
