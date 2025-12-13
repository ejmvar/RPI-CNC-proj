# Design: Multifilament & Multitool Support

**Status:** Design Proposal — Dec 13, 2024  
**Target:** Phase 7+ (Advanced Features)  
**Complexity:** High — requires changes across parser, visualization, UI, and transform logic

---

## Overview

Add support for multiple materials/tools in CNC machining and 3D printing workflows:

- **Multifilament (3D printing):** Use different filament colors/materials (PLA, ABS, PETG, TPU) in a single print
- **Multitool (CNC milling):** Switch between drill bits, end mills, v-bits, probes during a job
- **Tool offsets:** Each tool has different length, diameter, and position offsets
- **Visualization:** Color-code toolpath by active tool/material
- **Compensation:** Apply tool-specific transformations to G-Code

---

## Use Cases

### 3D Printing — Multifilament

```gcode
T0              ; Select extruder 0 (red PLA)
G1 X10 Y10 E5   ; Extrude red material
M109 S200       ; Wait for temp

T1              ; Switch to extruder 1 (blue PETG)
G1 X20 Y20 E5   ; Extrude blue material
M109 S230       ; Different temp for PETG
```

**Features needed:**

- Track active tool (T0, T1, T2, etc.)
- Store material properties per tool (color, temp, flow rate)
- Visualize extrusion paths in different colors
- Handle tool change time and purge towers
- Support MMU (multi-material unit) printers

### CNC Milling — Multitool

```gcode
T1 M6           ; Load tool 1 (6mm end mill)
G43 H1 Z0       ; Apply tool length offset for T1
G1 Z-5 F100     ; Cut at depth -5mm

T2 M6           ; Load tool 2 (3mm drill bit)
G43 H2 Z0       ; Apply tool length offset for T2
G81 Z-10 R2 F50 ; Drill cycle with T2 offset
```

**Features needed:**

- Parse tool selection (T) and tool change (M6) commands
- Store tool library (diameter, length, flutes, material)
- Apply G43 tool length offsets during simulation
- Visualize tool shape and swept volume
- Show tool change positions and estimated downtime

---

## Architecture

### 1. G-Code Parser Extensions

**File:** `modules/gcode/parser.mjs`

**New Commands to Parse:**

- **T** (tool select): `T0`, `T1`, `T2` → select tool by index
- **M6** (tool change): Explicit tool change (may pause for manual swap)
- **G43** (tool length offset): Apply stored offset for active tool
- **G49** (cancel tool offset): Return to machine coordinates
- **M109** (set extruder temp): 3D printing temp control per extruder
- **M104/M109** (set bed temp): Material-specific bed temps

**Parser Changes:**

```javascript
// modules/gcode/parser.mjs
export function parseLine(line) {
  // ... existing parsing ...

  // Add tool selection
  if (line.match(/^T(\d+)/)) {
    params.T = parseInt(RegExp.$1, 10);
  }

  // Detect tool change command
  if (line.match(/\bM6\b/)) {
    params.toolChange = true;
  }

  // Tool length offset
  if (line.match(/\bG43\b/)) {
    params.toolLengthOffset = true;
    if (line.match(/\bH(\d+)/)) {
      params.toolOffsetIndex = parseInt(RegExp.$1, 10);
    }
  }

  // Cancel offset
  if (line.match(/\bG49\b/)) {
    params.cancelToolOffset = true;
  }

  return { cmd, params, raw: line };
}
```

### 2. Tool Library & State Management

**New File:** `modules/gcode/tool-library.mjs`

Store tool/material configurations:

