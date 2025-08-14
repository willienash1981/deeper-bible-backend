import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

export interface ConnectionMetrics {
  activeConnections: number;
  maxConnections: number;
  idleConnections: number;
  waitingRequests: number;
  failedConnections: number;
  avgResponseTime: number;
  lastHealthCheck: Date;
  status: 'healthy' | 'warning' | 'critical' | 'down';
}

export interface AlertConfig {
  connectionThreshold: number; // Percentage of max connections before alert
  responseTimeThreshold: number; // Response time in ms before alert
  failureThreshold: number; // Number of failures before alert
  checkInterval: number; // Monitoring interval in ms
}

export interface Alert {
  id: string;
  type: 'connection_pool' | 'response_time' | 'connection_failure' | 'database_down';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: Date;
  metrics: ConnectionMetrics;
  resolved: boolean;
}

export class ConnectionMonitorService extends EventEmitter {
  private prisma: PrismaClient;
  private config: AlertConfig;
  private metrics: ConnectionMetrics;
  private alerts: Map<string, Alert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private startTime: Date = new Date();
  private connectionHistory: number[] = [];
  private responseTimeHistory: number[] = [];

  constructor(prisma: PrismaClient, config?: Partial<AlertConfig>) {
    super();
    this.prisma = prisma;
    this.config = {
      connectionThreshold: 80, // 80% of max connections
      responseTimeThreshold: 1000, // 1 second
      failureThreshold: 5, // 5 consecutive failures
      checkInterval: 30000, // 30 seconds
      ...config,
    };

    this.metrics = {
      activeConnections: 0,
      maxConnections: 10, // Default, will be updated
      idleConnections: 0,
      waitingRequests: 0,
      failedConnections: 0,
      avgResponseTime: 0,
      lastHealthCheck: new Date(),
      status: 'healthy',
    };
  }

  /**
   * Start monitoring connection pool
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('⚠️  Connection monitoring is already running');
      return;
    }

    console.log('📊 Starting connection pool monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.checkInterval);

    // Perform initial health check
    this.performHealthCheck().catch(console.error);

    console.log(`✅ Connection monitoring started (interval: ${this.config.checkInterval / 1000}s)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 Connection monitoring stopped');
    }
  }

  /**
   * Perform health check and update metrics
   */
  async performHealthCheck(): Promise<ConnectionMetrics> {
    const startTime = Date.now();
    
    try {
      // Test database connectivity
      await this.prisma.$queryRaw`SELECT 1 as health_check`;
      
      // Get connection statistics
      const connectionStats = await this.getConnectionStatistics();
      
      const responseTime = Date.now() - startTime;
      this.responseTimeHistory.push(responseTime);
      
      // Keep only last 10 response times for moving average
      if (this.responseTimeHistory.length > 10) {
        this.responseTimeHistory.shift();
      }

      // Update metrics
      this.metrics = {
        ...connectionStats,
        avgResponseTime: this.responseTimeHistory.reduce((sum, time) => sum + time, 0) / this.responseTimeHistory.length,
        lastHealthCheck: new Date(),
        status: this.determineStatus(connectionStats, responseTime),
      };

      // Check for alerts
      await this.checkAlerts();

      this.emit('health-check', this.metrics);
      
      return this.metrics;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      
      this.metrics.failedConnections++;
      this.metrics.status = 'down';
      this.metrics.lastHealthCheck = new Date();

      // Emit critical alert
      await this.createAlert('database_down', 'critical', `Database connection failed: ${error}`);
      
      this.emit('health-check-failed', error);
      
      return this.metrics;
    }
  }

