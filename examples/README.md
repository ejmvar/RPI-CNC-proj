# Example G-Code Files

This directory contains working examples demonstrating multi-tool G-Code simulation.

## Files

### 1. multi-color-vase.gcode

**Description:** Five-color spiral vase for 3D printing

**Tools Required:**

- Tool 0: PLA Red (0.4mm nozzle, 210°C)
- Tool 1: PETG Blue (0.4mm nozzle, 240°C)
- Tool 2: PLA Green (0.4mm nozzle, 210°C)
- Tool 3: PETG Yellow (0.4mm nozzle, 240°C)
- Tool 4: PLA Orange (0.4mm nozzle, 210°C)

**Features:**

- Multi-material color transitions
- Temperature management per material
- Purge tower for color changes
- Gradual tapering geometry
- Arc commands (G2) for smooth circles
- ~20 layers, 4 tool changes

**Usage:**

```bash
# 1. Open simulator
cd Simulator/web && python3 -m http.server 8000

# 2. In browser (http://localhost:8000/front.html):
#    - Click "Load 3D Print Tools"
#    - Load file: examples/multi-color-vase.gcode
#    - Click "Simulate"

# 3. Observe:
#    - Red base layer
#    - Blue layers 2-5
#    - Green layers 6-10 (tapering starts)
#    - Yellow layers 11-15
#    - Orange layers 16-20 (narrow top)
```

**Expected Statistics:**

- Total Distance: ~98mm
- Tool Changes: 4
- Material Usage: ~130mm (including purge)

---

### 2. pcb-prototype.gcode

**Description:** Complete PCB milling workflow with 4 different tools

**Tools Required:**

- Tool 1: 0.8mm Carbide End Mill (trace isolation, 18000 RPM)
- Tool 2: 1.0mm Drill (via holes, 12000 RPM)
- Tool 3: 3.0mm End Mill (board outline, 15000 RPM)
- Tool 4: 20° V-Bit (silkscreen engraving, 20000 RPM)

**Features:**

- Tool length offset compensation (G43/G49)
- Multiple spindle speeds per tool
- Canned drill cycle (G81)
- Multi-pass depth cutting
- Shallow engraving for text
- Real-world PCB fabrication sequence

**Usage:**

```bash
# 1. Open simulator
cd Simulator/web && python3 -m http.server 8000

# 2. In browser:
#    - Click "Load CNC Tools"
#    - Manually configure offsets:
#      Tool 1: -52.5mm
#      Tool 2: -51.85mm
#      Tool 3: -52.2mm
#      Tool 4: -51.1mm
#    - Load file: examples/pcb-prototype.gcode
#    - Click "Simulate"

# 3. Observe:
#    - Orange traces (Tool 1)
#    - Green drill holes (Tool 2)
#    - Light green outline (Tool 3)
#    - Blue engraving (Tool 4)
```

**Expected Statistics:**

- Total Distance: ~1270mm
- Tool Changes: 3
- Operations: 4 (isolation, drilling, outline, engraving)
- Estimated Time: ~25 minutes

---

## Loading Examples

### Method 1: File Upload

1. Open the simulator in your browser
2. Click the file input button
3. Navigate to `examples/` folder
4. Select `.gcode` file
5. Click "Load G-Code"
6. Click "Simulate"

### Method 2: Copy-Paste

1. Open example `.gcode` file in text editor
2. Copy entire contents
3. Paste into G-Code editor in simulator
4. Click "Load G-Code"
5. Click "Simulate"

### Method 3: Command Line

```bash
# View file contents
cat examples/multi-color-vase.gcode

# Or with syntax highlighting (if available)
pygmentize -l gcode examples/multi-color-vase.gcode
```

---

## Modifying Examples

### Change Colors

Edit the tool definitions in your Tool Library (right panel):

```javascript
// Before loading G-Code, update tool colors
Tool 0: color = "#ff0000"  // Red
Tool 1: color = "#00ff00"  // Change blue to green
Tool 2: color = "#ffff00"  // Change green to yellow
```

### Adjust Speeds

Modify `M104`, `M109` (3D print) or `S` values (CNC):

