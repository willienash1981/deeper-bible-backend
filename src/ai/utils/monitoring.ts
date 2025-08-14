import { createLogger } from '../../utils/logger';
import { RetryHandler } from './retry-handler';
import { Logger } from 'winston';
import Redis from 'ioredis';

interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  userId?: string;
}

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
  timestamp: Date;
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
  circuitBreakerStatus: Record<string, any>;
  costMetrics: {
    dailySpend: number;
    monthlySpend: number;
    averageCostPerRequest: number;
  };
}

export class AIMonitoringService {
  private logger: Logger;
  private redis: Redis;
  private retryHandler: RetryHandler;
  private metrics: Map<string, MetricData[]> = new Map();

  constructor() {
    this.logger = createLogger('AIMonitoringService');
    this.retryHandler = new RetryHandler();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error in monitoring service', { 
        error: error.message 
      });
    });
  }

  /**
   * Records a performance metric.
   */
  async recordMetric(metric: MetricData): Promise<void> {
    try {
      // Store in Redis for persistence
      const metricKey = `metrics:${metric.name}:${new Date().toISOString().split('T')[0]}`;
      const metricData = {
        ...metric,
        timestamp: metric.timestamp.toISOString()
      };

      await this.redis.lpush(metricKey, JSON.stringify(metricData));
      await this.redis.expire(metricKey, 86400 * 30); // 30 days retention

      // Also store in memory for quick access
      if (!this.metrics.has(metric.name)) {
        this.metrics.set(metric.name, []);
      }
      
      const metricArray = this.metrics.get(metric.name)!;
      metricArray.push(metric);
      
      // Keep only last 1000 metrics in memory
      if (metricArray.length > 1000) {
        metricArray.shift();
      }

      this.logger.debug('Metric recorded', {
        name: metric.name,
        value: metric.value,
        tags: metric.tags,
        userId: metric.userId
      });
    } catch (error) {
      this.logger.error('Failed to record metric', {
        error: error instanceof Error ? error.message : String(error),
        metric: { name: metric.name, value: metric.value }
      });
    }
  }

  /**
   * Records response time for an operation.
   */
  async recordResponseTime(operation: string, startTime: number, userId?: string): Promise<void> {
    const responseTime = Date.now() - startTime;
    await this.recordMetric({
      name: `response_time_${operation}`,
      value: responseTime,
      timestamp: new Date(),
      tags: { operation },
      userId
    });
  }

  /**
   * Records an error occurrence.
   */
  async recordError(operation: string, error: Error | string, userId?: string): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await this.recordMetric({
      name: `error_${operation}`,
      value: 1,
      timestamp: new Date(),
      tags: { 
        operation, 
        error_type: error instanceof Error ? error.constructor.name : 'unknown',
        error_message: errorMessage.substring(0, 100) // Truncate long messages
      },
      userId
    });

    this.logger.error('Operation error recorded', {
      operation,
      error: errorMessage,
      userId
    });
  }

  /**
   * Records a successful operation.
   */
  async recordSuccess(operation: string, userId?: string): Promise<void> {
    await this.recordMetric({
      name: `success_${operation}`,
      value: 1,
      timestamp: new Date(),
      tags: { operation },
      userId
    });
  }

  /**
   * Performs health checks on all AI services.
   */
  async performHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Check OpenAI connectivity
    const openAIHealth = await this.checkOpenAIHealth();
    results.push(openAIHealth);

    // Check Pinecone connectivity
    const pineconeHealth = await this.checkPineconeHealth();
    results.push(pineconeHealth);

    // Check Redis connectivity
    const redisHealth = await this.checkRedisHealth();
    results.push(redisHealth);

    // Log overall health status
    const unhealthyServices = results.filter(r => r.status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      this.logger.warn('Some services are unhealthy', {
        unhealthyServices: unhealthyServices.map(s => s.service)
      });
    } else {
      this.logger.info('All AI services are healthy');
    }

    return results;
  }

  private async checkOpenAIHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Import here to avoid circular dependencies
      const openai = (await import('../services/openai-client')).default;
      
      await openai.models.list();
      
      return {
        service: 'OpenAI',
        status: 'healthy',
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'OpenAI',
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  private async checkPineconeHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple connectivity check
      const { PineconeService } = await import('../services/pinecone.service');
      const pineconeService = new PineconeService();
      const isHealthy = await pineconeService.healthCheck();
      
      return {
        service: 'Pinecone',
        status: isHealthy ? 'healthy' : 'unhealthy',
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Pinecone',
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  private async checkRedisHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await this.redis.ping();
      
      return {
        service: 'Redis',
        status: 'healthy',
        latency: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        service: 'Redis',
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      };
    }
  }

  /**
   * Gets performance metrics for the AI services.
   */
  async getPerformanceMetrics(timeRange: '1h' | '24h' | '7d' = '24h'): Promise<PerformanceMetrics> {
    try {
      const now = Date.now();
      const timeRangeMs = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000
      }[timeRange];

      const startTime = now - timeRangeMs;

      // Calculate metrics from stored data
      const responseTimeMetrics = await this.calculateAverageResponseTime(startTime);
      const throughputMetrics = await this.calculateThroughput(startTime);
      const errorMetrics = await this.calculateErrorRate(startTime);
      const costMetrics = await this.calculateCostMetrics();
      const circuitBreakerStatus = this.retryHandler.getAllCircuitBreakerStatuses();

      const metrics: PerformanceMetrics = {
        responseTime: responseTimeMetrics,
        throughput: throughputMetrics,
        errorRate: errorMetrics.errorRate,
        successRate: 100 - errorMetrics.errorRate,
        circuitBreakerStatus,
        costMetrics
      };

      this.logger.info('Performance metrics calculated', {
        timeRange,
        metrics: {
          responseTime: metrics.responseTime,
          throughput: metrics.throughput,
          errorRate: metrics.errorRate
        }
      });

      return metrics;
    } catch (error) {
      this.logger.error('Error calculating performance metrics', {
        error: error instanceof Error ? error.message : String(error),
        timeRange
      });
      
      // Return default metrics on error
      return {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        successRate: 0,
        circuitBreakerStatus: {},
        costMetrics: {
          dailySpend: 0,
          monthlySpend: 0,
          averageCostPerRequest: 0
        }
      };
    }
  }

  private async calculateAverageResponseTime(startTime: number): Promise<number> {
    // This would query Redis for response time metrics
    // For now, return a placeholder
    return 1500; // 1.5 seconds average
  }

  private async calculateThroughput(startTime: number): Promise<number> {
    // This would calculate requests per minute from Redis data
    // For now, return a placeholder
    return 45; // 45 requests per minute
  }

  private async calculateErrorRate(startTime: number): Promise<{ errorRate: number; totalRequests: number; errorCount: number }> {
    // This would calculate error rate from Redis metrics
    // For now, return placeholder data
    return {
      errorRate: 2.5, // 2.5% error rate
      totalRequests: 1000,
      errorCount: 25
    };
  }

  private async calculateCostMetrics(): Promise<{
    dailySpend: number;
    monthlySpend: number;
    averageCostPerRequest: number;
  }> {
    try {
      // Import budget controller to get cost data
      const { BudgetController } = await import('./budget-controller');
      const budgetController = new BudgetController();
      
      const [dailySpend, monthlySpend] = await Promise.all([
        budgetController.getDailyCost(),
        budgetController.getMonthlyCost()
      ]);

      // Calculate average cost per request (simplified)
      const averageCostPerRequest = dailySpend > 0 ? dailySpend / 100 : 0; // Assuming 100 requests per day

      return {
        dailySpend,
        monthlySpend,
        averageCostPerRequest
      };
    } catch (error) {
      this.logger.error('Error calculating cost metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        dailySpend: 0,
        monthlySpend: 0,
        averageCostPerRequest: 0
      };
    }
  }

  /**
   * Creates an alert when thresholds are exceeded.
   */
  async createAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const alert = {
      severity,
      message,
      metadata,
      timestamp: new Date().toISOString(),
      service: 'AI_SERVICE'
    };

    try {
      // Store alert in Redis
      const alertKey = `alerts:${severity}:${Date.now()}`;
      await this.redis.setex(alertKey, 86400 * 7, JSON.stringify(alert)); // 7 days TTL

      // Log based on severity
      const logMethod = severity === 'critical' ? 'error' : 
                      severity === 'high' ? 'warn' : 'info';
      
      this.logger[logMethod]('Alert created', alert);

      // In production, this would also:
      // 1. Send to alerting system (PagerDuty, Slack, etc.)
      // 2. Update monitoring dashboard
      // 3. Trigger automated responses if needed
    } catch (error) {
      this.logger.error('Failed to create alert', {
        error: error instanceof Error ? error.message : String(error),
        alert
      });
    }
  }

  /**
   * Gets recent alerts.
   */
  async getRecentAlerts(limit: number = 50): Promise<any[]> {
    try {
      const pattern = 'alerts:*';
      const keys = await this.redis.keys(pattern);
      
      const alerts = await Promise.all(
        keys.slice(0, limit).map(async (key) => {
          const data = await this.redis.get(key);
          return data ? JSON.parse(data) : null;
        })
      );

      return alerts.filter(alert => alert !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      this.logger.error('Error retrieving recent alerts', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Middleware function to wrap AI service calls with monitoring.
   */
  withMonitoring<T>(
    operation: string,
    fn: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      
      try {
        const result = await fn();
        
        // Record success metrics
        await this.recordResponseTime(operation, startTime, userId);
        await this.recordSuccess(operation, userId);
        
        resolve(result);
      } catch (error) {
        // Record error metrics
        await this.recordError(operation, error instanceof Error ? error : new Error(String(error)), userId);
        
        // Check if we should create an alert
        if (await this.shouldCreateAlert(operation, error)) {
          await this.createAlert(
            'high',
            `AI operation failed: ${operation}`,
            {
              operation,
              error: error instanceof Error ? error.message : String(error),
              userId,
              responseTime: Date.now() - startTime
            }
          );
        }
        
        reject(error);
      }
    });
  }

  private async shouldCreateAlert(operation: string, error: any): Promise<boolean> {
    // Create alert for critical operations or repeated failures
    const criticalOperations = ['openai-structured-analysis', 'pinecone-upsert'];
    
    if (criticalOperations.includes(operation)) {
      return true;
    }

    // Check for repeated failures (simplified)
    try {
      const errorKey = `error_count:${operation}`;
      const errorCount = await this.redis.incr(errorKey);
      await this.redis.expire(errorKey, 300); // 5 minutes window
      
      return errorCount >= 5; // Alert after 5 errors in 5 minutes
    } catch {
      return false;
    }
  }

  /**
   * Gets system dashboard data.
   */
  async getDashboardData(): Promise<{
    healthChecks: HealthCheckResult[];
    performance: PerformanceMetrics;
    recentAlerts: any[];
    uptime: number;
  }> {
    const [healthChecks, performance, recentAlerts] = await Promise.all([
      this.performHealthChecks(),
      this.getPerformanceMetrics('24h'),
      this.getRecentAlerts(10)
    ]);

    // Calculate uptime (simplified - would use process start time in production)
    const uptime = process.uptime();

    return {
      healthChecks,
      performance,
      recentAlerts,
      uptime
    };
  }

  /**
   * Cleanup method.
   */
  async close(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('AI monitoring service shut down gracefully');
    } catch (error) {
      this.logger.error('Error closing monitoring service', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}