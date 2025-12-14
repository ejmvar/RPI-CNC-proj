# Multi-Tool Troubleshooting Guide

**Version:** 1.0  
**Last Updated:** December 14, 2024

This guide covers common issues, error messages, and solutions for multi-tool G-Code simulation.

---

## Table of Contents

1. [Tool Library Issues](#tool-library-issues)
2. [Visualization Problems](#visualization-problems)
3. [G-Code Parsing Issues](#g-code-parsing-issues)
4. [Tool Offset Problems](#tool-offset-problems)
5. [Performance Issues](#performance-issues)
6. [Browser Compatibility](#browser-compatibility)
7. [File Import/Export](#file-importexport)

---

## Tool Library Issues

### Tool Not Appearing in Dropdown

**Symptoms:**

- Added tool doesn't show in tool selector
- Tool list is empty

**Causes:**

1. Tool wasn't saved (clicked "Add Tool" but didn't confirm)
2. Browser storage quota exceeded
3. JavaScript error during tool creation

**Solutions:**

```javascript
// Check browser console for errors (F12)
// Look for: "QuotaExceededError" or "TypeError"

// Clear storage and try again
localStorage.clear();
location.reload();

// Verify tool format
{
  "name": "PLA Red",
  "diameter": 0.4,
  "color": "#ff0000",
  "zOffset": 0,
  "speed": 200,
  "temperature": 210
}
```

**Prevention:**

- Click "Save Library" after adding tools
- Export tool library to JSON backup

---

### Tool Changes Not Visible

**Symptoms:**

- G-Code uses T commands but visualization shows one color
- Statistics show 0 tool changes

**Causes:**

1. Tools not defined in Tool Library before loading G-Code
2. T command references invalid tool number
3. Missing M6 command after T

**Solutions:**

**Option 1: Define tools first**

```gcode
; WRONG order
T1 M6
G1 X10 Y10   ; Renders in default color

; CORRECT order
; 1. Load Tool Library with Tool 1
; 2. Then load G-Code
T1 M6
G1 X10 Y10   ; Renders in Tool 1's color
```

**Option 2: Add M6 command**

```gcode
; WRONG - tool selected but not changed
T1
G1 X10 Y10   ; Still using previous tool

; CORRECT
T1 M6
G1 X10 Y10   ; Now using Tool 1
```

**Prevention:**

- Always define tools before loading G-Code
- Use both T and M6 commands for explicit tool changes

---

### Tool Colors Look Wrong

**Symptoms:**

- All tools render in same color
- Colors don't match Tool Library

**Causes:**

1. Invalid hex color format
2. Color picker not updating
3. CSS styles interfering

**Solutions:**

**Valid hex formats:**

```javascript
✅ "#ff0000"    // Full 6-digit hex
✅ "#f00"       // 3-digit shorthand
❌ "ff0000"     // Missing #
❌ "red"        // Named colors not supported
❌ "#ff000099"  // Alpha channel not supported
```

**Reset color:**

```javascript
// In browser console
const tool = toolLibrary.getTool(1);
tool.color = '#ff0000';
toolLibrary.updateTool(1, tool);
```

---

### Tool Offsets Not Applying

**Symptoms:**

- Z positions don't change when G43 is used
- All tools appear at same Z height

**Causes:**

1. G43 command missing or incorrect
2. Tool offset is 0 (no compensation needed)
3. G49 cancelled offset before moves

**Solutions:**

**Correct G43 usage:**

```gcode
; WRONG - offset never enabled
T1 M6
G1 Z-5       ; No offset applied

; CORRECT - offset enabled
T1 M6
G43 H1       ; Enable offset for tool 1
G1 Z-5       ; Offset applied: Z = -5 + offset
```

**Check offset values:**

```javascript
// In browser console
toolLibrary.getAllTools().forEach((t) => {
  console.log(`Tool ${t.id}: offset = ${t.zOffset}mm`);
});

// Expected output:
// Tool 1: offset = -52.5mm
// Tool 2: offset = -51.2mm
```

**Prevention:**

- Always use G43 Hn after tool change
- Use non-zero offsets (unless reference tool)
- Include G49 only at end of program

---

## Visualization Problems

### Toolpath Not Visible

**Symptoms:**

- Loaded G-Code but nothing appears
- 3D view is blank or only shows grid

**Causes:**

1. Camera positioned incorrectly
2. G-Code coordinates outside workspace
3. WebGL context lost
4. All moves are rapids (G0) with dashed lines hard to see

**Solutions:**

**Reset camera:**

```javascript
// Click "Reset View" button
// Or manually reset in console
camera.position.set(150, 150, 150);
camera.lookAt(0, 0, 0);
controls.update();
```

**Check coordinate range:**

```javascript
// After loading G-Code, check statistics
console.log('X range:', minX, 'to', maxX);
console.log('Y range:', minY, 'to', maxY);
console.log('Z range:', minZ, 'to', maxZ);

// Coordinates should be within workspace:
// X: -150 to +150
// Y: -150 to +150
// Z: -50 to +50
```

**Reload WebGL:**

```
F5 or Ctrl+Shift+R to hard reload page
```

**Make rapids visible:**

```javascript
// Change rapid line opacity
rapidLineMaterial.opacity = 0.5; // More visible
// Or change to solid lines temporarily
rapidLineMaterial.setValues({ dashSize: 0, gapSize: 0 });
```

---

### Colors Bleeding Between Tools

**Symptoms:**

- Toolpath shows wrong colors in sections
- Color changes don't align with tool changes

**Causes:**

1. Geometry buffer not cleared between tool changes
2. Overlapping line segments
3. Incorrect segment attribution

**Solutions:**

**Reload G-Code:**

```
1. Click "Clear"
2. Reload G-Code file
3. Click "Simulate" again
```

**Check tool change positions:**

```javascript
// After simulation, inspect tool change log
const changes = document.getElementById('probing-log').innerText;
console.log(changes);

// Should show clear tool changes:
// "Tool change to T1 at X10 Y10 Z5"
// "Tool change to T2 at X20 Y20 Z5"
```

**Prevention:**

- Include safe moves (G0 Z5) before tool changes
- Don't overlap toolpaths from different tools
- Use M6 to mark clear tool boundaries

---

### Performance Degradation

**Symptoms:**

- 3D view lags or stutters
- Browser tab becomes unresponsive
- Fan noise increases

**Causes:**

1. Very large G-Code file (100k+ lines)
2. Too many tool changes (1000+)
3. Memory leak in rendering loop

**Solutions:**

**Optimize G-Code:**

```gcode
; BEFORE: 10000 tiny moves
G1 X0.01 Y0.01
G1 X0.02 Y0.02
G1 X0.03 Y0.03
; ...

; AFTER: Combine into larger moves
G1 X10 Y10  ; Single move covers same distance
```

**Reduce tool changes:**

```gcode
; BEFORE: Change tool every few moves
T0 M6
G1 X10
T1 M6
G1 X20
T0 M6
G1 X30

; AFTER: Batch operations per tool
T0 M6
G1 X10
G1 X30
T1 M6
G1 X20
```

**Close other tabs:**

- Chrome/Firefox: Close unused tabs
- Disable browser extensions
- Use Incognito/Private mode for testing

**Check memory usage:**

```
Chrome: Shift+Esc → Task Manager
Firefox: about:performance
```

---

## G-Code Parsing Issues

### "Invalid G-Code Line" Error

**Symptoms:**

- Error message appears during load
- Simulation stops at specific line

**Causes:**

1. Syntax error in G-Code
2. Unsupported command
3. Missing required parameters

**Solutions:**

**Check line number:**

```
Error: Invalid G-Code at line 157: "G1 X Y20"
                                        ↑ Missing X value
```

**Fix syntax:**

```gcode
; WRONG
G1 X Y20        ; Missing X value
G1 X10 20       ; Missing Y prefix
G X10 Y20       ; Missing command number

; CORRECT
G1 X10 Y20
G1 X10 Y20
G1 X10 Y20
```

**Supported commands:**

```gcode
✅ G0, G1       ; Motion
✅ G2, G3       ; Arcs
✅ G17, G18, G19; Plane selection
✅ G20, G21     ; Inches/mm
✅ G43, G49     ; Tool offset
✅ G90, G91     ; Absolute/relative
✅ M3, M5       ; Spindle
✅ M6           ; Tool change
✅ M104, M109   ; Extruder temp
✅ T0, T1, ...  ; Tool select

❌ G4 (dwell)   ; Parsed but ignored
❌ G28 (home)   ; Parsed but no action
❌ M0 (pause)   ; Parsed but no action
```

---

### Arc Commands Not Working

**Symptoms:**

- G2/G3 commands don't create curves
- Arcs appear as straight lines

**Causes:**

1. Missing I, J, K parameters
2. Incorrect plane selection (G17/G18/G19)
3. Arc calculation error

**Solutions:**

**Include arc parameters:**

```gcode
; WRONG - no center offset
G2 X10 Y10

; CORRECT - includes I,J
G2 X10 Y10 I5 J0  ; Arc with center at (X+5, Y+0)
```

**Set correct plane:**

```gcode
G17       ; XY plane (most common)
G2 X10 Y10 I5 J0  ; Arc in XY

G18       ; XZ plane
G2 X10 Z10 I5 K0  ; Arc in XZ

G19       ; YZ plane
G2 Y10 Z10 J5 K0  ; Arc in YZ
```

**Check arc validity:**

- Start and end points must be equidistant from center
- Radius tolerance: ±0.01mm

---

## Tool Offset Problems

### Z Position Incorrect After Tool Change

**Symptoms:**

- Tool appears to plunge too deep or too shallow
- Crashes into workpiece in simulation

**Causes:**

1. Offset sign reversed (positive instead of negative)
2. Offset value incorrect
3. G43 referencing wrong tool number

**Solutions:**

**Correct offset direction:**

```javascript
// Longer tools = MORE NEGATIVE offset
Reference tool: 50.0mm → offset =  0.00mm
Tool 1:         52.5mm → offset = -2.50mm  // 2.5mm longer
Tool 2:         51.2mm → offset = -1.20mm  // 1.2mm longer
Tool 3:         48.7mm → offset = +1.30mm  // 1.3mm shorter
```

**Match G43 to tool:**

```gcode
T1 M6
G43 H1    ; ✅ Correct: H matches T

T2 M6
G43 H1    ; ❌ Wrong: H1 offset for T2 tool
```

**Test offsets:**

```javascript
// In console, simulate offset application
const toolOffset = -2.5;
const programmedZ = -5;
const actualZ = programmedZ + toolOffset;
console.log(`Actual Z: ${actualZ}mm`); // Should be -7.5mm
```

---

### Offsets Not Cancelling

**Symptoms:**

- G49 doesn't remove offset
- Subsequent tool has double offset

**Causes:**

1. G49 not executed
2. New G43 applied before G49
3. Offset accumulation bug

**Solutions:**

**Proper sequence:**

```gcode
; WRONG - offset accumulates
T1 M6
G43 H1       ; Offset 1 active
; ... moves ...
T2 M6
G43 H2       ; Offset 2 ADDS to offset 1 (BUG)

; CORRECT - cancel between tools
T1 M6
G43 H1       ; Offset 1 active
; ... moves ...
G49          ; Cancel offset 1
T2 M6
G43 H2       ; Offset 2 active (clean slate)
```

**Verify offset state:**

```javascript
// After each tool change, check console
console.log('Offset active:', currentZOffset);

// Should show:
// After G43 H1: currentZOffset = -2.5
// After G49:    currentZOffset = 0
// After G43 H2: currentZOffset = -1.2
```

---

## Performance Issues

### Slow Loading Large Files

**Symptoms:**

- "Loading..." appears for >5 seconds
- Browser "Page Unresponsive" warning
- Memory usage spikes

**Causes:**

1. File size >5MB (>100k lines)
2. Synchronous parsing blocking UI
3. Too many tool changes to process

**Solutions:**

**Split large files:**

```bash
# Split 200k-line file into 4 parts
split -l 50000 large.gcode part_
# Simulate each part separately
```

**Increase timeout:**

```javascript
// In browser console, increase parse timeout
parseTimeout = 60000; // 60 seconds instead of 10
```

**Use file streaming:**

```javascript
// For future: load chunks progressively
// Current implementation loads entire file at once
```

---

### Choppy Visualization

**Symptoms:**

- 3D view stutters during playback
- Frame rate drops below 30 FPS

**Causes:**

1. Too many line segments rendered
2. Anti-aliasing enabled
3. High-DPI display scaling

**Solutions:**

**Reduce line segments:**

```javascript
// Set minimum move distance (combine small moves)
const MIN_MOVE_DISTANCE = 0.5; // mm
// Moves <0.5mm get merged into previous segment
```

**Disable anti-aliasing:**

```javascript
// In initThreeJS():
renderer = new THREE.WebGLRenderer({
  antialias: false, // Change to false
});
```

**Lower resolution:**

```javascript
// Reduce canvas size
renderer.setSize(800, 600); // Instead of full screen
```

**Monitor FPS:**

```javascript
// Add FPS counter
let lastTime = Date.now();
function renderLoop() {
  const now = Date.now();
  const fps = 1000 / (now - lastTime);
  console.log('FPS:', fps.toFixed(1));
  lastTime = now;

  requestAnimationFrame(renderLoop);
  renderer.render(scene, camera);
}
```

---

## Browser Compatibility

### WebGL Not Available

**Symptoms:**

- "WebGL not supported" error
- Black screen instead of 3D view

**Solutions:**

**Enable WebGL in Chrome:**

```
1. Go to chrome://flags
2. Search "WebGL"
3. Enable "WebGL" and "WebGL 2.0"
4. Relaunch browser
```

**Enable WebGL in Firefox:**

```
1. Go to about:config
2. Search "webgl"
3. Set webgl.disabled = false
4. Restart browser
```

**Check support:**

```javascript
// In console
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
console.log('WebGL available:', !!gl);
```

**Fallback browsers:**

- ✅ Chrome 90+
- ✅ Firefox 85+
- ✅ Edge 90+
- ✅ Safari 14+
- ❌ Internet Explorer (not supported)

---

### LocalStorage Issues

**Symptoms:**

- Tool library doesn't persist
- "QuotaExceededError" in console

**Solutions:**

**Clear storage:**

```javascript
// In console
localStorage.clear();
sessionStorage.clear();
```

**Check quota:**

```javascript
navigator.storage.estimate().then((estimate) => {
  const used = estimate.usage;
  const quota = estimate.quota;
  const percent = ((used / quota) * 100).toFixed(2);
  console.log(`Storage: ${percent}% (${used}/${quota} bytes)`);
});
```

**Export tool library:**

- Click "Save Library" to download JSON
- Store JSON file externally
- Re-import when needed

---

## File Import/Export

### Can't Load JSON Tool Library

**Symptoms:**

- "Invalid JSON" error
- Tools don't import

**Causes:**

1. Malformed JSON syntax
2. Missing required fields
3. Incorrect file encoding

**Solutions:**

**Validate JSON:**

```bash
# Use online validator: jsonlint.com
# Or command line:
python3 -m json.tool tools.json
```

**Required format:**

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

**Fix common errors:**

```json
// ❌ WRONG - trailing comma
{
  "name": "PLA Red",
  "diameter": 0.4,
}

// ✅ CORRECT
{
  "name": "PLA Red",
  "diameter": 0.4
}
```

---

### G-Code File Won't Load

**Symptoms:**

- File selector doesn't respond
- "File too large" warning

**Causes:**

1. File size >10MB
2. Wrong file extension
3. Browser security restrictions

**Solutions:**

**Check file size:**

```bash
ls -lh myfile.gcode
# If >10MB, consider splitting or simplifying
```

**Supported extensions:**

```
✅ .gcode
✅ .nc
✅ .txt
✅ .ngc
❌ .exe, .zip (security block)
```

**Bypass size limit:**

```javascript
// In console, increase max size
MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
```

---

## Getting More Help

### Collect Debug Information

When reporting issues, include:

```javascript
// Run this in console and paste output
console.log('Browser:', navigator.userAgent);
console.log('WebGL:', !!document.createElement('canvas').getContext('webgl'));
console.log('Tool count:', toolLibrary.getAllTools().length);
console.log('G-Code lines:', document.getElementById('gcode-input').value.split('\n').length);
console.log('Errors:', window.errors || 'none');
```

### Enable Verbose Logging

```javascript
// In console
DEBUG_MODE = true;
VERBOSE_LOGGING = true;
// Reload G-Code to see detailed parsing logs
```

### Report Bugs

Include:

1. Browser and OS version
2. G-Code sample (first 50 lines)
3. Tool library JSON export
4. Console error messages (F12 → Console)
5. Screenshots of issue

---

**Still stuck?** Check the [User Guide](./USER-GUIDE-MULTI-TOOL.md) or open an issue on GitHub.
