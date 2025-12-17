/**
 * Machine Configuration Profiles
 * Phase 15.4: Hardware Integration
 *
 * Manages machine-specific settings and presets:
 * - Machine specification storage
 * - Work area bounds and limits
 * - Tool offset management
 * - Safety limits and warnings
 */

export class MachineProfiles {
  constructor(options = {}) {
    this.options = {
      baseDir: options.baseDir || './profiles',
      maxProfiles: options.maxProfiles || 50,
      ...options,
    };

    this.profiles = new Map();
    this.activeProfile = null;
    this.listeners = {};

    // Create default profile
    this.createDefaultProfile();
  }

  /**
   * Create default profile
   */
  createDefaultProfile() {
    const defaultProfile = {
      id: 'default',
      name: 'Default CNC',
      description: 'Default CNC machine configuration',
      type: 'router',
      manufacturer: 'Generic',
      model: 'Generic CNC',
      specs: {
        workAreaX: 500,
        workAreaY: 500,
        workAreaZ: 100,
        maxRapidFeed: 2000,
        maxCuttingFeed: 500,
        spindle: {
          type: 'ER20',
          maxRPM: 24000,
          minRPM: 1000,
        },
      },
      safetyLimits: {
        maxCuttingFeed: 500,
        maxRapidFeed: 2000,
        warningDistance: 10,
        emergencyStop: true,
      },
      toolOffsets: [],
      created: new Date().toISOString(),
    };

    this.profiles.set(defaultProfile.id, defaultProfile);
    this.activeProfile = defaultProfile.id;

    return defaultProfile;
  }

  /**
   * Create new profile
   */
  createProfile(name, specs = {}) {
    if (!name) {
      throw new Error('Profile name required');
    }

    if (this.profiles.size >= this.options.maxProfiles) {
      throw new Error(`Maximum profiles (${this.options.maxProfiles}) reached`);
    }

    const id = this.generateId();
    const profile = {
      id,
      name,
      description: specs.description || '',
      type: specs.type || 'router',
      manufacturer: specs.manufacturer || 'Unknown',
      model: specs.model || 'Custom',
      specs: {
        workAreaX: specs.workAreaX || 500,
        workAreaY: specs.workAreaY || 500,
        workAreaZ: specs.workAreaZ || 100,
        maxRapidFeed: specs.maxRapidFeed || 2000,
        maxCuttingFeed: specs.maxCuttingFeed || 500,
        spindle: specs.spindle || {
          type: 'ER20',
          maxRPM: 24000,
          minRPM: 1000,
        },
      },
      safetyLimits: specs.safetyLimits || {
        maxCuttingFeed: specs.maxCuttingFeed || 500,
        maxRapidFeed: specs.maxRapidFeed || 2000,
        warningDistance: 10,
        emergencyStop: true,
      },
      toolOffsets: [],
      created: new Date().toISOString(),
    };

    this.profiles.set(id, profile);
    this.emit('profile:created', { id, name });

    return profile;
  }

  /**
   * Get profile by ID
   */
  getProfile(profileId) {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    return profile;
  }

  /**
   * Update profile
   */
  updateProfile(profileId, updates) {
    const profile = this.getProfile(profileId);

    Object.assign(profile, updates);
    profile.modified = new Date().toISOString();

    this.emit('profile:updated', { id: profileId });

    return profile;
  }

  /**
   * Delete profile
   */
  deleteProfile(profileId) {
    if (profileId === 'default') {
      throw new Error('Cannot delete default profile');
    }

    if (!this.profiles.has(profileId)) {
      throw new Error(`Profile not found: ${profileId}`);
    }

    if (this.activeProfile === profileId) {
      this.activeProfile = 'default';
    }

    const name = this.profiles.get(profileId).name;
    this.profiles.delete(profileId);

    this.emit('profile:deleted', { id: profileId, name });

    return { deleted: true, id: profileId };
  }

  /**
   * List all profiles
   */
  listProfiles() {
    return Array.from(this.profiles.values()).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      model: p.model,
      active: p.id === this.activeProfile,
    }));
  }

  /**
   * Set active profile
   */
  setActiveProfile(profileId) {
    const profile = this.getProfile(profileId);

    const previous = this.activeProfile;
    this.activeProfile = profileId;

    this.emit('profile:activated', { id: profileId, name: profile.name, previous });

    return { active: profileId, profile };
  }

  /**
   * Get active profile
   */
  getActiveProfile() {
    return this.getProfile(this.activeProfile);
  }

  /**
   * Add tool offset to profile
   */
  addToolOffset(profileId, tool) {
    if (!tool || !tool.id || !tool.name) {
      throw new Error('Tool ID and name required');
    }

    const profile = this.getProfile(profileId);
    const offset = {
      toolId: tool.id,
      name: tool.name,
      offsetX: tool.offsetX || 0,
      offsetY: tool.offsetY || 0,
      offsetZ: tool.offsetZ || 0,
      length: tool.length || 0,
      diameter: tool.diameter || 0,
    };

    profile.toolOffsets.push(offset);
    this.emit('tool:added', { profileId, toolId: tool.id });

    return offset;
  }

  /**
   * Remove tool offset from profile
   */
  removeToolOffset(profileId, toolId) {
    const profile = this.getProfile(profileId);
    const index = profile.toolOffsets.findIndex((t) => t.toolId === toolId);

    if (index === -1) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const removed = profile.toolOffsets.splice(index, 1)[0];
    this.emit('tool:removed', { profileId, toolId });

    return { removed: true, tool: removed };
  }

  /**
   * Get tool offset
   */
  getToolOffset(profileId, toolId) {
    const profile = this.getProfile(profileId);
    const offset = profile.toolOffsets.find((t) => t.toolId === toolId);

    if (!offset) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    return offset;
  }

  /**
   * Validate machine bounds
   */
  validateBounds(profileId, position) {
    const profile = this.getProfile(profileId);
    const { specs } = profile;

    const valid = {
      x: position.x >= 0 && position.x <= specs.workAreaX,
      y: position.y >= 0 && position.y <= specs.workAreaY,
      z: position.z >= 0 && position.z <= specs.workAreaZ,
    };

    const violations = Object.keys(valid).filter((axis) => !valid[axis]);

    return {
      valid: violations.length === 0,
      violations,
      workArea: { x: specs.workAreaX, y: specs.workAreaY, z: specs.workAreaZ },
    };
  }

  /**
   * Export profile to JSON
   */
  exportProfile(profileId) {
    const profile = this.getProfile(profileId);
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Import profile from JSON
   */
  importProfile(json) {
    try {
      const profile = JSON.parse(json);

      if (!profile.id || !profile.name) {
        throw new Error('Invalid profile format');
      }

      const id = profile.id;
      this.profiles.set(id, profile);

      this.emit('profile:imported', { id, name: profile.name });

      return profile;
    } catch (error) {
      throw new Error(`Failed to import profile: ${error.message}`);
    }
  }

  /**
   * Get profile statistics
   */
  getStats() {
    return {
      totalProfiles: this.profiles.size,
      activeProfile: this.activeProfile,
      maxProfiles: this.options.maxProfiles,
      profiles: this.listProfiles(),
    };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `prof-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  /**
   * Emit event
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((callback) => callback(data));
  }
}
