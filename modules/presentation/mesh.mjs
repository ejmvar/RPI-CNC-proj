// Rendering helpers for probe points and mesh overlays

export function renderProbePoints(scene, points = [], options = {}) {
  if (!scene) throw new Error('scene required');
  const group = new THREE.Group();
  group.name = options.name || 'probe-points';

  points.forEach(p => {
    const geom = new THREE.SphereGeometry(options.radius || 0.2, 8, 8);
    const mat = new THREE.MeshStandardMaterial({ color: options.color || 0xffff00 });
    const s = new THREE.Mesh(geom, mat);
    s.position.set(p.x, p.z, p.y);
    group.add(s);
  });

  scene.add(group);
  return group;
}

export function renderMeshOverlay(scene, mesh = {}, options = {}) {
  if (!scene) throw new Error('scene required');
  if (!mesh || !mesh.values) return null;

  const size = mesh.size || mesh.values.length;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xx = mesh.bounds.minX + (mesh.bounds.maxX - mesh.bounds.minX) * (x / (size - 1));
      const yy = mesh.bounds.minY + (mesh.bounds.maxY - mesh.bounds.minY) * (y / (size - 1));
      const zz = parseFloat(mesh.values[y][x]);
      positions.push(xx, zz, yy);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  // Display as points grid
  const material = new THREE.PointsMaterial({ size: options.pointSize || 0.15, color: options.color || 0x00ff00 });
  const pointsObj = new THREE.Points(geometry, material);
  pointsObj.name = options.name || 'mesh-overlay';
  scene.add(pointsObj);
  return pointsObj;
}

export default { renderProbePoints, renderMeshOverlay };
