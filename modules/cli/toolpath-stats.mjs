export function distance(a, b) {
  const dx = (b.x || 0) - (a.x || 0);
  const dy = (b.y || 0) - (a.y || 0);
  const dz = (b.z || 0) - (a.z || 0);
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

export function computeToolpathStats(points = [], opts = {}) {
  // points: [{x,y,z,type}, ...]
  const result = { totalDistance: 0, segments: [], estimatedTimeSec: 0 };
  if (!Array.isArray(points) || points.length <= 1) return result;

  const feedMmPerMin = opts.feed || 1000; // default mm/min
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distance(points[i], points[i+1]);
    total += d;
    result.segments.push({ i, from: points[i], to: points[i+1], dist: d, type: points[i+1].type });
  }
  result.totalDistance = total;
  const feedMmPerSec = feedMmPerMin / 60;
  result.estimatedTimeSec = feedMmPerSec > 0 ? (total / feedMmPerSec) : 0;
  return result;
}

export default { distance, computeToolpathStats };