  /**
   * Get current connection statistics
   */
  async getConnectionStatistics(): Promise<Partial<ConnectionMetrics>> {
    try {
      // PostgreSQL specific queries for connection stats
      const connectionInfo = await this.prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(CASE WHEN state = 'active' THEN 1 END) as active_connections,
          count(CASE WHEN state = 'idle' THEN 1 END) as idle_connections,
          max_conn.setting::int as max_connections
        FROM pg_stat_activity
        CROSS JOIN pg_settings max_conn
        WHERE max_conn.name = 'max_connections'
          AND datname = current_database()
      ` as any[];

      const stats = connectionInfo[0];
      
      this.connectionHistory.push(stats.active_connections);
      if (this.connectionHistory.length > 60) { // Keep 1 hour of data (at 1-minute intervals)
        this.connectionHistory.shift();
      }

      return {
        activeConnections: parseInt(stats.active_connections) || 0,
        maxConnections: parseInt(stats.max_connections) || 100,
        idleConnections: parseInt(stats.idle_connections) || 0,
        waitingRequests: 0, // Would need custom tracking
        failedConnections: this.metrics.failedConnections, // Keep existing count
      };
    } catch (error) {
      console.error('Failed to get connection statistics:', error);
      return {
        activeConnections: 0,
        maxConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        failedConnections: this.metrics.failedConnections + 1,
      };
    }
  }

  /**
   * Determine overall status based on metrics
   */
  private determineStatus(metrics: Partial<ConnectionMetrics>, responseTime: number): 'healthy' | 'warning' | 'critical' | 'down' {
    const connectionUsage = (metrics.activeConnections || 0) / (metrics.maxConnections || 1) * 100;
    
    if (responseTime > this.config.responseTimeThreshold * 2) {
      return 'critical';
    }
    
    if (connectionUsage > 90) {
      return 'critical';
    }
    
    if (responseTime > this.config.responseTimeThreshold || connectionUsage > this.config.connectionThreshold) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(): Promise<void> {
    const connectionUsage = this.metrics.activeConnections / this.metrics.maxConnections * 100;

    // Connection pool usage alert
    if (connectionUsage > this.config.connectionThreshold) {
      const severity = connectionUsage > 90 ? 'critical' : 'warning';
      await this.createAlert(
        'connection_pool',
        severity,
        `Connection pool usage high: ${connectionUsage.toFixed(1)}% (${this.metrics.activeConnections}/${this.metrics.maxConnections})`
      );
    } else {
      this.resolveAlert('connection_pool');
    }

    // Response time alert
    if (this.metrics.avgResponseTime > this.config.responseTimeThreshold) {
      const severity = this.metrics.avgResponseTime > this.config.responseTimeThreshold * 2 ? 'critical' : 'warning';
      await this.createAlert(
        'response_time',
        severity,
        `Database response time high: ${this.metrics.avgResponseTime.toFixed(0)}ms`
      );
    } else {
      this.resolveAlert('response_time');
    }

    // Connection failure alert
    if (this.metrics.failedConnections > this.config.failureThreshold) {
      await this.createAlert(
        'connection_failure',
        'critical',
        `Multiple connection failures: ${this.metrics.failedConnections} failures`
      );
    }
  }

  /**
   * Create or update an alert
   */
  private async createAlert(type: Alert['type'], severity: Alert['severity'], message: string): Promise<void> {
    const alertId = `${type}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      type,
      severity,
      message,
      timestamp: new Date(),
      metrics: { ...this.metrics },
      resolved: false,
    };

    this.alerts.set(type, alert); // Use type as key to avoid duplicate alerts
    
    console.log(`🚨 [${severity.toUpperCase()}] ${message}`);
    
    this.emit('alert', alert);

    // Log to file for persistence
    await this.logAlert(alert);
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(type: Alert['type']): void {
    const alert = this.alerts.get(type);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      console.log(`✅ Alert resolved: ${alert.message}`);
      this.emit('alert-resolved', alert);
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Get historical connection data
   */
  getConnectionHistory(): {
    connections: number[];
    responseTimes: number[];
    timestamps: Date[];
  } {
    const now = new Date();
    const timestamps = this.connectionHistory.map((_, index) => 
      new Date(now.getTime() - (this.connectionHistory.length - index - 1) * this.config.checkInterval)
    );

    return {
      connections: [...this.connectionHistory],
      responseTimes: [...this.responseTimeHistory],
      timestamps,
    };
  }

  /**
   * Generate monitoring report
   */
  generateReport(): {
    summary: ConnectionMetrics;
    alerts: Alert[];
    history: ReturnType<typeof this.getConnectionHistory>;
    uptime: number;
    recommendations: string[];
  } {
    const uptime = Date.now() - this.startTime.getTime();
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    const connectionUsage = this.metrics.activeConnections / this.metrics.maxConnections * 100;
    
    if (connectionUsage > 70) {
      recommendations.push('Consider increasing max_connections in PostgreSQL configuration');
    }
    
    if (this.metrics.avgResponseTime > 500) {
      recommendations.push('Database response time is elevated - check for slow queries');
    }
    
    if (this.metrics.failedConnections > 0) {
      recommendations.push('Investigate connection failures and network stability');
    }

    const avgConnections = this.connectionHistory.reduce((sum, conn) => sum + conn, 0) / this.connectionHistory.length;
    if (avgConnections < this.metrics.maxConnections * 0.1) {
      recommendations.push('Consider reducing max_connections to optimize memory usage');
    }

    return {
      summary: this.metrics,
      alerts: Array.from(this.alerts.values()),
      history: this.getConnectionHistory(),
      uptime,
      recommendations,
    };
  }

  /**
   * Log alert to file
   */
  private async logAlert(alert: Alert): Promise<void> {
    try {
      const logEntry = {
        timestamp: alert.timestamp.toISOString(),
        level: alert.severity,
        type: alert.type,
        message: alert.message,
        metrics: alert.metrics,
      };

      // In a real implementation, you'd use a proper logging library
      console.log('ALERT:', JSON.stringify(logEntry, null, 2));
      
      // Emit to external monitoring systems
      this.emit('alert-logged', logEntry);
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }

  /**
   * Reset failure counters
   */
  resetFailureCounters(): void {
    this.metrics.failedConnections = 0;
    console.log('🔄 Connection failure counters reset');
  }

  /**
   * Force health check
   */
  async forceHealthCheck(): Promise<ConnectionMetrics> {
    console.log('🔍 Performing manual health check...');
    return await this.performHealthCheck();
  }
}