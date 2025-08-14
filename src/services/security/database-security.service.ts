import { PrismaClient } from '@prisma/client';
import { SecretsManagerService } from './secrets-manager.service';

export interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  event: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  tableName?: string;
  operation?: string;
  success: boolean;
  details?: any;
}

export interface DatabaseSecurityConfig {
  enableAuditLogging: boolean;
  enableRowLevelSecurity: boolean;
  maxConnectionsPerUser: number;
  queryTimeoutMs: number;
  enableQueryLogging: boolean;
  requireSSL: boolean;
  allowedIPs: string[];
  rateLimitConfig: {
    maxQueriesPerMinute: number;
    maxQueriesPerHour: number;
  };
}

export class DatabaseSecurityService {
  private prisma: PrismaClient;
  private secretsManager: SecretsManagerService;
  private config: DatabaseSecurityConfig;
  private connectionMap: Map<string, { count: number; lastAccess: Date }> = new Map();
  private queryLog: Array<{ timestamp: Date; query: string; userId?: string; duration: number }> = [];

  constructor(prisma: PrismaClient, secretsManager: SecretsManagerService, config?: Partial<DatabaseSecurityConfig>) {
    this.prisma = prisma;
    this.secretsManager = secretsManager;
    this.config = {
      enableAuditLogging: true,
      enableRowLevelSecurity: true,
      maxConnectionsPerUser: 5,
      queryTimeoutMs: 30000,
      enableQueryLogging: true,
      requireSSL: true,
      allowedIPs: ['127.0.0.1', '::1'], // Localhost by default
      rateLimitConfig: {
        maxQueriesPerMinute: 100,
        maxQueriesPerHour: 1000,
      },
      ...config,
    };
  }

  /**
   * Initialize database security settings
   */
  async initializeSecurity(): Promise<void> {
    console.log('🔒 Initializing database security hardening...');

    try {
      await this.setupDatabaseSecurity();
      await this.setupRowLevelSecurity();
      await this.setupAuditLogging();
      await this.configureConnectionLimits();
      
      console.log('✅ Database security hardening completed');
    } catch (error) {
      console.error('❌ Failed to initialize database security:', error);
      throw error;
    }
  }

  /**
   * Setup basic database security configuration
   */
  private async setupDatabaseSecurity(): Promise<void> {
    console.log('🛡️  Setting up database security configuration...');

    // Set connection and query limits
    await this.prisma.$executeRaw`
      ALTER DATABASE deeper_bible SET default_transaction_isolation = 'read committed'
    `;

    // Configure connection timeouts
    await this.prisma.$executeRaw`
      ALTER DATABASE deeper_bible SET statement_timeout = ${this.config.queryTimeoutMs}
    `;

    // Set connection limit per database
    await this.prisma.$executeRaw`
      ALTER DATABASE deeper_bible CONNECTION LIMIT 50
    `;

    console.log('✅ Database security configuration applied');
  }

  /**
   * Setup row-level security policies
   */
  private async setupRowLevelSecurity(): Promise<void> {
    if (!this.config.enableRowLevelSecurity) {
      return;
    }

    console.log('🔐 Setting up row-level security policies...');

    try {
      // Enable RLS on sensitive tables
      await this.prisma.$executeRaw`ALTER TABLE "User" ENABLE ROW LEVEL SECURITY`;
      await this.prisma.$executeRaw`ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY`;
      await this.prisma.$executeRaw`ALTER TABLE "Favorite" ENABLE ROW LEVEL SECURITY`;
      await this.prisma.$executeRaw`ALTER TABLE "History" ENABLE ROW LEVEL SECURITY`;

      // Create RLS policies for user data access
      await this.prisma.$executeRaw`
        CREATE POLICY user_own_data ON "User"
        FOR ALL
        USING (id = current_setting('app.current_user_id', true)::text)
      `;

      await this.prisma.$executeRaw`
        CREATE POLICY user_own_reports ON "Report"
        FOR ALL
        USING ("userId" = current_setting('app.current_user_id', true)::text)
      `;

      await this.prisma.$executeRaw`
        CREATE POLICY user_own_favorites ON "Favorite"
        FOR ALL
        USING ("userId" = current_setting('app.current_user_id', true)::text)
      `;

      await this.prisma.$executeRaw`
        CREATE POLICY user_own_history ON "History"
        FOR ALL
        USING ("userId" = current_setting('app.current_user_id', true)::text)
      `;

      console.log('✅ Row-level security policies created');
    } catch (error) {
      // RLS policies might already exist, which is fine
      console.log('ℹ️  Row-level security policies may already exist');
    }
  }

