# RPI-CNC-proj — Raspberry Pi CNC Simulator

![Tests](https://github.com/YOUR_USERNAME/RPI-CNC-proj/actions/workflows/collab-e2e.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

Lightweight browser-based simulator for a Raspberry Pi CNC educational project. The simulator is a single-page front-end located at `Simulator/web/front.html`. It supports loading simple G-Code, a 3D visualization (Three.js), and a conceptual auto-leveling probe simulation.

Quick start

1. Serve the simulator locally:

```bash
./scripts/serve.sh
# open http://localhost:8000/front.html in your browser
```

2. Run tests (unit/integration/e2e):

```bash
npm install
npm test
```

Developer notes

- The project uses a single-file front-end (`Simulator/web/front.html`). For larger features, prefer adding small ES modules under `modules/` and update docs.
- This repository enforces tests for every task. Add tests under `tests/ut`, `tests/it`, or `tests/e2e` as appropriate and rerun the test suite before committing.
