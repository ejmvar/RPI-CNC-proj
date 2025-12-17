/**
 * Application Configuration
 * Phase 15.1: Desktop Application
 *
 * Manages application settings, paths, and configuration
 */

import path from 'path';
import os from 'os';

export class AppConfig {
  constructor(appName = 'RPI-CNC-Simulator') {
    this.appName = appName;
    this.appVersion = '0.1.0';
    this.userDataPath = this.getUserDataPath();
    this.configPath = this.getConfigPath();
    this.recentFilesPath = this.getRecentFilesPath();
    this.config = this.loadConfig();
  }

  /**
   * Get user data directory
   */
  getUserDataPath() {
    const homeDir = os.homedir();
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.APPDATA || homeDir, this.appName);
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', this.appName);
      default:
        return path.join(homeDir, `.${this.appName.toLowerCase()}`);
    }
  }

  /**
   * Get config file path
   */
  getConfigPath() {
    return path.join(this.userDataPath, 'config.json');
  }

  /**
   * Get recent files path
   */
  getRecentFilesPath() {
    return path.join(this.userDataPath, 'recent-files.json');
  }

  /**
   * Load configuration from file
   */
  loadConfig() {
    return {
      theme: 'dark',
      windowSize: { width: 1400, height: 900 },
      windowPosition: { x: 0, y: 0 },
      editorFont: 'Fira Code',
      editorFontSize: 13,
      autoSave: true,
      autoSaveInterval: 30000,
      recentFilesMax: 10,
      serialPortBaudRate: 115200,
      serialPortTimeout: 5000,
      checkUpdatesOnStartup: true,
      enableTelemetry: false,
    };
  }

  /**
   * Save configuration
   */
  saveConfig() {
    // In real implementation, would write to configPath
    return true;
  }

  /**
   * Get setting value
   */
  getSetting(key, defaultValue) {
    return this.config[key] ?? defaultValue;
  }

  /**
   * Set setting value
   */
  setSetting(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  /**
   * Get all settings
   */
  getAllSettings() {
    return { ...this.config };
  }

  /**
   * Reset to defaults
   */
  resetToDefaults() {
    this.config = this.loadConfig();
    this.saveConfig();
  }

  /**
   * Get application info
   */
  getAppInfo() {
    return {
      name: this.appName,
      version: this.appVersion,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
    };
  }
}
