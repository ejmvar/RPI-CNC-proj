#!/usr/bin/env node
/* Simple demo runner for the collab WS bridge.
 * This script starts an HTTP server and attaches the optional WebSocket bridge
 * (modules/backend/collab/ws-server.js). If you also have the 'ws' package
 * installed it will create two Node WebSocket clients and demonstrate create/join/update.
 */

const http = require('http');
const path = require('path');

const { createCollabServer } = require('../modules/backend/collab/index.js');
const { createWsCollabServer } = require('../modules/backend/collab/ws-server');

const PORT = process.env.PORT || 8001;

const fs = require('fs');

const server = http.createServer((req, res) => {
  // Serve demo HTML and static JS module for browser testing
  const u = req.url || '/';
  if (u === '/' || u === '/demo' || u === '/demo.html') {
    const html = fs.readFileSync(path.join(__dirname, '..', 'Simulator', 'web', 'demo.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (u.startsWith('/js/') || u.startsWith('/static/')) {
    // map to Simulator/web
    const servePath = path.join(__dirname, '..', 'Simulator', 'web', u);
    if (fs.existsSync(servePath)) {
      const content = fs.readFileSync(servePath);
      const type = u.endsWith('.mjs') ? 'application/javascript' : 'text/plain';
      res.writeHead(200, { 'Content-Type': type });
      res.end(content);
      return;
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('RPI-CNC collab demo server\n');
});

server.listen(PORT, () => {
  console.log(`Collab demo HTTP listening on http://127.0.0.1:${PORT}/`);
  const collab = createCollabServer();
  let wss;
  try {
    wss = createWsCollabServer(collab, { server, path: '/c' });
  } catch (e) {
    console.error('Failed to attach WS bridge (ws module missing?)', e.message || e);
    console.error('Install a WebSocket server to try the live demo: npm install ws --save-dev');
    return;
  }

  if (!wss) {
    console.error('ws bridge not available (ws lib not installed).');
    console.error('Install the ws package: npm install ws --save-dev');
    return;
  }

  console.log('WebSocket collab bridge attached at ws://127.0.0.1:' + PORT + '/c');
  console.log('If you have the simulator open, point a client at that path or run this script with the WS client enabled.');

  // If the local 'ws' client class is available, show a short self-demo
  try {
    const WebSocket = require('ws');
    // connect two headless clients
    const url = `ws://127.0.0.1:${PORT}/c`;
    const c1 = new WebSocket(url);
    const c2 = new WebSocket(url);

    c1.on('open', () => {
      console.log('demo: client-1 open -> creating session s1');
      c1.send(JSON.stringify({ action: 'create', sessionId: 's1', initialState: { a: 1 } }));
    });

    c1.on('message', (m) => console.log('[c1] <-', m.toString()));
    c2.on('message', (m) => console.log('[c2] <-', m.toString()));

    c2.on('open', () => {
      console.log('demo: client-2 open -> joining s1 and updating');
      c2.send(JSON.stringify({ action: 'join', sessionId: 's1', clientId: 'c2' }));
      setTimeout(() => c2.send(JSON.stringify({ action: 'update', sessionId: 's1', patch: { a: 2 } })), 50);
    });

    // keep process running until Ctrl+C
    process.on('SIGINT', () => {
      console.log('closing demo');
      c1.close(); c2.close(); wss.close(); server.close(); process.exit(0);
    });
  } catch (e) {
    console.log('ws client not installed; install ws to run the self-demo (npm install ws --save-dev)');
  }
});
