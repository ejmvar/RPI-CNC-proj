# RPI-CNC-proj — Raspberry Pi CNC Simulator

![Tests](https://github.com/YOUR_USERNAME/RPI-CNC-proj/actions/workflows/collab-e2e.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

Lightweight browser-based simulator for a Raspberry Pi CNC educational project. The simulator is a single-page front-end located at `Simulator/web/front.html`. It supports loading simple G-Code, a 3D visualization (Three.js), and a conceptual auto-leveling probe simulation.

## Features

### Core Simulator (`front.html`)

- **3D Visualization**: Three.js-based real-time toolpath preview
- **G-Code Editor**: Load, edit, and execute G-code programs
- **Auto-Leveling**: Mesh-based bed leveling with bilinear interpolation
- **Toolpath Optimization**: Remove redundant moves and convert to rapid traversals (⚡ Optimize Path button)
- **File I/O**: Upload/download G-code files, export compensated code
- **Playback Controls**: Step through G-code with visual feedback

### Collaboration Demo (`demo.html`)

- **Multi-Client Editing**: WebSocket-based real-time collaboration
- **Chat & Annotations**: Send messages and code annotations to other users
- **Session Management**: Export/import complete sessions with mesh data
- **Conflict Resolution**: Visual indicators for concurrent edits

### Testing & Quality

- **Unit Tests**: 80+ tests for parsers, transforms, and utilities
- **Integration Tests**: End-to-end workflows with mock backends
- **Performance Benchmarks**: G-code parser throughput (172k lines/sec)
- **Visual Regression**: Playwright snapshots for UI consistency
- **Coverage Reporting**: Jest coverage with 50% thresholds
- **Mock GRBL Firmware**: Full GRBL v1.1 simulation for testing

## Quick Start

1. Serve the simulator locally:

```bash
./scripts/serve.sh
# open http://localhost:8000/front.html in your browser
```

2. Run tests (unit/integration/e2e):

```bash
npm install
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:coverage # With coverage report
```

3. View test coverage:

```bash
npm run test:coverage
open coverage/index.html
```

## New Features (December 2025)

### Toolpath Optimization

Analyze and optimize G-code to remove redundant moves and improve efficiency:

- Click **⚡ Optimize Path** in `front.html`
- View statistics: moves removed, rapid conversions, size reduction %
- Automatically converts safe Z-axis moves (>5mm) to G0 rapid

### Chat & Collaboration

Real-time messaging in `demo.html`:

- Send chat messages to connected users
- Add code annotations with context
- Press Enter to send messages quickly

### Performance Monitoring

Benchmark suite in `tests/ut/gcode/parser.benchmark.test.js`:

- Measures parsing throughput (100, 1000, 10000 lines)
- Memory efficiency tracking
- Complex G-code with comments

### Mock GRBL Interface

Simulate CNC controller without hardware:

- Full GRBL v1.1 command support (G0/G1, $H, ?, $$)
- State machine (Idle/Run/Hold/Alarm/Home)
- Position tracking and status reports
- See `modules/backend/firmware/mock-grbl.js`

## Developer Notes

- The project uses a single-file front-end (`Simulator/web/front.html`). For larger features, prefer adding small ES modules under `modules/` and update docs.
- This repository enforces tests for every task. Add tests under `tests/ut`, `tests/it`, or `tests/e2e` as appropriate and rerun the test suite before committing.
- Pre-commit hooks run linting automatically (warnings allowed for browser globals)
