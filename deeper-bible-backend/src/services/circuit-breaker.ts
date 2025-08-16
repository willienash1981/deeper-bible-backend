import { EventEmitter } from 'events';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening
  recoveryTimeout: number;      // Time to wait before half-open (ms)
  monitoringPeriod: number;     // Time window for failure counting (ms)
  expectedLatency: number;      // Expected max latency (ms)
  volumeThreshold: number;      // Minimum requests before evaluating
}

export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  requests: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  nextAttempt: Date | null;
  failureRate: number;
  averageLatency: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private requests: number = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttempt: Date | null = null;
  private latencies: number[] = [];
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.config = {
      failureThreshold: 5,        // 5 failures
      recoveryTimeout: 60000,     // 1 minute
      monitoringPeriod: 300000,   // 5 minutes
      expectedLatency: 1000,      // 1 second
      volumeThreshold: 10,        // 10 requests minimum
      ...config,
    };
  }

  async execute<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.state === CircuitBreakerState.OPEN) {
        if (this.canAttemptReset()) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.emit('halfOpen');
        } else {
          const error = new Error('Circuit breaker is OPEN');
          (error as any).circuitBreakerOpen = true;
          
          if (fallback) {
            return fallback()
              .then(resolve)
              .catch(reject);
          }
          
          return reject(error);
        }
      }

      const startTime = Date.now();
      this.requests++;

      operation()
        .then((result) => {
          const latency = Date.now() - startTime;
          this.onSuccess(latency);
          resolve(result);
        })
        .catch((error) => {
          const latency = Date.now() - startTime;
          this.onFailure(error, latency);
          
          if (fallback && this.state === CircuitBreakerState.OPEN) {
            return fallback()
              .then(resolve)
              .catch(reject);
          }
          
          reject(error);
        });
    });
  }

  private onSuccess(latency: number): void {
    this.lastSuccessTime = new Date();
    this.successes++;
    this.addLatency(latency);

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.reset();
    }

    this.cleanOldData();
    this.emit('success', { latency, state: this.state });
  }

  private onFailure(error: Error, latency: number): void {
    this.lastFailureTime = new Date();
    this.failures++;
    this.addLatency(latency);

    if (this.shouldTrip()) {
      this.trip();
    }

    this.cleanOldData();
    this.emit('failure', { error, latency, state: this.state });
  }

  private shouldTrip(): boolean {
    // Don't trip if we haven't seen enough volume
    if (this.requests < this.config.volumeThreshold) {
      return false;
    }

    // Trip if failure rate exceeds threshold
    const failureRate = this.failures / this.requests;
    const hasExceededFailureThreshold = this.failures >= this.config.failureThreshold;
    const hasHighFailureRate = failureRate > 0.5; // 50% failure rate
    
    // Also consider latency - if average latency is too high, consider it a failure
    const avgLatency = this.getAverageLatency();
    const hasHighLatency = avgLatency > this.config.expectedLatency * 2;

    return hasExceededFailureThreshold || (hasHighFailureRate && hasHighLatency);
  }

  private trip(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.config.recoveryTimeout);
    this.emit('open', this.getStats());
  }

  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.requests = 0;
    this.nextAttempt = null;
    this.latencies = [];
    this.emit('close', this.getStats());
  }

  private canAttemptReset(): boolean {
    return this.nextAttempt !== null && new Date() >= this.nextAttempt;
  }

  private addLatency(latency: number): void {
    this.latencies.push(latency);
    // Keep only recent latencies (last 100 requests)
    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
  }

  private getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return sum / this.latencies.length;
  }

  private cleanOldData(): void {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    
    // In a real implementation, you'd want to track timestamps for each request
    // For simplicity, we'll reset if the last failure was too long ago
    if (this.lastFailureTime && this.lastFailureTime < cutoff && this.state === CircuitBreakerState.CLOSED) {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  getStats(): CircuitBreakerStats {
    const totalRequests = this.requests || 1; // Avoid division by zero
    
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      requests: this.requests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttempt: this.nextAttempt,
      failureRate: this.failures / totalRequests,
      averageLatency: this.getAverageLatency(),
    };
  }

  // Manual controls for testing and administration
  forceOpen(): void {
    this.trip();
  }

  forceClose(): void {
    this.reset();
  }

  forceHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.emit('halfOpen');
  }
}

// Circuit breaker specifically for Redis operations
export class RedisCircuitBreaker extends CircuitBreaker {
  constructor() {
    super({
      failureThreshold: 3,        // Redis should be more sensitive
      recoveryTimeout: 30000,     // 30 seconds recovery
      monitoringPeriod: 60000,    // 1 minute window
      expectedLatency: 100,       // Redis should be fast (100ms)
      volumeThreshold: 5,         // Lower volume threshold for Redis
    });
  }

  async executeRedisOperation<T>(
    operation: () => Promise<T>,
    operationName: string = 'redis-operation'
  ): Promise<T | null> {
    try {
      return await this.execute(operation, async () => {
        console.warn(`Redis circuit breaker is open, skipping ${operationName}`);
        return null as T;
      });
    } catch (error) {
      if ((error as any).circuitBreakerOpen) {
        console.warn(`Redis operation ${operationName} failed due to circuit breaker`);
        return null;
      }
      throw error;
    }
  }
}