```gcode
; 3D Printing - change temperature
M104 T0 S200   ; Lower from 210 to 200°C

; CNC Milling - change spindle speed
S15000 M3      ; Lower from 18000 to 15000 RPM
```

### Scale Geometry

Multiply all X/Y coordinates by a factor:

```gcode
; Original
G1 X10 Y20

; Scaled 2x
G1 X20 Y40

; Scaled 0.5x
G1 X5 Y10
```

**Note:** Be careful with Z coordinates - keep them relative to your workspace.

### Add More Layers

Copy existing layer code blocks and increment Z:

```gcode
; Copy this block:
G1 X75 Y50 Z1.3 F3000
G92 E0
G2 X75 Y50 I-25 J0 E5.0

; Paste and change Z:
G1 X75 Y50 Z1.5 F3000  ; +0.2mm
G92 E0
G2 X75 Y50 I-25 J0 E5.0
```

---

## Creating Your Own Examples

### Template: 3D Print

```gcode
; Header
G21                     ; Millimeters
G90                     ; Absolute positioning
M82                     ; Absolute extrusion
G28                     ; Home all axes

; Tool setup
T0                      ; Select tool 0
M109 S210               ; Heat and wait

; Print moves
G1 X10 Y10 Z0.2 E0      ; Position
G1 X50 Y10 E5 F1200     ; Extrude line

; Tool change
G1 Z5 F3000             ; Lift
T1 M6                   ; Change tool
M109 S240               ; Heat new tool

; Continue printing
G1 X10 Y20 Z0.2 E0
G1 X50 Y20 E5 F1200

; Finish
G28 X0 Y0
M104 S0                 ; Cool down
M84                     ; Motors off
```

### Template: CNC Milling

```gcode
; Header
G21                     ; Millimeters
G90                     ; Absolute positioning
G17                     ; XY plane

; Tool 1 setup
T1 M6                   ; Select tool 1
G43 H1                  ; Enable offset
S12000 M3               ; Spindle on

; Cutting moves
G0 X10 Y10 Z5 F3000     ; Rapid position
G1 Z-2 F300             ; Plunge
G1 X50 Y10 F1000        ; Cut

; Tool change
G0 Z10 F1000            ; Retract
M5                      ; Spindle off
G49                     ; Cancel offset

; Tool 2 setup
T2 M6
G43 H2
S15000 M3

; More cutting...
G0 X20 Y20 Z5
G1 Z-3 F300
G1 X60 Y20 F800

; Finish
G0 Z30
M5
M30                     ; Program end
```

---

## Troubleshooting

### Example Won't Load

**Issue:** "Invalid G-Code" error

**Solutions:**

- Check file encoding (should be UTF-8 or ASCII)
- Remove any non-ASCII characters
- Verify all commands are supported (see User Guide)

### Colors Not Showing

**Issue:** All toolpaths render in single color

**Solutions:**

- Define tools in Tool Library BEFORE loading G-Code
- Verify tool numbers in G-Code match Tool Library IDs
- Check that T commands are followed by M6

### Offsets Look Wrong

**Issue:** CNC tool appears to crash into workpiece

**Solutions:**

- Enter correct offset values in Tool Library
- Negative offsets for longer tools
- Use G43 Hn after each tool change
- Verify workspace Z=0 is at top of material

### Statistics Missing

**Issue:** "Tool Changes: 0" displayed

**Solutions:**

- Add M6 command after T commands
- Reload G-Code after fixing
- Check browser console for errors (F12)

---

## Contributing Examples

Have a cool multi-tool example? Contributions welcome!

**Requirements:**

- Working G-Code (tested in simulator)
- Commented clearly
- Includes tool definitions
- Demonstrates specific feature
- Reasonable file size (<500 lines preferred)

**Submit:**

1. Create your example `.gcode` file
2. Test in simulator
3. Add entry to this README
4. Submit pull request

---

## References

- [User Guide](../docs/USER-GUIDE-MULTI-TOOL.md) - Full tutorial
- [Troubleshooting](../docs/TROUBLESHOOTING-MULTI-TOOL.md) - Common issues
- [API Reference](../docs/API-REFERENCE-MULTI-TOOL.md) - For developers

---

## G-Code Optimizer Examples

