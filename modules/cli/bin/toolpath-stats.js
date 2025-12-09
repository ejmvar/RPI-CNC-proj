#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

(async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) { console.error('Usage: toolpath-stats <points-json-file> [--feed <mm/min>]'); process.exit(2); }
  const file = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(file)) { console.error('file not found'); process.exit(2); }
  const feedIndex = args.indexOf('--feed');
  const feed = feedIndex >= 0 ? Number(args[feedIndex + 1]) : undefined;
  const pts = JSON.parse(fs.readFileSync(file, 'utf8'));
  const mod = await import('../toolpath-stats.mjs');
  const res = mod.computeToolpathStats(pts, { feed });
  console.log(JSON.stringify(res, null, 2));
})();
