/**
 * Electron App
 * Phase 15.1: Desktop Application
 *
 * Main Electron process for desktop application
 */

export class ElectronApp {
  constructor(options = {}) {
    this.options = {
      appName: 'RPI-CNC-Simulator',
      appVersion: '0.1.0',
      isDev: false,
      enableDevTools: false,
      ...options,
    };

    this.mainWindow = null;
    this.windows = new Map();
    this.menu = null;
    this.tray = null;
    this.listeners = {};
  }

  /**
   * Create main window
   */
  createMainWindow(width = 1400, height = 900) {
    const window = {
      id: 'main',
      title: this.options.appName,
      width,
      height,
      webPreferences: {
        preload: './electron-preload.mjs',
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
      },
      isVisible: false,
      createdAt: new Date().toISOString(),
    };

    this.mainWindow = window;
    this.windows.set('main', window);

    return {
      success: true,
      window: this.getWindowInfo('main'),
    };
  }

  /**
   * Show window
   */
  showWindow(windowId = 'main') {
    const window = this.windows.get(windowId);
    if (!window) {
      return {
        success: false,
        error: `Window ${windowId} not found`,
      };
    }

    window.isVisible = true;
    return {
      success: true,
      window: this.getWindowInfo(windowId),
    };
  }

  /**
   * Hide window
   */
  hideWindow(windowId = 'main') {
    const window = this.windows.get(windowId);
    if (!window) {
      return {
        success: false,
        error: `Window ${windowId} not found`,
      };
    }

    window.isVisible = false;
    return {
      success: true,
      window: this.getWindowInfo(windowId),
    };
  }

  /**
   * Minimize window
   */
  minimizeWindow(windowId = 'main') {
    const window = this.windows.get(windowId);
    if (!window) {
      return {
        success: false,
        error: `Window ${windowId} not found`,
      };
    }

    window.isMinimized = true;
    return {
      success: true,
      window: this.getWindowInfo(windowId),
    };
  }

  /**
   * Maximize window
   */
  maximizeWindow(windowId = 'main') {
    const window = this.windows.get(windowId);
    if (!window) {
      return {
        success: false,
        error: `Window ${windowId} not found`,
      };
    }

    window.isMaximized = true;
    return {
      success: true,
      window: this.getWindowInfo(windowId),
    };
  }

  /**
   * Close window
   */
  closeWindow(windowId = 'main') {
    if (!this.windows.has(windowId)) {
      return {
        success: false,
        error: `Window ${windowId} not found`,
      };
    }

    this.windows.delete(windowId);

    if (windowId === 'main') {
      this.mainWindow = null;
    }

    return {
      success: true,
      windowId,
      closed: true,
    };
  }

  /**
   * Get window info
   */
  getWindowInfo(windowId = 'main') {
    const window = this.windows.get(windowId);
    if (!window) {
      return null;
    }

    return {
      id: window.id,
      title: window.title,
      width: window.width,
      height: window.height,
      isVisible: window.isVisible,
      isMinimized: window.isMinimized || false,
      isMaximized: window.isMaximized || false,
      createdAt: window.createdAt,
    };
  }

  /**
   * List all windows
   */
  listWindows() {
    const windows = [];
    for (const windowId of this.windows.keys()) {
      windows.push(this.getWindowInfo(windowId));
    }
    return {
      success: true,
      windows,
      count: windows.length,
    };
  }

  /**
   * Load URL in window
   */
  loadURL(windowId, url) {
    const window = this.windows.get(windowId);
    if (!window) {
      return {
        success: false,
        error: `Window ${windowId} not found`,
      };
    }

    window.currentURL = url;
    window.loadedAt = new Date().toISOString();

    return {
      success: true,
      window: this.getWindowInfo(windowId),
      url,
    };
  }

  /**
   * Send message to renderer
   */
  send(windowId, channel, ...args) {
    const window = this.windows.get(windowId);
    if (!window) {
      return {
        success: false,
        error: `Window ${windowId} not found`,
      };
    }

    return {
      success: true,
      windowId,
      channel,
      args,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Handle message from renderer
   */
  on(channel, callback) {
    if (!this.listeners[channel]) {
      this.listeners[channel] = [];
    }

    this.listeners[channel].push(callback);
    return true;
  }

  /**
   * Remove message handler
   */
  off(channel, callback) {
    if (!this.listeners[channel]) {
      return false;
    }

    const index = this.listeners[channel].indexOf(callback);
    if (index > -1) {
      this.listeners[channel].splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Create app menu
   */
  createMenu() {
    this.menu = {
      templates: [
        {
          label: 'File',
          submenu: [
            { label: 'New', accelerator: 'CmdOrCtrl+N' },
            { label: 'Open', accelerator: 'CmdOrCtrl+O' },
            { label: 'Save', accelerator: 'CmdOrCtrl+S' },
            { label: 'Save As', accelerator: 'CmdOrCtrl+Shift+S' },
            { type: 'separator' },
            { label: 'Exit', accelerator: 'CmdOrCtrl+Q' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { label: 'Undo', accelerator: 'CmdOrCtrl+Z' },
            { label: 'Redo', accelerator: 'CmdOrCtrl+Y' },
            { type: 'separator' },
            { label: 'Cut', accelerator: 'CmdOrCtrl+X' },
            { label: 'Copy', accelerator: 'CmdOrCtrl+C' },
            { label: 'Paste', accelerator: 'CmdOrCtrl+V' },
          ],
        },
        {
          label: 'View',
          submenu: [
            { label: 'Reload', accelerator: 'CmdOrCtrl+R' },
            { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Shift+I' },
            { type: 'separator' },
            { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus' },
            { label: 'Zoom Out', accelerator: 'CmdOrCtrl+Minus' },
            { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0' },
          ],
        },
        {
          label: 'Help',
          submenu: [{ label: 'About' }, { label: 'Documentation' }, { label: 'Report Issue' }],
        },
      ],
    };

    return {
      success: true,
      menu: this.menu,
    };
  }

  /**
   * Quit application
   */
  quit() {
    return {
      success: true,
      message: 'Application quit',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get app version
   */
  getVersion() {
    return this.options.appVersion;
  }

  /**
   * Get app name
   */
  getName() {
    return this.options.appName;
  }

  /**
   * Check if in development mode
   */
  isDevelopment() {
    return this.options.isDev;
  }
}
