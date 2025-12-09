<!-- Copilot / AI agent guidance for the RPI-CNC-proj repository -->

# Copilot Instructions — RPI-CNC-proj

Purpose

- Help AI coding agents become productive quickly in this repository: a small Raspberry Pi CNC project with a browser-based simulator.

Big picture

- This repo contains a front-end simulator located at `Simulator/web/` that provides a G‑Code editor, a 3D visualization (Three.js) and a conceptual auto‑leveling simulation.
- The simulator is static HTML/JS/CSS — there is no build system, backend server, or tests in the repo.

Key files and locations

- `Simulator/web/front.html`: single-page simulator. Primary place for behavior, constants and UI. Examples:
  - Workspace size constants: `WORKSPACE_SIZE` and `WORKSPACE_HEIGHT` defined in `initThreeJS()`.
  - G‑code parsing and simulation loop live in `processNextCommand()` and `loadGCode()`.
  - Coordinate mapping: the code maps CNC Z → Three.js Y via `tool.position.set(nextPos.x, nextPos.z, nextPos.y)`.
- `Simulator/static/`: contains local assets (three.min.js, tailwind folders). Note: `front.html` currently uses CDN versions — replace the CDN URLs with local paths to use offline assets.
- `Simulator/web/static/`: contains local assets (three.min.js, tailwind/3.4.17). `front.html` now references these local files so the simulator works offline.
- Root note file: `20251116 _Proyecto CNC Raspberry Pi Integral .md` contains project notes and context; review before major design changes.
- Project plan: `.github/PLAN CNC architecture.md` contains phases, tasks, and status tracking (DONE/WIP/TODO/BLOCKED/FAILED). Check this before proposing new features to avoid duplicating work or starting tasks out of sequence.

Developer workflows (what works now)

- Quick preview (static site):
  - From repo root: `cd Simulator/web && python3 -m http.server 8000` and open `http://localhost:8000/front.html`.
  - From repo root: `./scripts/serve.sh` (starts a python simple HTTP server) and open `http://localhost:8000/front.html`.
  - Or use any static server (e.g. `npx serve .`).
- There are no test, build, or CI scripts in the repository — do not look for `package.json`, `Makefile`, or test runners.

Testing

- This project adopts an automated test policy: every new feature or task must include tests (unit/integration/e2e) where appropriate and tests must be run after each change.
- Test layout: `./tests/ut/` (unit), `./tests/it/` (integration), `./tests/e2e/` (end-to-end / smoke tests).
- Run tests locally with:

```
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
```

When proposing code changes, include one or more tests demonstrating correctness and run them as part of your change. Automated agents should fail fast and do not commit changes that reduce test coverage or break existing tests.

Project conventions & patterns

- Single-file frontend: changes to UI/logic are made directly inside `front.html` (script tags). Keep edits small and self-contained.
- Visual/geometry constants are declared near `initThreeJS()` — changing simulated workspace geometry or probe behavior usually involves updating those constants and the probing logic in `simulateProbing()`.
- Logging/UI pattern: functions use `showMessage()` which writes into `#probing-log` (prepend). Reuse this for user-facing messages rather than console logs when possible.

Integration points & external dependencies

- External CDNs used in `front.html`:
  - Tailwind CSS via CDN
  - Three.js via CDN (r128 in the file content)
- Commented hints in the code indicate conceptual integration with CNC firmware (e.g. GRBL, spindle commands like `M3`/`M5`) — there is no firmware code here. Any integration with hardware should be clearly isolated and feature-gated.

What to watch for when editing

- Keep the single-file nature in mind: large features may warrant extracting JS to new modules under `Simulator/web/` (create `js/` or `src/`) but note there is no bundler — if you add modules, prefer plain ES modules and update `front.html` `<script type="module">`.
- Coordinate conventions: Three.js uses Y as vertical axis; CNC commonly uses Z — confirm conversions when modifying movement code.
- Offline asset fallback: if changing CDN usage, ensure local files in `Simulator/static/` are referenced and relative paths are correct.

Examples (copy-pasteable guidance)

- Start preview server:

```
cd Simulator/web
python3 -m http.server 8000
# then open http://localhost:8000/front.html
```

- Map CNC Z to Three.js Y (example found in code):

```
tool.position.set(nextPos.x, nextPos.z, nextPos.y)
```

Notes about repository state

- No CI/test/build tools detected. Create minimal docs or scripts (e.g. `scripts/serve.sh`) if you add developer tooling.
- If adding non-trivial JS modules or a build step, include `README.md` with explicit dev commands and keep the simulator runnable as a static site for quick testing.

If anything here is unclear or you'd like the instructions expanded (examples for extracting modules, adding local asset usage, or adding a simple `serve` script), tell me which part to expand.

**Planned Architecture & Modules**

- This repository currently hosts a lightweight static simulator. The attached design notes (`.github/PLAN CNC architecture.md`) recommend splitting future work into separate modules to keep concerns isolated and enable optional features.
- Suggested module folders (scaffolded in `modules/`):
  - `modules/gcode/` — G‑Code parsing, transformation, and toolpath utilities.
  - `modules/presentation/` — Three.js visualization helpers, canvas management, and UI components.
    Phase 2 status
  - This repo now contains Phase 2 ES modules and browser wrappers for the key pieces of the simulator:
    - `modules/gcode/parser.mjs` + `Simulator/web/js/gcode-parser.mjs` (G‑Code parsing)
    - `modules/gcode/transform.mjs` + `Simulator/web/js/gcode-transform.mjs` (mesh compensation / transforms)
    - `modules/presentation/three-helper.mjs` + `Simulator/web/js/three-helper.mjs` (Three.js scene init)
    - `modules/presentation/controls.mjs` + `Simulator/web/js/controls.mjs` (lightweight orbit controls)
  - `front.html` now imports these browser wrappers and exposes them on `window` (useful for interactive debugging).
  - `modules/backend/` — Optional server-side helpers (data export/import, offline asset serving, or firmware gateways).
  - `modules/cli/` — CLI utilities for offline processing, converting G‑Code, or running batch simulations.
- Configuration: use `modules/modules-config.yml` to enable/disable modules or select between alternate implementations (for example: `gcode: enabled: true`, `presentation: impl: threejs|svg`).
- Keep modules minimal and independent. If you introduce ES modules, prefer plain `type="module"` scripts and document how to use them without a bundler.

These plans are intentionally lightweight and align with the repository's current single-file frontend approach; they exist to guide modularization while keeping the simulator runnable as a static site.
