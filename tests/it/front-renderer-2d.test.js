/**
 * Integration test: Verify 2D renderer is properly integrated in front.html
 */

const { describe, test, expect } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

describe('2D Renderer Integration', () => {
  const frontHtmlPath = path.join(__dirname, '../../Simulator/web/front.html');
  const renderer2dModulePath = path.join(__dirname, '../../modules/presentation/renderer-2d.mjs');
  const renderer2dWrapperPath = path.join(__dirname, '../../Simulator/web/js/renderer-2d.mjs');

  test('front.html imports renderer-2d module', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain("import * as RENDERER_2D from './js/renderer-2d.mjs'");
  });

  test('front.html exposes RENDERER_2D on window', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('window.RENDERER_2D = RENDERER_2D');
  });

  test('front.html has toggle renderer button', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('id="toggle-renderer-btn"');
    expect(content).toContain('onclick="toggleRenderer()"');
  });

  test('front.html has toggleRenderer function', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('function toggleRenderer()');
  });

  test('front.html has renderer2D variable', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('let renderer2D');
  });

  test('front.html has currentRenderMode variable', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain("let currentRenderMode = '3d'");
  });

  test('front.html switches between 2D and 3D modes', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain("currentRenderMode === '3d'");
    expect(content).toContain("currentRenderMode = '2d'");
    expect(content).toContain("currentRenderMode = '3d'");
  });

  test('front.html saves render mode preference', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain("localStorage.setItem('renderMode'");
  });

  test('front.html restores render mode preference', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('function restoreRenderMode()');
    expect(content).toContain("localStorage.getItem('renderMode')");
    expect(content).toContain('restoreRenderMode()');
  });

  test('renderer-2d module exists', () => {
    expect(fs.existsSync(renderer2dModulePath)).toBe(true);
  });

  test('renderer-2d wrapper exists', () => {
    expect(fs.existsSync(renderer2dWrapperPath)).toBe(true);
  });

  test('renderer-2d module exports SVGPathBuilder', () => {
    const content = fs.readFileSync(renderer2dModulePath, 'utf-8');
    expect(content).toContain('export class SVGPathBuilder');
  });

  test('renderer-2d module exports Viewport2D', () => {
    const content = fs.readFileSync(renderer2dModulePath, 'utf-8');
    expect(content).toContain('export class Viewport2D');
  });

  test('renderer-2d module exports Renderer2D', () => {
    const content = fs.readFileSync(renderer2dModulePath, 'utf-8');
    expect(content).toContain('export class Renderer2D');
  });

  test('renderer-2d module exports toolpathToSegments', () => {
    const content = fs.readFileSync(renderer2dModulePath, 'utf-8');
    expect(content).toContain('export function toolpathToSegments');
  });

  test('renderer-2d wrapper re-exports module', () => {
    const content = fs.readFileSync(renderer2dWrapperPath, 'utf-8');
    expect(content).toContain("export * from '../../../modules/presentation/renderer-2d.mjs'");
  });

  test('toggleRenderer creates Renderer2D instance', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('new window.RENDERER_2D.Renderer2D');
  });

  test('toggleRenderer converts toolpath to segments', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('window.RENDERER_2D.toolpathToSegments');
  });

  test('toggleRenderer updates button text and style', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain("btn.textContent = '🎲 3D View'");
    expect(content).toContain("btn.textContent = '📐 2D View'");
  });

  test('toggleRenderer hides/shows 3D renderer', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain("renderer.domElement.style.display = 'none'");
    expect(content).toContain("renderer.domElement.style.display = 'block'");
  });

  test('toggleRenderer stops/starts 3D animation', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('cancelAnimationFrame(animationFrameId)');
    expect(content).toContain('animate()');
  });
});
