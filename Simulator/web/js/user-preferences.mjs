/**
 * User Preferences Manager
 * Handles persistent user settings
 */

class UserPreferences {
  constructor() {
    this.storageKey = 'cnc-simulator-preferences';
    this.defaults = {
      theme: 'light',
      autoSave: true,
      gridVisible: true,
      axesVisible: true,
      animationSpeed: 1.0,
      cameraSpeed: 1.0,
      showFPS: false,
      enableSound: false,
      language: 'en',
      recentFiles: [],
      lastFolder: null,
    };
    this.preferences = { ...this.defaults };
  }

  /**
   * Initialize preferences
   */
  init() {
    this.load();
    this.injectUI();
  }

  /**
   * Load preferences from localStorage
   */
  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.preferences = { ...this.defaults, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      this.preferences = { ...this.defaults };
    }
    return this.preferences;
  }

  /**
   * Save preferences to localStorage
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
      window.dispatchEvent(
        new CustomEvent('preferenceschange', {
          detail: { preferences: this.preferences },
        })
      );
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  /**
   * Get preference value
   */
  get(key) {
    return this.preferences[key];
  }

  /**
   * Set preference value
   */
  set(key, value) {
    this.preferences[key] = value;
    this.save();
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.preferences = { ...this.defaults };
    this.save();
  }

  /**
   * Add to recent files
   */
  addRecentFile(fileId, filename) {
    const recent = this.get('recentFiles') || [];

    // Remove if already exists
    const filtered = recent.filter((f) => f.id !== fileId);

    // Add to front
    filtered.unshift({ id: fileId, filename, timestamp: Date.now() });

    // Keep only last 10
    this.set('recentFiles', filtered.slice(0, 10));
  }

  /**
   * Get recent files
   */
  getRecentFiles() {
    return this.get('recentFiles') || [];
  }

  /**
   * Inject preferences UI
   */
  injectUI() {
    // Check if already exists
    if (document.getElementById('preferences-btn')) return;

    const button = document.createElement('button');
    button.id = 'preferences-btn';
    button.className = 'preferences-btn';
    button.innerHTML = '⚙️';
    button.setAttribute('aria-label', 'Preferences');
    button.setAttribute('title', 'Settings');
    button.addEventListener('click', () => this.showPreferences());

    document.body.appendChild(button);

    // Create modal
    this.createPreferencesModal();
  }

  /**
   * Create preferences modal
   */
  createPreferencesModal() {
    if (document.getElementById('preferences-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'preferences-modal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        <h2>⚙️ Preferences</h2>
        
        <div class="preferences-section">
          <h3>Display</h3>
          <div class="pref-item">
            <label>
              <input type="checkbox" id="pref-grid-visible">
              Show grid
            </label>
          </div>
          <div class="pref-item">
            <label>
              <input type="checkbox" id="pref-axes-visible">
              Show axes
            </label>
          </div>
          <div class="pref-item">
            <label>
              <input type="checkbox" id="pref-show-fps">
              Show FPS counter
            </label>
          </div>
        </div>

        <div class="preferences-section">
          <h3>Performance</h3>
          <div class="pref-item">
            <label for="pref-animation-speed">Animation speed</label>
            <input type="range" id="pref-animation-speed" min="0.1" max="5" step="0.1">
            <span id="animation-speed-value">1.0x</span>
          </div>
          <div class="pref-item">
            <label for="pref-camera-speed">Camera speed</label>
            <input type="range" id="pref-camera-speed" min="0.1" max="3" step="0.1">
            <span id="camera-speed-value">1.0x</span>
          </div>
        </div>

        <div class="preferences-section">
          <h3>Files</h3>
          <div class="pref-item">
            <label>
              <input type="checkbox" id="pref-auto-save">
              Auto-save files
            </label>
          </div>
        </div>

        <div class="preferences-section">
          <h3>Audio</h3>
          <div class="pref-item">
            <label>
              <input type="checkbox" id="pref-enable-sound">
              Enable sound effects
            </label>
          </div>
        </div>

        <div class="preferences-actions">
          <button id="btn-reset-preferences" class="btn btn-secondary">Reset to Defaults</button>
          <button id="btn-save-preferences" class="btn btn-primary">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachPreferencesListeners();
  }

  /**
   * Attach preferences event listeners
   */
  attachPreferencesListeners() {
    // Close button
    document.querySelector('#preferences-modal .modal-close').addEventListener('click', () => {
      this.hidePreferences();
    });

    // Click outside
    document.getElementById('preferences-modal').addEventListener('click', (e) => {
      if (e.target.id === 'preferences-modal') {
        this.hidePreferences();
      }
    });

    // Save button
    document.getElementById('btn-save-preferences').addEventListener('click', () => {
      this.savePreferencesFromUI();
      this.hidePreferences();
    });

    // Reset button
    document.getElementById('btn-reset-preferences').addEventListener('click', () => {
      if (confirm('Reset all preferences to defaults?')) {
        this.reset();
        this.loadPreferencesToUI();
      }
    });

    // Range input live updates
    document.getElementById('pref-animation-speed').addEventListener('input', (e) => {
      document.getElementById('animation-speed-value').textContent = `${e.target.value}x`;
    });

    document.getElementById('pref-camera-speed').addEventListener('input', (e) => {
      document.getElementById('camera-speed-value').textContent = `${e.target.value}x`;
    });
  }

  /**
   * Show preferences modal
   */
  showPreferences() {
    this.loadPreferencesToUI();
    document.getElementById('preferences-modal').classList.remove('hidden');
  }

  /**
   * Hide preferences modal
   */
  hidePreferences() {
    document.getElementById('preferences-modal').classList.add('hidden');
  }

  /**
   * Load preferences to UI
   */
  loadPreferencesToUI() {
    document.getElementById('pref-grid-visible').checked = this.get('gridVisible');
    document.getElementById('pref-axes-visible').checked = this.get('axesVisible');
    document.getElementById('pref-show-fps').checked = this.get('showFPS');
    document.getElementById('pref-animation-speed').value = this.get('animationSpeed');
    document.getElementById('animation-speed-value').textContent = `${this.get('animationSpeed')}x`;
    document.getElementById('pref-camera-speed').value = this.get('cameraSpeed');
    document.getElementById('camera-speed-value').textContent = `${this.get('cameraSpeed')}x`;
    document.getElementById('pref-auto-save').checked = this.get('autoSave');
    document.getElementById('pref-enable-sound').checked = this.get('enableSound');
  }

  /**
   * Save preferences from UI
   */
  savePreferencesFromUI() {
    this.set('gridVisible', document.getElementById('pref-grid-visible').checked);
    this.set('axesVisible', document.getElementById('pref-axes-visible').checked);
    this.set('showFPS', document.getElementById('pref-show-fps').checked);
    this.set('animationSpeed', parseFloat(document.getElementById('pref-animation-speed').value));
    this.set('cameraSpeed', parseFloat(document.getElementById('pref-camera-speed').value));
    this.set('autoSave', document.getElementById('pref-auto-save').checked);
    this.set('enableSound', document.getElementById('pref-enable-sound').checked);
  }
}

// Export
if (typeof window !== 'undefined') {
  window.UserPreferences = UserPreferences;
}

export default UserPreferences;
