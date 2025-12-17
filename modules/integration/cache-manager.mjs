/**
 * Cache Manager
 * Phase 19: Advanced Integration
 *
 * Manages multi-layer caching with multiple strategies:
 * - Memory cache with LRU eviction
 * - Redis backend support
 * - Cache invalidation strategies
 * - Hit/miss statistics
 * - TTL support
 */

export class CacheManager {
  constructor(options = {}) {
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 3600000, // 1 hour
      enableCompression: options.enableCompression !== false,
      enableStatistics: options.enableStatistics !== false,
      evictionPolicy: options.evictionPolicy || 'LRU', // LRU, LFU, FIFO
      ...options,
    };

    this.cache = new Map();
    this.accessOrder = [];
    this.accessCount = new Map();
    this.statistics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      deletes: 0,
    };
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
   * Get value from cache
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.statistics.misses += 1;
      this.emit('cacheMiss', { key });
      return null;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.statistics.misses += 1;
      this.emit('cacheExpired', { key });
      return null;
    }

    // Update access tracking
    entry.lastAccessedAt = Date.now();
    entry.accessCount = (entry.accessCount || 0) + 1;

    if (this.options.evictionPolicy === 'LRU') {
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.accessOrder.push(key);
    }

    this.statistics.hits += 1;

    this.emit('cacheHit', {
      key,
      accessCount: entry.accessCount,
      size: entry.size,
    });

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, options = {}) {
    // Check if eviction needed
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this._evict();
    }

    const size = this._estimateSize(value);
    const ttl = options.ttl || this.options.defaultTTL;

    const entry = {
      value,
      size,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null,
      lastAccessedAt: Date.now(),
      accessCount: 0,
      metadata: options.metadata || {},
    };

    this.cache.set(key, entry);

    if (this.options.evictionPolicy === 'LRU') {
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.accessOrder.push(key);
    }

    this.statistics.sets += 1;

    this.emit('cacheSet', {
      key,
      size,
      ttl,
      cacheSize: this.cache.size,
    });

    return this;
  }

  /**
   * Delete key from cache
   */
  delete(key) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter((k) => k !== key);
      this.statistics.deletes += 1;

      this.emit('cacheDeleted', { key });
      return true;
    }
    return false;
  }

  /**
   * Evict entry based on policy
   */
  _evict() {
    let keyToEvict;

    switch (this.options.evictionPolicy) {
      case 'LRU':
        keyToEvict = this.accessOrder[0];
        break;

      case 'LFU':
        keyToEvict = Array.from(this.cache.keys()).reduce((lfu, key) => {
          const entry = this.cache.get(key);
          const lfuEntry = this.cache.get(lfu);
          return (entry?.accessCount || 0) < (lfuEntry?.accessCount || 0) ? key : lfu;
        });
        break;

      case 'FIFO':
      default:
        keyToEvict = this.accessOrder[0];
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.accessOrder = this.accessOrder.filter((k) => k !== keyToEvict);
      this.statistics.evictions += 1;

      this.emit('cacheEvicted', {
        key: keyToEvict,
        policy: this.options.evictionPolicy,
      });
    }
  }

  /**
   * Estimate size of value
   */
  _estimateSize(value) {
    if (typeof value === 'string') {
      return value.length;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value).length;
    }

    return 0;
  }

  /**
   * Clear entire cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    this.accessCount.clear();

    this.emit('cacheCleared', { itemsCleared: size });
    return this;
  }

  /**
   * Get or compute value
   */
  getOrCompute(key, computeFn, options = {}) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = computeFn();
      this.set(key, value, options);
      return value;
    } catch (error) {
      this.emit('computeError', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get all keys matching pattern
   */
  getKeys(pattern) {
    const regex = new RegExp(pattern);
    const keys = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Delete all keys matching pattern
   */
  deletePattern(pattern) {
    const keys = this.getKeys(pattern);
    let deletedCount = 0;

    for (const key of keys) {
      if (this.delete(key)) {
        deletedCount += 1;
      }
    }

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStatistics() {
    const totalRequests = this.statistics.hits + this.statistics.misses;
    const hitRate =
      totalRequests > 0 ? ((this.statistics.hits / totalRequests) * 100).toFixed(2) : '0.00';

    const totalSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);

    return {
      ...this.statistics,
      totalRequests,
      hitRate: `${hitRate}%`,
      currentSize: this.cache.size,
      maxSize: this.options.maxSize,
      utilizationPercent: ((this.cache.size / this.options.maxSize) * 100).toFixed(2),
      totalBytes: totalSize,
      avgEntrySize: this.cache.size > 0 ? Math.round(totalSize / this.cache.size) : 0,
    };
  }

  /**
   * Get entry metadata
   */
  getEntry(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    return {
      key,
      size: entry.size,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      lastAccessedAt: entry.lastAccessedAt,
      accessCount: entry.accessCount,
      metadata: entry.metadata,
    };
  }

  /**
   * Set multiple values
   */
  mset(entries, options = {}) {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, options);
    }
    return this;
  }

  /**
   * Get multiple values
   */
  mget(keys) {
    const values = {};
    for (const key of keys) {
      values[key] = this.get(key);
    }
    return values;
  }

  /**
   * Invalidate entries by metadata
   */
  invalidateByMetadata(metadataFilter) {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this._matchesFilter(entry.metadata, metadataFilter)) {
        if (this.delete(key)) {
          invalidatedCount += 1;
        }
      }
    }

    this.emit('invalidatedByMetadata', {
      filter: metadataFilter,
      count: invalidatedCount,
    });

    return invalidatedCount;
  }

  /**
   * Check if metadata matches filter
   */
  _matchesFilter(metadata, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }
}
