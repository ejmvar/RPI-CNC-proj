#!/usr/bin/env node
const fs = require('fs');

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Usage: apply-leveling <gcode-file> <mesh-json-file> [--out out-file]');
    process.exit(2);
  }
  const [gcodeFile, meshFile, outFlag, outFile] = argv;
  if (!fs.existsSync(gcodeFile)) {
    console.error('gcode file not found');
    process.exit(2);
  }
  if (!fs.existsSync(meshFile)) {
    console.error('mesh file not found');
    process.exit(2);
  }

  const gcodeText = fs.readFileSync(gcodeFile, 'utf8');
  const mesh = JSON.parse(fs.readFileSync(meshFile, 'utf8'));

  const mod = await import('../../gcode/transform.mjs');
  const result = mod.applyMeshCompensationToGCode(gcodeText, mesh);

  if (outFlag === '--out' && outFile) {
    fs.writeFileSync(outFile, result, 'utf8');
    console.log(`Wrote ${outFile}`);
  } else {
    process.stdout.write(result);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
