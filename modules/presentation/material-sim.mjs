// Very simple material removal simulation
// This reduces mesh heights where the toolpath passes nearby, simulating removal.

export function applyToolpathToMesh(mesh, points, options = {}) {
  const radius = options.radius || 1; // mm
  const removalPerPass = options.removalPerPass || 0.1; // mm removed per pass
  const out = JSON.parse(JSON.stringify(mesh)); // deep copy
  const size = mesh.size || mesh.values.length;
  const { minX, maxX, minY, maxY } = mesh.bounds;
  for (const p of points) {
    // find grid cell positions
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const xx = minX + (maxX - minX) * (x / (size - 1));
        const yy = minY + (maxY - minY) * (y / (size - 1));
        const dx = xx - p.x;
        const dy = yy - p.y;
        const d2 = dx*dx + dy*dy;
        if (d2 <= radius*radius) {
          // lower the mesh value (more negative means deeper cut) toward the tool Z
          // we interpret p.z as the current tool Z, so we remove material down to p.z
          // for simplicity, move the mesh value down by removalPerPass
          out.values[y][x] = Number(out.values[y][x]) - removalPerPass;
        }
      }
    }
  }
  return out;
}

export default { applyToolpathToMesh };
