import { createLogger } from '../../utils/logger';
import { Logger } from 'winston';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: any) => boolean;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successCount: number;
  requestCount: number;
}

export class RetryHandler {
  private logger: Logger;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
  };

  constructor() {
    this.logger = createLogger('RetryHandler');
  }

  /**
   * Executes a function with retry logic and circuit breaker protection.
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
    circuitKey?: string
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 16000,
      backoffMultiplier = 2,
      shouldRetry = this.defaultShouldRetry
    } = options;

    // Check circuit breaker
    if (circuitKey && !this.canProceed(circuitKey)) {
      throw new Error(`Circuit breaker is OPEN for ${circuitKey}. Service temporarily unavailable.`);
    }

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        
        // Record success for circuit breaker
        if (circuitKey) {
          this.recordSuccess(circuitKey);
        }
        
        if (attempt > 0) {
          this.logger.info('Operation succeeded after retry', {
            circuitKey,
            attempt,
            totalAttempts: attempt + 1
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Record failure for circuit breaker
        if (circuitKey) {
          this.recordFailure(circuitKey);
        }

        // Check if we should retry
        if (!shouldRetry(error)) {
          this.logger.warn('Error is not retryable', {
            error: error instanceof Error ? error.message : String(error),
            circuitKey,
            attempt
          });
          break;
        }

        // Check if we've exhausted retries
        if (attempt === maxRetries) {
          this.logger.error('Max retries exceeded', {
            maxRetries,
            circuitKey,
            error: error instanceof Error ? error.message : String(error)
          });
          break;
        }

        // Log retry attempt
        this.logger.warn('Retrying operation after failure', {
          circuitKey,
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error instanceof Error ? error.message : String(error)
        });

        // Wait before retrying
        await this.sleep(delay);

        // Calculate next delay with exponential backoff and jitter
        delay = Math.min(delay * backoffMultiplier + Math.random() * 1000, maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Default retry logic for different types of errors.
   */
  private defaultShouldRetry(error: any): boolean {
    // Retry on rate limit errors
    if (error.status === 429 || error.code === 'rate_limit_exceeded') {
      return true;
    }

    // Retry on temporary network errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNREFUSED') {
      return true;
    }

    // Retry on 5xx server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Retry on specific OpenAI errors
    if (error.type === 'server_error' || 
        error.type === 'api_connection_error' ||
        error.type === 'timeout') {
      return true;
    }

    // Don't retry on client errors (4xx except 429)
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
      return false;
    }

    // Don't retry on authentication errors
    if (error.status === 401 || error.status === 403) {
      return false;
    }

    // Default to not retrying unknown errors
    return false;
  }

  /**
   * Circuit breaker methods
   */
  private canProceed(key: string): boolean {
    const breaker = this.getCircuitBreaker(key);
    
    if (breaker.state === 'OPEN') {
      // Check if we should try to reset
      if (this.shouldAttemptReset(breaker)) {
        breaker.state = 'HALF_OPEN';
        breaker.successCount = 0;
        this.logger.info('Circuit breaker transitioning to HALF_OPEN', { key });
        return true;
      }
      return false;
    }
    
    return true;
  }

  private getCircuitBreaker(key: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        failures: 0,
        lastFailureTime: null,
        state: 'CLOSED',
        successCount: 0,
        requestCount: 0
      });
    }
    return this.circuitBreakers.get(key)!;
  }

  private recordSuccess(key: string): void {
    const breaker = this.getCircuitBreaker(key);
    breaker.requestCount++;
    
    if (breaker.state === 'HALF_OPEN') {
      breaker.successCount++;
      if (breaker.successCount >= 3) {
        // Reset circuit breaker
        breaker.state = 'CLOSED';
        breaker.failures = 0;
        breaker.lastFailureTime = null;
        breaker.successCount = 0;
        this.logger.info('Circuit breaker reset to CLOSED', { key });
      }
    } else if (breaker.state === 'CLOSED') {
      // Reset failure count on success
      breaker.failures = Math.max(0, breaker.failures - 1);
    }
  }

  private recordFailure(key: string): void {
    const breaker = this.getCircuitBreaker(key);
    breaker.failures++;
    breaker.lastFailureTime = new Date();
    breaker.requestCount++;
    
    if (breaker.state === 'HALF_OPEN') {
      // Immediately open on failure in half-open state
      breaker.state = 'OPEN';
      breaker.successCount = 0;
      this.logger.warn('Circuit breaker reopened after failure in HALF_OPEN state', { key });
    } else if (breaker.failures >= this.defaultConfig.failureThreshold) {
      breaker.state = 'OPEN';
      this.logger.warn('Circuit breaker opened due to failure threshold', { 
        key, 
        failures: breaker.failures,
        threshold: this.defaultConfig.failureThreshold 
      });
    }
  }

  private shouldAttemptReset(breaker: CircuitBreakerState): boolean {
    if (!breaker.lastFailureTime) {
      return true;
    }
    
    const timeSinceLastFailure = Date.now() - breaker.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.defaultConfig.resetTimeout;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker status for monitoring.
   */
  getCircuitBreakerStatus(key: string): {
    state: string;
    failures: number;
    requestCount: number;
    lastFailureTime: Date | null;
  } {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) {
      return {
        state: 'NOT_INITIALIZED',
        failures: 0,
        requestCount: 0,
        lastFailureTime: null
      };
    }

    return {
      state: breaker.state,
      failures: breaker.failures,
      requestCount: breaker.requestCount,
      lastFailureTime: breaker.lastFailureTime
    };
  }

  /**
   * Manually reset a circuit breaker (admin function).
   */
  resetCircuitBreaker(key: string): void {
    const breaker = this.getCircuitBreaker(key);
    breaker.state = 'CLOSED';
    breaker.failures = 0;
    breaker.lastFailureTime = null;
    breaker.successCount = 0;
    
    this.logger.info('Circuit breaker manually reset', { key });
  }

  /**
   * Get all circuit breaker statuses for monitoring dashboard.
   */
  getAllCircuitBreakerStatuses(): Record<string, any> {
    const statuses: Record<string, any> = {};
    
    this.circuitBreakers.forEach((breaker, key) => {
      statuses[key] = {
        state: breaker.state,
        failures: breaker.failures,
        requestCount: breaker.requestCount,
        lastFailureTime: breaker.lastFailureTime,
        successRate: breaker.requestCount > 0 
          ? ((breaker.requestCount - breaker.failures) / breaker.requestCount * 100).toFixed(1) + '%'
          : 'N/A'
      };
    });
    
    return statuses;
  }

  /**
   * Update circuit breaker configuration.
   */
  updateCircuitBreakerConfig(config: Partial<CircuitBreakerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
    this.logger.info('Circuit breaker configuration updated', { config: this.defaultConfig });
  }
}