  /**
   * Setup audit logging for security events
   */
  private async setupAuditLogging(): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    console.log('📝 Setting up audit logging...');

    try {
      // Create audit log table if it doesn't exist
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS security_audit_log (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          event_type VARCHAR(50) NOT NULL,
          user_id TEXT,
          ip_address INET,
          user_agent TEXT,
          table_name VARCHAR(50),
          operation VARCHAR(20),
          success BOOLEAN NOT NULL,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;

      // Create index for efficient querying
      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp 
        ON security_audit_log(timestamp DESC)
      `;

      await this.prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_security_audit_event_type 
        ON security_audit_log(event_type)
      `;

      console.log('✅ Audit logging setup completed');
    } catch (error) {
      console.log('ℹ️  Audit logging table may already exist');
    }
  }

  /**
   * Configure connection limits and monitoring
   */
  private async configureConnectionLimits(): Promise<void> {
    console.log('🔗 Configuring connection limits...');

    // These are already set in docker-compose.yml PostgreSQL configuration
    // but we can also set application-level limits
    
    // Create roles for different access levels
    try {
      await this.prisma.$executeRaw`
        CREATE ROLE app_read_only;
        GRANT CONNECT ON DATABASE deeper_bible TO app_read_only;
        GRANT USAGE ON SCHEMA public TO app_read_only;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read_only;
      `;

      await this.prisma.$executeRaw`
        CREATE ROLE app_read_write;
        GRANT CONNECT ON DATABASE deeper_bible TO app_read_write;
        GRANT USAGE ON SCHEMA public TO app_read_write;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_read_write;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_read_write;
      `;

      console.log('✅ Database roles configured');
    } catch (error) {
      console.log('ℹ️  Database roles may already exist');
    }
  }

