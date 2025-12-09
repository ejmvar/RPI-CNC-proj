# PLAN CNC architecture.md

## Base infrastructure

I suggest the following, feel free to add alternatives or modules to meet best standards and keeo an open mind project, able ti introduce new features and/or improvements.
Keep also open to different tools, on every level (gcode, presentation, backend management, cnc operation planning and user online interface, as html front and cli tools).

Keep separate folders for the modules integrating the full solution.
Keep config for enabling/disabling tools (to add/include, also if they offer similar functionality)

---

## Project Phases & Task Tracking

### Phase 1: Foundation & Simulator Core [WIP]
**Goal:** Establish a working static simulator with basic G-Code visualization.

#### Tasks:
- [x] **DONE** — Create initial single-page simulator (`Simulator/web/front.html`)
- [x] **DONE** — Implement basic Three.js scene with CNC workspace visualization
- [x] **DONE** — Add G-Code editor textarea with syntax handling
- [x] **DONE** — Implement simple G-Code parser (G0/G1/X/Y/Z/F commands)
- [x] **DONE** — Add simulation controls (load, simulate, pause, reset)
- [x] **DONE** — Create conceptual auto-leveling/probing simulation
- [x] **DONE** — Add `showMessage()` logging pattern to `#probing-log`
- [x] **DONE** — Initialize git repository
- [x] **DONE** — Create `.github/copilot-instructions.md` for AI agent guidance
- [x] **DONE** — Scaffold `modules/` folder structure with READMEs
- [x] **DONE** — Create `modules/modules-config.yml` toggle configuration
 - [x] **DONE** — Switch from CDN to local assets (Three.js, Tailwind)
 - [x] **DONE** — Add `scripts/serve.sh` for quick dev server startup
 - [x] **DONE** — Create root `README.md` with project overview and quick-start

### Phase 2: Module Extraction & Code Organization [PLANNED]
**Goal:** Refactor single-file simulator into modular components.

#### Tasks:
- [ ] **TODO** — Extract G-Code parser to `modules/gcode/parser.js` (ES module)
- [ ] **TODO** — Move Three.js initialization to `modules/presentation/three-helper.js`
- [ ] **TODO** — Create `modules/presentation/controls.js` for camera/orbit controls
- [ ] **TODO** — Implement `modules/gcode/transform.js` for coordinate transformations
- [ ] **TODO** — Add bed leveling mesh compensation logic to gcode module
- [ ] **TODO** — Update `front.html` to use `type="module"` imports
- [ ] **TODO** — Document module integration patterns in module READMEs

### Phase 3: Enhanced Visualization & Toolpath [PLANNED]
**Goal:** Improve 3D visualization with actual toolpath rendering.

#### Tasks:
- [ ] **TODO** — Render G-Code toolpath as 3D line segments
- [ ] **TODO** — Add color coding for rapid moves (G0) vs cutting moves (G1)
- [ ] **TODO** — Implement smooth interpolation between positions
- [ ] **TODO** — Add visual probe points and mesh overlay for auto-leveling
- [ ] **TODO** — Show current position indicator and coordinate display
- [ ] **TODO** — Add simulation speed control (playback rate slider)
- [ ] **TODO** — Implement step-by-step command execution mode

### Phase 4: Backend & Firmware Integration [PLANNED]
**Goal:** Optional server-side features and real CNC communication.

#### Tasks:
- [ ] **TODO** — Create minimal static file server in `modules/backend/server/`
- [ ] **TODO** — Implement GRBL serial communication gateway (WebSocket bridge)
- [ ] **TODO** — Add G-Code file upload/download endpoints
- [ ] **TODO** — Create session persistence (save/load simulator state)
- [ ] **TODO** — Add real-time CNC position streaming (if hardware connected)
- [ ] **TODO** — Implement firmware command queue visualization

### Phase 5: CLI Tools & Offline Processing [PLANNED]
**Goal:** Command-line utilities for batch operations.

#### Tasks:
- [ ] **TODO** — Create `modules/cli/bin/gcode-validate` script
- [ ] **TODO** — Add `modules/cli/bin/apply-leveling` for mesh compensation
- [ ] **TODO** — Implement `modules/cli/bin/simulate-batch` for headless runs
- [ ] **TODO** — Create G-Code format converter (different dialects)
- [ ] **TODO** — Add toolpath statistics generator (distance, time estimates)

### Phase 6: Testing & Quality [PLANNED]
**Goal:** Add test coverage and CI/CD.

#### Tasks:
- [ ] **TODO** — Set up test framework (Jest or similar)
- [ ] **TODO** — Add unit tests for G-Code parser
- [ ] **TODO** — Add integration tests for coordinate transformations
- [ ] **TODO** — Create visual regression tests for Three.js scenes
- [ ] **TODO** — Set up GitHub Actions CI workflow
- [ ] **TODO** — Add linting (ESLint) and formatting (Prettier)

### Phase 7: Advanced Features [FUTURE]
**Goal:** Extended capabilities and polish.

#### Ideas:
- [ ] **FUTURE** — Multi-tool support and tool change visualization
- [ ] **FUTURE** — Material removal simulation (actual mesh subtraction)
- [ ] **FUTURE** — Collision detection and bounds checking
- [ ] **FUTURE** — G-Code optimization (remove redundant moves)
- [ ] **FUTURE** — Alternative renderer (SVG/Canvas 2D for low-end devices)
- [ ] **FUTURE** — Mobile-optimized touch controls
- [ ] **FUTURE** — Collaborative editing (multi-user G-Code sessions)

---

## Status Legend
- **DONE** — Task completed and committed
- **WIP** — Work in progress, partially implemented
- **TODO** — Planned but not started
- **BLOCKED** — Waiting on external dependency or decision
- **FAILED** — Attempted but abandoned (document reason inline)
- **FUTURE** — Long-term idea, not prioritized

---

## Notes on Task Management
- Update this file as work progresses; change `[ ]` to `[x]` and update status tags.
- When tasks fail or are blocked, add inline notes explaining why (e.g., `[x] **FAILED** — Reason: dependency X not available`).
- Use git commits to track major phase completions.
- AI agents should check this file before proposing new features to avoid duplicate work.

### Mandatory testing policy for all tasks
- Every task or feature MUST include relevant tests (unit/integration/e2e) — add tests under `./tests/{ut|it|e2e}/...`.
- Rerun the test suite after each change and do not merge or commit changes that break tests.
- When creating module code, add unit tests in `tests/ut/{module}/...` and integration/e2e tests when multiple modules or front-end behavior must be validated.


