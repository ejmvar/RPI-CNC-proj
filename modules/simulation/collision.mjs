// Collision and bounds checking helpers

export function detectCollisions(points = [], bounds = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity, minZ: -Infinity, maxZ: Infinity }) {
  const collisions = [];
  points.forEach((p, idx) => {
    const { x = 0, y = 0, z = 0 } = p;
    if (x < bounds.minX || x > bounds.maxX) collisions.push({ index: idx, axis: 'X', value: x });
    if (y < bounds.minY || y > bounds.maxY) collisions.push({ index: idx, axis: 'Y', value: y });
    if (z < bounds.minZ || z > bounds.maxZ) collisions.push({ index: idx, axis: 'Z', value: z });
  });
  return collisions;
}

export default { detectCollisions };
