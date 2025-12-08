# Modules folder — RPI-CNC-proj

This folder contains optional modules that can be added to the simulator to separate concerns.

Keep module implementations small and independent. The top-level `modules/modules-config.yml` controls which modules are considered active.

Current scaffold:
- `gcode/` — G‑Code parsing & utilities
- `presentation/` — Three.js helpers and visual components
- `backend/` — Server-side helpers and firmware gateway code (optional)
- `cli/` — Command-line utilities

When adding modules, include a short `README.md` and any usage examples. Prefer ES modules for in-browser code and document how to include them in `Simulator/web/front.html`.
