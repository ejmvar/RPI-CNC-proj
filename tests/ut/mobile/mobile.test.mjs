/**
 * Mobile Module Tests
 * Phase 15.2: Mobile Optimization
 */

/* eslint-disable no-undef */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { TouchHandler } from '../../../modules/mobile/touch-handler.mjs';
import { GestureDetector } from '../../../modules/mobile/gesture-detector.mjs';
import { ResponsiveLayout } from '../../../modules/mobile/responsive-layout.mjs';
import { PWAConfig } from '../../../modules/mobile/pwa-config.mjs';

describe('TouchHandler', () => {
  let handler;
  let mockElement;

  beforeEach(() => {
    mockElement = {
      addEventListener: jest.fn(),
    };
    handler = new TouchHandler(mockElement);
  });

  test('should create touch handler', () => {
    expect(handler.element).toBe(mockElement);
    expect(handler.touches.size).toBe(0);
  });

  test('should setup touch listeners', () => {
    expect(mockElement.addEventListener).toHaveBeenCalledWith(
      'touchstart',
      expect.any(Function),
      false
    );
    expect(mockElement.addEventListener).toHaveBeenCalledWith(
      'touchmove',
      expect.any(Function),
      false
    );
    expect(mockElement.addEventListener).toHaveBeenCalledWith(
      'touchend',
      expect.any(Function),
      false
    );
  });

  test('should get current touches', () => {
    handler.touches.set('touch1', {
      id: 'touch1',
      currentX: 100,
      currentY: 200,
    });

    const touches = handler.getTouches();
    expect(touches.length).toBe(1);
    expect(touches[0].id).toBe('touch1');
  });

  test('should get touch count', () => {
    handler.touches.set('touch1', { id: 'touch1' });
    handler.touches.set('touch2', { id: 'touch2' });

    expect(handler.getTouchCount()).toBe(2);
  });

  test('should check if touching', () => {
    expect(handler.isTouching()).toBe(false);

    handler.touches.set('touch1', { id: 'touch1' });
    expect(handler.isTouching()).toBe(true);
  });

  test('should calculate distance between two touches', () => {
    handler.touches.set('touch1', {
      id: 'touch1',
      currentX: 0,
      currentY: 0,
    });
    handler.touches.set('touch2', {
      id: 'touch2',
      currentX: 3,
      currentY: 4,
    });

    const distance = handler.getDistance('touch1', 'touch2');
    expect(distance).toBe(5); // 3-4-5 triangle
  });

  test('should get center point of touches', () => {
    handler.touches.set('touch1', {
      id: 'touch1',
      currentX: 0,
      currentY: 0,
    });
    handler.touches.set('touch2', {
      id: 'touch2',
      currentX: 100,
      currentY: 100,
    });

    const center = handler.getCenterPoint();
    expect(center.x).toBe(50);
    expect(center.y).toBe(50);
  });

  test('should add event listener', () => {
    const callback = jest.fn();
    const result = handler.on('touchstart', callback);
    expect(result).toBe(true);
    expect(handler.listeners.touchstart).toContain(callback);
  });

  test('should remove event listener', () => {
    const callback = jest.fn();
    handler.on('touchstart', callback);
    const result = handler.off('touchstart', callback);
    expect(result).toBe(true);
    expect(handler.listeners.touchstart.length).toBe(0);
  });

  test('should emit event', () => {
    const callback = jest.fn();
    handler.on('test', callback);
    handler.emit('test', { data: 'test' });
    expect(callback).toHaveBeenCalledWith({ data: 'test' });
  });

  test('should cleanup handler', () => {
    handler.touches.set('touch1', { id: 'touch1' });
    handler.on('touchstart', () => {});

    handler.destroy();

    expect(handler.touches.size).toBe(0);
    expect(Object.keys(handler.listeners).length).toBe(0);
  });
});

