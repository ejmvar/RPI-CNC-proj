// Multi-tool toolpath renderer with color-coded visualization
// Renders toolpaths with different colors per tool

/* global window */

/**
 * Render multi-tool toolpath with color coding
 * @param {object} scene - THREE.js scene
 * @param {Array} points - Toolpath points with tool information
 * @param {object} options - Rendering options
 */
export function renderMultiToolToolpath(scene, points, options = {}) {
  const THREE =
    options.THREE || (typeof window !== 'undefined' && window.THREE ? window.THREE : null);
  if (!THREE) {
    console.error('THREE.js not available');
    return;
  }

  // Remove existing toolpath objects
  const existingToolpath = scene.children.filter(
    (c) => c.userData.isToolpath || c.userData.isToolChange
  );
  existingToolpath.forEach((obj) => scene.remove(obj));

  if (!points || points.length === 0) return;

  // Group points by tool
  const toolGroups = new Map();

  points.forEach((pt) => {
    const toolIndex = pt.tool ?? 0;
    if (!toolGroups.has(toolIndex)) {
      toolGroups.set(toolIndex, { rapid: [], cut: [], toolChanges: [] });
    }

    const group = toolGroups.get(toolIndex);
    if (pt.type === 'tool-change') {
      group.toolChanges.push(pt);
    } else if (pt.type === 'rapid' || pt.type === 'G0') {
      group.rapid.push(pt);
    } else if (pt.type === 'cut' || pt.type === 'G1') {
      group.cut.push(pt);
    } else {
      // Default to cut for unknown types
      group.cut.push(pt);
    }
  });

  // Render each tool's path with its color
  toolGroups.forEach((group, toolIndex) => {
    const toolConfig = (group.cut[0] || group.rapid[0] || group.toolChanges[0])?.toolConfig;
    const colorHex = toolConfig?.color || '#888888';
    const color = new THREE.Color(colorHex);

    // Render cutting moves (solid line, full opacity)
    if (group.cut.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        group.cut.map((p) => new THREE.Vector3(p.x, p.z, p.y))
      );
      const material = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
        opacity: 0.9,
        transparent: true,
      });
      const line = new THREE.Line(geometry, material);
      line.userData.isToolpath = true;
      line.userData.toolIndex = toolIndex;
      line.userData.moveType = 'cut';
      scene.add(line);
    }

    // Render rapid moves (dashed line, lighter color)
    if (group.rapid.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        group.rapid.map((p) => new THREE.Vector3(p.x, p.z, p.y))
      );

      // Create lighter shade for rapids
      const rapidColor = color.clone();
      rapidColor.offsetHSL(0, -0.3, 0.3);

      const material = new THREE.LineDashedMaterial({
        color: rapidColor,
        linewidth: 1,
        dashSize: 2,
        gapSize: 1,
        opacity: 0.6,
        transparent: true,
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances(); // Required for dashed lines
      line.userData.isToolpath = true;
      line.userData.toolIndex = toolIndex;
      line.userData.moveType = 'rapid';
      scene.add(line);
    }

    // Render tool change markers (spheres)
    group.toolChanges.forEach((pt) => {
      const markerSize = options.toolChangeMarkerSize || 1.0;
      const geometry = new THREE.SphereGeometry(markerSize, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color,
        opacity: 0.8,
        transparent: true,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(pt.x, pt.z, pt.y);
      sphere.userData.isToolChange = true;
      sphere.userData.toolIndex = toolIndex;
      scene.add(sphere);
    });
  });
}

/**
 * Calculate toolpath statistics by tool
 * @param {Array} points - Toolpath points
 * @returns {object} Statistics including distances and tool changes
 */
export function calculateToolpathStats(points) {
  if (!points || points.length === 0) {
    return { toolChanges: 0, toolDistances: new Map(), totalDistance: 0 };
  }

  const toolDistances = new Map();
  let toolChanges = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (curr.type === 'tool-change') {
      toolChanges++;
      continue;
    }

    const tool = curr.tool ?? 0;
    const dist = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2) + Math.pow(curr.z - prev.z, 2)
    );

    toolDistances.set(tool, (toolDistances.get(tool) || 0) + dist);
  }

  const totalDistance = Array.from(toolDistances.values()).reduce((a, b) => a + b, 0);

  return { toolChanges, toolDistances, totalDistance };
}

export default { renderMultiToolToolpath, calculateToolpathStats };
