# Collab WebSocket Bridge

This folder contains the server-side pieces for collaborative editing support.

Files
- `index.js` — in-memory collab server (create/join/update/getSession)
- `ws-server.js` — optional WebSocket bridge that uses `ws` (if installed)

Demo / local run

1. Start the demo runner:

```bash
# from repository root
node scripts/collab-demo.js
```

2. If you have `ws` installed locally (npm install ws --save-dev) the demo will
   create two headless clients and show create/join/update activity in your
   terminal.

3. You can also open the simulator `Simulator/web/front.html` (run the simple
   static server in `scripts/serve.sh`) and connect the `COLLAB_CLIENT` to
   `ws://127.0.0.1:8001/c` to interact from the browser.

Notes
- The WebSocket bridge is an optional layer — the code will return `null` if
  the `ws` package is not installed so tests can still run in CI without the
  dependency. Integration tests in the repo mock `ws` where needed so the
  behavior remains deterministic.