```javascript
// modules/gcode/tool-library.mjs
export class ToolLibrary {
  constructor() {
    this.tools = new Map();
    this.activeTool = null;
  }

  // Add a tool definition
  addTool(index, config) {
    this.tools.set(index, {
      index,
      name: config.name || `Tool ${index}`,
      type: config.type || 'endmill', // 'endmill', 'drill', 'vbit', 'extruder'
      diameter: config.diameter || 3.0, // mm
      length: config.length || 50.0, // mm
      offsetZ: config.offsetZ || 0.0, // Z offset from reference
      color: config.color || '#888888', // visualization color
      material: config.material || 'HSS', // tool material or filament type
      feedRate: config.feedRate || 100, // default feed rate
      spindleSpeed: config.spindleSpeed || 10000, // RPM (CNC) or temp (3D print)
      ...config,
    });
  }

  // Select active tool
  selectTool(index) {
    if (!this.tools.has(index)) {
      console.warn(`Tool ${index} not defined, using default`);
      this.addTool(index, {});
    }
    this.activeTool = index;
    return this.tools.get(index);
  }

  // Get current tool config
  getActiveTool() {
    return this.tools.get(this.activeTool);
  }

  // Get tool by index
  getTool(index) {
    return this.tools.get(index);
  }

  // Load tool library from JSON
  loadFromJSON(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    data.tools.forEach((t) => this.addTool(t.index, t));
  }

  // Export tool library as JSON
  toJSON() {
    return {
      tools: Array.from(this.tools.values()),
      activeTool: this.activeTool,
    };
  }
}

// Example 3D printing configuration
export const DEFAULT_3D_PRINT_TOOLS = [
  {
    index: 0,
    name: 'PLA Red',
    type: 'extruder',
    diameter: 0.4,
    color: '#ff0000',
    material: 'PLA',
    spindleSpeed: 200,
  },
  {
    index: 1,
    name: 'PETG Blue',
    type: 'extruder',
    diameter: 0.4,
    color: '#0000ff',
    material: 'PETG',
    spindleSpeed: 230,
  },
  {
    index: 2,
    name: 'TPU Black',
    type: 'extruder',
    diameter: 0.4,
    color: '#000000',
    material: 'TPU',
    spindleSpeed: 220,
  },
];

// Example CNC milling configuration
export const DEFAULT_CNC_TOOLS = [
  {
    index: 1,
    name: '6mm End Mill',
    type: 'endmill',
    diameter: 6.0,
    length: 50,
    offsetZ: 0.0,
    color: '#cccccc',
    feedRate: 800,
    spindleSpeed: 12000,
  },
  {
    index: 2,
    name: '3mm Drill',
    type: 'drill',
    diameter: 3.0,
    length: 45,
    offsetZ: -5.0,
    color: '#ffaa00',
    feedRate: 300,
    spindleSpeed: 8000,
  },
  {
    index: 3,
    name: 'V-Bit 90°',
    type: 'vbit',
    diameter: 6.35,
    length: 40,
    offsetZ: -2.5,
    color: '#ff00ff',
    feedRate: 600,
    spindleSpeed: 15000,
  },
];
```

### 3. Toolpath Extension with Tool Tracking

**File:** `modules/gcode/toolpath.mjs` (extend existing)

**Changes:**

```javascript
// modules/gcode/toolpath.mjs
import { ToolLibrary } from './tool-library.mjs';

export function generateToolpath(commands, options = {}) {
  const toolLibrary = options.toolLibrary || new ToolLibrary();
  const points = [];
  let currentPos = { x: 0, y: 0, z: 0 };
  let currentTool = 0; // default tool

  commands.forEach((cmd) => {
    // Handle tool changes
    if (cmd.params.T !== undefined) {
      currentTool = cmd.params.T;
      toolLibrary.selectTool(currentTool);
    }

    if (cmd.params.toolChange) {
      // M6 tool change - record tool change event
      points.push({
        ...currentPos,
        type: 'tool-change',
        tool: currentTool,
        toolConfig: toolLibrary.getTool(currentTool),
      });
    }

    // Handle movement with active tool
    if (cmd.cmd === 'G0' || cmd.cmd === 'G1') {
      const nextPos = { ...currentPos };
      if (cmd.params.X !== undefined) nextPos.x = cmd.params.X;
      if (cmd.params.Y !== undefined) nextPos.y = cmd.params.Y;
      if (cmd.params.Z !== undefined) nextPos.z = cmd.params.Z;

      // Apply tool length offset if active
      if (toolLibrary.getActiveTool()?.offsetZ) {
        nextPos.z += toolLibrary.getActiveTool().offsetZ;
      }

      points.push({
        ...nextPos,
        type: cmd.cmd === 'G0' ? 'rapid' : 'cut',
        tool: currentTool,
        toolConfig: toolLibrary.getTool(currentTool),
      });

      currentPos = nextPos;
    }

    // Handle arc moves (G2/G3) with tool tracking
    // ... (extend existing arc logic with tool field)
  });

  return points;
}
```

