// Browser wrapper for toolpath helpers
export { parseGCodeToPoints } from '../../modules/gcode/toolpath.mjs';

export function renderToolpath(scene, points, options = {}) {
  if (!scene || !scene.add) throw new Error('scene must be a Three.js scene');
  if (!Array.isArray(points)) return null;
  // optionally interpolate points for smoothness
  if (options.subdivisions && typeof window !== 'undefined') {
    // try to call interpolatePoints from module if exposed in module runtime
    if (typeof parseGCodeToPoints !== 'undefined' && typeof window !== 'undefined') {
      // nothing to do here — calling code can pass interpolation result
    }
  }
  // build line segments from points
  const positions = [];
  const colors = [];
  points.forEach(pt => {
    positions.push(pt.x, pt.z, pt.y); // CNC Z -> Three Y mapping already used elsewhere
    // color: G0 rapid moves = blue, G1 cutting = red
    const color = (pt.type === 'G0') ? [0, 0, 1] : (pt.type === 'G1' ? [1, 0, 0] : [0.5, 0.5, 0.5]);
    colors.push(...color);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({ vertexColors: true, linewidth: options.linewidth || 2 });

  const line = new THREE.Line(geometry, material);
  line.name = 'toolpath-line';
  line.userData = { pointsCount: points.length };
  scene.add(line);

  return line;
}

export default { parseGCodeToPoints, renderToolpath };
