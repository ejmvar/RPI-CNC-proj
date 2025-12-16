# RPI-CNC-proj — Raspberry Pi CNC Simulator

[![Tests](https://github.com/YOUR_USERNAME/RPI-CNC-proj/actions/workflows/collab-e2e.yml/badge.svg)](https://github.com/YOUR_USERNAME/RPI-CNC-proj/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Code Style: ESLint](https://img.shields.io/badge/code_style-eslint-4b32c3.svg)](https://eslint.org/)
[![Coverage](https://img.shields.io/badge/coverage-30%25-yellow.svg)](https://codecov.io)

Lightweight browser-based simulator for a Raspberry Pi CNC educational project. The simulator is a single-page front-end located at `Simulator/web/front.html`. It supports loading simple G-Code, a 3D visualization (Three.js), and a conceptual auto-leveling probe simulation.

📚 **[View Documentation](docs/)** | 🎯 **[Try Examples](examples/)** | 💬 **[Join Discussions](https://github.com/YOUR_USERNAME/RPI-CNC-proj/discussions)** | 📝 **[Report Issues](https://github.com/YOUR_USERNAME/RPI-CNC-proj/issues)**

## Features

### Core Simulator (`front.html`)

- **3D Visualization**: Three.js-based real-time toolpath preview
- **G-Code Editor**: Load, edit, and execute G-code programs
- **Multi-Tool Support**: ✨ **NEW** - Simulate multiple tools/materials with color-coded visualization
  - Tool Library management (add/update/remove tools)
  - Tool offset compensation (G43/G49)
  - Color-coded toolpaths per tool
  - Statistics per tool (distance, tool changes)
  - 3D printing multi-material support
  - CNC multi-tool workflows
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

### Option 1: Quick Access via Makefile (Recommended)

```bash
make help    # See all available commands
make s       # Start server (alias for 'serve')
make t       # Run tests (alias for 'test')
make c       # Check coverage (alias for 'coverage')
```

### Option 2: Manual Commands

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

## Documentation

### Multi-Tool Feature (Complete)

- **[📖 User Guide](docs/USER-GUIDE-MULTI-TOOL.md)**: Complete tutorial for multi-tool/multi-material simulation
- **[🔧 Troubleshooting](docs/TROUBLESHOOTING-MULTI-TOOL.md)**: Common issues and solutions
- **[🧑‍💻 API Reference](docs/API-REFERENCE-MULTI-TOOL.md)**: Developer integration guide
- **[📝 Examples](examples/README.md)**: Working G-Code examples (3D printing, PCB milling)
- **[🏗️ Implementation Summary](MULTIFILAMENT-IMPLEMENTATION-SUMMARY.md)**: Technical architecture details
- **[📊 Documentation Index](docs/INDEX.md)**: Complete documentation directory

### Other Documentation

- **[Firmware Integration Guide](docs/FIRMWARE_INTEGRATION.md)**: 5 approaches to connect with real/simulated CNC firmware (Serial, WebSocket, REST, GPIO, Mock GRBL)
- **[Performance Optimization Guide](docs/PERFORMANCE_OPTIMIZATION.md)**: Detailed strategies for parser, rendering, and memory optimization
- **[Makefile Reference](#makefile-commands)**: Complete list of 40+ development commands

## New Features (December 2024)

### Multi-Tool & Multi-Material Simulation ✨

**Complete multi-tool G-Code simulation with tool library management:**

- **Tool Library UI**: Add, update, remove tools with custom properties
  - Name, diameter, color, Z offset, speed, temperature
  - Save/load tool configurations as JSON
  - Presets for 3D printing and CNC milling
- **Color-Coded Visualization**: Each tool renders in its configured color
- **Tool Change Markers**: Visual indicators (spheres) at tool change positions
- **Tool Offset Compensation**: Automatic Z-offset application (G43/G49)
- **Statistics Panel**: Distance per tool, tool change count, material usage
- **G-Code Support**: T (tool select), M6 (tool change), G43/G49 (offset)
- **Examples Included**:
  - 5-color spiral vase (3D printing)
  - 4-tool PCB milling workflow

**Status**: ✅ Production ready with 548 tests, 56.66% coverage, complete documentation

**Learn More**: See [Multi-Tool User Guide](docs/USER-GUIDE-MULTI-TOOL.md) or [Documentation Index](docs/INDEX.md)

---

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

## Makefile Commands

The project includes a comprehensive Makefile with 40+ documented commands organized into categories:

### Testing Commands

```bash
make test              # Run all tests
make test-quick        # Fast tests (exclude WebSocket)
make test-coverage     # Coverage report
make test-unit         # Unit tests only
make test-integration  # Integration tests
make test-e2e          # End-to-end tests
make test-grbl         # GRBL firmware tests
make watch             # Watch mode
```

### Development Commands

```bash
make serve             # Start dev server (localhost:8000)
make dev               # Start dev server
make clean             # Remove generated files
make fix               # Auto-fix linting issues
make status            # Git status + coverage stats
make commit-check      # Pre-commit validation
```

### Firmware & Performance

```bash
make run-grbl          # Interactive GRBL simulator
make firmware-info     # Show 5 integration options
make benchmark         # Run performance benchmarks
make perf-report       # Detailed performance analysis
make optimization-tips # Show optimization strategies
```

### Utilities

```bash
make help              # Show categorized help
make list              # List all targets
make coverage          # Alias for test-coverage
```

### Quick Aliases

```bash
make t                 # Alias for test
make s                 # Alias for serve
make c                 # Alias for coverage
make l                 # Alias for list
make b                 # Alias for benchmark
```

Run `make help` for the complete categorized list with descriptions.

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