### 3. inefficient.gcode

**Description:** Example G-Code with common inefficiencies demonstrating optimizer capabilities

**Inefficiencies Present:**

- Redundant moves to same position
- Collinear segments broken into multiple moves
- Duplicate feed rate (F) commands

**File Details:**

- Original: 37 lines, 20 commands
- Contains: Rapid moves, linear interpolation, feed rates, spindle commands

### 4. inefficient-optimized.gcode

**Description:** Optimized version of `inefficient.gcode`

**Optimization Results:**

- **60% reduction** in file size (37 lines → 8 lines)
- **6 redundant moves** removed
- **9 collinear segments** combined
- **2 duplicate commands** removed

**How to Use the Optimizer:**

1. **In the Simulator:**

   - Open http://localhost:8001/front.html
   - Load or paste G-Code into the editor
   - Click the **⚡ Optimize** button
   - View statistics in the message area
   - Optimized code replaces the original

2. **From Command Line:**

   ```bash
   node --input-type=module -e "
   import { optimizeGCode } from './modules/gcode/optimizer.mjs';
   import { readFileSync } from 'fs';
   const result = optimizeGCode(readFileSync('./examples/inefficient.gcode', 'utf-8'));
   console.log(result.gcode);
   "
   ```

3. **As a Module:**

   ```javascript
   import { optimizeGCode } from './modules/gcode/optimizer.mjs';

   const result = optimizeGCode(gcodeString, {
     removeRedundantMoves: true,
     combineCollinear: true,
     removeDuplicateCommands: true,
     positionTolerance: 0.001, // mm
     collinearTolerance: 0.5, // degrees
   });

   console.log('Stats:', result.stats);
   console.log('Optimized:', result.gcode);
   ```

**Optimization Algorithms:**

1. **Redundant Move Removal** - Removes consecutive moves to same position (tolerance: 0.001mm)
2. **Collinear Segment Combination** - Merges straight-line segments (angle tolerance: 0.5°)
3. **Duplicate Command Removal** - Removes repeated F/S values

**Configuration Options:**

| Option                    | Default | Description                                |
| ------------------------- | ------- | ------------------------------------------ |
| `removeRedundantMoves`    | `true`  | Remove moves to same position              |
| `combineCollinear`        | `true`  | Combine straight-line segments             |
| `removeDuplicateCommands` | `true`  | Remove duplicate F/S values                |
| `positionTolerance`       | `0.001` | Position equality tolerance (mm)           |
| `collinearTolerance`      | `0.5`   | Angle tolerance for collinearity (degrees) |

**Benefits:**

- ⚡ Faster machining time (fewer commands)
- 📐 Smoother paths (continuous motion)
- 📉 Smaller file sizes
- 🎯 Better CNC controller performance

**Testing:**

```bash
npm test -- tests/ut/gcode/optimizer.test.mjs
```

---

## Collision Detection & Safety Examples

### 5. unsafe.gcode

**Description:** Example G-Code with intentional safety violations for testing

**Safety Violations:**

- Out of bounds X/Y/Z positions
- Rapid plunge (unsafe Z drop > 10mm)
- Excessive feed rate (> 3000 mm/min)
- Excessive spindle speed (> 24000 RPM)
- Missing feed rate on cutting move

**Expected Results:**

- 🔴 **3 CRITICAL** issues (bounds violations)
- 🟠 **8 ERROR** issues (feed/spindle/plunge)
- ❌ **NOT SAFE TO RUN**

### 6. safe.gcode

**Description:** Example G-Code with no safety violations

**Safety Features:**

- All movements within machine bounds
- Safe Z approach and retract sequences
- Proper spindle speed (12000 RPM)
- Correct feed rates (500-1000 mm/min)
- Feed moves for plunging and retracting

**Expected Results:**

- ✅ **SAFE** - No issues detected
- Ready for machining

**How to Use Safety Checking:**

1. **In the Simulator:**

   - Open http://localhost:8001/front.html
   - Load or paste G-Code into the editor
   - Click the **🛡️ Check Safety** button
   - Review warnings in message area
   - Address critical/error issues before running

