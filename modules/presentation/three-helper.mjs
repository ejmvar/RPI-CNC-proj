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

export default { initThreeJS, createSceneDefaults };
