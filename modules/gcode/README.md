# G-Code Module (scaffold)

Purpose: place G‑Code parsing, canonicalization, transformations, and toolpath utilities here.

Starter items:
- `parser.js` — a small parser to extract X/Y/Z/F commands.
- `transform.js` — functions to apply bed compensation or tool offsets.

Current (Phase 2) status
- `parser.mjs` and browser wrapper `Simulator/web/js/gcode-parser.mjs` provide parsing helpers (parse, parseLine).
- `transform.mjs` and browser wrapper `Simulator/web/js/gcode-transform.mjs` provide:
	- bilinearInterpolate(mesh, x, y)
	- applyMeshCompensationToGCode(gcodeText, mesh)

Usage examples (in code)
- In node/ES modules:
	import { parse } from './parser.mjs';
	import { applyMeshCompensationToGCode } from './transform.mjs';

- In the browser use the web wrappers and the front end exposes them on window.GCODE_PARSER and window.GCODE_TRANSFORM when loaded by `front.html`.

Testing
- Unit tests for the parser and transform modules are located under `tests/ut/gcode/` and are executed via `npm test`.

Keep interfaces pure and small; consumers should export functions that take strings/objects and return normalized objects or strings.