### 4. Visualization — Color-Coded Toolpath

**File:** `modules/presentation/toolpath-renderer.mjs` (new)

Render toolpath with colors per tool:

```javascript
// modules/presentation/toolpath-renderer.mjs
import * as THREE from 'three';

export function renderMultiToolToolpath(scene, points, options = {}) {
  // Group points by tool
  const toolGroups = new Map();

  points.forEach((pt) => {
    const toolIndex = pt.tool ?? 0;
    if (!toolGroups.has(toolIndex)) {
      toolGroups.set(toolIndex, []);
    }
    toolGroups.get(toolIndex).push(pt);
  });

  // Render each tool's path with its color
  toolGroups.forEach((pts, toolIndex) => {
    const toolConfig = pts[0]?.toolConfig || { color: '#888888' };
    const color = new THREE.Color(toolConfig.color);

    // Separate rapid moves and cutting moves
    const rapidPoints = pts.filter((p) => p.type === 'rapid');
    const cutPoints = pts.filter((p) => p.type === 'cut');

    // Render cutting moves (solid line)
    if (cutPoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        cutPoints.map((p) => new THREE.Vector3(p.x, p.z, p.y))
      );
      const material = new THREE.LineBasicMaterial({
        color,
        linewidth: 2,
        opacity: 0.9,
        transparent: true,
      });
      const line = new THREE.Line(geometry, material);
      line.userData.toolIndex = toolIndex;
      scene.add(line);
    }

    // Render rapid moves (dashed line, lighter)
    if (rapidPoints.length > 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        rapidPoints.map((p) => new THREE.Vector3(p.x, p.z, p.y))
      );
      const material = new THREE.LineDashedMaterial({
        color: color.clone().offsetHSL(0, -0.3, 0.3), // lighter shade
        linewidth: 1,
        dashSize: 2,
        gapSize: 1,
      });
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances(); // required for dashed
      line.userData.toolIndex = toolIndex;
      scene.add(line);
    }

    // Render tool change markers
    pts
      .filter((p) => p.type === 'tool-change')
      .forEach((p) => {
        const geometry = new THREE.SphereGeometry(1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(p.x, p.z, p.y);
        sphere.userData.toolChange = true;
        scene.add(sphere);
      });
  });
}
```

### 5. UI — Tool Selection & Configuration

**File:** `Simulator/web/front.html` (extend)

Add UI controls for tool management:

```html
<!-- Tool library panel -->
<div id="tool-panel" class="bg-white p-4 rounded shadow">
  <h3 class="font-bold mb-2">Tool Library</h3>

  <!-- Tool selector -->
  <div class="mb-4">
    <label class="block mb-1">Active Tool:</label>
    <select id="tool-select" class="w-full border p-1">
      <option value="0">T0 - PLA Red (0.4mm)</option>
      <option value="1">T1 - PETG Blue (0.4mm)</option>
      <option value="2">T2 - TPU Black (0.4mm)</option>
    </select>
  </div>

  <!-- Tool configuration -->
  <div id="tool-config" class="space-y-2">
    <div>
      <label class="block text-sm">Tool Name:</label>
      <input type="text" id="tool-name" class="w-full border p-1" value="PLA Red" />
    </div>
    <div>
      <label class="block text-sm">Diameter (mm):</label>
      <input type="number" id="tool-diameter" class="w-full border p-1" value="0.4" step="0.1" />
    </div>
    <div>
      <label class="block text-sm">Color:</label>
      <input type="color" id="tool-color" class="w-full border p-1" value="#ff0000" />
    </div>
    <div>
      <label class="block text-sm">Z Offset (mm):</label>
      <input type="number" id="tool-offset-z" class="w-full border p-1" value="0.0" step="0.1" />
    </div>
    <div>
      <label class="block text-sm">Temperature (°C):</label>
      <input type="number" id="tool-temp" class="w-full border p-1" value="200" step="5" />
    </div>
  </div>

  <!-- Tool library actions -->
  <div class="mt-4 space-x-2">
    <button id="tool-add" class="bg-blue-500 text-white px-3 py-1 rounded">Add Tool</button>
    <button id="tool-save" class="bg-green-500 text-white px-3 py-1 rounded">Save Library</button>
    <button id="tool-load" class="bg-gray-500 text-white px-3 py-1 rounded">Load Library</button>
  </div>

  <!-- Tool statistics -->
  <div id="tool-stats" class="mt-4 p-2 bg-gray-100 rounded text-sm">
    <div>Tool changes: <span id="stat-tool-changes">0</span></div>
    <div>Distance by tool:</div>
    <ul id="stat-tool-distances" class="ml-4 list-disc">
      <!-- Populated dynamically -->
    </ul>
  </div>
</div>
```

