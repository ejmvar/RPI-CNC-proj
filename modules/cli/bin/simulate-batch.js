#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

(async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: simulate-batch <gcode-file>');
    process.exit(2);
  }
  const file = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(file)) { console.error('file not found'); process.exit(2); }
  const text = fs.readFileSync(file, 'utf8');
  const mod = await import('../simulate-batch.mjs');
  const result = mod.simulateBatchFromText(text);
  console.log('commands:', result.summary.commands);
  console.log('last:', JSON.stringify(result.summary.lastPosition));
  console.log('bounds:', JSON.stringify(result.summary.bounds));
})();
