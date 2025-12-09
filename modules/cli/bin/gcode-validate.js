#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { validateGCode } = require('../gcode-validate.mjs');

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error('Usage: gcode-validate <file>');
  process.exitCode = 2;
  process.exit();
}

const file = path.resolve(process.cwd(), argv[0]);
if (!fs.existsSync(file)) {
  console.error('file not found:', file);
  process.exitCode = 2;
  process.exit();
}

const text = fs.readFileSync(file, 'utf8');
const res = validateGCode(text);
if (res.ok) {
  console.log('OK — G-Code looks valid');
  process.exitCode = 0;
} else {
  console.error('Errors found:');
  res.errors.forEach(e => console.error(`line ${e.line}: ${e.token} — ${e.message}`));
  process.exitCode = 1;
}