  /**
   * Log security event to audit log
   */
  async logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    try {
      await this.prisma.$executeRaw`
        INSERT INTO security_audit_log (
          event_type, user_id, ip_address, user_agent, 
          table_name, operation, success, details
        ) VALUES (
          ${event.event}, ${event.userId || null}, ${event.ip || null}, 
          ${event.userAgent || null}, ${event.tableName || null}, 
          ${event.operation || null}, ${event.success}, ${JSON.stringify(event.details || {})}
        )
      `;
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Check if IP is allowed
   */
  isIPAllowed(ip: string): boolean {
    return this.config.allowedIPs.includes(ip) || 
           this.config.allowedIPs.includes('0.0.0.0') || // Allow all
           ip.startsWith('192.168.') || // Local network
           ip.startsWith('10.') || // Private network
           ip === '127.0.0.1' || ip === '::1'; // Localhost
  }

  /**
   * Check connection limits for user
   */
  async checkConnectionLimit(userId: string, ip: string): Promise<boolean> {
    const key = `${userId}_${ip}`;
    const existing = this.connectionMap.get(key);
    
    if (existing) {
      if (existing.count >= this.config.maxConnectionsPerUser) {
        await this.logSecurityEvent({
          event: 'connection_limit_exceeded',
          userId,
          ip,
          success: false,
          details: { currentConnections: existing.count, maxAllowed: this.config.maxConnectionsPerUser },
        });
        return false;
      }
      
      existing.count++;
      existing.lastAccess = new Date();
    } else {
      this.connectionMap.set(key, { count: 1, lastAccess: new Date() });
    }

    return true;
  }

  /**
   * Release connection for user
   */
  releaseConnection(userId: string, ip: string): void {
    const key = `${userId}_${ip}`;
    const existing = this.connectionMap.get(key);
    
    if (existing) {
      existing.count = Math.max(0, existing.count - 1);
      if (existing.count === 0) {
        this.connectionMap.delete(key);
      }
    }
  }

  /**
   * Rate limiting check
   */
  async checkRateLimit(userId: string, ip: string): Promise<boolean> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Clean old query logs
    this.queryLog = this.queryLog.filter(log => log.timestamp > oneHourAgo);

    const userQueries = this.queryLog.filter(log => 
      log.userId === userId && log.timestamp > oneMinuteAgo
    );

    const userQueriesHour = this.queryLog.filter(log => 
      log.userId === userId && log.timestamp > oneHourAgo
    );

    if (userQueries.length >= this.config.rateLimitConfig.maxQueriesPerMinute) {
      await this.logSecurityEvent({
        event: 'rate_limit_exceeded_minute',
        userId,
        ip,
        success: false,
        details: { 
          queriesLastMinute: userQueries.length, 
          maxAllowed: this.config.rateLimitConfig.maxQueriesPerMinute 
        },
      });
      return false;
    }

    if (userQueriesHour.length >= this.config.rateLimitConfig.maxQueriesPerHour) {
      await this.logSecurityEvent({
        event: 'rate_limit_exceeded_hour',
        userId,
        ip,
        success: false,
        details: { 
          queriesLastHour: userQueriesHour.length, 
          maxAllowed: this.config.rateLimitConfig.maxQueriesPerHour 
        },
      });
      return false;
    }

    return true;
  }

  /**
   * Log query for rate limiting and audit
   */
  logQuery(query: string, userId?: string, duration: number = 0): void {
    if (this.config.enableQueryLogging) {
      this.queryLog.push({
        timestamp: new Date(),
        query: query.substring(0, 200), // Truncate long queries
        userId,
        duration,
      });

      // Keep only last 1000 queries to prevent memory issues
      if (this.queryLog.length > 1000) {
        this.queryLog.shift();
      }
    }
  }

  /**
   * Get security audit logs
   */
  async getAuditLogs(limit: number = 100, eventType?: string): Promise<SecurityAuditLog[]> {
    try {
      const whereClause = eventType ? `WHERE event_type = '${eventType}'` : '';
      
      const logs = await this.prisma.$queryRaw`
        SELECT * FROM security_audit_log 
        ${whereClause ? whereClause : ''}
        ORDER BY timestamp DESC 
        LIMIT ${limit}
      ` as any[];

      return logs.map(log => ({
        id: log.id.toString(),
        timestamp: log.timestamp,
        event: log.event_type,
        userId: log.user_id,
        ip: log.ip_address,
        userAgent: log.user_agent,
        tableName: log.table_name,
        operation: log.operation,
        success: log.success,
        details: log.details,
      }));
    } catch (error) {
      console.error('Failed to retrieve audit logs:', error);
      return [];
    }
  }

