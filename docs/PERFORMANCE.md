# Performance Optimization Guide

This document describes the performance optimization features implemented in Phase 9.6 of the CNC Simulator project.

## Overview

Phase 9.6 focuses on optimizing application performance through:

- Service Worker for offline support and caching
- Progressive Web App (PWA) features
- Real-time performance monitoring
- WebGL rendering optimizations
- Lazy loading strategies

## Features

### 1. Service Worker (`service-worker.js`)

**Purpose:** Provides offline support and resource caching for improved load times and reliability.

**Key Features:**

- Static resource caching (HTML, CSS, JS, Three.js)
- Runtime caching for dynamic content
- Cache-first strategy with background updates
- Automatic cache versioning and cleanup
- Background sync support (future)
- Push notification support (future)

**Usage:**

```javascript
// Service worker registers automatically
// Check registration status
navigator.serviceWorker.ready.then((registration) => {
  console.log('Service Worker ready:', registration.scope);
});

// Force update
navigator.serviceWorker.getRegistration().then((reg) => {
  reg.update();
});

// Clear cache
navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
```

**Cache Strategy:**

- **Static resources:** Cache-first with background update
- **API calls:** Network-first (always fetch fresh)
- **WebSocket:** Skip caching
- **Offline fallback:** Show offline.html if available

### 2. PWA Manifest (`manifest.json`)

**Purpose:** Enables installation as a native-like app on supported devices.

**Features:**

