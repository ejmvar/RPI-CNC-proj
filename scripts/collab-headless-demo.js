#!/usr/bin/env node
// Spawn multiple headless WS clients against the collab demo server to show
// live multi-client activity in the terminal.

const http = require('http');
const { createCollabServer } = require('../modules/backend/collab/index.js');
const { createWsCollabServer } = require('../modules/backend/collab/ws-server');

// Simple arg parsing (avoid adding a dependency)
const argv = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = argv.findIndex((a) => a === name || a === `--${name}` || a === `-${name[0]}`);
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return fallback;
}
const N = parseInt(getArg('n', getArg('count', '3')), 10) || 3;
const PORT = getArg('port', process.env.PORT || '8002');

async function run() {
  const server = http.createServer((req, res) => res.end('collab headless demo'));
  await new Promise((r) => server.listen(PORT, r));
  console.log(`server listening http://127.0.0.1:${PORT}`);

  const collab = createCollabServer();
  const wss = createWsCollabServer(collab, { server, path: '/c' });
  if (!wss) {
    console.error('ws bridge not available (ws package missing).');
    console.error('Run: npm install ws --save-dev');
    process.exit(1);
  }

  let WS;
  try {
    WS = require('ws');
  } catch (e) {
    console.error('ws client missing (npm install ws) - cannot spawn clients');
    process.exit(1);
  }

  const clients = [];

  for (let i = 0; i < N; i++) {
    const id = `cli-${i + 1}`;
    const ws = new WS(`ws://127.0.0.1:${PORT}/c`);
    ws._id = id;
    ws.on('open', () => console.log(`[${id}] open`));
    ws.on('message', (m) => console.log(`[${id}] <- ${m.toString()}`));
    ws.on('close', () => console.log(`[${id}] close`));
    clients.push(ws);
  }

  // when the first client opens, create session
  clients[0].on('open', () => {
    console.log(`[${clients[0]._id}] creating session s1`);
    clients[0].send(
      JSON.stringify({
        action: 'create',
        sessionId: 's1',
        initialState: { a: 1 },
        clientId: clients[0]._id,
      })
    );
  });

  // subsequent clients join when open
  clients.slice(1).forEach((c, idx) => {
    c.on('open', () => {
      console.log(`[${c._id}] joining s1`);
      c.send(JSON.stringify({ action: 'join', sessionId: 's1', clientId: c._id }));
      // after join, last client will issue an update
      if (idx === clients.slice(1).length - 1) {
        setTimeout(() => {
          console.log(`[${c._id}] updating s1`);
          c.send(
            JSON.stringify({
              action: 'update',
              sessionId: 's1',
              patch: { updatedBy: c._id, timestamp: Date.now() },
            })
          );
        }, 200);
      }
    });
  });

  process.on('SIGINT', async () => {
    console.log('shutting down clients');
    clients.forEach((c) => c.close());
    wss.close();
    await new Promise((r) => server.close(r));
    process.exit(0);
  });
}

run().catch((e) => {
  console.error('err', e);
  process.exit(1);
});
