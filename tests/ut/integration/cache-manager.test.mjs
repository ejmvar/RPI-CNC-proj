import { describe, it, expect, beforeEach } from '@jest/globals';
import { CacheManager } from '../../../modules/integration/cache-manager.mjs';

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager({
      maxSize: 100,
      defaultTTL: 3600000,
      evictionPolicy: 'LRU',
    });
  });

  describe('Basic Operations', () => {
    it('should set and get value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for missing key', () => {
      expect(cache.get('missing')).toBeNull();
    });

    it('should delete key', () => {
      cache.set('key1', 'value1');
      const result = cache.delete('key1');

      expect(result).toBe(true);
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear entire cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.cache.size).toBe(0);
      expect(cache.get('key1')).toBeNull();
    });
  });

  describe('TTL Support', () => {
    it('should expire key with TTL', (done) => {
      cache.set('key1', 'value1', { ttl: 50 });

      expect(cache.get('key1')).toBe('value1');

      setTimeout(() => {
        expect(cache.get('key1')).toBeNull();
        done();
      }, 150);
    });

    it('should use default TTL', () => {
      cache = new CacheManager({ defaultTTL: 1000 });
      cache.set('key1', 'value1');

      const entry = cache.getEntry('key1');
      expect(entry.expiresAt).toBeDefined();
    });
  });

  describe('Eviction Policies', () => {
    it('should evict LRU entry when full', () => {
      const smallCache = new CacheManager({ maxSize: 2, evictionPolicy: 'LRU' });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.get('key1'); // Access key1 to make it recently used

      // Adding new key should evict key2 (least recently used)
      smallCache.set('key3', 'value3');

      expect(smallCache.get('key1')).not.toBeNull();
      expect(smallCache.get('key3')).not.toBeNull();
    });

    it('should evict LFU entry when full', () => {
      const lfuCache = new CacheManager({ maxSize: 2, evictionPolicy: 'LFU' });

      lfuCache.set('key1', 'value1');
      lfuCache.set('key2', 'value2');

      // Access key1 twice
      lfuCache.get('key1');
      lfuCache.get('key1');

      // key2 has lower frequency, should be evicted
      lfuCache.set('key3', 'value3');

      expect(lfuCache.get('key1')).not.toBeNull();
      expect(lfuCache.get('key3')).not.toBeNull();
    });

    it('should evict FIFO entry when full', () => {
      const fifoCache = new CacheManager({ maxSize: 2, evictionPolicy: 'FIFO' });

      fifoCache.set('key1', 'value1');
      fifoCache.set('key2', 'value2');

      // key1 was first in, should be evicted
      fifoCache.set('key3', 'value3');

      expect(fifoCache.get('key2')).not.toBeNull();
      expect(fifoCache.get('key3')).not.toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track hit rate', () => {
      cache.set('key1', 'value1');

      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('missing'); // miss

      const stats = cache.getStatistics();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toContain('%');
    });

    it('should track cache size', () => {
      cache.set('key1', 'small');
      cache.set('key2', 'somewhat longer string');

      const stats = cache.getStatistics();
      expect(stats.currentSize).toBe(2);
      expect(stats.totalBytes).toBeGreaterThan(0);
    });

    it('should calculate utilization percentage', () => {
      cache.set('key1', 'value1');

      const stats = cache.getStatistics();
      expect(parseFloat(stats.utilizationPercent)).toBeGreaterThan(0);
      expect(parseFloat(stats.utilizationPercent)).toBeLessThanOrEqual(100);
    });
  });

  describe('Get or Compute', () => {
    it('should return cached value', () => {
      cache.set('key1', 'cached');

      const result = cache.getOrCompute('key1', () => 'computed');

      expect(result).toBe('cached');
    });

    it('should compute and cache missing value', () => {
      const result = cache.getOrCompute('key1', () => 'computed');

      expect(result).toBe('computed');
      expect(cache.get('key1')).toBe('computed');
    });

    it('should support compute function with TTL', (done) => {
      const result = cache.getOrCompute('key1', () => 'computed', { ttl: 50 });

      expect(result).toBe('computed');

      setTimeout(() => {
        expect(cache.get('key1')).toBeNull();
        done();
      }, 150);
    });
  });

  describe('Pattern Matching', () => {
    it('should get keys matching pattern', () => {
      cache.set('user:1', 'Alice');
      cache.set('user:2', 'Bob');
      cache.set('post:1', 'Hello');

      const userKeys = cache.getKeys('^user:');
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain('user:1');
      expect(userKeys).toContain('user:2');
    });

    it('should delete keys matching pattern', () => {
      cache.set('user:1', 'Alice');
      cache.set('user:2', 'Bob');
      cache.set('post:1', 'Hello');

      const deleted = cache.deletePattern('^user:');
      expect(deleted).toBe(2);
      expect(cache.get('user:1')).toBeNull();
      expect(cache.get('post:1')).not.toBeNull();
    });
  });

  describe('Entry Metadata', () => {
    it('should get entry metadata', () => {
      cache.set('key1', 'value1', { metadata: { type: 'user' } });

      const entry = cache.getEntry('key1');
      expect(entry.metadata.type).toBe('user');
      expect(entry.createdAt).toBeDefined();
    });

    it('should track access count', () => {
      cache.set('key1', 'value1');

      cache.get('key1');
      cache.get('key1');
      cache.get('key1');

      const entry = cache.getEntry('key1');
      expect(entry.accessCount).toBe(3);
    });
  });

  describe('Multi Operations', () => {
    it('should set multiple values', () => {
      cache.mset({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      });

      expect(cache.cache.size).toBe(3);
    });

    it('should get multiple values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const values = cache.mget(['key1', 'key2', 'missing']);

      expect(values.key1).toBe('value1');
      expect(values.key2).toBe('value2');
      expect(values.missing).toBeNull();
    });
  });

  describe('Invalidation by Metadata', () => {
    it('should invalidate entries by metadata', () => {
      cache.set('key1', 'user1', { metadata: { type: 'user', role: 'admin' } });
      cache.set('key2', 'user2', { metadata: { type: 'user', role: 'guest' } });
      cache.set('key3', 'post1', { metadata: { type: 'post' } });

      const invalidated = cache.invalidateByMetadata({ type: 'user' });

      expect(invalidated).toBe(2);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).not.toBeNull();
    });

    it('should invalidate with exact metadata match', () => {
      cache.set('key1', 'data', { metadata: { role: 'admin' } });
      cache.set('key2', 'data', { metadata: { role: 'guest' } });

      const invalidated = cache.invalidateByMetadata({ role: 'admin' });

      expect(invalidated).toBe(1);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).not.toBeNull();
    });
  });

  describe('Size Estimation', () => {
    it('should estimate string size', () => {
      cache.set('key1', 'test string');

      const entry = cache.getEntry('key1');
      expect(entry.size).toBeGreaterThan(0);
    });

    it('should estimate object size', () => {
      cache.set('key1', { name: 'Alice', age: 30 });

      const entry = cache.getEntry('key1');
      expect(entry.size).toBeGreaterThan(0);
    });
  });

  describe('Events', () => {
    it('should emit cacheHit event', (done) => {
      cache.set('key1', 'value1');

      cache.on('cacheHit', (data) => {
        expect(data.key).toBe('key1');
        done();
      });

      cache.get('key1');
    });

    it('should emit cacheMiss event', (done) => {
      cache.on('cacheMiss', (data) => {
        expect(data.key).toBe('missing');
        done();
      });

      cache.get('missing');
    });

    it('should emit cacheEvicted event', (done) => {
      const smallCache = new CacheManager({ maxSize: 1 });

      smallCache.set('key1', 'value1');

      smallCache.on('cacheEvicted', (data) => {
        expect(data.key).toBe('key1');
        done();
      });

      smallCache.set('key2', 'value2');
    });

    it('should emit cacheCleared event', (done) => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.on('cacheCleared', (data) => {
        expect(data.itemsCleared).toBe(2);
        done();
      });

      cache.clear();
    });
  });

  describe('Cache Chain', () => {
    it('should support method chaining', () => {
      const result = cache.set('key1', 'value1').set('key2', 'value2').set('key3', 'value3');

      expect(result).toBe(cache);
      expect(cache.cache.size).toBe(3);
    });

    it('should support chained mset', () => {
      const result = cache.mset({
        key1: 'value1',
        key2: 'value2',
      });

      expect(result).toBe(cache);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      cache.set('key1', null);
      expect(cache.get('key1')).toBeNull();
    });

    it('should handle undefined values', () => {
      cache.set('key1', undefined);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should handle complex objects', () => {
      const complex = {
        nested: { data: [1, 2, 3] },
        array: [{ id: 1 }, { id: 2 }],
      };

      cache.set('key1', complex);
      expect(cache.get('key1')).toEqual(complex);
    });

    it('should handle rapid access patterns', () => {
      cache.set('key1', 'value1');

      for (let i = 0; i < 100; i++) {
        cache.get('key1');
      }

      const entry = cache.getEntry('key1');
      expect(entry.accessCount).toBe(100);
    });
  });
});
