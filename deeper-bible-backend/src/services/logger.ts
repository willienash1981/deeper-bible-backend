import { randomUUID } from 'crypto';

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operation?: string;
  component?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

export class StructuredLogger {
  private context: LogContext = {};
  private logLevel: LogLevel;

  constructor(context: LogContext = {}, logLevel: LogLevel = LogLevel.INFO) {
    this.context = { ...context };
    this.logLevel = logLevel;
    
    // Ensure we have a correlation ID
    if (!this.context.correlationId) {
      this.context.correlationId = randomUUID();
    }
  }

  static create(context: LogContext = {}): StructuredLogger {
    return new StructuredLogger(context);
  }

  withContext(additionalContext: LogContext): StructuredLogger {
    return new StructuredLogger(
      { ...this.context, ...additionalContext },
      this.logLevel
    );
  }

  withCorrelationId(correlationId: string): StructuredLogger {
    return this.withContext({ correlationId });
  }

  withUser(userId: string): StructuredLogger {
    return this.withContext({ userId });
  }

  withOperation(operation: string): StructuredLogger {
    return this.withContext({ operation });
  }

  withComponent(component: string): StructuredLogger {
    return this.withContext({ component });
  }

  withDuration(duration: number): StructuredLogger {
    return this.withContext({ duration });
  }

  withMetadata(metadata: Record<string, any>): StructuredLogger {
    return this.withContext({ 
      metadata: { ...this.context.metadata, ...metadata } 
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel <= currentLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  private writeLog(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  error(message: string, error?: Error): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.writeLog(this.formatLog(LogLevel.ERROR, message, error));
    }
  }

  warn(message: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.writeLog(this.formatLog(LogLevel.WARN, message));
    }
  }

  info(message: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.writeLog(this.formatLog(LogLevel.INFO, message));
    }
  }

  debug(message: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.writeLog(this.formatLog(LogLevel.DEBUG, message));
    }
  }

  trace(message: string): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      this.writeLog(this.formatLog(LogLevel.TRACE, message));
    }
  }

  // Specialized logging methods for cache operations
  cacheHit(key: string, ttl?: number): void {
    this.info('Cache hit')
      .withMetadata({ key, ttl, type: 'cache_hit' });
  }

  cacheMiss(key: string): void {
    this.info('Cache miss')
      .withMetadata({ key, type: 'cache_miss' });
  }

  cacheSet(key: string, ttl: number, compressed: boolean = false): void {
    this.info('Cache set')
      .withMetadata({ key, ttl, compressed, type: 'cache_set' });
  }

  cacheDelete(pattern: string, deletedCount: number): void {
    this.info('Cache delete')
      .withMetadata({ pattern, deletedCount, type: 'cache_delete' });
  }

  cacheError(operation: string, error: Error): void {
    this.error(`Cache operation failed: ${operation}`, error)
      .withMetadata({ operation, type: 'cache_error' });
  }

  // Performance logging
  performance(operation: string, duration: number, success: boolean = true): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const message = `Operation ${operation} ${success ? 'completed' : 'failed'} in ${duration}ms`;
    
    if (this.shouldLog(level)) {
      this.writeLog(this.formatLog(level, message))
        .withDuration(duration)
        .withMetadata({ operation, success, type: 'performance' });
    }
  }

  // Security logging
  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    
    this.writeLog(this.formatLog(level, `Security event: ${event}`))
      .withMetadata({ event, severity, type: 'security' });
  }

  // Rate limiting logging
  rateLimitExceeded(clientId: string, endpoint: string, limit: number): void {
    this.warn('Rate limit exceeded')
      .withMetadata({ 
        clientId, 
        endpoint, 
        limit, 
        type: 'rate_limit_exceeded' 
      });
  }

  // Circuit breaker logging
  circuitBreakerStateChange(component: string, oldState: string, newState: string): void {
    this.warn(`Circuit breaker state change: ${component}`)
      .withMetadata({ 
        component, 
        oldState, 
        newState, 
        type: 'circuit_breaker_state_change' 
      });
  }
}

// Global logger instance with cache component context
export const cacheLogger = StructuredLogger.create({ component: 'cache' });

// Express middleware for correlation ID
export function correlationIdMiddleware() {
  return (req: any, res: any, next: any) => {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Attach logger to request
    req.logger = StructuredLogger.create({
      correlationId,
      requestId: randomUUID(),
      userId: req.headers['x-user-id'],
      sessionId: req.headers['x-session-id'],
    });
    
    next();
  };
}

// Performance measurement utility
export function measurePerformance<T>(
  logger: StructuredLogger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return fn()
    .then((result) => {
      const duration = Date.now() - start;
      logger.performance(operation, duration, true);
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - start;
      logger.performance(operation, duration, false);
      logger.error(`Operation ${operation} failed`, error);
      throw error;
    });
}