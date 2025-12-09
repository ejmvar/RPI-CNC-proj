// Lightweight camera control helpers for the simulator.
// This is intentionally small — it provides simple orbit-like behavior without external dependencies.

export function createSimpleOrbitControls({ camera, domElement, target = { x: 0, y: 0, z: 0 } } = {}) {
  if (!camera) throw new Error('camera required');
  if (!domElement) throw new Error('domElement required');

  let isPointerDown = false;
  let startX = 0, startY = 0;
  let yaw = 0, pitch = 0; // in radians
  const radius = Math.hypot(camera.position.x - target.x, camera.position.y - target.y, camera.position.z - target.z) || 30;

  function updateCamera() {
    // spherical coordinates
    const r = radius;
    const x = target.x + r * Math.cos(pitch) * Math.sin(yaw);
    const z = target.z + r * Math.cos(pitch) * Math.cos(yaw);
    const y = target.y + r * Math.sin(pitch);
    camera.position.set(x, y, z);
    camera.lookAt(target.x, target.y, target.z);
  }

  function onPointerDown(e) {
    isPointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
    domElement.setPointerCapture && domElement.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isPointerDown) return;
    const dx = (e.clientX - startX) * 0.01;
    const dy = (e.clientY - startY) * 0.01;
    startX = e.clientX; startY = e.clientY;
    yaw += dx;
    pitch = Math.max(Math.min(pitch + dy, Math.PI/2 - 0.01), -Math.PI/2 + 0.01);
    updateCamera();
  }

  function onPointerUp(e) {
    isPointerDown = false;
    domElement.releasePointerCapture && domElement.releasePointerCapture(e.pointerId);
  }

  function onWheel(e) {
    e.preventDefault();
    // zoom in/out by moving camera along vector to target
    const dir = { x: target.x - camera.position.x, y: target.y - camera.position.y, z: target.z - camera.position.z };
    const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
    const norm = { x: dir.x/len, y: dir.y/len, z: dir.z/len };
    const delta = e.deltaY * 0.01;
    camera.position.set(camera.position.x + norm.x * delta, camera.position.y + norm.y * delta, camera.position.z + norm.z * delta);
    camera.lookAt(target.x, target.y, target.z);
  }

  function attach() {
    domElement.addEventListener('pointerdown', onPointerDown);
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });
  }

  function detach() {
    domElement.removeEventListener('pointerdown', onPointerDown);
    domElement.removeEventListener('pointermove', onPointerMove);
    domElement.removeEventListener('pointerup', onPointerUp);
    domElement.removeEventListener('wheel', onWheel);
  }

  return { attach, detach, updateCamera };
}

export default { createSimpleOrbitControls };
