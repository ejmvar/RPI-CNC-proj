#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

(async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) { console.error('Usage: gcode-convert <file> [--format <name>]'); process.exit(2); }
  const file = path.resolve(process.cwd(), args[0]);
  const formatIndex = args.indexOf('--format');
  const format = formatIndex >= 0 ? args[formatIndex + 1] : null;
  if (!fs.existsSync(file)) { console.error('file not found'); process.exit(2); }
  const text = fs.readFileSync(file, 'utf8');
  const mod = await import('../gcode-convert.mjs');
  const out = mod.convert(text, { format });
  process.stdout.write(out);
})();
