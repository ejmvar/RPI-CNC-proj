/**
 * Integration test: Verify touch controls are properly integrated in front.html
 */

const { describe, test, expect } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

describe('Touch Controls Integration', () => {
  const frontHtmlPath = path.join(__dirname, '../../Simulator/web/front.html');
  const touchControlsModulePath = path.join(
    __dirname,
    '../../modules/presentation/touch-controls.mjs'
  );
  const touchControlsWrapperPath = path.join(
    __dirname,
    '../../Simulator/web/js/touch-controls.mjs'
  );

  test('front.html imports touch-controls module', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain("import * as TOUCH_CONTROLS from './js/touch-controls.mjs'");
  });

  test('front.html exposes TOUCH_CONTROLS on window', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('window.TOUCH_CONTROLS = TOUCH_CONTROLS');
  });

  test('front.html checks for touch device', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('isTouchDevice()');
  });

  test('front.html initializes MobileTouchControls', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('new window.TOUCH_CONTROLS.MobileTouchControls');
  });

  test('front.html applies mobile styles', () => {
    const content = fs.readFileSync(frontHtmlPath, 'utf-8');
    expect(content).toContain('applyMobileStyles()');
  });

  test('touch-controls module exists', () => {
    expect(fs.existsSync(touchControlsModulePath)).toBe(true);
  });

  test('touch-controls wrapper exists', () => {
    expect(fs.existsSync(touchControlsWrapperPath)).toBe(true);
  });

  test('touch-controls module defines TouchState class', () => {
    const content = fs.readFileSync(touchControlsModulePath, 'utf-8');
    expect(content).toContain('class TouchState');
  });

  test('touch-controls module exports MobileTouchControls class', () => {
    const content = fs.readFileSync(touchControlsModulePath, 'utf-8');
    expect(content).toContain('export class MobileTouchControls');
  });

  test('touch-controls module exports isTouchDevice function', () => {
    const content = fs.readFileSync(touchControlsModulePath, 'utf-8');
    expect(content).toContain('export function isTouchDevice()');
  });

  test('touch-controls module exports getDeviceType function', () => {
    const content = fs.readFileSync(touchControlsModulePath, 'utf-8');
    expect(content).toContain('export function getDeviceType()');
  });

  test('touch-controls module exports applyMobileStyles function', () => {
    const content = fs.readFileSync(touchControlsModulePath, 'utf-8');
    expect(content).toContain('export function applyMobileStyles()');
  });

  test('touch-controls module handles gestures', () => {
    const content = fs.readFileSync(touchControlsModulePath, 'utf-8');
    expect(content).toContain('_handlePan');
    expect(content).toContain('_handlePinchZoom');
    expect(content).toContain('_handleRotate');
  });

  test('touch-controls wrapper re-exports module', () => {
    const content = fs.readFileSync(touchControlsWrapperPath, 'utf-8');
    expect(content).toContain("export * from '../../../modules/presentation/touch-controls.mjs'");
  });

  test('touch-controls module sets up event listeners', () => {
    const content = fs.readFileSync(touchControlsModulePath, 'utf-8');
    expect(content).toContain('touchstart');
    expect(content).toContain('touchmove');
    expect(content).toContain('touchend');
    expect(content).toContain('touchcancel');
  });

  test('touch-controls module has configurable options', () => {
    const content = fs.readFileSync(touchControlsModulePath, 'utf-8');
    expect(content).toContain('enablePan');
    expect(content).toContain('enableZoom');
    expect(content).toContain('enableRotate');
    expect(content).toContain('panSpeed');
    expect(content).toContain('zoomSpeed');
    expect(content).toContain('rotateSpeed');
  });
});
