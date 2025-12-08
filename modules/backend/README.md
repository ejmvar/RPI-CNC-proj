# Backend Module (scaffold)

Purpose: optional server-side helpers such as offline asset serving, firmware gateways (GRBL/gcode streaming), or export/import endpoints.

Starter items:
- `server/` — a minimal express/static server example (if added, include instructions and a `package.json`).
- `firmware-gateway/` — connectors to serial devices or WebSocket bridges.

Mark this module `enabled: true` in `modules/modules-config.yml` only when adding real server code.
