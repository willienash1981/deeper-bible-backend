/**
 * Tests for Cache Manager Implementation
 * @module tests/services/bible/CacheManager.test
 */

import { jest } from '@jest/globals';
import { CacheManager, CacheConfig, CacheStats } from '../../../src/services/bible/cache/CacheManager';

describe('CacheManager', () => {
  let cache: CacheManager<any>;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('constructor and configuration', () => {
    test('should initialize with default configuration', () => {
      const defaultCache = new CacheManager();
      const stats = defaultCache.getStats();
      
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      
      defaultCache.destroy();
    });

    test('should initialize with custom configuration', () => {
      const config: CacheConfig = {
        maxSize: 500,
        defaultTTL: 30000,
        autoCleanup: false,
        cleanupInterval: 60000
      };
      
      const customCache = new CacheManager(config);
      expect(customCache['config'].maxSize).toBe(500);
      expect(customCache['config'].defaultTTL).toBe(30000);
      expect(customCache['config'].autoCleanup).toBe(false);
      expect(customCache['config'].cleanupInterval).toBe(60000);
      
      customCache.destroy();
    });

    test('should handle partial configuration', () => {
      const partialConfig: CacheConfig = {
        maxSize: 100
      };
      
      const partialCache = new CacheManager(partialConfig);
      expect(partialCache['config'].maxSize).toBe(100);
      expect(partialCache['config'].defaultTTL).toBe(60 * 60 * 1000); // default 1 hour
      expect(partialCache['config'].autoCleanup).toBe(true); // default true
      
      partialCache.destroy();
    });

    test('should start cleanup timer when autoCleanup is enabled', () => {
      const timerCache = new CacheManager({ autoCleanup: true });
      expect(timerCache['cleanupTimer']).toBeDefined();
      timerCache.destroy();
    });

    test('should not start cleanup timer when autoCleanup is disabled', () => {
      const noTimerCache = new CacheManager({ autoCleanup: false });
      expect(noTimerCache['cleanupTimer']).toBeUndefined();
      noTimerCache.destroy();
    });
  });

  describe('basic cache operations', () => {
    test('should store and retrieve data', () => {
      const key = 'test-key';
      const data = { message: 'test data' };
      
      cache.set(key, data);
      const retrieved = cache.get(key);
      
      expect(retrieved).toEqual(data);
    });

    test('should return undefined for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeUndefined();
    });

    test('should update existing entries', () => {
      const key = 'update-test';
      cache.set(key, 'original');
      cache.set(key, 'updated');
      
      expect(cache.get(key)).toBe('updated');
    });

    test('should delete entries', () => {
      const key = 'delete-test';
      cache.set(key, 'data');
      
      const deleted = cache.delete(key);
      expect(deleted).toBe(true);
      expect(cache.get(key)).toBeUndefined();
    });

    test('should return false when deleting non-existent entry', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(false);
    });

    test('should clear all entries', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
      expect(cache.size()).toBe(0);
    });

    test('should check if key exists', () => {
      const key = 'exists-test';
      expect(cache.has(key)).toBe(false);
      
      cache.set(key, 'data');
      expect(cache.has(key)).toBe(true);
      
      cache.delete(key);
      expect(cache.has(key)).toBe(false);
    });

    test('should return correct size', () => {
      expect(cache.size()).toBe(0);
      
      cache.set('key1', 'data1');
      expect(cache.size()).toBe(1);
      
      cache.set('key2', 'data2');
      expect(cache.size()).toBe(2);
      
      cache.delete('key1');
      expect(cache.size()).toBe(1);
      
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    test('should return all keys', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      cache.set('key3', 'data3');
      
      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });

  describe('TTL (Time-To-Live) functionality', () => {
    test('should expire entries after TTL', async () => {
      const key = 'ttl-test';
      const data = 'ttl data';
      const ttl = 100; // 100ms
      
      cache.set(key, data, ttl);
      expect(cache.get(key)).toBe(data);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, ttl + 50));
      
      expect(cache.get(key)).toBeUndefined();
    });

    test('should use default TTL when not specified', async () => {
      const shortTTLCache = new CacheManager({ defaultTTL: 50 });
      
      shortTTLCache.set('key', 'data'); // Uses default TTL
      expect(shortTTLCache.get('key')).toBe('data');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(shortTTLCache.get('key')).toBeUndefined();
      
      shortTTLCache.destroy();
    });

    test('should not expire entries with sufficient TTL', async () => {
      const key = 'long-ttl-test';
      const data = 'long ttl data';
      const ttl = 10000; // 10 seconds
      
      cache.set(key, data, ttl);
      expect(cache.get(key)).toBe(data);
      
      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(cache.get(key)).toBe(data);
    });

    test('should clean up expired entries automatically', async () => {
      const shortTTL = 50;
      cache.set('expire1', 'data1', shortTTL);
      cache.set('expire2', 'data2', shortTTL);
      cache.set('keep', 'data3', 10000);
      
      expect(cache.size()).toBe(3);
      
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50));
      
      // Trigger cleanup by calling a method that checks for expired entries
      cache.keys();
      
      expect(cache.size()).toBe(1);
      expect(cache.get('keep')).toBe('data3');
    });

    test('should remove expired entries on has() check', async () => {
      const key = 'expire-on-has';
      const ttl = 50;
      
      cache.set(key, 'data', ttl);
      expect(cache.has(key)).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, ttl + 50));
      expect(cache.has(key)).toBe(false);
    });
  });

  describe('LRU (Least Recently Used) eviction', () => {
    test('should evict least recently used entries when maxSize is reached', () => {
      const lruCache = new CacheManager({ maxSize: 3 });
      
      lruCache.set('key1', 'data1');
      lruCache.set('key2', 'data2');
      lruCache.set('key3', 'data3');
      
      expect(lruCache.size()).toBe(3);
      
      // Adding fourth entry should evict the least recently used (key1)
      lruCache.set('key4', 'data4');
      
      expect(lruCache.size()).toBe(3);
      expect(lruCache.get('key1')).toBeUndefined(); // key1 was evicted
      expect(lruCache.get('key2')).toBe('data2');
      expect(lruCache.get('key3')).toBe('data3');
      expect(lruCache.get('key4')).toBe('data4');
      
      lruCache.destroy();
    });

    test('should update access order on get operations', () => {
      const lruCache = new CacheManager({ maxSize: 3 });
      
      lruCache.set('key1', 'data1');
      lruCache.set('key2', 'data2');
      lruCache.set('key3', 'data3');
      
      // Access key1 to make it most recently used
      lruCache.get('key1');
      
      // Adding fourth entry should now evict key2 (least recently used)
      lruCache.set('key4', 'data4');
      
      expect(lruCache.get('key1')).toBe('data1'); // key1 was accessed, so not evicted
      expect(lruCache.get('key2')).toBeUndefined(); // key2 was evicted
      expect(lruCache.get('key3')).toBe('data3');
      expect(lruCache.get('key4')).toBe('data4');
      
      lruCache.destroy();
    });

    test('should handle eviction order correctly with multiple accesses', () => {
      const lruCache = new CacheManager({ maxSize: 2 });
      
      lruCache.set('a', 'data-a');
      lruCache.set('b', 'data-b');
      
      // Access both to establish order
      lruCache.get('a');
      lruCache.get('b');
      
      // Access 'a' again to make it more recently used
      lruCache.get('a');
      
      // Add new entry - should evict 'b'
      lruCache.set('c', 'data-c');
      
      expect(lruCache.get('a')).toBe('data-a');
      expect(lruCache.get('b')).toBeUndefined();
      expect(lruCache.get('c')).toBe('data-c');
      
      lruCache.destroy();
    });
  });

  describe('statistics tracking', () => {
    test('should track hit and miss statistics', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      
      // Generate some hits
      cache.get('key1');
      cache.get('key1');
      cache.get('key2');
      
      // Generate some misses
      cache.get('nonexistent1');
      cache.get('nonexistent2');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.6); // 3/(3+2) = 0.6
    });

    test('should track evictions', () => {
      const evictionCache = new CacheManager({ maxSize: 2 });
      
      evictionCache.set('key1', 'data1');
      evictionCache.set('key2', 'data2');
      evictionCache.set('key3', 'data3'); // Should evict key1
      evictionCache.set('key4', 'data4'); // Should evict key2
      
      const stats = evictionCache.getStats();
      expect(stats.evictions).toBe(2);
      
      evictionCache.destroy();
    });

    test('should calculate hit rate correctly', () => {
      // Test with no requests
      expect(cache.getStats().hitRate).toBe(0);
      
      // Test with only hits
      cache.set('key', 'data');
      cache.get('key');
      cache.get('key');
      expect(cache.getStats().hitRate).toBe(1.0);
      
      // Test with mix
      cache.get('nonexistent');
      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(2/3); // 2 hits out of 3 requests
    });

    test('should calculate average entry age', () => {
      cache.set('key1', 'data1');
      
      // Wait a bit
      setTimeout(() => {
        cache.set('key2', 'data2');
        const stats = cache.getStats();
        expect(stats.averageAge).toBeGreaterThan(0);
      }, 10);
    });

    test('should estimate memory usage', () => {
      const stats1 = cache.getStats();
      expect(stats1.memoryUsage).toBe(0);
      
      cache.set('key1', { data: 'test' });
      cache.set('key2', { data: 'more test data' });
      
      const stats2 = cache.getStats();
      expect(stats2.memoryUsage).toBeGreaterThan(0);
    });

    test('should reset statistics on clear', () => {
      cache.set('key', 'data');
      cache.get('key');
      cache.get('nonexistent');
      
      expect(cache.getStats().hits).toBeGreaterThan(0);
      expect(cache.getStats().misses).toBeGreaterThan(0);
      
      cache.clear();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('cache warming', () => {
    test('should warm cache with predefined entries', () => {
      const warmEntries = [
        { key: 'warm1', data: 'data1' },
        { key: 'warm2', data: 'data2', ttl: 5000 },
        { key: 'warm3', data: { complex: 'object' } }
      ];
      
      cache.warm(warmEntries);
      
      expect(cache.get('warm1')).toBe('data1');
      expect(cache.get('warm2')).toBe('data2');
      expect(cache.get('warm3')).toEqual({ complex: 'object' });
      expect(cache.size()).toBe(3);
    });

    test('should handle empty warm entries', () => {
      cache.warm([]);
      expect(cache.size()).toBe(0);
    });

    test('should respect TTL in warm entries', async () => {
      const warmEntries = [
        { key: 'expire-warm', data: 'will expire', ttl: 50 }
      ];
      
      cache.warm(warmEntries);
      expect(cache.get('expire-warm')).toBe('will expire');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('expire-warm')).toBeUndefined();
    });
  });

  describe('entry metadata', () => {
    test('should provide entry metadata', () => {
      const key = 'meta-test';
      const data = 'test data';
      
      cache.set(key, data);
      
      const metadata = cache.getEntryMetadata(key);
      expect(metadata).toBeDefined();
      expect(metadata).toHaveProperty('timestamp');
      expect(metadata).toHaveProperty('ttl');
      expect(metadata).toHaveProperty('hits');
      expect(metadata).toHaveProperty('lastAccessed');
      expect(metadata).not.toHaveProperty('data'); // Data should be excluded
    });

    test('should return undefined for non-existent entry metadata', () => {
      const metadata = cache.getEntryMetadata('non-existent');
      expect(metadata).toBeUndefined();
    });

    test('should track hit count in metadata', () => {
      const key = 'hit-count-test';
      cache.set(key, 'data');
      
      // Initial metadata
      let metadata = cache.getEntryMetadata(key);
      expect(metadata?.hits).toBe(0);
      
      // Access entry multiple times
      cache.get(key);
      cache.get(key);
      cache.get(key);
      
      metadata = cache.getEntryMetadata(key);
      expect(metadata?.hits).toBe(3);
    });

    test('should update lastAccessed timestamp', async () => {
      const key = 'access-time-test';
      cache.set(key, 'data');
      
      const initialMetadata = cache.getEntryMetadata(key);
      const initialLastAccessed = initialMetadata?.lastAccessed;
      
      // Wait and access
      await new Promise(resolve => setTimeout(resolve, 10));
      
      cache.get(key);
      const updatedMetadata = cache.getEntryMetadata(key);
      expect(updatedMetadata?.lastAccessed).toBeGreaterThan(initialLastAccessed!);
    });
  });

  describe('automatic cleanup', () => {
    test('should automatically clean expired entries with timer', async () => {
      const autoCleanCache = new CacheManager({
        autoCleanup: true,
        cleanupInterval: 100, // 100ms
        defaultTTL: 50 // 50ms
      });
      
      autoCleanCache.set('expire1', 'data1');
      autoCleanCache.set('expire2', 'data2');
      
      expect(autoCleanCache.size()).toBe(2);
      
      // Wait for entries to expire and cleanup to run
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Check by calling size() which triggers cleanup
      expect(autoCleanCache.size()).toBe(0);
      
      autoCleanCache.destroy();
    });

    test('should not run automatic cleanup when disabled', async () => {
      const manualCache = new CacheManager({
        autoCleanup: false,
        defaultTTL: 50
      });
      
      manualCache.set('expire', 'data');
      expect(manualCache.size()).toBe(1);
      
      // Wait for entry to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Without cleanup, expired entries still count toward size until accessed
      // But get should return undefined and remove expired entry
      expect(manualCache.get('expire')).toBeUndefined();
      expect(manualCache.size()).toBe(0);
      
      manualCache.destroy();
    });
  });

  describe('destroy and lifecycle', () => {
    test('should stop cleanup timer on destroy', () => {
      const timerCache = new CacheManager({ autoCleanup: true });
      expect(timerCache['cleanupTimer']).toBeDefined();
      
      timerCache.destroy();
      expect(timerCache['cleanupTimer']).toBeUndefined();
    });

    test('should clear all data on destroy', () => {
      cache.set('key1', 'data1');
      cache.set('key2', 'data2');
      
      expect(cache.size()).toBe(2);
      
      cache.destroy();
      
      expect(cache.size()).toBe(0);
    });

    test('should reset statistics on destroy', () => {
      cache.set('key', 'data');
      cache.get('key');
      cache.get('nonexistent');
      
      expect(cache.getStats().hits).toBeGreaterThan(0);
      expect(cache.getStats().misses).toBeGreaterThan(0);
      
      cache.destroy();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle very large datasets within memory limits', () => {
      const largeCache = new CacheManager({ maxSize: 10000 });
      
      // Add many entries
      for (let i = 0; i < 5000; i++) {
        largeCache.set(`key-${i}`, `data-${i}`);
      }
      
      expect(largeCache.size()).toBe(5000);
      
      // Verify some entries exist
      expect(largeCache.get('key-0')).toBe('data-0');
      expect(largeCache.get('key-4999')).toBe('data-4999');
      
      largeCache.destroy();
    });

    test('should handle concurrent operations', () => {
      const key = 'concurrent-test';
      
      // Simulate concurrent access
      cache.set(key, 'data1');
      cache.set(key, 'data2');
      cache.get(key);
      cache.set(key, 'data3');
      
      expect(cache.get(key)).toBe('data3');
    });

    test('should handle objects that cannot be JSON serialized', () => {
      const circular: any = { name: 'circular' };
      circular.self = circular;
      
      cache.set('circular', circular);
      expect(cache.get('circular')).toBe(circular);
      
      // Memory estimation should still work (using fallback)
      const stats = cache.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    test('should handle null and undefined values', () => {
      cache.set('null-key', null);
      cache.set('undefined-key', undefined);
      
      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeUndefined();
      
      expect(cache.has('null-key')).toBe(true);
      expect(cache.has('undefined-key')).toBe(true);
    });

    test('should handle zero and negative TTL values', async () => {
      // Zero TTL should immediately expire
      cache.set('zero-ttl', 'data', 0);
      // Wait a tiny bit to ensure timestamp comparison works
      await new Promise(resolve => setTimeout(resolve, 1));
      expect(cache.get('zero-ttl')).toBeUndefined();
      
      // Negative TTL should immediately expire
      cache.set('negative-ttl', 'data', -1000);
      expect(cache.get('negative-ttl')).toBeUndefined();
    });

    test('should maintain consistency during eviction', () => {
      const consistencyCache = new CacheManager({ maxSize: 3 });
      
      // Fill cache
      consistencyCache.set('a', 1);
      consistencyCache.set('b', 2);
      consistencyCache.set('c', 3);
      
      // Add entry that causes eviction
      consistencyCache.set('d', 4);
      
      // Verify state is consistent
      const keys = consistencyCache.keys();
      expect(keys.length).toBe(3);
      expect(consistencyCache.size()).toBe(3);
      
      // Verify evicted entry is gone
      expect(consistencyCache.get('a')).toBeUndefined();
      
      consistencyCache.destroy();
    });
  });

  describe('performance characteristics', () => {
    test('should maintain reasonable performance with many entries', () => {
      const perfCache = new CacheManager({ maxSize: 10000 });
      
      const start = Date.now();
      
      // Add many entries
      for (let i = 0; i < 1000; i++) {
        perfCache.set(`key-${i}`, `data-${i}`);
      }
      
      // Access entries
      for (let i = 0; i < 1000; i++) {
        perfCache.get(`key-${i}`);
      }
      
      const end = Date.now();
      
      // Should complete quickly (adjust threshold as needed)
      expect(end - start).toBeLessThan(1000); // Less than 1 second
      
      perfCache.destroy();
    });

    test('should handle frequent updates efficiently', () => {
      const key = 'update-test';
      const iterations = 1000;
      
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        cache.set(key, `data-${i}`);
        cache.get(key);
      }
      
      const end = Date.now();
      
      expect(end - start).toBeLessThan(500); // Should be fast
      expect(cache.get(key)).toBe(`data-${iterations - 1}`);
    });
  });
});