JavaScript to wire up:

```javascript
// In front.html <script>
import { ToolLibrary, DEFAULT_3D_PRINT_TOOLS, DEFAULT_CNC_TOOLS } from './js/tool-library.mjs';

let toolLibrary = new ToolLibrary();

// Initialize with default tools
DEFAULT_3D_PRINT_TOOLS.forEach((t) => toolLibrary.addTool(t.index, t));

// Tool selection
document.getElementById('tool-select').addEventListener('change', (e) => {
  const toolIndex = parseInt(e.target.value, 10);
  const tool = toolLibrary.selectTool(toolIndex);

  // Update UI with selected tool config
  document.getElementById('tool-name').value = tool.name;
  document.getElementById('tool-diameter').value = tool.diameter;
  document.getElementById('tool-color').value = tool.color;
  document.getElementById('tool-offset-z').value = tool.offsetZ;
  document.getElementById('tool-temp').value = tool.spindleSpeed; // temp for 3D print
});

// Add new tool
document.getElementById('tool-add').addEventListener('click', () => {
  const nextIndex = toolLibrary.tools.size;
  toolLibrary.addTool(nextIndex, {
    name: document.getElementById('tool-name').value,
    diameter: parseFloat(document.getElementById('tool-diameter').value),
    color: document.getElementById('tool-color').value,
    offsetZ: parseFloat(document.getElementById('tool-offset-z').value),
    spindleSpeed: parseInt(document.getElementById('tool-temp').value, 10),
  });

  // Update tool selector dropdown
  refreshToolSelector();
});

// Save/load tool library
document.getElementById('tool-save').addEventListener('click', () => {
  const json = JSON.stringify(toolLibrary.toJSON(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tool-library.json';
  a.click();
});

document.getElementById('tool-load').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const text = await file.text();
    toolLibrary.loadFromJSON(text);
    refreshToolSelector();
    showMessage('Tool library loaded', 'success');
  };
  input.click();
});

// Update tool statistics after simulation
function updateToolStats(points) {
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

  document.getElementById('stat-tool-changes').textContent = toolChanges;

  const statList = document.getElementById('stat-tool-distances');
  statList.innerHTML = '';
  toolDistances.forEach((dist, tool) => {
    const toolConfig = toolLibrary.getTool(tool);
    const li = document.createElement('li');
    li.textContent = `${toolConfig?.name || `T${tool}`}: ${dist.toFixed(2)} mm`;
    li.style.color = toolConfig?.color || '#888';
    statList.appendChild(li);
  });
}
```

### 6. Transform Logic — Tool Offset Compensation

**File:** `modules/gcode/transform.mjs` (extend)

Apply tool-specific offsets during G-Code transformation:

```javascript
// modules/gcode/transform.mjs
export function applyToolOffsets(gcode, toolLibrary) {
  const lines = gcode.split('\n');
  const outputLines = [];
  let activeTool = 0;
  let offsetActive = false;

  lines.forEach((line) => {
    // Track tool changes
    if (line.match(/^T(\d+)/)) {
      activeTool = parseInt(RegExp.$1, 10);
      toolLibrary.selectTool(activeTool);
    }

    // G43: enable tool length offset
    if (line.match(/\bG43\b/)) {
      offsetActive = true;
      const tool = toolLibrary.getActiveTool();
      outputLines.push(`; Tool offset enabled: ${tool.name} (Z+${tool.offsetZ})`);
    }

    // G49: cancel tool offset
    if (line.match(/\bG49\b/)) {
      offsetActive = false;
      outputLines.push('; Tool offset cancelled');
    }

    // Apply offset to Z coordinates if active
    if (offsetActive && line.match(/\bZ([-+]?[0-9.]+)/)) {
      const tool = toolLibrary.getActiveTool();
      const originalZ = parseFloat(RegExp.$1);
      const adjustedZ = originalZ + tool.offsetZ;
      const newLine = line.replace(/\bZ[-+]?[0-9.]+/, `Z${adjustedZ.toFixed(3)}`);
      outputLines.push(`; Original: ${line}`);
      outputLines.push(newLine);
    } else {
      outputLines.push(line);
    }
  });

  return outputLines.join('\n');
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (1-2 weeks)

1. **Create `tool-library.mjs`**

   - Implement ToolLibrary class
   - Add default tool sets (3D print, CNC)
   - Write unit tests

2. **Extend G-Code parser**

   - Parse T, M6, G43, G49 commands
   - Add tests for new commands

3. **Update toolpath generator**
   - Track active tool per point
   - Include tool config in toolpath data
   - Test with multi-tool G-Code samples

### Phase 2: Visualization (1 week)

4. **Create toolpath renderer**

   - Implement color-coded path rendering
   - Add tool change markers
   - Test with Three.js scene

5. **Integrate into front.html**
   - Replace existing toolpath renderer
   - Verify colors match tool library

### Phase 3: UI & Interaction (1 week)

6. **Add tool panel UI**

   - Tool selector dropdown
   - Tool configuration form
   - Save/load tool library

7. **Wire up event handlers**

   - Tool selection changes active tool
   - Add/edit/delete tools
   - Update visualization on tool changes

8. **Add tool statistics**
   - Count tool changes
   - Calculate distance per tool
   - Display in UI

### Phase 4: Advanced Features (1-2 weeks)

9. **Tool offset transformation**

   - Implement `applyToolOffsets()` in transform.mjs
   - Test with G43/G49 commands
   - Add CLI tool for offline processing

10. **3D printing specifics**

    - Parse M104/M109 (temp control)
    - Handle retraction/de-retraction
    - Support purge towers and prime pillars

11. **CNC specifics**
    - Parse spindle speed (S parameter)
    - Show tool diameter as cylinder in 3D view
    - Implement collision detection (optional)

### Phase 5: Testing & Polish (1 week)

12. **Comprehensive testing**

    - Unit tests for ToolLibrary
    - Integration tests for parser + toolpath
    - E2E tests for UI interactions
    - Visual regression tests

13. **Documentation**
    - Update copilot-instructions.md
    - Add tool library JSON schema
    - Create example G-Code files
    - Write user guide

---

## Example G-Code Files

### 3D Print — Two-Color Logo

```gcode
; Two-color 3D print demo
; T0 = PLA Red (base)
; T1 = PETG Blue (logo)

G21         ; millimeters
G90         ; absolute positioning
M82         ; absolute extrusion
M104 S200 T0 ; preheat extruder 0
M140 S60    ; preheat bed

T0          ; select extruder 0
G1 Z0.2 F5000
G1 X0 Y0 E0 ; home

; Print base layer (red)
G1 X50 Y0 E5 F1200
G1 X50 Y50 E10
G1 X0 Y50 E15
G1 X0 Y0 E20

; Tool change to blue
T1
M109 S230 T1 ; wait for blue extruder temp
G1 X10 Y10 ; move to logo position

; Print logo (blue)
G1 X40 Y10 E25
G1 X40 Y40 E30
G1 X10 Y40 E35
G1 X10 Y10 E40

