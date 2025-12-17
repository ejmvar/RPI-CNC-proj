/**
 * Data Synchronization Manager
 * Phase 19: Advanced Integration
 *
 * Manages data synchronization across distributed systems:
 * - Change detection and tracking
 * - Conflict resolution strategies
 * - Data consistency verification
 * - Incremental sync support
 * - Two-way synchronization
 */

export class DataSynchronizationManager {
  constructor(options = {}) {
    this.options = {
      enableChangeTracking: options.enableChangeTracking !== false,
      enableConflictResolution: options.enableConflictResolution !== false,
      conflictStrategy: options.conflictStrategy || 'LAST_WRITE_WINS', // LWW, FIRST_WRITE_WINS, MERGE
      enableVersioning: options.enableVersioning !== false,
      maxHistorySize: options.maxHistorySize || 1000,
      ...options,
    };

    this.dataStore = new Map();
    this.changeLog = [];
    this.versionHistory = new Map();
    this.syncState = new Map();
    this.conflicts = [];
    this.listeners = {};
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Emit event to registered listeners
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data));
    }
  }

  /**
   * Set data with change tracking
   */
  set(key, value, options = {}) {
    const oldValue = this.dataStore.get(key);
    const timestamp = Date.now();

    // Store version history
    if (this.options.enableVersioning) {
      if (!this.versionHistory.has(key)) {
        this.versionHistory.set(key, []);
      }

      const history = this.versionHistory.get(key);
      history.push({
        value: oldValue,
        timestamp: timestamp - 1,
        userId: options.userId || 'system',
      });

      if (history.length > this.options.maxHistorySize) {
        history.shift();
      }
    }

    this.dataStore.set(key, {
      value,
      timestamp,
      version: (this.dataStore.get(key)?.version || 0) + 1,
      userId: options.userId || 'system',
      metadata: options.metadata || {},
    });

    // Track change
    if (this.options.enableChangeTracking) {
      this.changeLog.push({
        key,
        operation: 'set',
        oldValue,
        newValue: value,
        timestamp,
        userId: options.userId || 'system',
      });

      // Limit change log size
      if (this.changeLog.length > 10000) {
        this.changeLog.shift();
      }
    }

    this.emit('dataChanged', {
      key,
      operation: 'set',
      version: this.dataStore.get(key).version,
      timestamp,
    });

    return this;
  }

  /**
   * Get data value
   */
  get(key) {
    const entry = this.dataStore.get(key);
    return entry ? entry.value : null;
  }

  /**
   * Get data with metadata
   */
  getWithMetadata(key) {
    return this.dataStore.get(key) || null;
  }

  /**
   * Delete data
   */
  delete(key, options = {}) {
    if (!this.dataStore.has(key)) {
      return false;
    }

    const entry = this.dataStore.get(key);

    if (this.options.enableChangeTracking) {
      this.changeLog.push({
        key,
        operation: 'delete',
        oldValue: entry.value,
        timestamp: Date.now(),
        userId: options.userId || 'system',
      });
    }

    this.dataStore.delete(key);

    this.emit('dataChanged', {
      key,
      operation: 'delete',
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Get changes since timestamp
   */
  getChangesSince(timestamp) {
    return this.changeLog.filter((change) => change.timestamp > timestamp);
  }

  /**
   * Sync data with remote source
   */
  async syncWithRemote(remoteData, options = {}) {
    const strategy = options.strategy || this.options.conflictStrategy;
    const syncResults = {
      synced: 0,
      conflicts: 0,
      errors: 0,
      changes: [],
    };

    for (const [remoteKey, remoteEntry] of Object.entries(remoteData)) {
      try {
        const localEntry = this.dataStore.get(remoteKey);

        if (!localEntry) {
          // No conflict, just add
          this.set(remoteKey, remoteEntry.value, {
            userId: options.userId || 'remote',
          });
          syncResults.synced += 1;
          syncResults.changes.push({
            key: remoteKey,
            action: 'added',
          });
        } else if (localEntry.timestamp === remoteEntry.timestamp) {
          // Same version, no action needed
          continue;
        } else if (localEntry.version === remoteEntry.version) {
          // Same logical version but different values - potential conflict
          const conflict = this._detectConflict(remoteKey, localEntry, remoteEntry);

          if (conflict) {
            const resolved = this._resolveConflict(remoteKey, localEntry, remoteEntry, strategy);

            if (resolved) {
              this.set(remoteKey, resolved.value, {
                userId: options.userId || 'remote',
              });
              syncResults.synced += 1;
              syncResults.changes.push({
                key: remoteKey,
                action: 'resolved',
                strategy,
              });
            } else {
              syncResults.conflicts += 1;
              this.conflicts.push({
                key: remoteKey,
                local: localEntry,
                remote: remoteEntry,
                timestamp: Date.now(),
              });
            }
          } else {
            this.set(remoteKey, remoteEntry.value, {
              userId: options.userId || 'remote',
            });
            syncResults.synced += 1;
          }
        } else if (remoteEntry.timestamp > localEntry.timestamp) {
          // Remote is newer
          this.set(remoteKey, remoteEntry.value, {
            userId: options.userId || 'remote',
          });
          syncResults.synced += 1;
          syncResults.changes.push({
            key: remoteKey,
            action: 'updated',
          });
        }
      } catch (error) {
        syncResults.errors += 1;
        this.emit('syncError', { key: remoteKey, error: error.message });
      }
    }

    this.emit('syncCompleted', syncResults);
    return syncResults;
  }

  /**
   * Detect conflict between versions
   */
  _detectConflict(key, localEntry, remoteEntry) {
    return JSON.stringify(localEntry.value) !== JSON.stringify(remoteEntry.value);
  }

  /**
   * Resolve conflict using strategy
   */
  _resolveConflict(key, localEntry, remoteEntry, strategy) {
    switch (strategy) {
      case 'LAST_WRITE_WINS':
        return localEntry.timestamp > remoteEntry.timestamp ? localEntry : remoteEntry;

      case 'FIRST_WRITE_WINS':
        return localEntry.timestamp < remoteEntry.timestamp ? localEntry : remoteEntry;

      case 'MERGE':
        return this._mergeConflict(localEntry, remoteEntry);

      default:
        return null;
    }
  }

  /**
   * Merge conflicting values
   */
  _mergeConflict(localEntry, remoteEntry) {
    if (typeof localEntry.value === 'object' && typeof remoteEntry.value === 'object') {
      return {
        ...remoteEntry,
        value: { ...localEntry.value, ...remoteEntry.value },
      };
    }

    return localEntry.timestamp > remoteEntry.timestamp ? localEntry : remoteEntry;
  }

  /**
   * Get synchronization state
   */
  getSyncState(remoteId) {
    if (!this.syncState.has(remoteId)) {
      this.syncState.set(remoteId, {
        remoteId,
        lastSyncTime: 0,
        lastSyncHash: null,
        syncCount: 0,
      });
    }

    return this.syncState.get(remoteId);
  }

  /**
   * Update synchronization state
   */
  updateSyncState(remoteId, syncHash) {
    const state = this.getSyncState(remoteId);
    state.lastSyncTime = Date.now();
    state.lastSyncHash = syncHash;
    state.syncCount += 1;

    this.emit('syncStateUpdated', state);
  }

  /**
   * Get version history for key
   */
  getVersionHistory(key) {
    return this.versionHistory.get(key) || [];
  }

  /**
   * Rollback to specific version
   */
  rollback(key, version, options = {}) {
    const history = this.getVersionHistory(key);

    if (version >= history.length || version < 0) {
      return false;
    }

    const versionEntry = history[version];
    this.set(key, versionEntry.value, {
      userId: options.userId || 'system',
    });

    this.emit('rolledBack', { key, version });
    return true;
  }

  /**
   * Get all unresolved conflicts
   */
  getUnresolvedConflicts() {
    return this.conflicts.filter((c) => !c.resolved);
  }

  /**
   * Resolve conflict manually
   */
  resolveConflictManually(key, resolution, options = {}) {
    const conflictIndex = this.conflicts.findIndex((c) => c.key === key && !c.resolved);

    if (conflictIndex === -1) {
      return false;
    }

    const conflict = this.conflicts[conflictIndex];
    this.set(key, resolution, {
      userId: options.userId || 'system',
    });

    conflict.resolved = true;
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();

    this.emit('conflictResolved', {
      key,
      strategy: 'manual',
      timestamp: conflict.resolvedAt,
    });

    return true;
  }

  /**
   * Compute data checksum for verification
   */
  computeChecksum() {
    let hash = 0;

    for (const [key, entry] of this.dataStore.entries()) {
      const keyHash = key.split('').reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0);
      const valueHash = JSON.stringify(entry.value)
        .split('')
        .reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0);
      hash += keyHash + valueHash;
    }

    return hash.toString(16);
  }

  /**
   * Get synchronization statistics
   */
  getStatistics() {
    return {
      totalKeys: this.dataStore.size,
      totalVersions: Array.from(this.versionHistory.values()).reduce((sum, h) => sum + h.length, 0),
      changeLogSize: this.changeLog.length,
      unresolvedConflicts: this.getUnresolvedConflicts().length,
      totalConflicts: this.conflicts.length,
      syncStates: this.syncState.size,
    };
  }
}
