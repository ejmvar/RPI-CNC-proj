/**
 * Keyboard Shortcuts Manager
 * Provides global keyboard shortcuts and command palette
 */

class KeyboardShortcuts {
  constructor() {
    this.shortcuts = new Map();
    this.isCommandPaletteOpen = false;
    this.commandPaletteCallbacks = [];
  }

  /**
   * Initialize keyboard shortcuts
   */
  init() {
    this.registerDefaultShortcuts();
    this.attachEventListeners();
    this.injectCommandPalette();
  }

  /**
   * Register a keyboard shortcut
   * @param {string} key - Key combination (e.g., 'Ctrl+S', 'Alt+F')
   * @param {Function} callback - Function to execute
   * @param {string} description - Human-readable description
   */
  register(key, callback, description) {
    const normalizedKey = this.normalizeKey(key);
    this.shortcuts.set(normalizedKey, { callback, description });
  }

  /**
   * Register default shortcuts
   */
  registerDefaultShortcuts() {
    // File operations
    this.register('Ctrl+S', () => this.saveFile(), 'Save current file');
    this.register('Ctrl+O', () => this.openFile(), 'Open file');
    this.register('Ctrl+N', () => this.newFile(), 'New file');

    // View operations
    this.register('Ctrl+1', () => this.setView('top'), 'Top view');
    this.register('Ctrl+2', () => this.setView('front'), 'Front view');
    this.register('Ctrl+3', () => this.setView('side'), 'Side view');
    this.register('Ctrl+0', () => this.resetView(), 'Reset view');

    // Playback
    this.register('Space', () => this.togglePlayback(), 'Play/Pause simulation');
    this.register('R', () => this.resetSimulation(), 'Reset simulation');

    // UI
    this.register('Ctrl+K', () => this.showCommandPalette(), 'Show command palette');
    this.register('Ctrl+/', () => this.toggleShortcutsHelp(), 'Show shortcuts help');
    this.register('Escape', () => this.handleEscape(), 'Close modals');

    // Theme
    this.register('Ctrl+Shift+D', () => this.toggleTheme(), 'Toggle dark mode');

    // File library
    this.register('Ctrl+L', () => this.showFileLibrary(), 'Show file library');
  }