M104 S0 T0  ; cool down extruders
M104 S0 T1
M140 S0     ; cool bed
G1 Z100     ; raise Z
M84         ; disable motors
```

### CNC Mill — Three Tools

```gcode
; CNC milling with tool changes
; T1 = 6mm end mill (roughing)
; T2 = 3mm end mill (finishing)
; T3 = V-bit (engraving)

G21 G90     ; mm, absolute
G17         ; XY plane

; Load roughing tool
T1 M6
G43 H1      ; apply tool 1 length offset
S12000 M3   ; spindle on 12k RPM

; Rough cut
G0 Z5
G0 X10 Y10
G1 Z-5 F300
G1 X100 Y10 F800
G1 X100 Y100
G1 X10 Y100
G1 X10 Y10
G0 Z5

; Change to finishing tool
M5          ; spindle off
T2 M6
G43 H2      ; apply tool 2 length offset
S15000 M3   ; higher speed for finish

; Finish cut
G0 X15 Y15
G1 Z-5.5 F200
G1 X95 Y15 F600
G1 X95 Y95
G1 X15 Y95
G1 X15 Y15
G0 Z5

; Change to engraving tool
M5
T3 M6
G43 H3
S18000 M3

; Engrave text
G0 X50 Y50
G1 Z-0.5 F100
G1 X55 Y52 F300
; ... (text paths)
G0 Z5

M5          ; spindle off
G49         ; cancel tool offset
G0 Z100     ; safe height
M30         ; program end
```

---

## Storage Format — Tool Library JSON

```json
{
  "version": "1.0",
  "type": "3d-print",
  "tools": [
    {
      "index": 0,
      "name": "PLA Red",
      "type": "extruder",
      "diameter": 0.4,
      "length": 50,
      "offsetZ": 0.0,
      "color": "#ff0000",
      "material": "PLA",
      "feedRate": 50,
      "spindleSpeed": 200,
      "retractDistance": 5.0,
      "retractSpeed": 40,
      "notes": "Primary extruder for structural parts"
    },
    {
      "index": 1,
      "name": "PETG Blue",
      "type": "extruder",
      "diameter": 0.4,
      "length": 50,
      "offsetZ": 0.2,
      "color": "#0000ff",
      "material": "PETG",
      "feedRate": 40,
      "spindleSpeed": 230,
      "retractDistance": 6.5,
      "retractSpeed": 35,
      "notes": "Secondary extruder for accents"
    }
  ]
}
```

---

## Open Questions & Future Enhancements

1. **Tool change time estimation:** Pause duration for manual/automatic tool changes?
2. **Collision detection:** Check if tool diameter intersects with previous cuts?
3. **Material removal visualization:** Show actual stock material being cut away?
4. **Support for ATC (Automatic Tool Changer):** Different G-Code patterns for ATC machines?
5. **Filament usage calculator:** Estimate material consumption per tool/color?
6. **Multi-tool optimization:** Minimize tool changes by reordering operations?

---

## Testing Requirements

All new code must include tests:

- **Unit tests:** ToolLibrary class, parser extensions, offset calculations
- **Integration tests:** Full toolpath generation with multiple tools
- **E2E tests:** UI interactions (select tool, change color, save/load library)
- **Visual tests:** Verify color-coded toolpath rendering (manual review)

Run tests after each change:

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
```

---

## References

- [GRBL Tool Change Commands](https://github.com/gnea/grbl/wiki/Grbl-v1.1-Commands#g43-g49---tool-length-offsets)
- [Marlin Multi-Extruder Setup](https://marlinfw.org/docs/configuration/configuration.html#extruders)
- [RepRap G-Code - Tool Change](https://reprap.org/wiki/G-code#T:_Select_Tool)
- [Three.js Line Materials](https://threejs.org/docs/#api/en/materials/LineBasicMaterial)

---

**Next Steps:**

1. Review this design with team/users
2. Prioritize features (3D print vs CNC, basic vs advanced)
3. Create Phase 7 tasks in PLAN.md
4. Start with Phase 1 implementation (tool library + parser)
