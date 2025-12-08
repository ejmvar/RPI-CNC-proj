# G-Code Module (scaffold)

Purpose: place G‑Code parsing, canonicalization, transformations, and toolpath utilities here.

Starter items:
- `parser.js` — a small parser to extract X/Y/Z/F commands.
- `transform.js` — functions to apply bed compensation or tool offsets.

Keep interfaces pure and small; consumers should export functions that take strings/objects and return normalized objects or strings.
