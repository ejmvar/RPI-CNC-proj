/**
 * PWA Install Manager
 * Handle Progressive Web App installation
 */

class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isStandalone = false;
  }

  /**
   * Initialize PWA installer
   */
  init() {
    this.checkInstallStatus();
    this.registerServiceWorker();
    this.attachEventListeners();
    this.injectUI();
  }

  /**
   * Check if app is installed or running standalone
   */
  checkInstallStatus() {
    // Check if running as installed PWA
    this.isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    console.log('PWA standalone mode:', this.isStandalone);
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.isInstalled = true;
      this.hideInstallPrompt();
      this.showInstalledNotification();
    });

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  /**
   * Show install prompt
   */
  showInstallPrompt() {
    if (this.isStandalone || this.isInstalled) return;

    const prompt = document.getElementById('install-prompt');
    if (prompt) {
      prompt.classList.add('show');
    }
  }

  /**
   * Hide install prompt
   */
  hideInstallPrompt() {
    const prompt = document.getElementById('install-prompt');
    if (prompt) {
      prompt.classList.remove('show');
    }
  }

  /**
   * Trigger install
   */
  async install() {
    if (!this.deferredPrompt) {
      console.log('Install prompt not available');
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    console.log('Install outcome:', outcome);

    if (outcome === 'accepted') {
      this.deferredPrompt = null;
    }
  }

  /**
   * Handle online event
   */
  handleOnline() {
    console.log('Back online');
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.classList.remove('show');
    }
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    console.log('Gone offline');
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.classList.add('show');
    }
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    if (!confirm('New version available! Reload to update?')) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    });

    window.location.reload();
  }

  /**
   * Show installed notification
   */
  showInstalledNotification() {
    // Could show a toast or notification
    console.log('App installed - showing notification');
  }

  /**
   * Inject install UI
   */
  injectUI() {
    // Install prompt
    if (!document.getElementById('install-prompt')) {
      const prompt = document.createElement('div');
      prompt.id = 'install-prompt';
      prompt.className = 'install-prompt';
      prompt.innerHTML = `
        <div class="install-prompt-content">
          <div class="install-prompt-icon">📱</div>
          <div class="install-prompt-text">
            <h4 class="install-prompt-title">Install CNC Simulator</h4>
            <p class="install-prompt-desc">Get the full app experience with offline support</p>
          </div>
        </div>
        <div class="install-prompt-actions">
          <button class="install-btn-primary" id="btn-install-pwa">Install</button>
          <button class="install-btn-secondary" id="btn-dismiss-install">Not now</button>
        </div>
      `;
      document.body.appendChild(prompt);

      // Event listeners
      document.getElementById('btn-install-pwa')?.addEventListener('click', () => {
        this.install();
      });

      document.getElementById('btn-dismiss-install')?.addEventListener('click', () => {
        this.hideInstallPrompt();
      });
    }

    // Offline indicator
    if (!document.getElementById('offline-indicator')) {
      const indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.className = 'offline-indicator';
      indicator.textContent = '📡 You are offline. Some features may be unavailable.';
      document.body.appendChild(indicator);
    }
  }
}

// Export
if (typeof window !== 'undefined') {
  window.PWAInstaller = PWAInstaller;
}

export default PWAInstaller;