2. **From Command Line:**

   ```bash
   node --input-type=module -e "
   import { detectCollisions, getSummaryText } from './modules/gcode/collision-detector.mjs';
   import { readFileSync } from 'fs';
   const result = detectCollisions(readFileSync('./examples/unsafe.gcode', 'utf-8'));
   console.log(getSummaryText(result));
   "
   ```

3. **As a Module:**

   ```javascript
   import { detectCollisions, SEVERITY } from './modules/gcode/collision-detector.mjs';

   const result = detectCollisions(gcodeString, {
     xMin: 0,
     xMax: 200,
     maxFeedRate: 3000,
     maxSpindleSpeed: 24000,
   });

   if (!result.safe) {
     console.error('UNSAFE G-Code!');
     result.warnings.forEach((w) => console.log(w.message));
   }
   ```

**Safety Checks:**

- 🛡️ Bounds checking (X/Y/Z limits)
- ⚡ Rapid plunge detection (> 10mm)
- 📏 Feed rate validation
- 🔧 Spindle speed validation
- 🎯 Workpiece collision detection
- ⚠️ Negative Z rapid warnings

**Testing:**

```bash
npm test -- tests/ut/gcode/collision-detector.test.mjs
```

---

## 8. Mobile Touch Controls

**Module:** `modules/presentation/touch-controls.mjs`

**Description:** Mobile-optimized touch gesture support for 3D visualization on tablets and phones.

**Features:**

- 📱 Automatic device detection (mobile/tablet/desktop)
- 👆 Single-finger pan gesture
- 🤏 Two-finger pinch-to-zoom
- 🔄 Two-finger rotation
- 📐 Configurable gesture speeds and sensitivity
- 📊 Gesture statistics tracking
- 🎨 Mobile-optimized CSS injection (44px buttons, touch-action)

**Usage in Simulator:**

The simulator automatically detects touch devices and enables touch controls:

```javascript
// Auto-initialized in front.html when touch device detected
if (TOUCH_CONTROLS.isTouchDevice()) {
  TOUCH_CONTROLS.applyMobileStyles();
  const touchControls = new TOUCH_CONTROLS.MobileTouchControls(container, camera, controls);
}
```

**Manual Usage:**

```javascript
import { MobileTouchControls, isTouchDevice, applyMobileStyles } from './touch-controls.mjs';

// Check for touch support
if (isTouchDevice()) {
  // Apply mobile styles
  applyMobileStyles();

  // Initialize touch controls
  const touchControls = new MobileTouchControls(
    container, // DOM element
    camera, // Three.js camera
    orbitControls, // Three.js OrbitControls (optional)
    {
      enablePan: true,
      enableZoom: true,
      enableRotate: true,
      panSpeed: 1.0,
      zoomSpeed: 1.0,
      rotateSpeed: 1.0,
      minDistance: 10,
    }
  );

  // Get statistics
  const stats = touchControls.getStats();
  console.log(`Total gestures: ${stats.totalGestures}`);

  // Cleanup when done
  touchControls.dispose();
}
```

**Gestures:**

- **Pan:** Single finger drag → moves camera position
- **Zoom:** Two fingers pinch/spread → dolly in/out
- **Rotate:** Two fingers rotate → rotate camera around target

**Configuration:**

```javascript
// Update configuration at runtime
touchControls.setConfig({
  panSpeed: 2.0, // Increase pan sensitivity
  enableRotate: false, // Disable rotation
});

// Disable/enable touch controls
touchControls.setEnabled(false);
touchControls.setEnabled(true);
```

**Device Detection:**

```javascript
import { getDeviceType } from './touch-controls.mjs';

const deviceType = getDeviceType();
// Returns: 'mobile', 'tablet', or 'desktop'

if (deviceType === 'mobile') {
  console.log('Optimizing for mobile device');
}
```

**Testing:**

```bash
npm test -- tests/ut/presentation/touch-controls.test.mjs
```

**Browser Compatibility:**

- ✅ iOS Safari (iPhone/iPad)
- ✅ Android Chrome
- ✅ Android Firefox
- ✅ Desktop browsers with touch screens

---

## 9. Alternative 2D Renderer

**Module:** `modules/presentation/renderer-2d.mjs`

