/**
 * Desktop Module Tests
 * Phase 15.1: Desktop Application
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { AppConfig } from '../../../modules/desktop/app-config.mjs';
import { FileSystemAPI } from '../../../modules/desktop/file-system-api.mjs';
import { SerialPortAPI } from '../../../modules/desktop/serial-port-api.mjs';
import { ElectronApp } from '../../../modules/desktop/electron-app.mjs';

describe('AppConfig', () => {
  let config;

  beforeEach(() => {
    config = new AppConfig('TestApp');
  });

  test('should create app config', () => {
    expect(config.appName).toBe('TestApp');
    expect(config.appVersion).toBe('0.1.0');
  });

  test('should get user data path', () => {
    expect(config.userDataPath).toBeDefined();
    expect(config.userDataPath.length).toBeGreaterThan(0);
  });

  test('should load default configuration', () => {
    expect(config.config.theme).toBe('dark');
    expect(config.config.autoSave).toBe(true);
    expect(config.config.editorFontSize).toBe(13);
  });

  test('should get setting value', () => {
    const theme = config.getSetting('theme');
    expect(theme).toBe('dark');
  });

  test('should get setting with default', () => {
    const value = config.getSetting('nonexistent', 'default');
    expect(value).toBe('default');
  });

  test('should set setting value', () => {
    config.setSetting('theme', 'light');
    expect(config.getSetting('theme')).toBe('light');
  });

  test('should get all settings', () => {
    const all = config.getAllSettings();
    expect(all.theme).toBeDefined();
    expect(all.autoSave).toBeDefined();
  });

  test('should reset to defaults', () => {
    config.setSetting('theme', 'light');
    config.resetToDefaults();
    expect(config.getSetting('theme')).toBe('dark');
  });

  test('should get app info', () => {
    const info = config.getAppInfo();
    expect(info.name).toBe('TestApp');
    expect(info.version).toBe('0.1.0');
    expect(info.platform).toBeDefined();
  });
});

describe('FileSystemAPI', () => {
  test('should check if file exists', () => {
    const exists = FileSystemAPI.fileExists('/package.json');
    expect(typeof exists).toBe('boolean');
  });

  test('should read file contents', () => {
    const result = FileSystemAPI.readFile(process.cwd() + '/package.json');
    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
    expect(result.size).toBeGreaterThan(0);
  });

  test('should handle file read errors', () => {
    const result = FileSystemAPI.readFile('/nonexistent/file-xyz-123.txt');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should write file contents', () => {
    const testFile = '/tmp/test-gcode-123.gcode';
    const result = FileSystemAPI.writeFile(testFile, 'G0 X10 Y10 Z5\nG1 Z0 F100\n');
    expect(result.success).toBe(true);
    expect(result.size).toBeGreaterThan(0);
  });

  test('should get file info', () => {
    const result = FileSystemAPI.getFileInfo(process.cwd() + '/package.json');
    expect(result.success).toBe(true);
    expect(result.isFile).toBe(true);
    expect(result.size).toBeGreaterThan(0);
  });

  test('should create directory', () => {
    const result = FileSystemAPI.createDirectory('/tmp/test-dir');
    expect(result.success).toBe(true);
  });

  test('should delete file', () => {
    const testFile = '/tmp/test-delete.txt';
    FileSystemAPI.writeFile(testFile, 'test');
    const result = FileSystemAPI.deleteFile(testFile);
    expect(result.success).toBe(true);
  });

  test('should copy file', () => {
    const source = '/tmp/test-source.txt';
    const dest = '/tmp/test-dest.txt';
    FileSystemAPI.writeFile(source, 'test content');
    const result = FileSystemAPI.copyFile(source, dest);
    expect(result.success).toBe(true);
  });

  test('should get recent files', () => {
    const result = FileSystemAPI.getRecentFiles('/tmp', 5);
    expect(result.success).toBeDefined();
  });
});

describe('SerialPortAPI', () => {
  let serialAPI;

  beforeEach(() => {
    serialAPI = new SerialPortAPI();
  });

  test('should list available ports', async () => {
    const result = await serialAPI.listPorts();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.ports)).toBe(true);
  });

  test('should connect to port', async () => {
    const result = await serialAPI.connect('/dev/ttyUSB0', {
      baudRate: 115200,
    });
    expect(result.success).toBe(true);
    expect(result.connected).toBe(true);
  });

  test('should track connected ports', async () => {
    await serialAPI.connect('/dev/ttyUSB0');
    const info = serialAPI.getPortInfo('/dev/ttyUSB0');
    expect(info.success).toBe(true);
    expect(info.isOpen).toBe(true);
  });

  test('should send data to port', async () => {
    await serialAPI.connect('/dev/ttyUSB0');
    const result = await serialAPI.send('/dev/ttyUSB0', 'G0 X10 Y10\n');
    expect(result.success).toBe(true);
    expect(result.dataSent).toBeGreaterThan(0);
  });

  test('should reject send on disconnected port', async () => {
    const result = await serialAPI.send('/dev/ttyUSB0', 'G0 X10\n');
    expect(result.success).toBe(false);
  });

  test('should disconnect from port', async () => {
    await serialAPI.connect('/dev/ttyUSB0');
    const result = await serialAPI.disconnect('/dev/ttyUSB0');
    expect(result.success).toBe(true);
    expect(result.connected).toBe(false);
  });

  test('should add event listener', async () => {
    await serialAPI.connect('/dev/ttyUSB0');
    const callback = () => {};
    const result = serialAPI.on('/dev/ttyUSB0', 'data', callback);
    expect(result).toBe(true);
  });

  test('should remove event listener', async () => {
    await serialAPI.connect('/dev/ttyUSB0');
    const callback = () => {};
    serialAPI.on('/dev/ttyUSB0', 'data', callback);
    const result = serialAPI.off('/dev/ttyUSB0', 'data', callback);
    expect(result).toBe(true);
  });

  test('should clear port buffer', async () => {
    await serialAPI.connect('/dev/ttyUSB0');
    const result = serialAPI.clearBuffer('/dev/ttyUSB0');
    expect(result.success).toBe(true);
  });

  test('should get port info', async () => {
    await serialAPI.connect('/dev/ttyUSB0', { baudRate: 115200 });
    const info = serialAPI.getPortInfo('/dev/ttyUSB0');
    expect(info.success).toBe(true);
    expect(info.baudRate).toBe(115200);
    expect(info.isOpen).toBe(true);
  });
});

describe('ElectronApp', () => {
  let app;

  beforeEach(() => {
    app = new ElectronApp({
      appName: 'TestCNC',
      appVersion: '0.1.0',
      isDev: true,
    });
  });

  test('should create electron app', () => {
    expect(app.getName()).toBe('TestCNC');
    expect(app.getVersion()).toBe('0.1.0');
  });

  test('should create main window', () => {
    const result = app.createMainWindow(1400, 900);
    expect(result.success).toBe(true);
    expect(result.window.id).toBe('main');
    expect(result.window.width).toBe(1400);
  });

  test('should show window', () => {
    app.createMainWindow();
    const result = app.showWindow('main');
    expect(result.success).toBe(true);
    expect(result.window.isVisible).toBe(true);
  });

  test('should hide window', () => {
    app.createMainWindow();
    app.showWindow('main');
    const result = app.hideWindow('main');
    expect(result.success).toBe(true);
    expect(result.window.isVisible).toBe(false);
  });

  test('should minimize window', () => {
    app.createMainWindow();
    const result = app.minimizeWindow('main');
    expect(result.success).toBe(true);
    expect(result.window.isMinimized).toBe(true);
  });

  test('should maximize window', () => {
    app.createMainWindow();
    const result = app.maximizeWindow('main');
    expect(result.success).toBe(true);
    expect(result.window.isMaximized).toBe(true);
  });

  test('should close window', () => {
    app.createMainWindow();
    const result = app.closeWindow('main');
    expect(result.success).toBe(true);
    expect(result.closed).toBe(true);
  });

  test('should list windows', () => {
    app.createMainWindow();
    const result = app.listWindows();
    expect(result.success).toBe(true);
    expect(result.windows.length).toBeGreaterThan(0);
  });

  test('should load URL in window', () => {
    app.createMainWindow();
    const result = app.loadURL('main', 'http://localhost:3000/front.html');
    expect(result.success).toBe(true);
    expect(result.url).toBe('http://localhost:3000/front.html');
  });

  test('should send message to renderer', () => {
    app.createMainWindow();
    const result = app.send('main', 'test-channel', 'arg1', 'arg2');
    expect(result.success).toBe(true);
    expect(result.channel).toBe('test-channel');
  });

  test('should add message handler', () => {
    const callback = () => {};
    const result = app.on('test-channel', callback);
    expect(result).toBe(true);
  });

  test('should remove message handler', () => {
    const callback = () => {};
    app.on('test-channel', callback);
    const result = app.off('test-channel', callback);
    expect(result).toBe(true);
  });

  test('should create menu', () => {
    const result = app.createMenu();
    expect(result.success).toBe(true);
    expect(result.menu.templates.length).toBeGreaterThan(0);
  });

  test('should handle quit', () => {
    const result = app.quit();
    expect(result.success).toBe(true);
  });

  test('should check development mode', () => {
    expect(app.isDevelopment()).toBe(true);
  });

  test('should handle non-existent window', () => {
    const result = app.showWindow('nonexistent');
    expect(result.success).toBe(false);
  });

  test('should handle multiple windows', () => {
    app.createMainWindow();
    const result = app.listWindows();
    expect(result.windows.length).toBe(1);
  });
});
