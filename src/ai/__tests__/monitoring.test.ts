import { AIMonitoringService } from '../utils/monitoring';

jest.mock('../../utils/logger');
jest.mock('ioredis');

describe('AIMonitoringService', () => {
  let monitoringService: AIMonitoringService;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Redis
    mockRedis = {
      lpush: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue('{}'),
      ping: jest.fn().mockResolvedValue('PONG'),
      keys: jest.fn().mockResolvedValue([]),
      incr: jest.fn().mockResolvedValue(1),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn()
    };

    const Redis = require('ioredis');
    Redis.mockImplementation(() => mockRedis);

    monitoringService = new AIMonitoringService();
  });

  describe('recordMetric', () => {
    it('should record metrics successfully', async () => {
      const metric = {
        name: 'response_time_test',
        value: 1500,
        timestamp: new Date(),
        tags: { operation: 'test' },
        userId: 'user-123'
      };

      await monitoringService.recordMetric(metric);

      expect(mockRedis.lpush).toHaveBeenCalled();
      expect(mockRedis.expire).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.lpush.mockRejectedValue(new Error('Redis error'));

      const metric = {
        name: 'test_metric',
        value: 100,
        timestamp: new Date()
      };

      // Should not throw error
      await expect(monitoringService.recordMetric(metric)).resolves.toBeUndefined();
    });
  });

  describe('recordResponseTime', () => {
    it('should calculate and record response time', async () => {
      const startTime = Date.now() - 1000; // 1 second ago
      
      await monitoringService.recordResponseTime('test_operation', startTime, 'user-123');

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        expect.stringContaining('metrics:response_time_test_operation'),
        expect.stringContaining('"value":')
      );
    });
  });

  describe('recordError', () => {
    it('should record error occurrences', async () => {
      const error = new Error('Test error');
      
      await monitoringService.recordError('test_operation', error, 'user-123');

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        expect.stringContaining('metrics:error_test_operation'),
        expect.stringContaining('"value":1')
      );
    });

    it('should handle string errors', async () => {
      await monitoringService.recordError('test_operation', 'String error');

      expect(mockRedis.lpush).toHaveBeenCalled();
    });
  });

  describe('performHealthChecks', () => {
    it('should perform health checks on all services', async () => {
      const results = await monitoringService.performHealthChecks();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Should include OpenAI, Pinecone, and Redis checks
      const serviceNames = results.map(r => r.service);
      expect(serviceNames).toContain('Redis');
    });

    it('should handle service failures in health checks', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection failed'));

      const results = await monitoringService.performHealthChecks();
      const redisResult = results.find(r => r.service === 'Redis');

      expect(redisResult?.status).toBe('unhealthy');
      expect(redisResult?.error).toBeDefined();
    });
  });

  describe('withMonitoring', () => {
    it('should wrap function execution with monitoring', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await monitoringService.withMonitoring(
        'test_operation',
        mockFn,
        'user-123'
      );

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        expect.stringContaining('metrics:response_time_test_operation'),
        expect.any(String)
      );
    });

    it('should record errors in monitored functions', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(monitoringService.withMonitoring('test_operation', mockFn))
        .rejects.toThrow('Test error');

      expect(mockRedis.lpush).toHaveBeenCalledWith(
        expect.stringContaining('metrics:error_test_operation'),
        expect.any(String)
      );
    });
  });

  describe('createAlert', () => {
    it('should create alerts with different severity levels', async () => {
      await monitoringService.createAlert(
        'critical',
        'System failure detected',
        { service: 'OpenAI', error: 'Connection timeout' }
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('alerts:critical:'),
        604800, // 7 days in seconds
        expect.stringContaining('System failure detected')
      );
    });

    it('should handle alert creation errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(monitoringService.createAlert('low', 'Test alert'))
        .resolves.toBeUndefined();
    });
  });

  describe('getRecentAlerts', () => {
    it('should retrieve recent alerts', async () => {
      const mockAlerts = [
        JSON.stringify({
          severity: 'high',
          message: 'Test alert',
          timestamp: new Date().toISOString()
        })
      ];

      mockRedis.keys.mockResolvedValue(['alerts:high:123']);
      mockRedis.get.mockResolvedValue(mockAlerts[0]);

      const alerts = await monitoringService.getRecentAlerts(10);

      expect(Array.isArray(alerts)).toBe(true);
      expect(mockRedis.keys).toHaveBeenCalledWith('alerts:*');
    });

    it('should handle Redis errors when retrieving alerts', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      const alerts = await monitoringService.getRecentAlerts();

      expect(alerts).toEqual([]);
    });
  });

  describe('getDashboardData', () => {
    it('should return comprehensive dashboard data', async () => {
      const dashboardData = await monitoringService.getDashboardData();

      expect(dashboardData).toHaveProperty('healthChecks');
      expect(dashboardData).toHaveProperty('performance');
      expect(dashboardData).toHaveProperty('recentAlerts');
      expect(dashboardData).toHaveProperty('uptime');
      
      expect(Array.isArray(dashboardData.healthChecks)).toBe(true);
      expect(typeof dashboardData.uptime).toBe('number');
    });
  });

  describe('close', () => {
    it('should close Redis connection gracefully', async () => {
      await monitoringService.close();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      mockRedis.quit.mockRejectedValue(new Error('Close error'));

      await expect(monitoringService.close()).resolves.toBeUndefined();
    });
  });
});