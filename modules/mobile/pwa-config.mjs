/**
 * Progressive Web App Configuration
 * Phase 15.2: Mobile Optimization
 *
 * Manages PWA manifest, installation, and offline support
 */

/* global window, navigator */

export class PWAConfig {
  constructor(options = {}) {
    this.options = {
      name: 'RPI CNC Simulator',
      shortName: 'CNC Sim',
      description: 'Raspberry Pi CNC Simulator with G-Code Editor',
      startUrl: '/',
      display: 'standalone',
      backgroundColor: '#ffffff',
      themeColor: '#1976d2',
      orientation: 'portrait-primary',
      ...options,
    };

    this.manifest = this.createManifest();
    this.isInstalled = false;
    this.installPrompt = null;
    this.listeners = {};
    this.setupPWAListeners();
  }

  /**
   * Create PWA manifest
   */
  createManifest() {
    return {
      name: this.options.name,
      short_name: this.options.shortName,
      description: this.options.description,
      start_url: this.options.startUrl,
      scope: '/',
      display: this.options.display,
      background_color: this.options.backgroundColor,
      theme_color: this.options.themeColor,
      orientation: this.options.orientation,
      icons: [
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/maskable-icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      screenshots: [
        {
          src: '/screenshot-540x720.png',
          sizes: '540x720',
          type: 'image/png',
          form_factor: 'narrow',
        },
        {
          src: '/screenshot-1280x720.png',
          sizes: '1280x720',
          type: 'image/png',
          form_factor: 'wide',
        },
      ],
      categories: ['productivity', 'graphics'],
      shortcuts: [
        {
          name: 'Open Editor',
          url: '/editor',
          icons: [{ src: '/icon-96x96.png', sizes: '96x96' }],
        },
      ],
    };
  }

  /**
   * Setup PWA event listeners
   */
  setupPWAListeners() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event;
      this.emit('installprompt', { prompt: event });
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.emit('installed', { installed: true });
    });

    // Check if already installed
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
    }
  }

  /**
   * Check if PWA is supported
   */
  static isSupported() {
    if (typeof window === 'undefined') {
      return false;
    }

    return 'serviceWorker' in navigator && 'caches' in window && 'indexedDB' in window;
  }

  /**
   * Get manifest
   */
  getManifest() {
    return { ...this.manifest };
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(scriptPath = '/sw.js') {
    if (typeof window === 'undefined') {
      return {
        success: false,
        error: 'Service workers not supported in this environment',
      };
    }

    try {
      const registration = await navigator.serviceWorker.register(scriptPath);
      this.emit('swregistered', {
        scope: registration.scope,
        active: registration.active !== null,
      });

      return {
        success: true,
        scope: registration.scope,
        active: registration.active !== null,
      };
    } catch (error) {
      this.emit('swregistrationfailed', { error: error.message });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Unregister service worker
   */
  async unregisterServiceWorker() {
    if (typeof navigator === 'undefined') {
      return {
        success: false,
        error: 'Service workers not supported',
      };
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      for (const registration of registrations) {
        await registration.unregister();
      }

      return {
        success: true,
        count: registrations.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Prompt installation
   */
  async promptInstall() {
    if (!this.installPrompt) {
      return {
        success: false,
        error: 'Install prompt not available',
      };
    }

    try {
      this.installPrompt.prompt();
      const { outcome } = await this.installPrompt.userChoice;

      this.installPrompt = null;

      return {
        success: true,
        outcome,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if installed
   */
  checkInstalled() {
    return {
      installed: this.isInstalled,
      installPromptAvailable: this.installPrompt !== null,
      standalone: typeof window !== 'undefined' && window.navigator.standalone === true,
    };
  }

  /**
   * Get service worker status
   */
  async getServiceWorkerStatus() {
    if (typeof navigator === 'undefined') {
      return { active: false };
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        return { active: false };
      }

      return {
        active: registration.active !== null,
        scope: registration.scope,
        updateViaCache: registration.updateViaCache,
        unregister: () => registration.unregister(),
      };
    } catch (error) {
      return {
        active: false,
        error: error.message,
      };
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);
    return true;
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) {
      return false;
    }

    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }
}