  /**
   * Get failed authentication attempts
   */
  async getFailedAuthAttempts(hours: number = 24): Promise<SecurityAuditLog[]> {
    const since = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    try {
      const logs = await this.prisma.$queryRaw`
        SELECT * FROM security_audit_log 
        WHERE event_type IN ('login_failed', 'token_invalid', 'unauthorized_access')
          AND timestamp >= ${since}
        ORDER BY timestamp DESC
      ` as any[];

      return logs.map(log => ({
        id: log.id.toString(),
        timestamp: log.timestamp,
        event: log.event_type,
        userId: log.user_id,
        ip: log.ip_address,
        userAgent: log.user_agent,
        tableName: log.table_name,
        operation: log.operation,
        success: log.success,
        details: log.details,
      }));
    } catch (error) {
      console.error('Failed to retrieve failed auth attempts:', error);
      return [];
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(): Promise<{
    suspiciousIPs: string[];
    rapidLoginAttempts: string[];
    unusualQueryPatterns: string[];
    recommendations: string[];
  }> {
    const oneDayAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));
    
    try {
      // Find IPs with multiple failed attempts
      const suspiciousIPs = await this.prisma.$queryRaw`
        SELECT ip_address, COUNT(*) as failed_attempts
        FROM security_audit_log 
        WHERE event_type IN ('login_failed', 'unauthorized_access')
          AND timestamp >= ${oneDayAgo}
          AND ip_address IS NOT NULL
        GROUP BY ip_address
        HAVING COUNT(*) >= 5
        ORDER BY failed_attempts DESC
      ` as Array<{ ip_address: string; failed_attempts: number }>;

      // Find users with rapid login attempts
      const rapidAttempts = await this.prisma.$queryRaw`
        SELECT user_id, COUNT(*) as attempts
        FROM security_audit_log 
        WHERE event_type = 'login_attempt'
          AND timestamp >= ${new Date(Date.now() - (60 * 60 * 1000))} -- Last hour
          AND user_id IS NOT NULL
        GROUP BY user_id
        HAVING COUNT(*) >= 10
        ORDER BY attempts DESC
      ` as Array<{ user_id: string; attempts: number }>;

      // Analyze query patterns for potential SQL injection attempts
      const unusualQueries = this.queryLog.filter(log => 
        log.query.toLowerCase().includes('drop') ||
        log.query.toLowerCase().includes('delete from') ||
        log.query.toLowerCase().includes('truncate') ||
        log.query.toLowerCase().includes('--') ||
        log.query.toLowerCase().includes('/*')
      );

      const recommendations: string[] = [];

      if (suspiciousIPs.length > 0) {
        recommendations.push(`Block ${suspiciousIPs.length} suspicious IP addresses`);
      }

      if (rapidAttempts.length > 0) {
        recommendations.push(`Investigate ${rapidAttempts.length} users with rapid login attempts`);
      }

      if (unusualQueries.length > 0) {
        recommendations.push(`Review ${unusualQueries.length} potentially dangerous queries`);
      }

      if (this.connectionMap.size > 50) {
        recommendations.push('High number of active connections - consider implementing connection pooling');
      }

      return {
        suspiciousIPs: suspiciousIPs.map(ip => ip.ip_address),
        rapidLoginAttempts: rapidAttempts.map(attempt => attempt.user_id),
        unusualQueryPatterns: unusualQueries.map(q => q.query),
        recommendations,
      };
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
      return {
        suspiciousIPs: [],
        rapidLoginAttempts: [],
        unusualQueryPatterns: [],
        recommendations: ['Error detecting suspicious activity - check audit log table'],
      };
    }
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(): Promise<{
    summary: {
      totalConnections: number;
      activeAlerts: number;
      failedAuthToday: number;
      suspiciousActivity: boolean;
    };
    details: {
      auditLogs: SecurityAuditLog[];
      suspiciousActivity: Awaited<ReturnType<typeof this.detectSuspiciousActivity>>;
      connectionStats: { userId: string; connections: number; lastAccess: Date }[];
    };
    recommendations: string[];
  }> {
    console.log('📊 Generating security report...');

    const failedAuthToday = await this.getFailedAuthAttempts(24);
    const suspiciousActivity = await this.detectSuspiciousActivity();
    const recentAuditLogs = await this.getAuditLogs(50);

    const connectionStats = Array.from(this.connectionMap.entries()).map(([key, data]) => ({
      userId: key.split('_')[0],
      connections: data.count,
      lastAccess: data.lastAccess,
    }));

    const recommendations: string[] = [
      ...suspiciousActivity.recommendations,
    ];

    if (failedAuthToday.length > 10) {
      recommendations.push('High number of failed authentication attempts - consider implementing account lockout');
    }

    if (connectionStats.length > 0) {
      const maxUserConnections = Math.max(...connectionStats.map(stat => stat.connections));
      if (maxUserConnections > this.config.maxConnectionsPerUser * 0.8) {
        recommendations.push('Some users approaching connection limits - monitor usage patterns');
      }
    }

    return {
      summary: {
        totalConnections: connectionStats.reduce((sum, stat) => sum + stat.connections, 0),
        activeAlerts: suspiciousActivity.suspiciousIPs.length + suspiciousActivity.rapidLoginAttempts.length,
        failedAuthToday: failedAuthToday.length,
        suspiciousActivity: suspiciousActivity.suspiciousIPs.length > 0 || 
                          suspiciousActivity.rapidLoginAttempts.length > 0 ||
                          suspiciousActivity.unusualQueryPatterns.length > 0,
      },
      details: {
        auditLogs: recentAuditLogs,
        suspiciousActivity,
        connectionStats,
      },
      recommendations,
    };
  }

  /**
   * Validate current security configuration
   */
  async validateSecurityConfiguration(): Promise<{
    isSecure: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    console.log('🔍 Validating security configuration...');

    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check if RLS is enabled on sensitive tables
      const rlsStatus = await this.prisma.$queryRaw`
        SELECT tablename, rowsecurity 
        FROM pg_tables t
        LEFT JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public' 
          AND t.tablename IN ('User', 'Report', 'Favorite', 'History')
      ` as Array<{ tablename: string; rowsecurity: boolean }>;

      const tablesWithoutRLS = rlsStatus.filter(table => !table.rowsecurity);
      if (tablesWithoutRLS.length > 0) {
        issues.push(`Row-level security not enabled on: ${tablesWithoutRLS.map(t => t.tablename).join(', ')}`);
      }

      // Check for audit log table
      const auditTableExists = await this.prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = 'security_audit_log'
        )
      ` as Array<{ exists: boolean }>;

      if (!auditTableExists[0]?.exists) {
        issues.push('Security audit log table not found');
      }

      // Check SSL enforcement
      const sslSetting = await this.prisma.$queryRaw`
        SELECT setting FROM pg_settings WHERE name = 'ssl'
      ` as Array<{ setting: string }>;

      if (sslSetting[0]?.setting !== 'on' && this.config.requireSSL) {
        recommendations.push('Enable SSL for database connections');
      }

      // Check connection limits
      const connectionLimits = await this.prisma.$queryRaw`
        SELECT datconnlimit FROM pg_database WHERE datname = 'deeper_bible'
      ` as Array<{ datconnlimit: number }>;

      if (connectionLimits[0]?.datconnlimit === -1) {
        recommendations.push('Set database connection limit to prevent resource exhaustion');
      }

      return {
        isSecure: issues.length === 0,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to validate security configuration:', error);
      return {
        isSecure: false,
        issues: ['Failed to validate security configuration'],
        recommendations: ['Review database connectivity and permissions'],
      };
    }
  }

  /**
   * Emergency security lockdown
   */
  async emergencyLockdown(): Promise<void> {
    console.log('🚨 EMERGENCY LOCKDOWN INITIATED');

    await this.logSecurityEvent({
      event: 'emergency_lockdown',
      success: true,
      details: { timestamp: new Date(), reason: 'Manual emergency lockdown' },
    });

    // Terminate non-essential connections
    await this.prisma.$executeRaw`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'deeper_bible' 
        AND pid != pg_backend_pid()
        AND state != 'idle'
    `;

    // Clear connection tracking
    this.connectionMap.clear();
    this.queryLog.length = 0;

    console.log('🔒 Emergency lockdown completed');
  }

  /**
   * Cleanup old audit logs
   */
  async cleanupAuditLogs(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));
    
    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM security_audit_log 
        WHERE timestamp < ${cutoffDate}
      `;

      console.log(`🧹 Cleaned up audit logs older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
    }
  }
}