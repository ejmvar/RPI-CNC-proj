#!/usr/bin/env node
/**
 * Collaborative Editing Server
 *
 * Starts a WebSocket server for real-time G-Code collaboration.
 * Usage: node scripts/collab-server.js [port]
 */

import { CollaborativeServer } from '../modules/backend/websocket-server.mjs';

const port = parseInt(process.argv[2], 10) || 8765;
const server = new CollaborativeServer({ port });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down collaborative server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down collaborative server...');
  await server.stop();
  process.exit(0);
});

// Start server
server.start();

// Log statistics every 30 seconds
setInterval(() => {
  const stats = server.getStats();
  if (stats.activeSessions > 0 || stats.activeClients > 0) {
    console.log('[Stats]', JSON.stringify(stats, null, 2));
  }
}, 30000);

console.log(`Collaborative editing server ready on port ${port}`);
console.log('Press Ctrl+C to stop');