  /**
   * Attach keyboard event listeners
   */
  attachEventListeners() {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /**
   * Handle keydown event
   */
  handleKeyDown(e) {
    // Don't intercept if typing in input/textarea
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.isContentEditable
    ) {
      // Allow Ctrl+K for command palette
      if (!(e.ctrlKey && e.key === 'k')) {
        return;
      }
    }

    const key = this.getKeyString(e);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      e.preventDefault();
      shortcut.callback();
    }
  }

  /**
   * Get key string from event
   */
  getKeyString(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');

    const key = e.key === ' ' ? 'Space' : e.key;
    parts.push(key.length === 1 ? key.toUpperCase() : key);

    return parts.join('+');
  }

  /**
   * Normalize key string
   */
  normalizeKey(key) {
    return key
      .split('+')
      .map((k) => k.trim())
      .map((k) => (k.length === 1 ? k.toUpperCase() : k))
      .join('+');
  }

  /**
   * Show command palette
   */
  showCommandPalette() {
    this.isCommandPaletteOpen = true;
    const palette = document.getElementById('command-palette');
    if (palette) {
      palette.classList.remove('hidden');
      document.getElementById('command-palette-input').focus();
      this.updateCommandList('');
    }
  }

  /**
   * Hide command palette
   */
  hideCommandPalette() {
    this.isCommandPaletteOpen = false;
    const palette = document.getElementById('command-palette');
    if (palette) {
      palette.classList.add('hidden');
    }
  }

  /**
   * Update command list based on search
   */
  updateCommandList(query) {
    const list = document.getElementById('command-list');
    if (!list) return;

    const filtered = Array.from(this.shortcuts.entries())
      .filter(([key, data]) => {
        const searchString = `${key} ${data.description}`.toLowerCase();
        return searchString.includes(query.toLowerCase());
      })
      .slice(0, 10); // Limit to 10 results

    list.innerHTML = filtered
      .map(
        ([key, data], index) => `
      <div class="command-item ${index === 0 ? 'selected' : ''}" data-key="${key}">
        <span class="command-desc">${this.escapeHtml(data.description)}</span>
        <kbd class="command-key">${this.escapeHtml(key)}</kbd>
      </div>
    `
      )
      .join('');

    // Attach click handlers
    list.querySelectorAll('.command-item').forEach((item) => {
      item.addEventListener('click', () => {
        const key = item.dataset.key;
        const shortcut = this.shortcuts.get(key);
        if (shortcut) {
          this.hideCommandPalette();
          shortcut.callback();
        }
      });
    });
  }

  /**
   * Inject command palette UI
   */
  injectCommandPalette() {
    const existing = document.getElementById('command-palette');
    if (existing) return;

    const palette = document.createElement('div');
    palette.id = 'command-palette';
    palette.className = 'command-palette hidden';
    palette.innerHTML = `
      <div class="command-palette-content">
        <input type="text" 
               id="command-palette-input" 
               placeholder="Type a command or search..."
               autocomplete="off"
               aria-label="Command palette search">
        <div id="command-list" class="command-list"></div>
      </div>
    `;

    document.body.appendChild(palette);

    // Event listeners
    const input = document.getElementById('command-palette-input');
    input.addEventListener('input', (e) => this.updateCommandList(e.target.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideCommandPalette();
      } else if (e.key === 'Enter') {
        const selected = document.querySelector('.command-item.selected');
        if (selected) selected.click();
      }
    });

    // Click outside to close
    palette.addEventListener('click', (e) => {
      if (e.target === palette) {
        this.hideCommandPalette();
      }
    });
  }

  /**
   * Shortcuts help modal
   */
  toggleShortcutsHelp() {
    let modal = document.getElementById('shortcuts-help-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'shortcuts-help-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <span class="modal-close">&times;</span>
          <h2>⌨️ Keyboard Shortcuts</h2>
          <div class="shortcuts-grid">
            ${Array.from(this.shortcuts.entries())
              .map(
                ([key, data]) => `
                <div class="shortcut-row">
                  <kbd>${this.escapeHtml(key)}</kbd>
                  <span>${this.escapeHtml(data.description)}</span>
                </div>
              `
              )
              .join('')}
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    }

    modal.classList.toggle('hidden');
  }

  /**
   * Command implementations
   */
  saveFile() {
    console.log('Save file shortcut triggered');
    // Integrate with file library
    window.dispatchEvent(new CustomEvent('shortcut-save'));
  }

  openFile() {
    console.log('Open file shortcut triggered');
    window.dispatchEvent(new CustomEvent('shortcut-open'));
  }

  newFile() {
    console.log('New file shortcut triggered');
    window.dispatchEvent(new CustomEvent('shortcut-new'));
  }

  setView(view) {
    console.log(`Set view: ${view}`);
    window.dispatchEvent(new CustomEvent('shortcut-view', { detail: { view } }));
  }

  resetView() {
    console.log('Reset view');
    window.dispatchEvent(new CustomEvent('shortcut-reset-view'));
  }

  togglePlayback() {
    console.log('Toggle playback');
    window.dispatchEvent(new CustomEvent('shortcut-toggle-playback'));
  }

  resetSimulation() {
    console.log('Reset simulation');
    window.dispatchEvent(new CustomEvent('shortcut-reset-simulation'));
  }

  handleEscape() {
    // Close command palette if open
    if (this.isCommandPaletteOpen) {
      this.hideCommandPalette();
      return;
    }

    // Close any open modals
    document.querySelectorAll('.modal:not(.hidden)').forEach((modal) => {
      modal.classList.add('hidden');
    });
  }

  toggleTheme() {
    if (window.themeManager) {
      window.themeManager.toggle();
    }
  }

  showFileLibrary() {
    if (window.fileLibrary) {
      window.fileLibrary.show();
    }
  }

  /**
   * Utility: Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export
if (typeof window !== 'undefined') {
  window.KeyboardShortcuts = KeyboardShortcuts;
}

export default KeyboardShortcuts;
