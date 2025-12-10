const fs = require('fs');
const path = require('path');

describe('front.html G-Code export integration', () => {
  let frontHtml;

  beforeAll(() => {
    const frontPath = path.join(process.cwd(), 'Simulator', 'web', 'front.html');
    frontHtml = fs.readFileSync(frontPath, 'utf-8');
  });

  test('front.html contains exportCompensatedGCode function', () => {
    expect(frontHtml).toMatch(/function exportCompensatedGCode\(\)/);
  });

  test('exportCompensatedGCode creates blob and triggers download', () => {
    expect(frontHtml).toMatch(/const blob = new Blob/);
    expect(frontHtml).toMatch(/URL\.createObjectURL/);
    expect(frontHtml).toMatch(/link\.download/);
    expect(frontHtml).toMatch(/link\.click\(\)/);
    expect(frontHtml).toMatch(/URL\.revokeObjectURL/);
  });

  test('export button exists in UI with proper onclick handler', () => {
    expect(frontHtml).toMatch(/onclick="exportCompensatedGCode\(\)"/);
    expect(frontHtml).toMatch(/Export G-Code/i);
  });

  test('export function applies mesh compensation when available', () => {
    expect(frontHtml).toMatch(/if \(\s*window\.LATEST_MESH/);
    expect(frontHtml).toMatch(/window\.GCODE_TRANSFORM\.applyMeshCompensationToGCode/);
  });

  test('export function handles case when no mesh is available', () => {
    expect(frontHtml).toMatch(/Exporting G-Code without mesh compensation/);
  });

  test('exported filename includes timestamp', () => {
    expect(frontHtml).toMatch(/gcode-compensated-/);
    expect(frontHtml).toMatch(/\.nc/);
    expect(frontHtml).toMatch(/new Date\(\)\.toISOString/);
  });

  test('export function validates G-Code is present', () => {
    expect(frontHtml).toMatch(/if \(!gcodeText \|\| !gcodeText\.trim\(\)\)/);
    expect(frontHtml).toMatch(/No G-Code to export/);
  });

  test('export shows appropriate user messages', () => {
    expect(frontHtml).toMatch(/Exporting G-Code with mesh compensation applied/);
    expect(frontHtml).toMatch(/G-Code exported as/);
  });
});