**Description:** Lightweight SVG-based renderer as an alternative to Three.js 3D visualization.

**Features:**

- 📐 SVG path generation from G-Code toolpath
- 🎨 Color coding (rapids=gray, linear=green, arcs=cyan)
- 🖱️ Pan/zoom viewport controls (mouse drag, wheel)
- 📏 Automatic fit-to-view
- 💾 Export to SVG file
- ⚡ Lower memory footprint than 3D
- 🔋 Better battery life on mobile devices

**Usage in Simulator:**

Click the **📐 2D View** button to toggle between 3D and 2D rendering modes.

**Testing:**

```bash
npm test -- tests/ut/presentation/renderer-2d.test.mjs
```

---

## 10. Material Removal Simulation

**Module:** `modules/presentation/material-removal.mjs`

**Description:** Real-time voxel-based material removal simulation with visual feedback during machining operations.

**Features:**

- 🔨 Voxel-grid material representation (configurable resolution)
- 📊 Real-time volume statistics (removed/remaining material)
- 🎨 Progressive visual feedback (opacity fade, color change)
- ⚡ Performance-optimized (update throttling, Uint8Array storage)
- 📏 Automatic workpiece bounds estimation
- 🔧 Tool radius-aware cutting simulation
- 💾 Memory efficient (1-200KB for typical workpieces)

**Algorithm:**

- **Voxel Grid:** 3D array representation (1 = material, 0 = removed)
- **Resolution:** Configurable mm per voxel (default 2.0mm)
  - Lower resolution = more detail, slower performance
  - Higher resolution = faster, less detail
- **Removal:**
  - Spherical sweep at each position (O(r³) per operation)
  - Linear interpolation along tool paths
  - Step size = resolution / 2 for smooth paths
- **Visualization:**
  - Three.js BoxGeometry for material block
  - Opacity fades as material removed (100% → 0%)
  - Color changes to red when >50% removed
  - Updates every N operations (default: 10)

**Performance Characteristics:**

| Resolution | Grid Size (50×50×10mm)   | Memory | Speed/Cut |
| ---------- | ------------------------ | ------ | --------- |
| 1.0 mm     | 50×50×10 = 25,000 voxels | ~25 KB | 1-2 ms    |
| 2.0 mm     | 25×25×5 = 3,125 voxels   | ~3 KB  | 0.1 ms    |
| 5.0 mm     | 10×10×2 = 200 voxels     | <1 KB  | <0.1 ms   |

**Usage in Simulator:**

1. Load G-Code with linear moves (G1)
2. Click **🔨 Material Removal** button to enable
3. Run simulation to see material removal in real-time
4. Statistics appear in log panel:
   ```
   Material: 45.2% removed (12.34cm³ / 27.30cm³)
   ```

**Configuration Options:**

```javascript
{
  resolution: 2.0,           // mm per voxel
  materialColor: 0x8b7355,   // Brownish wood color
  materialOpacity: 0.3,      // Transparency (0-1)
  showRemovedVoxels: false,  // Show removed material (slower)
  updateInterval: 10         // Update every N cuts
}
```

**Testing:**

```bash
# Unit tests (algorithm verification)
npm test -- tests/ut/presentation/material-removal.test.mjs

# Integration tests (UI integration)
npm test -- tests/it/front-material-removal.test.js
```

**Example Workflow:**

```bash
# 1. Start simulator
cd Simulator/web && python3 -m http.server 8000

# 2. In browser (http://localhost:8000/front.html):
#    - Load examples/multi-color-vase.gcode
#    - Click "🔨 Material Removal" to enable
#    - Click "▶️ Simulate"

# 3. Observe:
#    - Material block appears over work area
#    - Block fades as tool removes material
#    - Statistics update every 10 operations
#    - Color changes when heavily machined
```

**Tips:**

- **Lower resolution (0.5-1.0mm)** for detailed finishing operations
- **Higher resolution (2.0-5.0mm)** for roughing or large parts
- **Disable during rapid moves** (only G1 moves remove material)
- **Toggle off** when simulation is slow on low-end devices
- **Statistics accuracy** depends on resolution (finer = more accurate)

---

**Happy Simulating!** 🚀