- App metadata (name, description, icons)
- Standalone display mode (no browser UI)
- Theme customization (#6366f1 primary color)
- Dark mode support (#111827 background)
- Shortcuts for quick access
- File handler for .gcode files
- Share target for receiving G-Code files

**Installation:**

- Chrome/Edge: "Install app" button in address bar
- iOS Safari: "Add to Home Screen"
- Android: "Add to Home screen" prompt

**Icons Required:**
Place in `Simulator/web/icons/`:

- icon-72.png through icon-512.png (various sizes)
- icon-maskable-192.png, icon-maskable-512.png (adaptive icons)
- shortcut-simulator.png, shortcut-files.png (96x96)

### 3. Performance Monitor (`performance-monitor.mjs`)

**Purpose:** Real-time tracking and reporting of application performance metrics.

**Metrics Tracked:**

- **FPS:** Frames per second (current, average, min, max)
- **Frame Time:** Milliseconds per frame
- **Memory:** JavaScript heap usage (MB)
- **Draw Calls:** Number of render calls per frame
- **Triangles:** Total triangle count rendered

**Usage:**

```javascript
import PerformanceMonitor from './js/performance-monitor.mjs';

const monitor = new PerformanceMonitor();
monitor.init({
  showOverlay: true, // Display on-screen stats
  sampleSize: 60, // Number of frames to average
  updateInterval: 1000, // Update display every 1s
});

// In animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update metrics
  monitor.update(renderer);

  // Render scene
  renderer.render(scene, camera);
}

// Get performance report
const report = monitor.getReport();
console.log('Average FPS:', report.fps.average);

// Export metrics to JSON file
monitor.exportMetrics();
```

**UI Overlay:**

- Position: Top-right (230px from top)
- Displays: FPS, frame time, memory, calls, triangles
- Color-coded FPS: Green (>55), Yellow (30-55), Red (<30)
- Collapsible with close button

### 4. WebGL Optimizer (`webgl-optimizer.mjs`)

**Purpose:** Apply best practices for Three.js rendering optimization.

**Optimization Techniques:**

#### Renderer Settings

```javascript
import { WebGLOptimizer } from './js/webgl-optimizer.mjs';

const optimizer = new WebGLOptimizer(renderer, scene);
optimizer.applyOptimizations();
```

**Applied optimizations:**

- Pixel ratio capped at 2 (balance quality/performance)
- Logarithmic depth buffer for large scenes
- Object sorting for optimal render order
- Frustum culling enabled on all meshes

#### Geometry Instancing

For repeated objects (e.g., grid points, markers):

```javascript
const positions = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 0, 0),
  // ... many more positions
];

const instancedMesh = optimizer.enableInstancing(geometry, material, positions.length, positions);
scene.add(instancedMesh);
```

Benefits: Single draw call instead of N draw calls.

#### Geometry Merging

Combine static geometries to reduce draw calls:

```javascript
const geometries = [mesh1.geometry, mesh2.geometry, mesh3.geometry];
const mergedGeometry = optimizer.mergeGeometries(geometries);
const mergedMesh = new THREE.Mesh(mergedGeometry, material);
```

#### Resource Disposal

Properly clean up unused resources:

```javascript
// Remove object and free memory
scene.remove(mesh);
optimizer.disposeObject(mesh);
```

#### Optimization Report

```javascript
const report = optimizer.getReport();
console.log(report);
// {
//   memory: { geometries: 125, textures: 8 },
//   render: { calls: 42, triangles: 150000 },
//   programs: 5,
//   recommendations: [...]
// }
```

**Recommendations provided:**

- High draw call count (>100) → Use instancing/merging
- High geometry count (>1000) → Implement LOD
- Many textures (>100) → Use texture atlases
- High triangle count (>1M) → Simplify models

### 5. PWA Installer (`pwa-installer.mjs`)

**Purpose:** Manage Progressive Web App installation and offline capabilities.

**Features:**

#### Installation Management

```javascript
import PWAInstaller from './js/pwa-installer.mjs';

const installer = new PWAInstaller();
installer.init();

// Manually trigger install
document.getElementById('install-btn').addEventListener('click', () => {
  installer.install();
});
```

#### Install Prompt

Automatically shows when:

- Not running in standalone mode
- Not already installed
- Browser supports installation
- `beforeinstallprompt` event fired

Prompt includes:

- App icon and description
- "Install" button
- "Not now" dismiss button

#### Offline Detection

Shows banner when offline:

- Top banner: "📡 You are offline. Some features may be unavailable."
- Hides automatically when back online
- Persists across page navigation

#### Update Notification

Prompts user when new version available:

- Detects service worker update
- Shows reload confirmation
- Activates new version on confirm

**Event Handling:**

```javascript
// App installed
window.addEventListener('appinstalled', () => {
  console.log('App installed successfully');
});

// Display mode check
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
console.log('Running as PWA:', isStandalone);
```

### 6. Lazy Loading

**Strategy:** Load non-critical modules on demand.

```javascript
import { LazyLoader } from './js/webgl-optimizer.mjs';

const loader = new LazyLoader();

// Load module when needed
async function openFileLibrary() {
  const { FileLibraryUI } = await loader.load('./js/file-library-ui.mjs');
  const library = new FileLibraryUI();
  library.show();
}

// Preload critical modules
await loader.preload(['./js/theme-manager.mjs', './js/keyboard-shortcuts.mjs']);
```

**Benefits:**

- Smaller initial bundle size
- Faster page load time
- Loads features only when needed

## Performance Budgets

**Target Metrics:**

- **Initial Load:** <3 seconds on 3G
- **Time to Interactive:** <5 seconds
- **First Contentful Paint:** <1.5 seconds
- **FPS:** 60 fps minimum
- **Memory:** <100 MB for core features
- **Bundle Size:** <500 KB (gzipped)

**Monitoring:**

```bash
# Check bundle size
npm run build:analyze

# Run Lighthouse audit
npm run lighthouse

# Check performance in tests
npm run test:performance
```

## Best Practices

### 1. Renderer Configuration

```javascript
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: window.devicePixelRatio < 2, // Only on low-DPI
  powerPreference: 'high-performance',
  preserveDrawingBuffer: false, // True only if screenshots needed
  alpha: false, // Opaque background is faster
});
```

### 2. Geometry Optimization

```javascript
// Use BufferGeometry (not Geometry)
const geometry = new THREE.BufferGeometry();

// Dispose when done
geometry.dispose();

// Merge static geometries
const merged = BufferGeometryUtils.mergeBufferGeometries([geo1, geo2]);
```

### 3. Material Optimization

```javascript
// Reuse materials
const sharedMaterial = new THREE.MeshStandardMaterial({ color: 0x6366f1 });
const mesh1 = new THREE.Mesh(geo1, sharedMaterial);
const mesh2 = new THREE.Mesh(geo2, sharedMaterial);

// Use simpler materials when possible
const basicMaterial = new THREE.MeshBasicMaterial(); // Faster than Standard
```

### 4. Texture Optimization

```javascript
// Compress textures
texture.format = THREE.RGBFormat; // Not RGBA if no transparency

// Use mipmaps
texture.generateMipmaps = true;

// Set appropriate filter
texture.minFilter = THREE.LinearMipmapLinearFilter;
```

### 5. Scene Management

```javascript
// Enable frustum culling
mesh.frustumCulled = true;

// Use Layers for selective rendering
camera.layers.enable(1);
mesh.layers.set(1);

// Remove invisible objects
if (!mesh.visible) {
  scene.remove(mesh);
}
```

## Demo Page

**Location:** `Simulator/web/performance-demo.html`

**Features:**

- 125 animated cubes (stress test)
- Real-time FPS monitoring
- WebGL optimization demonstration
- PWA installation prompt
- Export metrics functionality

**Run:**

```bash
cd Simulator/web
python3 -m http.server 8000
# Open: http://localhost:8000/performance-demo.html
```

## Browser Support

**Service Worker:**

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: 11.1+ (limited)
- iOS Safari: 11.3+

**PWA Installation:**

- Chrome/Edge: Full support
- Firefox: Limited (no install prompt)
- Safari: Add to Home Screen only
- iOS Safari: Add to Home Screen

**Performance API:**

- All modern browsers
- `performance.memory` Chrome-only

## Troubleshooting

### Service Worker Not Updating

```javascript
// Force update in console
navigator.serviceWorker.getRegistration().then((reg) => {
  reg.unregister();
  window.location.reload();
});
```

### Cache Issues

```javascript
// Clear all caches
caches.keys().then((names) => {
  names.forEach((name) => caches.delete(name));
});
```

### Poor Performance

1. Check FPS in performance monitor
2. Review WebGL optimizer recommendations
3. Reduce geometry complexity
4. Enable instancing for repeated objects
5. Check browser console for warnings

### Memory Leaks

1. Dispose geometries/materials when removing
2. Remove event listeners
3. Clear intervals/timeouts
4. Check Three.js memory stats

## Future Improvements

**Phase 9.6 Remaining:**

- Bundle size analysis
- Code splitting implementation
- Lighthouse CI integration
- Performance tests

**Phase 10:**

- CDN integration
- Image optimization
- Lazy image loading
- Resource hints (preload, prefetch)

## References

- [Web.dev Performance](https://web.dev/performance/)
- [Three.js Performance Tips](https://threejs.org/docs/#manual/en/introduction/Performance-tips)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
