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

**Happy Simulating!** 🚀
