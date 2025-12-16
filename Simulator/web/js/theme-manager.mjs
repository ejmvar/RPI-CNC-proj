/**
 * Theme Manager - Dark/Light mode with persistence
 */

class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.storageKey = 'cnc-simulator-theme';
  }

  /**
   * Initialize theme system
   */
  init() {
    // Load saved theme or detect system preference
    const savedTheme = localStorage.getItem(this.storageKey);

    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.currentTheme = prefersDark ? 'dark' : 'light';
    }

    this.applyTheme(this.currentTheme);
    this.injectThemeToggle();
    this.attachEventListeners();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.storageKey)) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    localStorage.setItem(this.storageKey, theme);

    // Update toggle button
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
  }

  /**
   * Set theme
   */
  setTheme(theme) {
    this.applyTheme(theme);
    this.notifyThemeChange(theme);
  }

  /**
   * Toggle between light and dark
   */
  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Get current theme
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Inject theme toggle button
   */
  injectThemeToggle() {
    // Check if already exists
    if (document.getElementById('theme-toggle')) return;

    const button = document.createElement('button');
    button.id = 'theme-toggle';
    button.className = 'theme-toggle';
    button.innerHTML = this.currentTheme === 'dark' ? '☀️' : '🌙';
    button.setAttribute(
      'aria-label',
      `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`
    );
    button.setAttribute('title', 'Toggle theme');

    document.body.appendChild(button);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }

  /**
   * Notify theme change (for other components)
   */
  notifyThemeChange(theme) {
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }
}

// Export
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}

export default ThemeManager;
