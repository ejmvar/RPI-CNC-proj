# CNC Simulator - User Guide

Complete guide for using the CNC Simulator application.

## Table of Contents

- [Getting Started](#getting-started)
- [Interface Overview](#interface-overview)
- [Loading G-Code](#loading-g-code)
- [Simulation Controls](#simulation-controls)
- [Auto-Leveling](#auto-leveling)
- [Visualization Features](#visualization-features)
- [File Management](#file-management)
- [Collaboration](#collaboration)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tips & Tricks](#tips--tricks)

---

## Getting Started

### Accessing the Simulator

**Online:**
Visit [https://your-domain.com](https://your-domain.com)

**Local:**

```bash
cd Simulator/web
python3 -m http.server 8000
# Open: http://localhost:8000/front.html
```

### First Steps

1. **Create Account** (optional for local use)

   - Click "Register" in top-right
   - Enter email, password, and name
   - Click "Sign Up"

2. **Login**

   - Click "Login"
   - Enter credentials
   - Click "Sign In"

3. **Load G-Code**

   - Paste G-Code in editor (left panel)
   - Or load from file library
   - Click "Load G-Code"

4. **Start Simulation**
   - Click ▶️ Play button
   - Watch tool path in 3D view
   - Monitor current position

---

## Interface Overview

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Theme] [Shortcuts] [Library] [Settings]     [Profile] │  Header
├──────────────────┬──────────────────────────────────────┤
│                  │                                      │
│   G-Code Editor  │         3D Visualization             │  Main
│                  │                                      │
│  1. G21         │    ┌───────────────┐                 │
│  2. G90         │    │     Tool      │                 │
│  3. G0 X0 Y0    │    │      ▼        │                 │
│  4. G1 Z-2 F100 │    │  Workspace    │                 │
│  5. ...         │    │               │                 │
│                  │    └───────────────┘                 │
├──────────────────┴──────────────────────────────────────┤
│ ▶️ Play  ⏸️ Pause  ⏹️ Stop  ⏩ Fast   Position: X Y Z   │  Controls
└─────────────────────────────────────────────────────────┘
```

### Panels

**Left Panel - G-Code Editor:**

- Line numbers
- Syntax highlighting
- Current line indicator
- Editable text

**Right Panel - 3D View:**

- Tool representation
- Workspace grid
- Axes (X=Red, Y=Green, Z=Blue)
- Tool path (yellow lines)
- Current position indicator

**Bottom Panel - Controls:**

- Playback controls
- Speed adjustment
- Position display
- Status messages

---

## Loading G-Code

### Method 1: Paste Text

1. Click in G-Code editor (left panel)
2. Paste or type G-Code
3. Click "Load G-Code" button
4. View parsed commands and 3D preview

### Method 2: File Library

1. Click "📁 Library" button (top-right)
2. Browse your files and folders
3. Click file name to view
4. Click "Load" to open in simulator

### Method 3: Upload File

1. Click "Upload" button
2. Select `.gcode`, `.nc`, or `.tap` file
3. File opens automatically

### Method 4: Example Files

1. Click "Examples" menu
2. Select demo file:
   - **Simple Square** - Basic rectangle
   - **Circle Test** - Arc commands (G2/G3)
   - **Pocket** - Advanced toolpath
   - **Probe Grid** - Auto-leveling demo

---

## Simulation Controls

### Playback

**▶️ Play**

- Start/resume simulation
- Tool follows tool path
- Keyboard: `Space`

**⏸️ Pause**

- Pause at current position
- Resume with Play
- Keyboard: `Space`

**⏹️ Stop**

- Reset to start position
- Keyboard: `R`

**⏩ Fast Forward**

- Increase playback speed
- 1x → 2x → 5x → 10x
- Keyboard: `→` (right arrow)

**⏪ Rewind**

- Decrease playback speed
- Keyboard: `←` (left arrow)

### Speed Control

**Speed Slider:**

- Drag slider (1x - 10x)
- Fine control over playback
- Real-time speed adjustment

**Step Controls:**

- **Next Line:** Execute one command
- **Previous Line:** Go back one command
- Keyboard: `↑` / `↓`

### Position Display

Shows current tool position:

```
Position: X: 10.50  Y: 25.30  Z: -2.00
Line: 42 / 150 (28%)
```

---

## Auto-Leveling

### What is Auto-Leveling?

Auto-leveling compensates for uneven work surfaces by adjusting Z coordinates based on probe data.

### How It Works

```
Original Surface (assumed flat):
────────────────────────────

Actual Surface (warped):
╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱╲╱

Compensated Tool Path:
   ╱╲  ╱╲  ╱╲
```

### Using Auto-Leveling

#### Step 1: Probe the Surface

1. Click "Probe" button
2. Set probe grid size (e.g., 5x5)
3. Set probe area (mm)
4. Click "Start Probing"
5. Wait for completion

**Manual Probe Data:**

```javascript
// Paste in probe tab
const probeData = [
  [0.0, 0.05, 0.1], // Row 1
  [0.02, 0.08, 0.12], // Row 2
  [0.05, 0.1, 0.15], // Row 3
];
```

#### Step 2: Generate Mesh

1. View mesh visualization (3D colored surface)
2. Check coverage area
3. Adjust if needed

#### Step 3: Apply Compensation

1. Load your G-Code
2. Click "Apply Leveling"
3. View compensated preview (green path)
4. Export compensated G-Code

### Mesh Visualization

**Color coding:**

- 🟦 **Blue:** Low points (below average)
- 🟩 **Green:** Mid points (near average)
- 🟨 **Yellow:** High points (above average)
- 🟥 **Red:** Very high points

---

## Visualization Features

### Camera Controls

**Mouse:**

- **Left Click + Drag:** Rotate view
- **Right Click + Drag:** Pan view
- **Scroll Wheel:** Zoom in/out

**Touch:**

- **One Finger:** Rotate
- **Two Fingers:** Pinch to zoom, drag to pan

### Camera Bookmarks

**Save View:**

1. Position camera as desired
2. Click "Bookmarks" panel (bottom-left)
3. Click "💾 Save Bookmark"
4. Name your view (e.g., "Top View")

**Restore View:**

1. Open "Bookmarks" panel
2. Click bookmark name
3. Camera animates to saved position

**Predefined Views:**

- **Top:** Looking down (Z-axis)
- **Front:** Looking from front (Y-axis)
- **Side:** Looking from side (X-axis)
- **Isometric:** 45° angle view

**Keyboard Shortcuts:**

- `Ctrl+1`: Top view
- `Ctrl+2`: Front view
- `Ctrl+3`: Side view
- `Ctrl+0`: Reset to default

### Measurement Tools

**Distance Measurement:**

1. Click "📏 Measure" button
2. Select "Distance" mode
3. Click first point in 3D space
4. Click second point
5. View distance in mm

**Angle Measurement:**

1. Click "📐 Angle" button
2. Select "Angle" mode
3. Click three points (vertex in middle)
4. View angle in degrees

**Clear Measurements:**

- Click "🗑️ Clear All"
- Or delete individual measurements

### Multiple Viewports

**Split View:**

1. Click viewport icon (top-right)
2. Select layout:
   - **Single:** One view
   - **Horizontal:** Top/bottom split
   - **Vertical:** Left/right split
   - **Quad:** 4-way split (top/front/side/perspective)

**Benefits:**

- View from multiple angles simultaneously
- Compare original vs. compensated paths
- Inspect complex geometries

### Screenshots

**Capture View:**

1. Click "📷 Screenshot" menu (top-right)
2. Select quality:
   - **Normal:** Current resolution
   - **HD (2x):** Double resolution
   - **4K (4x):** Quadruple resolution
3. Image downloads automatically

**Copy to Clipboard:**

1. Click "📋 Copy to Clipboard"
2. Paste in other applications

**Filename Format:**

```
cnc-simulator-2025-12-16T14-30-45.png
```

---

## File Management

### Creating Files

1. Click "📁 Library" button
2. Click "New File"
3. Enter filename (e.g., `my-project.gcode`)
4. Add description and tags
5. Click "Create"

### Organizing with Folders

**Create Folder:**

1. Click "New Folder" in library
2. Name folder (e.g., "Projects")
3. Click "Create"

**Move to Folder:**

1. Edit file metadata
2. Select destination folder
3. Click "Save"

**Folder Tree:**

```
📁 Root
  📁 Work
    📁 Projects
      📄 part-1.gcode
      📄 part-2.gcode
  📁 Personal
    📄 test.gcode
```

### File Versioning

**View Versions:**

1. Open file details
2. Click "Versions" tab
3. See version history with timestamps

**Restore Version:**

1. Select older version
2. Click "Restore"
3. Creates new version from old content

### Search Files

**Quick Search:**

1. Type in search box (min 2 chars)
2. Results filter in real-time
3. Click result to open

**Advanced Search:**

- Search filename: `square`
- Search by tag: `tag:production`
- Search description: `test part`

### Sharing Files

**Make Public:**

1. Edit file
2. Toggle "Public" checkbox
3. Share URL with others

**Note:** Public files visible to all users

---

## Collaboration

### Starting a Session

1. Click "Collaborate" button
2. Click "Create Session"
3. Share session code with team
4. Wait for others to join

**Session Code Example:** `ABC-123-XYZ`

### Joining a Session

1. Click "Join Session"
2. Enter session code
3. Click "Join"
4. See other participants

### Collaborative Features

**Live Cursors:**

- See where others are editing
- Different color per user
- Shows username

**Real-time Edits:**

- Changes appear instantly
- Synchronized across all clients
- Conflict-free editing

**Chat:**

- Click chat icon (bottom-right)
- Type message
- Send to all participants

**Shared Simulation:**

- Host controls playback
- All viewers see same state
- Synchronized position

### Best Practices

- **Communicate:** Use chat for coordination
- **Take Turns:** Avoid editing same line simultaneously
- **Host Control:** One person controls simulation
- **Save Often:** Create file versions during session

---

## Keyboard Shortcuts

### Global

| Shortcut       | Action               |
| -------------- | -------------------- |
| `Ctrl+K`       | Open command palette |
| `Ctrl+/`       | Show all shortcuts   |
| `Ctrl+S`       | Save current file    |
| `Ctrl+O`       | Open file library    |
| `Ctrl+N`       | New file             |
| `Ctrl+Shift+D` | Toggle dark mode     |
| `Esc`          | Close modals/dialogs |

### Simulation

| Shortcut | Action         |
| -------- | -------------- |
| `Space`  | Play/Pause     |
| `R`      | Reset to start |
| `→`      | Speed up       |
| `←`      | Slow down      |
| `↑`      | Next line      |
| `↓`      | Previous line  |

### Camera

| Shortcut | Action       |
| -------- | ------------ |
| `Ctrl+1` | Top view     |
| `Ctrl+2` | Front view   |
| `Ctrl+3` | Side view    |
| `Ctrl+0` | Reset camera |

### Editor

| Shortcut | Action       |
| -------- | ------------ |
| `Ctrl+F` | Find in code |
| `Ctrl+G` | Go to line   |
| `Ctrl+Z` | Undo         |
| `Ctrl+Y` | Redo         |
| `Ctrl+A` | Select all   |

---

## Tips & Tricks

### Performance

**Optimize Large Files:**

- Use "Fast" playback mode
- Disable grid/axes if not needed
- Close unused browser tabs
- Enable hardware acceleration in browser

**Smooth Rendering:**

- Target 60 FPS
- Check performance monitor (`Ctrl+Shift+P`)
- Reduce viewport count if slow

### Workflow

**Quick Testing:**

1. Paste simple G-Code
2. Press `Space` to play
3. Adjust and reload
4. No need to save for quick tests

**Project Setup:**

1. Create folder for project
2. Save main file
3. Create variations (v1, v2, etc.)
4. Use tags for organization

**Auto-Leveling Workflow:**

1. Probe once per material
2. Save mesh with project
3. Apply to all files for that setup
4. Export compensated code to CNC

### Troubleshooting

**Simulation Not Starting:**

- Check G-Code loaded
- Look for parsing errors
- Verify work area size

**Slow Performance:**

- Check FPS in monitor
- Reduce simulation speed
- Close other applications
- Try different browser

**WebSocket Disconnected:**

- Check internet connection
- Reload page
- Check server status

---

## Keyboard Shortcut Cheat Sheet

```
╔════════════════════════════════════════╗
║      CNC Simulator Shortcuts           ║
╠════════════════════════════════════════╣
║ PLAYBACK                               ║
║  Space     Play/Pause                  ║
║  R         Reset                       ║
║  ← →       Speed control               ║
║  ↑ ↓       Step through lines          ║
╠════════════════════════════════════════╣
║ CAMERA                                 ║
║  Ctrl+1    Top view                    ║
║  Ctrl+2    Front view                  ║
║  Ctrl+3    Side view                   ║
║  Ctrl+0    Reset camera                ║
╠════════════════════════════════════════╣
║ FILES                                  ║
║  Ctrl+S    Save file                   ║
║  Ctrl+O    Open library                ║
║  Ctrl+N    New file                    ║
║  Ctrl+L    File library                ║
╠════════════════════════════════════════╣
║ INTERFACE                              ║
║  Ctrl+K    Command palette             ║
║  Ctrl+/    Show shortcuts              ║
║  Ctrl+Shift+D  Toggle dark mode        ║
║  Esc       Close dialogs               ║
╚════════════════════════════════════════╝
```

---

## Example Projects

### 1. Simple Square

```gcode
G21 ; mm mode
G90 ; absolute positioning
G0 X0 Y0 Z5 ; move to start, safe height
G1 Z-2 F100 ; plunge to depth
G1 X50 F300 ; move right
G1 Y50 ; move up
G1 X0 ; move left
G1 Y0 ; move down
G0 Z5 ; retract
```

### 2. Circle (Using Arcs)

```gcode
G21 G90
G0 X25 Y25 Z5
G1 Z-1 F100
G2 X25 Y25 I-25 J0 F200 ; full circle
G0 Z5
```

### 3. Auto-Level Example

```gcode
; Original Code
G0 Z-2

; After leveling (Z adjusted)
G0 Z-1.85 ; compensated for 0.15mm warp
```

---

## Support

**Documentation:**

- [Architecture Guide](../docs/ARCHITECTURE.md)
- [API Reference](../docs/API.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)

**Community:**

- GitHub Issues: [Report bugs](https://github.com/your-org/RPI-CNC-proj/issues)
- Discussions: [Ask questions](https://github.com/your-org/RPI-CNC-proj/discussions)
- Discord: [Join chat](https://discord.gg/your-invite)

**Contact:**

- Email: support@your-domain.com
- Twitter: [@YourProject](https://twitter.com/yourproject)

---

**Happy Machining! 🔧⚙️**