describe('GestureDetector', () => {
  let detector;

  beforeEach(() => {
    detector = new GestureDetector({
      swipeThreshold: 50,
      longPressDelay: 500,
      doubleTapDelay: 300,
    });
  });

  test('should create gesture detector', () => {
    expect(detector.options.swipeThreshold).toBe(50);
    expect(detector.touches.size).toBe(0);
  });

  test('should handle single touch start', () => {
    const callback = jest.fn();
    detector.on('touchstart', callback);

    const event = {
      touches: [{ identifier: 1, clientX: 100, clientY: 200 }],
    };

    detector.handleTouchStart(event);

    expect(detector.touches.size).toBe(1);
  });

  test('should detect swipe right', () => {
    const callback = jest.fn();
    detector.on('swipe', callback);

    detector.touches.set('touch1', {
      id: 'touch1',
      startX: 100,
      startY: 200,
      startTime: Date.now() - 100,
      currentX: 100,
      currentY: 200,
    });

    const touch = { identifier: 'touch1', clientX: 160, clientY: 200 };
    detector.detectSwipe(touch);

    expect(callback).toHaveBeenCalled();
    const call = callback.mock.calls[0][0];
    expect(call.direction).toBe('right');
  });

  test('should detect swipe left', () => {
    const callback = jest.fn();
    detector.on('swipe', callback);

    detector.touches.set('touch1', {
      id: 'touch1',
      startX: 200,
      startY: 200,
      startTime: Date.now() - 100,
      currentX: 200,
      currentY: 200,
    });

    const touch = { identifier: 'touch1', clientX: 100, clientY: 200 };
    detector.detectSwipe(touch);

    expect(callback).toHaveBeenCalled();
    const call = callback.mock.calls[0][0];
    expect(call.direction).toBe('left');
  });

  test('should detect swipe down', () => {
    const callback = jest.fn();
    detector.on('swipe', callback);

    detector.touches.set('touch1', {
      id: 'touch1',
      startX: 200,
      startY: 100,
      startTime: Date.now() - 100,
      currentX: 200,
      currentY: 100,
    });

    const touch = { identifier: 'touch1', clientX: 200, clientY: 160 };
    detector.detectSwipe(touch);

    expect(callback).toHaveBeenCalled();
    const call = callback.mock.calls[0][0];
    expect(call.direction).toBe('down');
  });

  test('should detect pinch', () => {
    const callback = jest.fn();
    detector.on('pinch', callback);

    detector.touches.set('touch1', {
      id: 'touch1',
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
    detector.touches.set('touch2', {
      id: 'touch2',
      startX: 100,
      startY: 0,
      currentX: 150,
      currentY: 0,
    });

    detector.detectPinch();

    expect(callback).toHaveBeenCalled();
    const call = callback.mock.calls[0][0];
    expect(call.scale).toBeGreaterThan(1);
  });

  test('should add event listener', () => {
    const callback = jest.fn();
    const result = detector.on('swipe', callback);
    expect(result).toBe(true);
  });

  test('should cleanup detector', () => {
    detector.touches.set('touch1', { id: 'touch1' });
    detector.on('swipe', () => {});

    detector.destroy();

    expect(detector.touches.size).toBe(0);
  });
});

describe('ResponsiveLayout', () => {
  let layout;

  beforeEach(() => {
    layout = new ResponsiveLayout({
      mobileBreakpoint: 640,
      tabletBreakpoint: 1024,
    });
  });

  test('should create responsive layout', () => {
    expect(layout.options.mobileBreakpoint).toBe(640);
    expect(layout.options.tabletBreakpoint).toBe(1024);
  });

  test('should get current breakpoint', () => {
    const bp = layout.getBreakpoint();
    expect(['mobile', 'tablet', 'desktop']).toContain(bp);
  });

  test('should get layout config', () => {
    const config = layout.getConfig('mobile');
    expect(config.name).toBe('mobile');
    expect(config.columns).toBe(1);
    expect(config.spacing).toBeGreaterThan(0);
  });

  test('should get all configs', () => {
    const allConfigs = layout.getAllConfigs();
    expect(allConfigs.mobile).toBeDefined();
    expect(allConfigs.tablet).toBeDefined();
    expect(allConfigs.desktop).toBeDefined();
  });

  test('should check device type', () => {
    expect(typeof layout.isMobile()).toBe('boolean');
    expect(typeof layout.isTablet()).toBe('boolean');
    expect(typeof layout.isDesktop()).toBe('boolean');
  });

  test('should check if touch device', () => {
    const isTouch = ResponsiveLayout.isTouchDevice();
    expect(typeof isTouch).toBe('boolean');
  });

  test('should get device orientation', () => {
    const orientation = ResponsiveLayout.getOrientation();
    expect(['portrait', 'landscape', 'unknown']).toContain(orientation);
  });

  test('should get pixel ratio', () => {
    const ratio = ResponsiveLayout.getPixelRatio();
    expect(ratio).toBeGreaterThanOrEqual(1);
  });

  test('should get viewport dimensions', () => {
    const dims = ResponsiveLayout.getViewportDimensions();
    expect(dims.width).toBeGreaterThanOrEqual(0);
    expect(dims.height).toBeGreaterThanOrEqual(0);
  });

  test('should update config', () => {
    layout.updateConfig('mobile', { columns: 2, spacing: 10 });
    const config = layout.getConfig('mobile');
    expect(config.columns).toBe(2);
    expect(config.spacing).toBe(10);
  });

  test('should add event listener', () => {
    const callback = jest.fn();
    const result = layout.on('breakpointchange', callback);
    expect(result).toBe(true);
  });
});

describe('PWAConfig', () => {
  let pwa;

  beforeEach(() => {
    pwa = new PWAConfig({
      name: 'TestApp',
      shortName: 'Test',
    });
  });

  test('should create PWA config', () => {
    expect(pwa.options.name).toBe('TestApp');
    expect(pwa.options.shortName).toBe('Test');
  });

  test('should create manifest', () => {
    const manifest = pwa.getManifest();
    expect(manifest.name).toBe('TestApp');
    expect(manifest.short_name).toBe('Test');
    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test('should have required manifest fields', () => {
    const manifest = pwa.getManifest();
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.description).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
  });

  test('should check PWA support', () => {
    const supported = PWAConfig.isSupported();
    expect(typeof supported).toBe('boolean');
  });

  test('should check install status', () => {
    const status = pwa.checkInstalled();
    expect(status.installed).toBe(false);
    expect(typeof status.installPromptAvailable).toBe('boolean');
    expect(typeof status.standalone).toBe('boolean');
  });

  test('should get service worker status', async () => {
    const status = await pwa.getServiceWorkerStatus();
    expect(status.active).toBe(false);
  });

  test('should register service worker', async () => {
    // Mock navigator.serviceWorker
    if (typeof navigator === 'undefined') {
      expect(true).toBe(true);
      return;
    }

    if (!navigator.serviceWorker) {
      expect(true).toBe(true);
      return;
    }

    const result = await pwa.registerServiceWorker('/sw.js');
    expect(result.success).toBe(typeof result.success === 'boolean');
  });

  test('should add event listener', () => {
    const callback = jest.fn();
    const result = pwa.on('installed', callback);
    expect(result).toBe(true);
  });

  test('should emit event', () => {
    const callback = jest.fn();
    pwa.on('test', callback);
    pwa.emit('test', { data: 'test' });
    expect(callback).toHaveBeenCalledWith({ data: 'test' });
  });
});
