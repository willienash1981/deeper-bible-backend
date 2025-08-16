import { CacheService } from '../redis.service';
import Redis from 'ioredis';

// Mock ioredis properly
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    getBuffer: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    flushdb: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
    pipeline: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
    on: jest.fn(),
    info: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  }));
});

describe('CacheService - Fixed Tests', () => {
  let cacheService: CacheService;
  let mockRedisClient: jest.Mocked<Redis>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create a new instance
    cacheService = new CacheService();
    
    // Get the mocked client
    mockRedisClient = (cacheService as any).client;
    
    // Mock the connection state
    (cacheService as any).isConnected = true;
    
    // Setup default mock behaviors
    mockRedisClient.ping.mockResolvedValue('PONG');
    mockRedisClient.quit.mockResolvedValue('OK');
    mockRedisClient.info.mockResolvedValue('used_memory:1024\r\nevicted_keys:0\r\nconnected_clients:1\r\n');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get - with proper connection state', () => {
    it('should return cached data when key exists and connected', async () => {
      const testData = { test: 'data' };
      const serialized = JSON.stringify(testData);
      
      mockRedisClient.getBuffer.mockResolvedValue(Buffer.from(serialized));
      mockRedisClient.get.mockResolvedValue(null); // No compression metadata

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.getBuffer).toHaveBeenCalledWith('cache:test-key');
      expect(cacheService.getStats().hits).toBe(1);
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.getBuffer.mockResolvedValue(null);

      const result = await cacheService.get('non-existent');

      expect(result).toBeNull();
      expect(cacheService.getStats().misses).toBe(1);
    });

    it('should handle compressed data correctly', async () => {
      const testData = { test: 'compressed data' };
      const serialized = JSON.stringify(testData);
      
      // Mock compressed data
      mockRedisClient.getBuffer.mockResolvedValue(Buffer.from(serialized));
      mockRedisClient.get.mockResolvedValue('compressed'); // Compression metadata

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('cache:test-key:meta');
    });

    it('should handle disconnected state gracefully', async () => {
      (cacheService as any).isConnected = false;

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedisClient.getBuffer).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.getBuffer.mockRejectedValue(new Error('Redis connection error'));

      const result = await cacheService.get('error-key');

      expect(result).toBeNull();
      expect(cacheService.getStats().errors).toBe(1);
    });
  });

  describe('set - with proper connection state', () => {
    it('should set cache value when connected', async () => {
      const testData = { test: 'data' };
      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([['OK'], ['OK']]),
      };
      
      mockRedisClient.pipeline.mockReturnValue(mockPipeline as any);

      await cacheService.set('test-key', testData);

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
      expect(cacheService.getStats().sets).toBe(1);
    });

    it('should handle disconnected state gracefully', async () => {
      (cacheService as any).isConnected = false;

      await cacheService.set('test-key', { test: 'data' });

      expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
      expect(cacheService.getStats().sets).toBe(0);
    });

    it('should compress large values', async () => {
      const largeData = { data: 'x'.repeat(2000) }; // Over compression threshold
      const mockPipeline = {
        set: jest.fn().mockReturnThis(),
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([['OK'], ['OK']]),
      };
      
      mockRedisClient.pipeline.mockReturnValue(mockPipeline as any);

      await cacheService.set('large-key', largeData);

      expect(mockRedisClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledTimes(2); // Data + metadata
    });
  });

  describe('delete - with proper connection state', () => {
    it('should delete keys matching pattern when connected', async () => {
      const keys = ['cache:test:1', 'cache:test:2'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(4); // 2 keys + 2 meta keys

      const result = await cacheService.delete('test:*');

      expect(result).toBe(4);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:test:*');
      expect(mockRedisClient.del).toHaveBeenCalled();
      expect(cacheService.getStats().deletes).toBe(4);
    });

    it('should handle disconnected state gracefully', async () => {
      (cacheService as any).isConnected = false;

      const result = await cacheService.delete('test:*');

      expect(result).toBe(0);
      expect(mockRedisClient.keys).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Redis is healthy and connected', async () => {
      (cacheService as any).isConnected = true;
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await cacheService.healthCheck();

      expect(result).toBe(true);
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it('should return false when Redis ping fails', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await cacheService.healthCheck();

      expect(result).toBe(false);
    });

    it('should return false when not connected', async () => {
      (cacheService as any).isConnected = false;
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await cacheService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('statistics tracking', () => {
    it('should properly track hit rate calculation', async () => {
      // Reset stats
      cacheService.resetStats();
      
      // Simulate cache miss
      mockRedisClient.getBuffer.mockResolvedValueOnce(null);
      await cacheService.get('miss-key');
      
      // Simulate cache hit
      mockRedisClient.getBuffer.mockResolvedValueOnce(Buffer.from('{"data":"hit"}'));
      mockRedisClient.get.mockResolvedValueOnce(null);
      await cacheService.get('hit-key');

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should handle zero operations correctly', () => {
      cacheService.resetStats();
      const stats = cacheService.getStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('connection management', () => {
    it('should handle connection events properly', () => {
      // Verify event handlers are set up
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should disconnect all clients properly', async () => {
      await cacheService.disconnect();

      expect(mockRedisClient.quit).toHaveBeenCalledTimes(3); // main, subscriber, publisher
      expect((cacheService as any).isConnected).toBe(false);
    });
  });
});