/**
 * Integration tests for material removal in front.html
 */

const fs = require('fs');
const path = require('path');

describe('Material Removal Integration', () => {
  let frontHtmlContent;

  beforeAll(() => {
    const frontPath = path.join(__dirname, '../../Simulator/web/front.html');
    frontHtmlContent = fs.readFileSync(frontPath, 'utf8');
  });

  test('imports material-removal module', () => {
    expect(frontHtmlContent).toContain(
      "import * as MATERIAL_REMOVAL from './js/material-removal.mjs'"
    );
  });

  test('exposes MATERIAL_REMOVAL on window object', () => {
    expect(frontHtmlContent).toContain('window.MATERIAL_REMOVAL = MATERIAL_REMOVAL');
  });

  test('declares materialSimulator variable', () => {
    expect(frontHtmlContent).toContain('let materialSimulator = null');
  });

  test('declares materialRemovalEnabled variable', () => {
    expect(frontHtmlContent).toContain('let materialRemovalEnabled = false');
  });

  test('has toggle material removal button', () => {
    expect(frontHtmlContent).toContain('id="toggle-material-btn"');
    expect(frontHtmlContent).toContain('onclick="toggleMaterialRemoval()"');
    expect(frontHtmlContent).toContain('🔨 Material Removal');
  });

  test('defines toggleMaterialRemoval function', () => {
    expect(frontHtmlContent).toContain('function toggleMaterialRemoval()');
  });

  test('defines updateMaterialStats function', () => {
    expect(frontHtmlContent).toContain('function updateMaterialStats()');
  });

  test('toggleMaterialRemoval checks for MATERIAL_REMOVAL module', () => {
    const funcMatch = frontHtmlContent.match(
      /function toggleMaterialRemoval\(\)\s*\{[\s\S]*?if\s*\(\s*!MATERIAL_REMOVAL\s*\)/
    );
    expect(funcMatch).toBeTruthy();
  });

  test('toggleMaterialRemoval initializes simulator with estimateWorkpieceBounds', () => {
    const funcMatch = frontHtmlContent.match(
      /MATERIAL_REMOVAL\.estimateWorkpieceBounds\s*\(\s*toolpathPoints\s*,\s*\d+\s*\)/
    );
    expect(funcMatch).toBeTruthy();
  });

  test('toggleMaterialRemoval creates MaterialRemovalSimulator instance', () => {
    const funcMatch = frontHtmlContent.match(
      /new\s+MATERIAL_REMOVAL\.MaterialRemovalSimulator\s*\(\s*scene\s*,\s*bounds/
    );
    expect(funcMatch).toBeTruthy();
  });

  test('toggleMaterialRemoval passes configuration options', () => {
    expect(frontHtmlContent).toContain('resolution:');
    expect(frontHtmlContent).toContain('materialColor:');
    expect(frontHtmlContent).toContain('materialOpacity:');
  });

  test('toggleMaterialRemoval updates button state when enabled', () => {
    expect(frontHtmlContent).toContain('Material Removal (ON)');
    expect(frontHtmlContent).toContain('bg-green-500');
  });

  test('applyCommandAtIndex tracks linear moves', () => {
    const funcContent = frontHtmlContent.match(
      /function applyCommandAtIndex[\s\S]*?return isMovement;/
    );
    expect(funcContent).toBeTruthy();
    const funcText = funcContent[0];
    expect(funcText).toContain('let isLinearMove = false');
    expect(funcText).toContain('if (value === 1) isLinearMove = true');
  });

  test('applyCommandAtIndex calls processCut for linear moves', () => {
    const funcContent = frontHtmlContent.match(
      /function applyCommandAtIndex[\s\S]*?return isMovement;/
    );
    expect(funcContent).toBeTruthy();
    const funcText = funcContent[0];
    expect(funcText).toContain('materialSimulator');
    expect(funcText).toContain('materialRemovalEnabled');
    expect(funcText).toContain('isLinearMove');
    expect(funcText).toContain('processCut');
  });

  test('applyCommandAtIndex gets tool diameter from toolLibrary', () => {
    const funcContent = frontHtmlContent.match(
      /function applyCommandAtIndex[\s\S]*?return isMovement;/
    );
    expect(funcContent).toBeTruthy();
    const funcText = funcContent[0];
    expect(funcText).toContain('toolLibrary.getActiveTool()');
    expect(funcText).toContain('activeTool.diameter');
  });

  test('applyCommandAtIndex passes correct parameters to processCut', () => {
    const funcContent = frontHtmlContent.match(
      /function applyCommandAtIndex[\s\S]*?return isMovement;/
    );
    expect(funcContent).toBeTruthy();
    const funcText = funcContent[0];
    expect(funcText).toContain(
      'materialSimulator.processCut(currentPosition, nextPos, toolRadius)'
    );
  });

  test('updateMaterialStats retrieves and formats statistics', () => {
    const funcContent = frontHtmlContent.match(
      /function updateMaterialStats\(\)\s*\{[\s\S]*?\n\s*\}/
    );
    expect(funcContent).toBeTruthy();
    const funcText = funcContent[0];
    expect(funcText).toContain('materialSimulator.getStats()');
    expect(funcText).toContain('removedPercentage');
    expect(funcText).toContain('removedVolume');
    expect(funcText).toContain('totalVolume');
  });

  test('updateMaterialStats displays formatted message', () => {
    const funcContent = frontHtmlContent.match(
      /function updateMaterialStats\(\)\s*\{[\s\S]*?\n\s*\}/
    );
    expect(funcContent).toBeTruthy();
    const funcText = funcContent[0];
    expect(funcText).toContain('showMessage');
    expect(funcText).toContain('Material:');
    expect(funcText).toContain('% removed');
  });

  test('handles errors during initialization gracefully', () => {
    expect(frontHtmlContent).toMatch(/try\s*\{[\s\S]{0,500}estimateWorkpieceBounds/);
  });

  test('disables material removal when toggled off', () => {
    expect(frontHtmlContent).toContain('materialSimulator.setEnabled(false)');
  });
});
