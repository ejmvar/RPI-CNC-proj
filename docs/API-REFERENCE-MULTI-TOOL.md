# Multi-Tool API Reference

**Version:** 1.0  
**Target Audience:** Developers integrating or extending the multi-tool feature  
**Last Updated:** December 14, 2024

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tool Library API](#tool-library-api)
3. [G-Code Parser Extensions](#g-code-parser-extensions)
4. [Renderer API](#renderer-api)
5. [State Management](#state-management)
6. [Integration Guide](#integration-guide)
7. [Testing API](#testing-api)

---

## Architecture Overview

The multi-tool feature is implemented across several modules:

```
modules/
├── gcode/
│   ├── parser.mjs          # Core G-Code parser
│   ├── toolpath.mjs        # Tool-aware toolpath generation
│   └── transform.mjs       # Mesh compensation with tool support
├── presentation/
│   ├── toolpath-renderer.mjs  # Multi-tool visualization
│   └── mesh.mjs            # Mesh utilities (tool-aware)
└── Simulator/web/
    └── front.html          # UI integration + ToolLibrary class
```

### Data Flow

```
User Input (G-Code + Tool Definitions)
         ↓
    Parser.mjs (parse commands, extract tool changes)
         ↓
    Toolpath.mjs (generate segments with tool metadata)
         ↓
    Transform.mjs (apply mesh compensation per tool)
         ↓
    Renderer.mjs (visualize color-coded toolpaths)
         ↓
    Three.js Scene (display to user)
```

---

## Tool Library API

### Class: `ToolLibrary`

**Location:** `Simulator/web/front.html` (lines ~50-150)

Manages tool definitions, persistence, and queries.

#### Constructor

```javascript
const toolLibrary = new ToolLibrary();
```

No parameters. Automatically loads from localStorage if available.

---

#### Method: `addTool(tool)`

Add a new tool to the library.

**Parameters:**

- `tool` (Object): Tool definition
  - `name` (string): Display name
  - `diameter` (number): Tool diameter in mm
  - `color` (string): Hex color code (e.g., "#ff0000")
  - `zOffset` (number): Tool length offset in mm
  - `speed` (number): Feed rate (mm/min) or spindle speed (RPM)
  - `temperature` (number, optional): Extruder temperature in °C

**Returns:** `number` - Tool ID (auto-generated)

**Example:**

```javascript
const toolId = toolLibrary.addTool({
  name: 'PLA Red',
  diameter: 0.4,
  color: '#ff0000',
  zOffset: 0,
  speed: 200,
  temperature: 210,
});
console.log('Tool added with ID:', toolId); // e.g., 0
```

**Notes:**

- Tool IDs start at 0 and increment
- ID cannot be manually specified
- Duplicate names are allowed
- Color must be valid hex format

---

#### Method: `getTool(toolId)`

Retrieve a tool by ID.

**Parameters:**

- `toolId` (number): Tool identifier

**Returns:** `Object | null` - Tool definition or null if not found

**Example:**

```javascript
const tool = toolLibrary.getTool(0);
if (tool) {
  console.log(`Tool 0: ${tool.name} (${tool.diameter}mm)`);
} else {
  console.log('Tool 0 not found');
}
```

---

#### Method: `updateTool(toolId, updatedTool)`

Update an existing tool's properties.

**Parameters:**

- `toolId` (number): Tool identifier
- `updatedTool` (Object): Partial or complete tool definition

**Returns:** `boolean` - True if successful, false if tool not found

**Example:**

```javascript
const success = toolLibrary.updateTool(0, {
  name: 'PLA Red (0.4mm)', // Update name
  temperature: 215, // Update temperature
});
// Other properties (diameter, color, etc.) remain unchanged
```

**Notes:**

- Only provided properties are updated
- Tool ID cannot be changed
- Returns false if toolId doesn't exist

---

#### Method: `removeTool(toolId)`

Remove a tool from the library.

**Parameters:**

- `toolId` (number): Tool identifier

**Returns:** `boolean` - True if removed, false if not found

**Example:**

```javascript
if (toolLibrary.removeTool(5)) {
  console.log('Tool 5 removed');
} else {
  console.log('Tool 5 not found');
}
```

**Warning:** Removing a tool that's referenced in loaded G-Code will cause visualization issues. Remove tools only when no G-Code is loaded.

---

#### Method: `getAllTools()`

Get all tools in the library.

**Returns:** `Array<Object>` - Array of tool definitions

**Example:**

```javascript
const tools = toolLibrary.getAllTools();
console.log(`Total tools: ${tools.length}`);
tools.forEach((tool) => {
  console.log(`- ${tool.name} (ID ${tool.id})`);
});
```

**Notes:**

- Returns copy of tools, not live references
- Order is not guaranteed (use tool IDs for sorting)

---

#### Method: `saveToDisk()`

Export tool library as JSON file (browser download).

**Returns:** `void`

**Example:**

```javascript
// Trigger download of "tool-library.json"
toolLibrary.saveToDisk();
```

**File Format:**

```json
[
  {
    "id": 0,
    "name": "PLA Red",
    "diameter": 0.4,
    "color": "#ff0000",
    "zOffset": 0,
    "speed": 200,
    "temperature": 210
  }
]
```

---

#### Method: `loadFromDisk(file)`

Import tool library from JSON file.

**Parameters:**

- `file` (File): File object from input[type="file"]

**Returns:** `Promise<void>`

**Example:**

```javascript
document.getElementById('file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  try {
    await toolLibrary.loadFromDisk(file);
    console.log('Tool library loaded successfully');
  } catch (error) {
    console.error('Failed to load library:', error);
  }
});
```

**Throws:**

- `SyntaxError` if JSON is invalid
- `TypeError` if required fields are missing

---

#### Method: `saveToLocalStorage()`

Persist tool library to browser's localStorage.

**Returns:** `void`

**Example:**

```javascript
toolLibrary.addTool({ name: "New Tool", ... });
toolLibrary.saveToLocalStorage();
// Tool will persist across page reloads
```

**Storage Key:** `"toolLibrary"` (can be changed in constructor)

**Quota:** Typical limit is 5-10MB. See troubleshooting guide if QuotaExceededError occurs.

---

#### Method: `loadFromLocalStorage()`

Restore tool library from localStorage.

**Returns:** `boolean` - True if loaded, false if no data found

**Example:**

```javascript
const toolLibrary = new ToolLibrary();
if (toolLibrary.loadFromLocalStorage()) {
  console.log('Tools restored from previous session');
} else {
  console.log('No saved tools, starting fresh');
  toolLibrary.loadDefaults();
}
```

**Notes:**

- Called automatically in constructor
- Returns false if localStorage is empty or disabled
- Silently fails if JSON is corrupted (logs error)

---

### Presets

#### Method: `loadDefaults(preset)`

Load predefined tool configurations.

**Parameters:**

- `preset` (string): `"3d-printing"` or `"cnc-milling"`

**Returns:** `void`

**Example:**

```javascript
// Load 3D printing tools (PLA, PETG, TPU)
toolLibrary.loadDefaults('3d-printing');

// Load CNC tools (end mills, drill, v-bit)
toolLibrary.loadDefaults('cnc-milling');
```

**Presets:**

**3D Printing:**

```javascript
[
  { name: 'PLA Red', diameter: 0.4, color: '#ff0000', temperature: 210 },
  { name: 'PETG Blue', diameter: 0.4, color: '#0000ff', temperature: 240 },
  { name: 'TPU Black', diameter: 0.4, color: '#000000', temperature: 220 },
];
```

**CNC Milling:**

```javascript
[
  { name: '6mm End Mill', diameter: 6.0, color: '#ff8800', zOffset: -52.5, speed: 12000 },
  { name: '3mm End Mill', diameter: 3.0, color: '#00ff00', zOffset: -51.2, speed: 15000 },
  { name: '90° V-Bit', diameter: 1.0, color: '#0088ff', zOffset: -50.8, speed: 18000 },
];
```

---

## G-Code Parser Extensions

### Module: `parser.mjs`

**Location:** `modules/gcode/parser.mjs`

Extended to support tool-related commands.

#### Function: `parseGCodeLine(line)`

Parse a single G-Code line into structured command.

**Parameters:**

- `line` (string): G-Code line (e.g., "T1 M6")

**Returns:** `Object` - Parsed command with tool metadata

**Example:**

```javascript
import { parseGCodeLine } from './modules/gcode/parser.mjs';

const cmd = parseGCodeLine('T1 M6');
console.log(cmd);
// {
//   type: 'tool-change',
//   tool: 1,
//   m6: true,
//   line: "T1 M6"
// }
```

**Tool-Related Command Types:**

```javascript
// Tool selection
parseGCodeLine('T0');
// { type: 'tool-select', tool: 0 }

// Tool change
parseGCodeLine('M6');
// { type: 'tool-change', m6: true }

// Tool offset compensation
parseGCodeLine('G43 H1');
// { type: 'tool-offset', enable: true, offset: 1 }

parseGCodeLine('G49');
// { type: 'tool-offset', enable: false }
```

---

#### Function: `parseGCode(gcode, options)`

Parse full G-Code program with tool tracking.

**Parameters:**

- `gcode` (string): Complete G-Code program
- `options` (Object, optional):
  - `trackTools` (boolean): Enable tool change tracking (default: true)
  - `toolLibrary` (ToolLibrary): Tool definitions for validation

**Returns:** `Object`

- `commands` (Array): Parsed command objects
- `toolChanges` (Array): List of tool change events
- `errors` (Array): Parse errors encountered

**Example:**

```javascript
import { parseGCode } from './modules/gcode/parser.mjs';

const result = parseGCode(
  `
  T0
  G1 X10 Y10
  T1 M6
  G1 X20 Y20
`,
  { trackTools: true }
);

console.log(result.toolChanges);
// [
//   { line: 1, tool: 0, position: null },
//   { line: 3, tool: 1, position: { x: 10, y: 10, z: 0 } }
// ]
```

---

### Module: `toolpath.mjs`

**Location:** `modules/gcode/toolpath.mjs`

Generate tool-aware toolpath segments.

#### Function: `generateToolpath(commands, toolLibrary)`

Convert parsed commands into renderable toolpath with tool information.

**Parameters:**

- `commands` (Array): Output from `parseGCode()`
- `toolLibrary` (ToolLibrary): Tool definitions

**Returns:** `Array<Segment>`

**Segment Object:**

```javascript
{
  type: 'line' | 'arc' | 'rapid',
  start: { x, y, z },
  end: { x, y, z },
  tool: toolId,
  color: '#ff0000',
  feed: 1000,          // mm/min
  offsetApplied: true  // G43 active
}
```

**Example:**

```javascript
import { parseGCode } from './modules/gcode/parser.mjs';
import { generateToolpath } from './modules/gcode/toolpath.mjs';

const result = parseGCode(gcode);
const segments = generateToolpath(result.commands, toolLibrary);

console.log(`Generated ${segments.length} segments`);
segments.forEach((seg) => {
  console.log(
    `${seg.type} from (${seg.start.x},${seg.start.y}) to (${seg.end.x},${seg.end.y}) with tool ${seg.tool}`
  );
});
```

---

## Renderer API

### Module: `toolpath-renderer.mjs`

**Location:** `modules/presentation/toolpath-renderer.mjs`

Render multi-tool toolpaths in Three.js.

#### Function: `renderMultiToolToolpath(segments, scene, toolLibrary)`

Create Three.js line objects for each tool's segments.

**Parameters:**

- `segments` (Array): From `generateToolpath()`
- `scene` (THREE.Scene): Three.js scene to add objects to
- `toolLibrary` (ToolLibrary): Tool definitions for colors

**Returns:** `Object`

- `groups` (Array<THREE.Group>): Line groups per tool
- `markers` (Array<THREE.Mesh>): Tool change markers (spheres)
- `bounds` (Object): `{ minX, maxX, minY, maxY, minZ, maxZ }`

**Example:**

```javascript
import { renderMultiToolToolpath } from './modules/presentation/toolpath-renderer.mjs';
import * as THREE from 'three';

const scene = new THREE.Scene();
const segments = generateToolpath(commands, toolLibrary);

const result = renderMultiToolToolpath(segments, scene, toolLibrary);

console.log(`Created ${result.groups.length} tool groups`);
console.log(`Placed ${result.markers.length} tool change markers`);
console.log('Bounds:', result.bounds);

// Access specific tool group
const tool0Group = result.groups[0];
scene.add(tool0Group);
```

**Line Materials:**

```javascript
// Solid lines for cutting moves (G1)
const cuttingMaterial = new THREE.LineBasicMaterial({
  color: tool.color,
  linewidth: 2,
  opacity: 1.0,
});

// Dashed lines for rapid moves (G0)
const rapidMaterial = new THREE.LineDashedMaterial({
  color: tool.color,
  linewidth: 1,
  dashSize: 5,
  gapSize: 3,
  opacity: 0.4,
});
```

**Tool Change Markers:**

```javascript
// Colored sphere at each tool change
const markerGeometry = new THREE.SphereGeometry(2, 16, 16);
const markerMaterial = new THREE.MeshBasicMaterial({
  color: nextTool.color,
});
const marker = new THREE.Mesh(markerGeometry, markerMaterial);
marker.position.set(changeX, changeY, changeZ);
```

---

#### Function: `calculateToolpathStats(segments)`

Calculate statistics for multi-tool toolpath.

**Parameters:**

- `segments` (Array): From `generateToolpath()`

**Returns:** `Object`

- `totalDistance` (number): Total travel in mm
- `toolDistances` (Object): Distance per tool ID
- `toolChangeCount` (number): Number of tool changes
- `toolUsage` (Array): Per-tool usage details

**Example:**

```javascript
import { calculateToolpathStats } from './modules/presentation/toolpath-renderer.mjs';

const stats = calculateToolpathStats(segments);

console.log(`Total distance: ${stats.totalDistance.toFixed(2)} mm`);
console.log(`Tool changes: ${stats.toolChangeCount}`);

Object.entries(stats.toolDistances).forEach(([toolId, distance]) => {
  const tool = toolLibrary.getTool(parseInt(toolId));
  const percent = ((distance / stats.totalDistance) * 100).toFixed(1);
  console.log(`Tool ${toolId} (${tool.name}): ${distance.toFixed(2)} mm (${percent}%)`);
});
```

**Output Example:**

```
Total distance: 239.70 mm
Tool changes: 2
Tool 0 (PLA Red): 150.23 mm (62.7%)
Tool 1 (PETG Blue): 89.47 mm (37.3%)
```

---

## State Management

### Global State Variables

These variables track multi-tool state in `front.html`:

```javascript
// Current tool
let currentTool = 0;

// Tool offset compensation
let currentZOffset = 0; // Applied Z offset in mm
let offsetCompensation = false; // G43 active flag

// Tool change tracking
let toolChangePositions = []; // Array of { tool, x, y, z }

// Rendering state
let toolpathGroups = []; // THREE.Group per tool
let toolChangeMarkers = []; // THREE.Mesh spheres
```

### State Transitions

```javascript
// Tool selection (T command)
function selectTool(toolId) {
  currentTool = toolId;
  // Tool not yet active until M6
}

// Tool change (M6 command)
function changeTool() {
  const tool = toolLibrary.getTool(currentTool);
  if (tool) {
    // Record change position
    toolChangePositions.push({
      tool: currentTool,
      x: currentPosition.x,
      y: currentPosition.y,
      z: currentPosition.z,
    });

    // Create visual marker
    const marker = createToolChangeMarker(tool);
    scene.add(marker);
    toolChangeMarkers.push(marker);
  }
}

// Offset compensation (G43/G49)
function setToolOffset(enable, offsetNumber) {
  if (enable) {
    const tool = toolLibrary.getTool(offsetNumber || currentTool);
    currentZOffset = tool ? tool.zOffset : 0;
    offsetCompensation = true;
  } else {
    currentZOffset = 0;
    offsetCompensation = false;
  }
}

// Apply offset to Z position
function getActualZ(programmedZ) {
  return offsetCompensation ? programmedZ + currentZOffset : programmedZ;
}
```

---

## Integration Guide

### Adding Multi-Tool to New Project

#### Step 1: Import Modules

```html
<!-- In your HTML -->
<script type="module">
  import { parseGCode } from './modules/gcode/parser.mjs';
  import { generateToolpath } from './modules/gcode/toolpath.mjs';
  import {
    renderMultiToolToolpath,
    calculateToolpathStats,
  } from './modules/presentation/toolpath-renderer.mjs';
</script>
```

#### Step 2: Initialize Tool Library

```javascript
// Create global tool library
const toolLibrary = new ToolLibrary();

// Load defaults or restore from storage
if (!toolLibrary.loadFromLocalStorage()) {
  toolLibrary.loadDefaults('3d-printing');
}
```

#### Step 3: Parse G-Code

```javascript
function loadGCode(gcodeText) {
  // Parse with tool tracking
  const result = parseGCode(gcodeText, {
    trackTools: true,
    toolLibrary: toolLibrary,
  });

  if (result.errors.length > 0) {
    console.error('Parse errors:', result.errors);
    return;
  }

  // Generate segments
  const segments = generateToolpath(result.commands, toolLibrary);

  return segments;
}
```

#### Step 4: Render Toolpath

```javascript
function renderToolpath(segments) {
  // Clear previous render
  clearScene();

  // Render multi-tool toolpath
  const result = renderMultiToolToolpath(segments, scene, toolLibrary);

  // Add to scene
  result.groups.forEach((group) => scene.add(group));
  result.markers.forEach((marker) => scene.add(marker));

  // Update camera to fit bounds
  fitCameraToBounds(result.bounds);

  // Display statistics
  const stats = calculateToolpathStats(segments);
  displayStats(stats);
}
```

#### Step 5: Handle Tool Changes

```javascript
function onToolChange(toolId) {
  // Update UI
  updateToolSelector(toolId);

  // Log event
  console.log(`Tool changed to T${toolId}`);

  // Show message to user
  showMessage(`Tool change: ${toolLibrary.getTool(toolId).name}`);
}
```

---

### Custom Tool Types

To add custom tool types (e.g., laser, plasma):

#### 1. Extend Tool Definition

```javascript
toolLibrary.addTool({
  name: 'CO2 Laser',
  diameter: 0.2, // Beam width
  color: '#ff0000',
  zOffset: 0,
  speed: 300, // mm/min
  power: 40, // % power (custom field)
  frequency: 5000, // Hz (custom field)
});
```

#### 2. Parse Custom Commands

```javascript
// In parser.mjs, add custom command handler
function parseCustomLaser(line) {
  if (line.includes('M3')) {
    const power = extractParameter(line, 'S'); // M3 S40
    return { type: 'laser-on', power: power };
  }
  if (line.includes('M5')) {
    return { type: 'laser-off' };
  }
  return null;
}
```

#### 3. Custom Renderer

```javascript
function renderLaserToolpath(segments) {
  // Use gradient color based on power
  const lineMaterial = new THREE.LineBasicMaterial({
    color: tool.color,
    opacity: tool.power / 100, // Fade based on power
    transparent: true,
  });

  // ... render segments
}
```

---

## Testing API

### Unit Test Helpers

**Location:** `tests/ut/` (various test files)

#### Mock Tool Library

```javascript
function createMockToolLibrary() {
  const tools = new Map();
  tools.set(0, {
    id: 0,
    name: 'Mock Tool 0',
    diameter: 0.4,
    color: '#ff0000',
    zOffset: 0,
    speed: 200,
  });
  tools.set(1, {
    id: 1,
    name: 'Mock Tool 1',
    diameter: 0.4,
    color: '#0000ff',
    zOffset: -1.5,
    speed: 250,
  });

  return {
    getTool: (id) => tools.get(id),
    getAllTools: () => Array.from(tools.values()),
    addTool: (tool) => {
      const id = tools.size;
      tools.set(id, { ...tool, id });
      return id;
    },
  };
}
```

#### Test Fixtures

```javascript
// Sample G-Code for testing
export const SIMPLE_TWO_TOOL_GCODE = `
T0
G1 X10 Y10
T1 M6
G1 X20 Y20
`;

export const OFFSET_TEST_GCODE = `
T1 M6
G43 H1
G1 Z-5
G49
G1 Z0
`;

export const MULTI_TOOL_GCODE = `
T0
G1 X0 Y0 Z0
T1 M6
G43 H1
G1 X10 Y10 Z-5
T2 M6
G43 H2
G1 X20 Y20 Z-10
G49
`;
```

#### Integration Test Example

```javascript
import { parseGCode, generateToolpath, calculateToolpathStats } from '../modules/index.js';

describe('Multi-tool integration', () => {
  test('should track tool changes correctly', () => {
    const toolLib = createMockToolLibrary();
    const result = parseGCode(MULTI_TOOL_GCODE, { toolLibrary: toolLib });

    expect(result.toolChanges.length).toBe(3);
    expect(result.toolChanges[0].tool).toBe(0);
    expect(result.toolChanges[1].tool).toBe(1);
    expect(result.toolChanges[2].tool).toBe(2);
  });

  test('should apply Z offsets correctly', () => {
    const segments = generateToolpath(commands, toolLib);
    const tool1Segments = segments.filter((s) => s.tool === 1);

    // Tool 1 has -1.5mm offset
    expect(tool1Segments[0].end.z).toBe(-5 + -1.5); // -6.5mm
  });

  test('should calculate per-tool distances', () => {
    const stats = calculateToolpathStats(segments);

    expect(stats.toolDistances[0]).toBeGreaterThan(0);
    expect(stats.toolDistances[1]).toBeGreaterThan(0);
    expect(stats.toolChangeCount).toBe(2);
  });
});
```

---

## Performance Considerations

### Optimization Tips

1. **Batch Tool Changes**

   - Minimize tool changes in G-Code
   - Group operations by tool
   - Reduces visual markers and state transitions

2. **Simplify Geometry**

   - Set `MIN_MOVE_DISTANCE` to merge tiny segments
   - Use lower subdivision for arcs
   - Reduces line segment count

3. **Limit Tool Count**

   - Keep tool library to <20 tools
   - Remove unused tools
   - Reduces memory and lookup time

4. **Lazy Rendering**
   - Don't render all tools at once
   - Allow user to toggle tool visibility
   - Only render visible tools

**Example: Lazy Rendering**

```javascript
function renderToolSelectively(segments, visibleTools) {
  const filtered = segments.filter((seg) => visibleTools.includes(seg.tool));
  return renderMultiToolToolpath(filtered, scene, toolLibrary);
}

// User toggles tool visibility
document.getElementById('show-tool-0').addEventListener('change', (e) => {
  if (e.target.checked) {
    visibleTools.add(0);
  } else {
    visibleTools.delete(0);
  }
  reRender();
});
```

---

## Migration Guide

### From Single-Tool to Multi-Tool

If you have existing single-tool code:

**Before:**

```javascript
const segments = parseGCode(gcode);
renderToolpath(segments);
```

**After:**

```javascript
// 1. Create tool library
const toolLibrary = new ToolLibrary();
toolLibrary.loadDefaults('3d-printing');

// 2. Parse with tool tracking
const result = parseGCode(gcode, { toolLibrary: toolLibrary });
const segments = generateToolpath(result.commands, toolLibrary);

// 3. Render multi-tool
renderMultiToolToolpath(segments, scene, toolLibrary);
```

### Backward Compatibility

Single-tool G-Code (no T commands) is still supported:

- Defaults to Tool 0
- No tool change markers
- Single-color rendering (Tool 0's color)

---

## Further Reading

- [User Guide](./USER-GUIDE-MULTI-TOOL.md) - End-user documentation
- [Troubleshooting](./TROUBLESHOOTING-MULTI-TOOL.md) - Common issues
- [Implementation Summary](../MULTIFILAMENT-IMPLEMENTATION-SUMMARY.md) - Technical details
- [Test Coverage](../tests/README.md) - Test documentation

---

**Questions?** Open an issue on GitHub or consult the inline code comments in each module.
