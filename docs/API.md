# API Documentation

Complete API reference for the CNC Simulator project.

## Table of Contents

- [Backend API](#backend-api)
  - [Authentication](#authentication)
  - [Files](#files)
  - [Folders](#folders)
  - [Users](#users)
  - [WebSocket](#websocket)
- [Frontend Modules](#frontend-modules)
  - [G-Code Parser](#gcode-parser)
  - [G-Code Transform](#gcode-transform)
  - [Three.js Helper](#threejs-helper)
  - [Theme Manager](#theme-manager)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [User Preferences](#user-preferences)
  - [Camera Bookmarks](#camera-bookmarks)
  - [Measurement Tools](#measurement-tools)
  - [Viewport Manager](#viewport-manager)
  - [Screenshot Exporter](#screenshot-exporter)
  - [Performance Monitor](#performance-monitor)
  - [WebGL Optimizer](#webgl-optimizer)
  - [PWA Installer](#pwa-installer)

---

## Backend API

Base URL: `http://localhost:3000` (development)

All API endpoints require authentication unless otherwise noted.

### Authentication

#### POST /api/auth/register

Register a new user account.

**Request Body:**

```json
{
  "username": "string (3-50 chars)",
  "email": "string (valid email)",
  "password": "string (min 8 chars)"
}
```

**Response:** `201 Created`

```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "created_at": "ISO8601 timestamp"
  },
  "token": "JWT token"
}
```

**Errors:**

- `400` - Validation error (username/email taken, weak password)
- `500` - Server error

---

#### POST /api/auth/login

Login with existing credentials.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`

```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  },
  "token": "JWT token"
}
```

**Errors:**

- `401` - Invalid credentials
- `500` - Server error

---

#### GET /api/auth/me

Get current user information.

**Headers:**

```
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "created_at": "ISO8601 timestamp"
}
```

**Errors:**

- `401` - Unauthorized (missing/invalid token)

---

### Files

#### GET /api/files

List user's G-Code files with filtering and pagination.

**Query Parameters:**

- `limit` (number, default: 50) - Results per page
- `offset` (number, default: 0) - Skip results
- `folderId` (uuid, optional) - Filter by folder
- `tags` (string, optional) - Comma-separated tags
- `isPublic` (boolean, optional) - Filter by public/private

**Response:** `200 OK`

```json
{
  "files": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "folder_id": "uuid | null",
      "filename": "string",
      "description": "string | null",
      "content": "string (G-Code)",
      "tags": ["string"],
      "is_public": "boolean",
      "version": "number",
      "file_size_bytes": "number",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

---

#### GET /api/files/search

Search files by filename or description.

**Query Parameters:**

- `q` (string, required) - Search query
- `limit` (number, default: 50)
- `offset` (number, default: 0)

**Response:** `200 OK` (same structure as GET /api/files)

---

#### GET /api/files/stats

Get user's file statistics.

**Response:** `200 OK`

```json
{
  "file_count": "number",
  "total_size_bytes": "number",
  "last_upload_at": "ISO8601 | null"
}
```

---

#### GET /api/files/:id

Get a specific file by ID.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "folder_id": "uuid | null",
  "filename": "string",
  "description": "string | null",
  "content": "string",
  "tags": ["string"],
  "is_public": "boolean",
  "version": "number",
  "file_size_bytes": "number",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

**Errors:**

- `404` - File not found
- `403` - Access denied (not owner and not public)

---

#### POST /api/files

Create a new G-Code file.

**Request Body:**

```json
{
  "filename": "string (required)",
  "content": "string (required, G-Code)",
  "description": "string (optional)",
  "folderId": "uuid (optional)",
  "tags": ["string"] (optional),
  "isPublic": "boolean (optional, default: false)"
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "filename": "string",
  "version": 1,
  "created_at": "ISO8601"
}
```

**Errors:**

- `400` - Validation error
- `500` - Server error

---

#### PUT /api/files/:id

Update file metadata (filename, description, tags, isPublic).

**Request Body:**

```json
{
  "filename": "string (optional)",
  "description": "string (optional)",
  "folderId": "uuid (optional)",
  "tags": ["string"] (optional),
  "isPublic": "boolean (optional)"
}
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "updated_at": "ISO8601"
}
```

**Errors:**

- `404` - File not found
- `403` - Not owner

---

#### PUT /api/files/:id/content

Update file content (creates new version).

**Request Body:**

```json
{
  "content": "string (required, G-Code)"
}
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "version": "number (incremented)",
  "updated_at": "ISO8601"
}
```

---

#### GET /api/files/:id/versions

Get version history for a file.

**Response:** `200 OK`

```json
{
  "versions": [
    {
      "version": "number",
      "content": "string",
      "file_size_bytes": "number",
      "created_at": "ISO8601"
    }
  ]
}
```

---

#### DELETE /api/files/:id

Soft delete a file (sets deleted_at timestamp).

**Response:** `200 OK`

```json
{
  "message": "File deleted successfully"
}
```

**Errors:**

- `404` - File not found
- `403` - Not owner

---

#### POST /api/files/:id/duplicate

Duplicate a file.

**Response:** `201 Created`

```json
{
  "id": "uuid (new file)",
  "filename": "string (Copy of ...)",
  "created_at": "ISO8601"
}
```

---

### Folders

#### GET /api/folders

List user's folders.

**Query Parameters:**

- `parentId` (uuid, optional) - Filter by parent folder

**Response:** `200 OK`

```json
{
  "folders": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "parent_folder_id": "uuid | null",
      "name": "string",
      "path": "string (parent/child/grandchild)",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}
```

---

#### GET /api/folders/tree

Get full folder hierarchy as tree structure.

**Response:** `200 OK`

```json
{
  "tree": [
    {
      "id": "uuid",
      "name": "string",
      "path": "string",
      "children": [
        {
          "id": "uuid",
          "name": "string",
          "path": "string",
          "children": []
        }
      ]
    }
  ]
}
```

---

#### GET /api/folders/:id

Get a specific folder.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "parent_folder_id": "uuid | null",
  "name": "string",
  "path": "string",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

#### POST /api/folders

Create a new folder.

**Request Body:**

```json
{
  "name": "string (required)",
  "parentFolderId": "uuid (optional)"
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "name": "string",
  "path": "string",
  "created_at": "ISO8601"
}
```

---

#### PUT /api/folders/:id

Rename a folder.

**Request Body:**

```json
{
  "name": "string (required)"
}
```

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "string",
  "path": "string (updated)",
  "updated_at": "ISO8601"
}
```

---

#### DELETE /api/folders/:id

Delete a folder.

**Response:** `200 OK`

```json
{
  "message": "Folder deleted successfully"
}
```

**Note:** Consider implementing cascade delete or preventing deletion of non-empty folders.

---

### WebSocket

**Connection URL:** `ws://localhost:3000`

#### Authentication

Send token as first message after connection:

```json
{
  "type": "authenticate",
  "token": "JWT token"
}
```

**Response:**

```json
{
  "type": "authenticated",
  "userId": "uuid"
}
```

---

#### Join Room

Join a collaborative editing session:

```json
{
  "type": "join",
  "roomId": "string"
}
```

**Broadcast to room:**

```json
{
  "type": "user_joined",
  "userId": "uuid",
  "username": "string",
  "roomId": "string"
}
```

---

#### Send Cursor Position

Share cursor position with room:

```json
{
  "type": "cursor",
  "position": {
    "x": "number",
    "y": "number",
    "z": "number"
  }
}
```

**Broadcast:**

```json
{
  "type": "cursor_update",
  "userId": "uuid",
  "username": "string",
  "position": { "x": 0, "y": 0, "z": 0 }
}
```

---

#### Send G-Code Edit

Share G-Code changes:

```json
{
  "type": "edit",
  "content": "string (G-Code)",
  "cursor": { "line": 0, "column": 0 }
}
```

**Broadcast:**

```json
{
  "type": "edit_received",
  "userId": "uuid",
  "username": "string",
  "content": "string",
  "cursor": { "line": 0, "column": 0 }
}
```

---

#### Leave Room

Leave collaborative session:

```json
{
  "type": "leave"
}
```

**Broadcast:**

```json
{
  "type": "user_left",
  "userId": "uuid",
  "username": "string"
}
```

---

## Frontend Modules

### G-Code Parser

**Module:** `modules/gcode/parser.mjs` (Node.js) or `Simulator/web/js/gcode-parser.mjs` (Browser)

#### parseGCode(gcodeText)

Parse G-Code text into structured commands.

**Parameters:**

- `gcodeText` (string) - Raw G-Code text

**Returns:** Array of command objects

```javascript
[
  {
    line: 1,
    command: 'G00',
    params: { X: 10, Y: 20, Z: 5 },
    comment: 'Rapid move',
    raw: 'G00 X10 Y20 Z5 ; Rapid move',
  },
];
```

**Example:**

```javascript
import { parseGCode } from './js/gcode-parser.mjs';

const gcode = `
G00 X10 Y20 Z5 ; Rapid move
G01 X15 Y25 F100 ; Linear move
`;

const commands = parseGCode(gcode);
console.log(commands.length); // 2
```

---

### G-Code Transform

**Module:** `modules/gcode/transform.mjs` or `Simulator/web/js/gcode-transform.mjs`

#### applyMeshCompensation(commands, mesh)

Apply mesh-based Z compensation to G-Code commands.

**Parameters:**

- `commands` (array) - Parsed G-Code commands
- `mesh` (object) - Mesh data with probe points

**Returns:** Modified commands array with Z adjustments

**Mesh Format:**

```javascript
{
  points: [
    { x: 0, y: 0, z: 0.05 },
    { x: 10, y: 0, z: 0.08 },
    // ...
  ],
  gridSize: { x: 5, y: 5 },
  bounds: { xMin: 0, xMax: 100, yMin: 0, yMax: 100 }
}
```

**Example:**

```javascript
import { applyMeshCompensation } from './js/gcode-transform.mjs';

const compensatedCommands = applyMeshCompensation(commands, mesh);
```

---

### Three.js Helper

**Module:** `Simulator/web/js/three-helper.mjs`

#### initScene(canvas, options)

Initialize Three.js scene with camera, renderer, and lighting.

**Parameters:**

- `canvas` (HTMLCanvasElement) - Canvas element
- `options` (object, optional):
  - `cameraPosition` (object) - `{ x, y, z }`
  - `backgroundColor` (number) - Hex color
  - `enableGrid` (boolean) - Show grid helper
  - `enableAxes` (boolean) - Show axes helper

**Returns:** Object

```javascript
{
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
}
```

**Example:**

```javascript
import { initScene } from './js/three-helper.mjs';

const { scene, camera, renderer } = initScene(canvas, {
  cameraPosition: { x: 50, y: 50, z: 50 },
  backgroundColor: 0x111827,
  enableGrid: true,
  enableAxes: true,
});
```

---

### Theme Manager

**Module:** `Simulator/web/js/theme-manager.mjs`

#### Class: ThemeManager

**Methods:**

##### init()

Initialize theme system (load saved theme or detect system preference).

```javascript
import ThemeManager from './js/theme-manager.mjs';

const themeManager = new ThemeManager();
themeManager.init();
```

##### setTheme(theme)

Set theme ('light' or 'dark').

```javascript
themeManager.setTheme('dark');
```

##### toggle()

Toggle between light and dark themes.

```javascript
themeManager.toggle();
```

**Events:**

- `themechange` - Fired when theme changes

```javascript
window.addEventListener('themechange', (e) => {
  console.log('New theme:', e.detail.theme);
});
```

---

### Keyboard Shortcuts

**Module:** `Simulator/web/js/keyboard-shortcuts.mjs`

#### Class: KeyboardShortcuts

**Methods:**

##### init()

Initialize keyboard shortcuts system.

```javascript
import KeyboardShortcuts from './js/keyboard-shortcuts.mjs';

const shortcuts = new KeyboardShortcuts();
shortcuts.init();
```

##### register(key, callback, description)

Register a new keyboard shortcut.

**Parameters:**

- `key` (string) - Key combination (e.g., 'Ctrl+S', 'Ctrl+Shift+D')
- `callback` (function) - Function to execute
- `description` (string) - Human-readable description

```javascript
shortcuts.register(
  'Ctrl+E',
  () => {
    console.log('Export triggered');
  },
  'Export G-Code'
);
```

##### showCommandPalette()

Open command palette (Ctrl+K by default).

```javascript
shortcuts.showCommandPalette();
```

**Default Shortcuts:**

- `Ctrl+S` - Save file
- `Ctrl+O` - Open file
- `Ctrl+N` - New file
- `Ctrl+K` - Command palette
- `Ctrl+/` - Show shortcuts help
- `Space` - Play/pause simulation
- `R` - Reset simulation
- `Ctrl+1/2/3` - Camera views (top/front/side)
- `Ctrl+0` - Reset camera
- `Escape` - Close modals

---

### User Preferences

**Module:** `Simulator/web/js/user-preferences.mjs`

#### Class: UserPreferences

**Methods:**

##### init()

Initialize preferences system (load from localStorage).

```javascript
import UserPreferences from './js/user-preferences.mjs';

const prefs = new UserPreferences();
prefs.init();
```

##### get(key)

Get preference value.

```javascript
const showGrid = prefs.get('gridVisible'); // boolean
```

##### set(key, value)

Set preference value (auto-saves).

```javascript
prefs.set('animationSpeed', 2.0);
```

##### reset()

Reset all preferences to defaults.

```javascript
prefs.reset();
```

##### addRecentFile(id, filename)

Add file to recent files list (max 10).

```javascript
prefs.addRecentFile('uuid-123', 'part-001.gcode');
```

**Preference Keys:**

- `gridVisible` (boolean)
- `axesVisible` (boolean)
- `showFPS` (boolean)
- `animationSpeed` (number, 0.1-5)
- `cameraSpeed` (number, 0.1-3)
- `autoSave` (boolean)
- `enableSound` (boolean)
- `language` (string)
- `recentFiles` (array)

**Events:**

- `preferenceschange` - Fired when preferences change

---

### Camera Bookmarks

**Module:** `Simulator/web/js/camera-bookmarks.mjs`

#### Class: CameraBookmarks

**Constructor:**

```javascript
import CameraBookmarks from './js/camera-bookmarks.mjs';

const bookmarks = new CameraBookmarks(camera, controls);
```

**Methods:**

##### saveBookmark(name)

Save current camera position.

**Parameters:**

- `name` (string) - Bookmark name

**Returns:** Bookmark ID (string)

```javascript
const id = bookmarks.saveBookmark('Front View');
```

##### restoreBookmark(id, animated = true)

Restore saved camera position.

**Parameters:**

- `id` (string) - Bookmark ID
- `animated` (boolean) - Animate transition (default: true)

```javascript
bookmarks.restoreBookmark(id, true); // Smooth 1s animation
```

##### deleteBookmark(id)

Delete a bookmark.

```javascript
bookmarks.deleteBookmark(id);
```

##### setPredefinedView(viewName)

Set camera to predefined view.

**View Names:** `'top'`, `'front'`, `'side'`, `'isometric'`

```javascript
bookmarks.setPredefinedView('top');
```

**Storage:** Bookmarks persisted to localStorage (max 10).

---

### Measurement Tools

**Module:** `Simulator/web/js/measurement-tools.mjs`

#### Class: MeasurementTools

**Constructor:**

```javascript
import MeasurementTools from './js/measurement-tools.mjs';

const tools = new MeasurementTools(scene, camera);
```

**Methods:**

##### activate(tool)

Activate measurement tool.

**Tool Types:** `'distance'`, `'angle'`

```javascript
tools.activate('distance');
// Click two points to measure distance
```

##### handleClick(intersect)

Process raycasted click point.

**Parameters:**

- `intersect` (object) - Three.js raycast intersection with `.point` property

```javascript
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObjects(scene.children);
if (intersects.length > 0) {
  tools.handleClick(intersects[0]);
}
```

##### clearAll()

Clear all measurements.

```javascript
tools.clearAll();
```

##### deleteMeasurement(id)

Delete specific measurement.

```javascript
tools.deleteMeasurement('measurement-id-123');
```

**Measurement Flow:**

1. Activate tool (`distance` or `angle`)
2. Click points (2 for distance, 3 for angle)
3. Measurement auto-completes and displays
4. Tool deactivates

---

### Viewport Manager

**Module:** `Simulator/web/js/viewport-manager.mjs`

#### Class: ViewportManager

**Constructor:**

```javascript
import ViewportManager from './js/viewport-manager.mjs';

const viewportMgr = new ViewportManager(camera);
```

**Methods:**

##### setupViewport(mode)

Configure viewport layout.

**Modes:** `'single'`, `'split-h'`, `'split-v'`, `'quad'`

```javascript
viewportMgr.setupViewport('quad');
```

##### render(renderer, scene, camera)

Render all viewports.

```javascript
function animate() {
  requestAnimationFrame(animate);
  viewportMgr.render(renderer, scene, camera);
}
```

**Viewport Layouts:**

- **single:** Full screen
- **split-h:** Horizontal split (top/bottom)
- **split-v:** Vertical split (left/right)
- **quad:** 2×2 grid (top/front/side/perspective)

---

### Screenshot Exporter

**Module:** `Simulator/web/js/screenshot-exporter.mjs`

#### Class: ScreenshotExporter

**Constructor:**

```javascript
import ScreenshotExporter from './js/screenshot-exporter.mjs';

const exporter = new ScreenshotExporter(renderer, scene, camera);
```

**Methods:**

##### downloadScreenshot(filename, format = 'png')

Download screenshot.

**Parameters:**

- `filename` (string, optional) - Custom filename (default: timestamp)
- `format` (string) - 'png' or 'jpg'

```javascript
exporter.downloadScreenshot('my-part.png', 'png');
```

##### downloadHighRes(scale = 2)

Download high-resolution screenshot.

**Parameters:**

- `scale` (number) - Resolution multiplier (2 = 2×, 4 = 4×)

```javascript
exporter.downloadHighRes(4); // 4K screenshot
```

##### copyToClipboard()

Copy screenshot to clipboard.

```javascript
await exporter.copyToClipboard();
```

##### exportSceneJSON()

Export scene as JSON (for debugging).

```javascript
exporter.exportSceneJSON();
```

---

### Performance Monitor

**Module:** `Simulator/web/js/performance-monitor.mjs`

#### Class: PerformanceMonitor

**Constructor:**

```javascript
import PerformanceMonitor from './js/performance-monitor.mjs';

const monitor = new PerformanceMonitor();
```

**Methods:**

##### init(options)

Initialize performance monitoring.

**Options:**

- `showOverlay` (boolean, default: true) - Display on-screen stats
- `sampleSize` (number, default: 60) - Frames to average
- `updateInterval` (number, default: 1000) - Update frequency (ms)

```javascript
monitor.init({
  showOverlay: true,
  sampleSize: 60,
  updateInterval: 500,
});
```

##### update(renderer)

Update metrics (call in animation loop).

**Parameters:**

- `renderer` (THREE.WebGLRenderer) - Three.js renderer

```javascript
function animate() {
  requestAnimationFrame(animate);
  monitor.update(renderer);
  renderer.render(scene, camera);
}
```

##### getReport()

Get performance report.

**Returns:** Object

```javascript
{
  fps: { current, average, min, max },
  frameTime: { current, average, min, max },
  memory: { current, average },
  rendering: { calls, triangles, drawCalls }
}
```

##### exportMetrics()

Export metrics to JSON file.

```javascript
monitor.exportMetrics(); // Downloads performance-<timestamp>.json
```

---

### WebGL Optimizer

**Module:** `Simulator/web/js/webgl-optimizer.mjs`

#### Class: WebGLOptimizer

**Constructor:**

```javascript
import { WebGLOptimizer } from './js/webgl-optimizer.mjs';

const optimizer = new WebGLOptimizer(renderer, scene);
```

**Methods:**

##### applyOptimizations()

Apply recommended renderer and scene optimizations.

```javascript
optimizer.applyOptimizations();
```

##### enableInstancing(geometry, material, count, positions)

Create instanced mesh for repeated objects.

**Parameters:**

- `geometry` (THREE.BufferGeometry)
- `material` (THREE.Material)
- `count` (number) - Instance count
- `positions` (array) - Array of Vector3 positions

**Returns:** THREE.InstancedMesh

```javascript
const positions = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(10, 0, 0),
  // ...
];

const instancedMesh = optimizer.enableInstancing(geometry, material, positions.length, positions);
scene.add(instancedMesh);
```

##### disposeObject(object)

Properly dispose of Three.js object (geometry, material, textures).

```javascript
scene.remove(mesh);
optimizer.disposeObject(mesh);
```

##### getReport()

Get optimization report and recommendations.

**Returns:** Object with memory stats, render stats, and recommendations array

```javascript
const report = optimizer.getReport();
console.log(report.recommendations);
```

---

### PWA Installer

**Module:** `Simulator/web/js/pwa-installer.mjs`

#### Class: PWAInstaller

**Constructor:**

```javascript
import PWAInstaller from './js/pwa-installer.mjs';

const installer = new PWAInstaller();
```

**Methods:**

##### init()

Initialize PWA installer (registers service worker, attaches listeners).

```javascript
installer.init();
```

##### install()

Trigger PWA installation prompt.

```javascript
document.getElementById('install-btn').addEventListener('click', () => {
  installer.install();
});
```

**Properties:**

- `isStandalone` (boolean) - App running as PWA
- `isInstalled` (boolean) - App installed

**Events:**

- `beforeinstallprompt` - Browser install prompt available
- `appinstalled` - App successfully installed

---

## Error Codes

### HTTP Status Codes

- `200` - OK (successful request)
- `201` - Created (resource created)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

### WebSocket Error Codes

- `1000` - Normal closure
- `1001` - Going away (server shutdown)
- `1003` - Unsupported data
- `1006` - Abnormal closure
- `1008` - Policy violation (auth failed)
- `1011` - Internal error

---

## Rate Limiting

**Not yet implemented.** Consider for Phase 10.3.

Recommended limits:

- Authentication: 5 requests/minute
- File operations: 100 requests/minute
- WebSocket connections: 10 concurrent per user

---

## Versioning

**Current Version:** v1.0.0

API follows semantic versioning:

- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes

---

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/rpi-cnc-proj/issues)
- Documentation: [Full docs](https://github.com/yourusername/rpi-cnc-proj/tree/main/docs)
- Examples: See `Simulator/web/*-demo.html` files

---

**Last Updated:** December 16, 2025
