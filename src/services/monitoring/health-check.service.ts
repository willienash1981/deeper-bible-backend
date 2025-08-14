import { DatabaseService } from '../database/database.service';
import { ConnectionMonitorService } from './connection-monitor.service';
import { PrismaClient } from '@prisma/client';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    connections: ServiceHealth;
  };
  version: string;
  uptime: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  message?: string;
  details?: any;
}

export class HealthCheckService {
  private databaseService: DatabaseService;
  private connectionMonitor: ConnectionMonitorService;
  private startTime: Date = new Date();

  constructor(databaseService: DatabaseService, connectionMonitor: ConnectionMonitorService) {
    this.databaseService = databaseService;
    this.connectionMonitor = connectionMonitor;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const checkStart = Date.now();
    
    console.log('🔍 Performing comprehensive health check...');

    const [databaseHealth, cacheHealth, connectionHealth] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkCacheHealth(),
      this.checkConnectionHealth(),
    ]);

    const services = {
      database: databaseHealth.status === 'fulfilled' ? databaseHealth.value : this.createFailureHealth('Database check failed'),
      cache: cacheHealth.status === 'fulfilled' ? cacheHealth.value : this.createFailureHealth('Cache check failed'),
      connections: connectionHealth.status === 'fulfilled' ? connectionHealth.value : this.createFailureHealth('Connection check failed'),
    };

    const overallStatus = this.determineOverallStatus(services);
    const uptime = Date.now() - this.startTime.getTime();

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date(),
      services,
      version: process.env.npm_package_version || '1.0.0',
      uptime,
    };

    console.log(`✅ Health check completed in ${Date.now() - checkStart}ms - Status: ${overallStatus}`);
    
    return healthStatus;
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.databaseService.connect();
      
      // Test a simple query
      const stats = await this.databaseService.getDatabaseStats();
      
      // Test write operation (create and delete a test cache entry)
      const testKey = `health_check_${Date.now()}`;
      await this.databaseService.setCacheEntry(testKey, { test: true }, 1);
      await this.databaseService.getCacheEntry(testKey);
      
      const responseTime = Date.now() - startTime;
      
      // Validate expected data
      if (stats.books < 66) {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date(),
          message: 'Database missing expected data',
          details: { ...stats, expected: { books: 66 } },
        };
      }

      return {
        status: responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        lastCheck: new Date(),
        message: responseTime > 1000 ? 'Slow database response' : 'Database operational',
        details: stats,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: `Database error: ${error}`,
        details: { error: String(error) },
      };
    }
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test cache operations
      const testKey = `cache_health_${Date.now()}`;
      const testValue = { timestamp: new Date(), test: true };
      
      await this.databaseService.setCacheEntry(testKey, testValue, 60);
      const retrieved = await this.databaseService.getCacheEntry(testKey);
      
      const responseTime = Date.now() - startTime;
      
      if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(testValue)) {
        return {
          status: 'degraded',
          responseTime,
          lastCheck: new Date(),
          message: 'Cache read/write mismatch',
        };
      }

      return {
        status: responseTime > 100 ? 'degraded' : 'healthy',
        responseTime,
        lastCheck: new Date(),
        message: 'Cache operational',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: `Cache error: ${error}`,
        details: { error: String(error) },
      };
    }
  }

  /**
   * Check connection pool health
   */
  private async checkConnectionHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const metrics = await this.connectionMonitor.performHealthCheck();
      const responseTime = Date.now() - startTime;
      
      const connectionUsage = metrics.activeConnections / metrics.maxConnections * 100;
      
      let status: ServiceHealth['status'] = 'healthy';
      let message = 'Connection pool healthy';
      
      if (connectionUsage > 90) {
        status = 'unhealthy';
        message = 'Connection pool nearly exhausted';
      } else if (connectionUsage > 70 || metrics.avgResponseTime > 500) {
        status = 'degraded';
        message = 'Connection pool under pressure';
      }

      return {
        status,
        responseTime,
        lastCheck: new Date(),
        message,
        details: metrics,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        message: `Connection monitor error: ${error}`,
        details: { error: String(error) },
      };
    }
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(services: HealthStatus['services']): HealthStatus['status'] {
    const statuses = Object.values(services).map(service => service.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Create failure health object
   */
  private createFailureHealth(message: string): ServiceHealth {
    return {
      status: 'unhealthy',
      responseTime: 0,
      lastCheck: new Date(),
      message,
    };
  }

  /**
   * Get lightweight health status (for frequent checks)
   */
  async getQuickHealth(): Promise<{ status: string; timestamp: Date }> {
    try {
      await this.databaseService.getDatabaseStats();
      return {
        status: 'healthy',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Start automated health monitoring
   */
  startHealthMonitoring(intervalMs: number = 60000): void {
    console.log(`📊 Starting health monitoring (interval: ${intervalMs / 1000}s)`);
    
    setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        
        if (health.status !== 'healthy') {
          console.warn(`⚠️  System health: ${health.status}`);
        }
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
    }, intervalMs);
  }
}