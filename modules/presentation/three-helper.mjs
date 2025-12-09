// ES module: presentation helper for Three.js initialization
// This module exports helper factory functions but does not assume a DOM until functions are called.

export function createSceneDefaults() {
  return {
    background: 0x1f2937,
    cameraFov: 75,
    near: 0.1,
    far: 1000
  };
}

// initThreeJS(containerElement)
// - requires a global THREE available in the browser
// - returns { scene, camera, renderer, tool, material, materialGeometry }
export function initThreeJS(containerEl, opts = {}) {
  if (typeof containerEl === 'string') containerEl = document.querySelector(containerEl);
  if (!containerEl) throw new Error('initThreeJS requires a container element');
  if (typeof THREE === 'undefined') throw new Error('THREE is not available (include three.js in the page)');

  const defaults = createSceneDefaults();
  const cfg = Object.assign({}, defaults, opts);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.background);

  const camera = new THREE.PerspectiveCamera(cfg.cameraFov, containerEl.clientWidth / containerEl.clientHeight, cfg.near, cfg.far);
  camera.position.set(20, 30, 40);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
  containerEl.appendChild(renderer.domElement);

  // Workspace dims
  const WORKSPACE_SIZE = opts.WORKSPACE_SIZE ?? 50;
  const WORKSPACE_HEIGHT = opts.WORKSPACE_HEIGHT ?? 10;

  const floorGeometry = new THREE.BoxGeometry(WORKSPACE_SIZE, WORKSPACE_HEIGHT, WORKSPACE_SIZE);
  const materialGeometry = new THREE.MeshPhongMaterial({ color: 0x6b7280, transparent: true, opacity: 0.8 });
  const material = new THREE.Mesh(floorGeometry, materialGeometry);
  material.position.y = -WORKSPACE_HEIGHT / 2;
  scene.add(material);

  const axesHelper = new THREE.AxesHelper(WORKSPACE_SIZE * 1.5);
  scene.add(axesHelper);

  const toolGeometry = new THREE.SphereGeometry(1, 32, 32);
  const toolMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const tool = new THREE.Mesh(toolGeometry, toolMaterial);
  tool.position.set(0, 0, 0);
  scene.add(tool);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(50, 50, 50);
  scene.add(directionalLight);

  // return internals for caller to wire animation, control or resize
  return { scene, camera, renderer, tool, material, materialGeometry };
}

// Creates a small 3D marker attached to the provided tool and an HTML overlay
// that displays the current position coordinates. Returns an object with
// update(position) and remove() helpers.
export function createPositionIndicator(containerEl, scene, tool, opts = {}) {
  if (typeof containerEl === 'string') containerEl = document.querySelector(containerEl);
  if (!containerEl) throw new Error('container element required');
  if (!scene) throw new Error('scene required');
  if (!tool) throw new Error('tool required');

  const cfg = Object.assign({ color: 0x00ff00, textBg: 'rgba(0,0,0,0.6)', textColor: '#fff' }, opts);

  // Create DOM overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.right = '8px';
  overlay.style.top = '8px';
  overlay.style.minWidth = '140px';
  overlay.style.padding = '6px 8px';
  overlay.style.borderRadius = '6px';
  overlay.style.background = cfg.textBg;
  overlay.style.color = cfg.textColor;
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '12px';
  overlay.style.zIndex = '1000';
  overlay.innerText = 'X: 0.00 Y: 0.00 Z: 0.000';
  // Ensure container is positioned for absolute children
  let computed = { position: 'static' };
  try {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') computed = window.getComputedStyle(containerEl);
    else if (typeof global !== 'undefined' && typeof global.getComputedStyle === 'function') computed = global.getComputedStyle(containerEl);
  } catch (ex) { /* ignore and use default */ }
  if (computed.position === 'static' || !computed.position) containerEl.style.position = 'relative';
  containerEl.appendChild(overlay);

  // Create a small marker and attach to tool so it follows its movements
  let marker = null;
  try {
    const geom = new THREE.SphereGeometry(0.35, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: cfg.color });
    marker = new THREE.Mesh(geom, mat);
    marker.name = 'position-indicator-3d';
    // defensive: some runtimes (tests) mock Mesh without a position.set helper
    if (!marker.position) marker.position = { set: (x, y, z) => { marker._pos=[x,y,z]; } };
    if (typeof marker.position.set === 'function') marker.position.set(0, 1.2, 0);
    if (tool && typeof tool.add === 'function') tool.add(marker);
  } catch (err) {
    // if WebGL/three is not present or geometry fails, continue without marker
    marker = null;
  }

  function update(position = { x: 0, y: 0, z: 0 }) {
    const x = (position.x ?? 0).toFixed(2);
    const y = (position.y ?? 0).toFixed(2);
    const z = (position.z ?? 0).toFixed(3);
    overlay.innerText = `X: ${x} Y: ${y} Z: ${z}`;

    // If marker is attached, we'll keep it offset slightly above the tool
    if (marker) {
      // the marker is parented to the tool so moving the tool is enough; the
      // marker remains at its relative offset. If the API wants to tweak
      // offset based on Z we could do it here.
      // Ensure marker visibility based on tool position
      marker.visible = true;
    }
  }

  function remove() {
    try { overlay.remove(); } catch (e) { /* ignore */ }
    if (marker && marker.parent) marker.parent.remove(marker);
  }

  // return a lightweight control object
  return { overlay, marker, update, remove };
}

export default { initThreeJS, createSceneDefaults };
