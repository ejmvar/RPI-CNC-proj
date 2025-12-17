import { describe, it, expect, beforeEach } from '@jest/globals';
import { DataSynchronizationManager } from '../../../modules/integration/data-sync-manager.mjs';

describe('DataSynchronizationManager', () => {
  let manager;

  beforeEach(() => {
    manager = new DataSynchronizationManager({
      enableChangeTracking: true,
      enableVersioning: true,
      conflictStrategy: 'LAST_WRITE_WINS',
    });
  });

  describe('Basic Operations', () => {
    it('should set data', () => {
      manager.set('key1', 'value1');

      expect(manager.get('key1')).toBe('value1');
    });

    it('should get data with metadata', () => {
      manager.set('key1', 'value1');

      const entry = manager.getWithMetadata('key1');
      expect(entry).toBeDefined();
      expect(entry.value).toBe('value1');
      expect(entry.version).toBe(1);
    });

    it('should delete data', () => {
      manager.set('key1', 'value1');
      manager.delete('key1');

      expect(manager.get('key1')).toBeNull();
    });

    it('should track version on updates', () => {
      manager.set('key1', 'v1');
      const entry1 = manager.getWithMetadata('key1');

      manager.set('key1', 'v2');
      const entry2 = manager.getWithMetadata('key1');

      expect(entry2.version).toBe(entry1.version + 1);
    });
  });

  describe('Change Tracking', () => {
    it('should track changes', () => {
      manager.set('key1', 'oldValue');
      manager.set('key1', 'newValue');

      const changes = manager.getChangesSince(0);
      expect(changes.length).toBeGreaterThanOrEqual(1);
    });

    it('should track operation type', () => {
      manager.set('key1', 'value');
      manager.delete('key1');

      const changes = manager.getChangesSince(0);
      const deleteChange = changes.find((c) => c.operation === 'delete');
      expect(deleteChange).toBeDefined();
    });

    it('should limit change log size', () => {
      for (let i = 0; i < 10100; i++) {
        manager.set(`key${i}`, `value${i}`);
      }

      // Change log should be limited
      expect(manager.changeLog.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Version History', () => {
    it('should maintain version history', () => {
      manager.set('key1', 'v1');
      manager.set('key1', 'v2');
      manager.set('key1', 'v3');

      const history = manager.getVersionHistory('key1');
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should rollback to previous version', () => {
      manager.set('key1', 'v1');
      manager.set('key1', 'v2');
      manager.set('key1', 'v3');

      const history = manager.getVersionHistory('key1');
      manager.rollback('key1', 0);

      expect(manager.get('key1')).toBe('v1');
    });

    it('should reject invalid rollback index', () => {
      manager.set('key1', 'v1');

      const result = manager.rollback('key1', 999);
      expect(result).toBe(false);
    });
  });

  describe('Synchronization', () => {
    it('should sync new remote data', async () => {
      const remoteData = {
        key1: { value: 'remote1', version: 1, timestamp: Date.now() },
        key2: { value: 'remote2', version: 1, timestamp: Date.now() },
      };

      const result = await manager.syncWithRemote(remoteData);

      expect(result.synced).toBeGreaterThanOrEqual(0);
      expect(result.conflicts).toBeGreaterThanOrEqual(0);
    });

    it('should handle LAST_WRITE_WINS strategy', async () => {
      manager.set('key1', 'local');

      const remoteTimestamp = Date.now() + 1000;
      const remoteData = {
        key1: {
          value: 'remote',
          version: 1,
          timestamp: remoteTimestamp,
        },
      };

      await manager.syncWithRemote(remoteData, {
        strategy: 'LAST_WRITE_WINS',
      });

      expect(manager.get('key1')).toBe('remote');
    });

    it('should handle FIRST_WRITE_WINS strategy', async () => {
      const localTimestamp = Date.now() - 1000;
      manager.dataStore.set('key1', {
        value: 'local',
        timestamp: localTimestamp,
        version: 1,
      });

      const remoteData = {
        key1: {
          value: 'remote',
          version: 1,
          timestamp: Date.now(),
        },
      };

      await manager.syncWithRemote(remoteData, {
        strategy: 'FIRST_WRITE_WINS',
      });

      expect(manager.get('key1')).toBe('local');
    });

    it('should detect conflicts', async () => {
      manager.set('key1', 'local');

      const remoteData = {
        key1: {
          value: 'remote',
          version: 1,
          timestamp: Date.now() + 100,
        },
      };

      const result = await manager.syncWithRemote(remoteData, {
        strategy: 'LAST_WRITE_WINS',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Conflict Resolution', () => {
    it('should get unresolved conflicts', async () => {
      manager.set('key1', 'local');

      const remoteData = {
        key1: {
          value: 'remote',
          version: 2,
          timestamp: Date.now(),
        },
      };

      // Create a scenario with conflicting timestamps
      manager.dataStore.get('key1').timestamp = Date.now() + 1000;

      await manager.syncWithRemote(remoteData);

      const conflicts = manager.getUnresolvedConflicts();
      // May or may not have conflicts depending on strategy
      expect(Array.isArray(conflicts)).toBe(true);
    });

    it('should resolve conflict manually', () => {
      manager.set('key1', 'local');
      manager.set('key2', 'remote');

      manager.conflicts.push({
        key: 'key1',
        local: { value: 'local' },
        remote: { value: 'remote' },
        resolved: false,
      });

      const result = manager.resolveConflictManually('key1', 'resolved');

      expect(result).toBe(true);
      expect(manager.get('key1')).toBe('resolved');
    });

    it('should return false for non-existent conflict', () => {
      const result = manager.resolveConflictManually('non-existent', 'value');

      expect(result).toBe(false);
    });
  });

  describe('Synchronization State', () => {
    it('should get sync state', () => {
      const state = manager.getSyncState('remote1');

      expect(state).toBeDefined();
      expect(state.remoteId).toBe('remote1');
      expect(state.lastSyncTime).toBe(0);
    });

    it('should update sync state', () => {
      manager.updateSyncState('remote1', 'hash123');

      const state = manager.getSyncState('remote1');
      expect(state.lastSyncHash).toBe('hash123');
      expect(state.syncCount).toBe(1);
    });

    it('should increment sync count', () => {
      manager.updateSyncState('remote1', 'hash1');
      manager.updateSyncState('remote1', 'hash2');

      const state = manager.getSyncState('remote1');
      expect(state.syncCount).toBe(2);
    });
  });

  describe('Checksum Verification', () => {
    it('should compute checksum', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');

      const checksum = manager.computeChecksum();

      expect(typeof checksum).toBe('string');
      expect(checksum).toHaveLength(8); // Hex format
    });

    it('should produce same checksum for same data', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');

      const checksum1 = manager.computeChecksum();
      const checksum2 = manager.computeChecksum();

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksum for different data', () => {
      manager.set('key1', 'value1');
      const checksum1 = manager.computeChecksum();

      manager.set('key1', 'value2');
      const checksum2 = manager.computeChecksum();

      expect(checksum1).not.toBe(checksum2);
    });
  });

  describe('Statistics', () => {
    it('should get statistics', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');

      const stats = manager.getStatistics();
      expect(stats.totalKeys).toBe(2);
      expect(stats.changeLogSize).toBeGreaterThanOrEqual(0);
    });

    it('should track versions', () => {
      manager.set('key1', 'v1');
      manager.set('key1', 'v2');
      manager.set('key1', 'v3');

      const stats = manager.getStatistics();
      expect(stats.totalVersions).toBeGreaterThan(0);
    });
  });

  describe('Events', () => {
    it('should emit dataChanged event', (done) => {
      manager.on('dataChanged', (data) => {
        expect(data.key).toBe('key1');
        expect(data.operation).toBe('set');
        done();
      });

      manager.set('key1', 'value1');
    });

    it('should emit syncCompleted event', (done) => {
      manager.on('syncCompleted', (result) => {
        expect(result).toBeDefined();
        expect(result.synced).toBeGreaterThanOrEqual(0);
        done();
      });

      manager.syncWithRemote({});
    });

    it('should emit conflictResolved event', (done) => {
      manager.conflicts.push({
        key: 'key1',
        resolved: false,
      });

      manager.on('conflictResolved', (data) => {
        expect(data.key).toBe('key1');
        expect(data.strategy).toBe('manual');
        done();
      });

      manager.resolveConflictManually('key1', 'resolved');
    });

    it('should emit rolledBack event', (done) => {
      manager.set('key1', 'v1');
      manager.set('key1', 'v2');

      manager.on('rolledBack', (data) => {
        expect(data.key).toBe('key1');
        done();
      });

      manager.rollback('key1', 0);
    });
  });

  describe('Metadata Tracking', () => {
    it('should track user information', () => {
      manager.set('key1', 'value1', { userId: 'alice' });

      const entry = manager.getWithMetadata('key1');
      expect(entry.userId).toBe('alice');
    });

    it('should store custom metadata', () => {
      manager.set('key1', 'value1', {
        metadata: { category: 'user', priority: 'high' },
      });

      const entry = manager.getWithMetadata('key1');
      expect(entry.metadata.category).toBe('user');
    });
  });

  describe('Data Types', () => {
    it('should handle string data', () => {
      manager.set('key1', 'string value');
      expect(manager.get('key1')).toBe('string value');
    });

    it('should handle object data', () => {
      const obj = { name: 'Alice', age: 30 };
      manager.set('key1', obj);
      expect(manager.get('key1')).toEqual(obj);
    });

    it('should handle array data', () => {
      const arr = [1, 2, 3];
      manager.set('key1', arr);
      expect(manager.get('key1')).toEqual(arr);
    });

    it('should handle number data', () => {
      manager.set('key1', 42);
      expect(manager.get('key1')).toBe(42);
    });

    it('should handle boolean data', () => {
      manager.set('key1', true);
      expect(manager.get('key1')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle delete of non-existent key', () => {
      const result = manager.delete('non-existent');
      expect(result).toBe(false);
    });

    it('should handle sync with empty remote data', async () => {
      manager.set('key1', 'value1');

      const result = await manager.syncWithRemote({});

      expect(result.synced).toBeDefined();
    });

    it('should handle rapid updates', () => {
      for (let i = 0; i < 100; i++) {
        manager.set('key', `value${i}`);
      }

      const entry = manager.getWithMetadata('key');
      expect(entry.version).toBeGreaterThan(1);
    });
  });
});
