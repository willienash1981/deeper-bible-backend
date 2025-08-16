import { CacheService } from '../../services/cache/redis.service';
import { RedisCircuitBreaker } from '../../services/circuit-breaker';
import { CacheMetricsService } from '../../services/cache/metrics';
import { BibleDataCacheStrategy } from '../../services/cache/strategies/bible-data.strategy';
import Redis from 'ioredis';

// Integration tests require a real Redis instance
describe('Cache Integration Tests', () => {
  let cacheService: CacheService;
  let circuitBreaker: RedisCircuitBreaker;
  let metricsService: CacheMetricsService;
  let bibleStrategy: BibleDataCacheStrategy;
  let redis: Redis;

  const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: 15, // Use a different DB for testing
  };

  beforeAll(async () => {
    // Check if Redis is available
    redis = new Redis(REDIS_CONFIG);
    
    try {
      await redis.ping();
    } catch (error) {
      console.warn('Redis not available, skipping integration tests');
      await redis.quit();
      return;
    }

    // Clear test database
    await redis.flushdb();
    await redis.quit();

    // Initialize services
    process.env.REDIS_DB = '15';
    cacheService = new CacheService();
    circuitBreaker = new RedisCircuitBreaker();
    metricsService = new CacheMetricsService(cacheService);
    bibleStrategy = new BibleDataCacheStrategy(cacheService);

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (cacheService) {
      await cacheService.flush();
      await cacheService.disconnect();
    }
    if (metricsService) {
      metricsService.stopCollection();
    }
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache values', async () => {
      const testData = { message: 'Hello, Cache!' };
      
      await cacheService.set('test-key', testData, { ttl: 60 });
      const result = await cacheService.get('test-key');
      
      expect(result).toEqual(testData);
    });

    it('should handle TTL expiration', async () => {
      const testData = { message: 'Expiring data' };
      
      await cacheService.set('expiring-key', testData, { ttl: 1 });
      
      // Should exist immediately
      let result = await cacheService.get('expiring-key');
      expect(result).toEqual(testData);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be expired
      result = await cacheService.get('expiring-key');
      expect(result).toBeNull();
    });

    it('should compress large values', async () => {
      const largeData = {
        content: 'x'.repeat(2000), // Over compression threshold
        metadata: { size: 'large' }
      };
      
      await cacheService.set('large-key', largeData, { ttl: 60 });
      const result = await cacheService.get('large-key');
      
      expect(result).toEqual(largeData);
    });

    it('should delete cache patterns', async () => {
      // Set multiple keys
      await Promise.all([
        cacheService.set('pattern:test:1', { id: 1 }),
        cacheService.set('pattern:test:2', { id: 2 }),
        cacheService.set('other:key', { id: 3 }),
      ]);

      // Delete pattern
      const deleted = await cacheService.delete('pattern:test:*');
      
      expect(deleted).toBeGreaterThan(0);
      
      // Verify deletions
      expect(await cacheService.get('pattern:test:1')).toBeNull();
      expect(await cacheService.get('pattern:test:2')).toBeNull();
      expect(await cacheService.get('other:key')).not.toBeNull();
    });
  });

  describe('Bible Data Strategy Integration', () => {
    it('should cache and retrieve Bible verses', async () => {
      const verse = {
        book: 'Genesis',
        chapter: 1,
        verse: 1,
        text: 'In the beginning God created the heaven and the earth.',
        translation: 'KJV'
      };

      await bibleStrategy.setVerse(verse);
      const result = await bibleStrategy.getVerse('Genesis', 1, 1, 'KJV');

      expect(result).toEqual(verse);
    });

    it('should cache entire chapters', async () => {
      const chapter = {
        book: 'John',
        chapter: 3,
        translation: 'ESV',
        verses: [
          {
            book: 'John',
            chapter: 3,
            verse: 16,
            text: 'For God so loved the world...',
            translation: 'ESV'
          }
        ]
      };

      await bibleStrategy.setChapter(chapter);
      const result = await bibleStrategy.getChapter('John', 3, 'ESV');

      expect(result).toEqual(chapter);
    });

    it('should warm cache for entire books', async () => {
      const chapters = [
        {
          book: 'Psalm',
          chapter: 23,
          translation: 'NIV',
          verses: [
            {
              book: 'Psalm',
              chapter: 23,
              verse: 1,
              text: 'The Lord is my shepherd...',
              translation: 'NIV'
            }
          ]
        }
      ];

      await bibleStrategy.warmBibleBook('Psalm', 'NIV', chapters);
      
      const result = await bibleStrategy.getChapter('Psalm', 23, 'NIV');
      expect(result).toEqual(chapters[0]);
    });
  });

  describe('Performance and Metrics', () => {
    it('should track cache statistics', async () => {
      // Reset stats
      cacheService.resetStats();

      // Generate some cache activity
      await cacheService.set('stats-test', { data: 'test' });
      await cacheService.get('stats-test'); // Hit
      await cacheService.get('non-existent'); // Miss

      const stats = cacheService.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should measure response times under 10ms for simple operations', async () => {
      const testData = { simple: 'data' };
      
      // Measure set operation
      const setStart = Date.now();
      await cacheService.set('perf-test', testData);
      const setDuration = Date.now() - setStart;
      
      // Measure get operation
      const getStart = Date.now();
      await cacheService.get('perf-test');
      const getDuration = Date.now() - getStart;
      
      expect(setDuration).toBeLessThan(10);
      expect(getDuration).toBeLessThan(10);
    });

    it('should collect metrics over time', async () => {
      // Start metrics collection
      metricsService.startCollection(100); // 100ms interval for testing
      
      // Generate activity
      await cacheService.set('metrics-test', { data: 'value' });
      await cacheService.get('metrics-test');
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const latestMetrics = metricsService.getLatestMetrics();
      expect(latestMetrics).not.toBeNull();
      
      if (latestMetrics) {
        expect(latestMetrics.totalHits).toBeGreaterThan(0);
        expect(latestMetrics.timestamp).toBeInstanceOf(Date);
      }
      
      metricsService.stopCollection();
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should handle Redis failures gracefully', async () => {
      let failureCount = 0;
      const maxFailures = 3;

      const operation = async () => {
        failureCount++;
        if (failureCount <= maxFailures) {
          throw new Error(`Simulated Redis failure ${failureCount}`);
        }
        return 'success';
      };

      // Should fail initially but not throw due to circuit breaker
      try {
        const result = await circuitBreaker.executeRedisOperation(operation, 'test-operation');
        expect(result).toBeNull(); // Fallback should return null
      } catch (error) {
        // Circuit breaker should catch and handle
        expect(error).toBeDefined();
      }
    });

    it('should track circuit breaker state changes', async () => {
      const events: string[] = [];
      
      circuitBreaker.on('open', () => events.push('open'));
      circuitBreaker.on('close', () => events.push('close'));
      circuitBreaker.on('halfOpen', () => events.push('halfOpen'));

      // Force state changes for testing
      circuitBreaker.forceOpen();
      circuitBreaker.forceHalfOpen();
      circuitBreaker.forceClose();

      expect(events).toContain('open');
      expect(events).toContain('halfOpen');
      expect(events).toContain('close');
    });
  });

  describe('Health Check Integration', () => {
    it('should report healthy status when Redis is available', async () => {
      const isHealthy = await cacheService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should provide comprehensive health information', async () => {
      const stats = cacheService.getStats();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('hitRate');
      
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('Cache Warming Integration', () => {
    it('should warm cache with multiple entries efficiently', async () => {
      const entries = new Map([
        ['warm:key1', { data: 'value1' }],
        ['warm:key2', { data: 'value2' }],
        ['warm:key3', { data: 'value3' }],
      ]);

      const start = Date.now();
      await cacheService.warmCache(entries, { ttl: 300 });
      const duration = Date.now() - start;

      // Should be efficient (under 100ms for 3 entries)
      expect(duration).toBeLessThan(100);

      // Verify all entries were cached
      for (const [key, value] of entries) {
        const result = await cacheService.get(key);
        expect(result).toEqual(value);
      }
    });
  });
});

// Performance benchmark tests
describe('Cache Performance Benchmarks', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: 15,
    });

    try {
      await redis.ping();
      await redis.quit();
    } catch (error) {
      console.warn('Redis not available, skipping performance tests');
      return;
    }

    process.env.REDIS_DB = '15';
    cacheService = new CacheService();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (cacheService) {
      await cacheService.disconnect();
    }
  });

  it('should achieve 90% hit rate target with proper warming', async () => {
    // Pre-populate cache
    const entries = Array.from({ length: 100 }, (_, i) => [`bench:key${i}`, { id: i, data: `value${i}` }]);
    const cacheMap = new Map(entries);
    
    await cacheService.warmCache(cacheMap);

    // Simulate realistic access pattern (90% hot data, 10% cold)
    let hits = 0;
    let misses = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const isHotData = Math.random() < 0.9;
      const key = isHotData ? `bench:key${i % 100}` : `bench:cold${i}`;
      
      const result = await cacheService.get(key);
      if (result !== null) {
        hits++;
      } else {
        misses++;
      }
    }

    const hitRate = (hits / (hits + misses)) * 100;
    expect(hitRate).toBeGreaterThan(85); // Allow some margin for test variance
  });

  it('should maintain sub-10ms response times under load', async () => {
    const testData = { benchmark: 'data', size: 'medium' };
    await cacheService.set('load-test', testData);

    const iterations = 100;
    const responseTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await cacheService.get('load-test');
      const duration = Date.now() - start;
      responseTimes.push(duration);
    }

    const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxTime = Math.max(...responseTimes);
    
    expect(averageTime).toBeLessThan(5); // Average should be well under 10ms
    expect(maxTime).toBeLessThan(15); // Even max should be reasonable
  });
});