// Browser wrapper for toolpath helpers
export { parseGCodeToPoints, interpolatePoints } from '../../../modules/gcode/toolpath.mjs';

export function renderToolpath(scene, points, options = {}) {
  if (!scene || !scene.add) throw new Error('scene must be a Three.js scene');
  if (!Array.isArray(points)) return null;
  // optionally interpolate points for smoothness
  // optionally interpolate points for smoothness
  if (
    options.subdivisions &&
    typeof options.subdivisions === 'number' &&
    options.subdivisions > 1
  ) {
    if (typeof interpolatePoints === 'function') {
      points = interpolatePoints(points, options.subdivisions);
    }
  }
  // build line segments from points
  const positions = [];
  const colors = [];
  points.forEach((pt) => {
    positions.push(pt.x, pt.z, pt.y); // CNC Z -> Three Y mapping already used elsewhere
    // color by tool if present; otherwise color by move type
    const toolColors = { 1: [0, 1, 0], 2: [1, 0, 1], 3: [1, 0.5, 0] };
    const color =
      pt.tool != null && toolColors[pt.tool]
        ? toolColors[pt.tool]
        : pt.type === 'G0'
        ? [0, 0, 1]
        : pt.type === 'G1'
        ? [1, 0, 0]
        : [0.5, 0.5, 0.5];
    colors.push(...color);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    linewidth: options.linewidth || 2,
  });

  const line = new THREE.Line(geometry, material);
  line.name = 'toolpath-line';
  line.userData = { pointsCount: points.length };
  scene.add(line);

  return line;
}

export default { parseGCodeToPoints, renderToolpath };
