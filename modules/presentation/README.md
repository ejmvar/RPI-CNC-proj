# Presentation Module (scaffold)

Purpose: visualization helpers for Three.js (or alternate renderers). Keep code that manipulates scenes, cameras, and meshes here.

Starter items:
- `three-helper.js` — utilities to create scene, camera, renderer and common meshes.
- `controls.js` — wrapper to add orbit controls or touch controls.

Current (Phase 2) status
- `three-helper.mjs` and browser wrapper `Simulator/web/js/three-helper.mjs` expose `initThreeJS(container, opts)` which returns { scene, camera, renderer, tool, material, materialGeometry }.
- `controls.mjs` and browser wrapper `Simulator/web/js/controls.mjs` expose `createSimpleOrbitControls({camera, domElement, target})` — a lightweight pointer/wheel control for rotating and zooming the camera.

Usage examples
- In `front.html` we import the browser wrappers and expose them on window.THREE_HELPER and window.THREE_CONTROLS.
- Call `initThreeJS(container, opts)` to create the Three.js scene and `createSimpleOrbitControls` to attach pointer controls to the renderer canvas.

Testing
- Unit tests for three-helper and controls are under `tests/ut/presentation/` and are run with `npm test`.

If you add files referenced from `Simulator/web/front.html`, prefer `type="module"` and document how to include them.
