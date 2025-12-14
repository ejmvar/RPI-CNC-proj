# Multi-Tool & Multi-Material User Guide

**Version:** 1.0  
**Date:** December 14, 2024  
**Status:** Production Ready

---

## Table of Contents

1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Using the Tool Library UI](#using-the-tool-library-ui)
4. [3D Printing Workflow](#3d-printing-workflow)
5. [CNC Milling Workflow](#cnc-milling-workflow)
6. [Understanding Tool Offsets](#understanding-tool-offsets)
7. [G-Code Commands](#g-code-commands)
8. [Tips & Best Practices](#tips--best-practices)
9. [Examples](#examples)

---

## Introduction

The Multi-Tool feature allows you to visualize and simulate G-Code that uses multiple tools or materials. This is essential for:

- **Multi-Material 3D Printing**: Different filaments (PLA, PETG, TPU) with different colors
- **Multi-Tool CNC Milling**: Different end mills, drills, and bits for various operations
- **Tool Length Compensation**: Automatic Z-offset adjustment for different tool lengths

### Key Features

✅ **Tool Library Management** - Define unlimited tools with custom properties  
✅ **Color-Coded Visualization** - Each tool renders in its configured color  
✅ **Tool Change Tracking** - See exactly where tool changes occur  
✅ **Offset Compensation** - Automatic Z-offset application (G43/G49)  
✅ **Statistics** - Distance traveled per tool, number of tool changes  
✅ **Persistent Storage** - Save/load tool configurations as JSON

---

## Quick Start

### 1. Open the Simulator

```bash
cd Simulator/web
python3 -m http.server 8000
```

Navigate to `http://localhost:8000/front.html`

### 2. Load a Tool Preset

Click one of the preset buttons:

- **"Load 3D Print Tools"** - PLA Red, PETG Blue, TPU Black
- **"Load CNC Tools"** - End mills, drill, v-bit

### 3. Load Example G-Code

Try the included examples:

- `examples/multifilament-demo.gcode` - Two-color 3D print
- `examples/multitool-cnc-demo.gcode` - Three-tool CNC job

### 4. Simulate

Click **"Load G-Code"** → **"Simulate"** to see the color-coded toolpath!

---

## Using the Tool Library UI

The Tool Library panel (right side of screen) provides complete control over your tools.

### Tool Selector

**Dropdown menu** showing all defined tools:

```
Tool 0: PLA Red (0.4mm)
Tool 1: PETG Blue (0.4mm)
Tool 2: TPU Black (0.4mm)
```

Select a tool to view/edit its configuration.

### Tool Configuration Form

Each tool has these properties:

| Property        | Description          | Units        | Example   |
| --------------- | -------------------- | ------------ | --------- |
| **Name**        | Display name         | text         | "PLA Red" |
| **Diameter**    | Tool/nozzle diameter | mm           | 0.4       |
| **Color**       | Visualization color  | hex          | #ff0000   |
| **Z Offset**    | Tool length offset   | mm           | -52.5     |
| **Speed**       | Feed rate or temp    | mm/min or °C | 200       |
| **Temperature** | Extruder temp (3D)   | °C           | 210       |

### Buttons

- **Add Tool** - Create new tool with current form values
- **Update Tool** - Save changes to selected tool
- **Remove Tool** - Delete selected tool (with confirmation)
- **Load 3D Print Tools** - Load default 3D printing preset
- **Load CNC Tools** - Load default CNC milling preset
- **Save Library** - Export tools to JSON file
- **Load Library** - Import tools from JSON file

### Statistics Display

After loading G-Code, you'll see:

```
Tool Changes: 2
Distance per Tool:
  Tool 0 (PLA Red): 150.23 mm
  Tool 1 (PETG Blue): 89.47 mm
Total Distance: 239.70 mm
```

---

## 3D Printing Workflow

### Step 1: Define Your Materials

```javascript
// Example: Three extruder setup
Tool 0: PLA Red (primary color)
  - Diameter: 0.4mm
  - Color: #ff0000
  - Temperature: 210°C

Tool 1: PETG Blue (accent color)
  - Diameter: 0.4mm
  - Color: #0000ff
  - Temperature: 240°C

Tool 2: TPU Black (flexible parts)
  - Diameter: 0.4mm
  - Color: #000000
  - Temperature: 220°C
```

### Step 2: Generate Multi-Material G-Code

Your slicer should generate tool change commands:

```gcode
; Start with Tool 0 (PLA Red)
T0
M104 S210        ; Set temp to 210°C
M109 S210        ; Wait for temp
G1 X10 Y10 E5    ; Extrude PLA

; Switch to Tool 1 (PETG Blue)
T1
M6               ; Tool change
M104 S240        ; Set temp to 240°C
M109 S240        ; Wait for temp
G1 X20 Y20 E10   ; Extrude PETG
```

### Step 3: Load and Simulate

1. Click **"Load 3D Print Tools"** (or configure manually)
2. Paste your G-Code into the editor
3. Click **"Load G-Code"**
4. Click **"Simulate"**

You'll see:

- **Red toolpath** for PLA sections
- **Blue toolpath** for PETG sections
- **Colored spheres** marking tool changes

### Step 4: Verify Statistics

Check the statistics panel:

```
Tool Changes: 1
Distance per Tool:
  Tool 0 (PLA Red): 250.5 mm
  Tool 1 (PETG Blue): 180.2 mm
```

This helps you estimate:

- Material consumption per filament
- Print time per material
- Number of purge operations needed

---

## CNC Milling Workflow

### Step 1: Define Your Tooling

```javascript
// Example: Three-operation job
Tool 1: 6mm End Mill (roughing)
  - Diameter: 6.0mm
  - Color: #ff8800
  - Z Offset: -52.5mm
  - Spindle Speed: 12000 RPM

Tool 2: 3mm End Mill (finishing)
  - Diameter: 3.0mm
  - Color: #00ff00
  - Z Offset: -51.2mm
  - Spindle Speed: 15000 RPM

Tool 3: 90° V-Bit (engraving)
  - Diameter: 1.0mm
  - Color: #0088ff
  - Z Offset: -50.8mm
  - Spindle Speed: 18000 RPM
```

### Step 2: Generate Multi-Tool G-Code

Your CAM software should output:

```gcode
; Tool 1 - Roughing with 6mm end mill
T1 M6
G43 H1           ; Apply tool length offset
S12000 M3        ; Spindle on at 12000 RPM
G0 Z5            ; Rapid to clearance
G1 Z-2 F800      ; Plunge and mill

; Tool 2 - Finishing with 3mm end mill
T2 M6
G43 H2           ; Apply tool 2 offset
S15000 M3        ; Spindle on at 15000 RPM
G1 Z-2.5 F600    ; Finishing passes

; Tool 3 - Engraving with v-bit
T3 M6
G43 H3           ; Apply tool 3 offset
S18000 M3        ; Spindle on at 18000 RPM
G1 Z-0.5 F400    ; Shallow engraving
```

### Step 3: Load and Simulate

1. Click **"Load CNC Tools"** (or configure manually)
2. Load your G-Code file
3. Click **"Simulate"**

You'll see:

- **Orange toolpath** for roughing (T1)
- **Green toolpath** for finishing (T2)
- **Blue toolpath** for engraving (T3)
- **Solid lines** for cutting moves (G1)
- **Dashed lines** for rapid moves (G0)

### Step 4: Verify Tool Offsets

**CRITICAL for CNC**: Tool length offsets must be accurate!

The simulator applies offsets automatically when G43 is active:

```
Z10 with -52.5mm offset → actual Z = -42.5mm
```

Check your toolpath to ensure:

- ✅ No collisions with workpiece
- ✅ Correct depth per tool
- ✅ Safe rapid moves above material

---

## Understanding Tool Offsets

### What Are Tool Offsets?

Different tools have different lengths. Tool offsets compensate for this so:

- You program Z positions relative to the workpiece
- The controller adjusts for actual tool length
- You don't reprogram when changing tools

### Example Scenario

```
Reference tool (touch-off): 50mm from spindle
Tool 1 (6mm end mill):      52.5mm → offset = -2.5mm
Tool 2 (3mm end mill):      51.2mm → offset = -1.2mm
Tool 3 (v-bit):             50.8mm → offset = -0.8mm
```

### G-Code Commands

```gcode
G43 H1    ; Enable offset for tool 1 (-2.5mm)
G1 Z0     ; Programmed Z=0, actual Z=-2.5mm

G49       ; Cancel offset
G1 Z0     ; Programmed Z=0, actual Z=0mm

G43 H2    ; Enable offset for tool 2 (-1.2mm)
G1 Z0     ; Programmed Z=0, actual Z=-1.2mm
```

### In the Simulator

The simulator visualizes the **actual** tool positions after offset:

- Enter offsets in the Tool Library
- Load G-Code with G43/G49 commands
- See the true toolpath positions

---

## G-Code Commands

### Tool Selection

```gcode
T0        ; Select tool 0
T1        ; Select tool 1
T5        ; Select tool 5
```

**Effect:**

- Changes active tool in simulator
- Auto-creates tool if not defined
- Updates toolpath color

### Tool Change

```gcode
M6        ; Execute tool change
```

**Effect:**

- Creates tool change marker (colored sphere)
- In real machine: pauses for manual/automatic tool change
- Counts toward tool change statistics

### Tool Length Offset

```gcode
G43 H1    ; Enable offset, use tool 1 offset value
G43 H2    ; Enable offset, use tool 2 offset value
G43       ; Enable offset, use current tool offset
G49       ; Cancel offset
```

**Effect:**

- Applies Z offset from Tool Library
- All Z moves adjusted by offset
- G49 cancels adjustment

### Temperature Control (3D Printing)

```gcode
M104 S200  ; Set extruder temp to 200°C (don't wait)
M109 S200  ; Set extruder temp to 200°C (wait)
M140 S60   ; Set bed temp to 60°C (don't wait)
M190 S60   ; Set bed temp to 60°C (wait)
```

**Effect:**

- Parsed but not simulated (no heating visualization)
- Useful for verifying correct temps per material

### Spindle Control (CNC)

```gcode
S12000 M3  ; Spindle CW at 12000 RPM
M5         ; Spindle off
```

**Effect:**

- Parsed but not simulated (no spindle visualization)
- Useful for verifying correct speeds per tool

---

## Tips & Best Practices

### 3D Printing

✅ **Use distinct colors** - Makes multi-material visualization clear  
✅ **Verify temperatures** - Check M104/M109 commands match material  
✅ **Check retraction** - Each tool should have retract settings  
✅ **Purge towers** - Include purge/wipe moves after tool changes  
✅ **Prime before printing** - First move after tool change should prime nozzle

❌ **Don't skip tool changes** - Always use T + M6 for clarity  
❌ **Don't forget to heat** - Include M109 after each T command

### CNC Milling

✅ **Measure offsets carefully** - Use touch probe or manual measurement  
✅ **Use negative offsets** - Longer tools have more negative offsets  
✅ **Test in air first** - Run above workpiece before cutting  
✅ **Order operations logically** - Roughing → finishing → engraving  
✅ **Include spindle commands** - S value and M3/M5 for each tool

❌ **Don't assume offsets** - Always measure, never guess  
❌ **Don't skip G43** - Offset compensation must be explicit  
❌ **Don't rapid too low** - Set safe Z clearance above part

### General

✅ **Save your tool library** - Click "Save Library" after configuration  
✅ **Use example files** - Start with working examples, then modify  
✅ **Check statistics** - Verify tool changes and distances make sense  
✅ **Zoom and rotate** - Use mouse to inspect toolpath from all angles

---

## Examples

### Example 1: Simple Two-Color 3D Print

```gcode
; Two-color cube base
G90 G21          ; Absolute mode, millimeters
T0               ; Red PLA
M109 S210        ; Heat to 210°C
G0 Z0.3          ; First layer height
G1 X0 Y0 E0      ; Start position
G1 X50 Y0 E15    ; Extrude red line
G1 X50 Y50 E30   ; Continue red
G1 X0 Y50 E45    ; Complete red square

T1 M6            ; Switch to Blue PETG
M109 S240        ; Heat to 240°C
G0 X10 Y10       ; Move inside
G1 X40 Y10 E55   ; Extrude blue line
G1 X40 Y40 E65   ; Continue blue
G1 X10 Y40 E75   ; Complete blue square
G1 X10 Y10 E80   ; Close blue square
```

**Result:** Red outer square, blue inner square

### Example 2: Three-Tool CNC Part

```gcode
; Mill a pocket with three tools
G90 G21 G17      ; Absolute, mm, XY plane

; Tool 1: 6mm end mill roughing
T1 M6
G43 H1
S12000 M3
G0 X0 Y0 Z5
G1 Z-5 F500      ; Rough pocket
G1 X50 F1000
G1 Y50
G1 X0
G1 Y0
G0 Z5
G49 M5

; Tool 2: 3mm end mill finishing
T2 M6
G43 H2
S15000 M3
G0 X0 Y0 Z5
G1 Z-5.5 F300    ; Finish walls
G1 X50 F600
G1 Y50
G1 X0
G1 Y0
G0 Z5
G49 M5

; Tool 3: V-bit engraving
T3 M6
G43 H3
S18000 M3
G0 X25 Y25 Z5
G1 Z-0.2 F200    ; Engrave text
; ... engraving moves ...
G0 Z5
G49 M5
```

**Result:** Roughed pocket, finished walls, engraved text

### Example 3: Complex Multi-Material

See `examples/multifilament-demo.gcode` for a complete working example with:

- Two materials (PLA + PETG)
- Temperature management
- Multiple layers
- Tool change markers
- Statistics tracking

### Example 4: Full CNC Workflow

See `examples/multitool-cnc-demo.gcode` for a complete working example with:

- Three tools (end mills + v-bit)
- Tool length offsets
- Spindle speed control
- Safe rapid moves
- Layer-by-layer milling

---

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING-MULTI-TOOL.md) for common issues and solutions.

---

## Next Steps

- 📖 Read the [API Reference](./API-REFERENCE-MULTI-TOOL.md) for developers
- 🎨 Try the [Advanced Examples](../examples/) for inspiration
- 💬 Join discussions about multi-tool features
- 🐛 Report bugs or request features on GitHub

---

**Happy Multi-Tool Machining!** 🛠️✨
