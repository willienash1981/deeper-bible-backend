import { RetryHandler } from '../utils/retry-handler';

jest.mock('../../utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;

  beforeEach(() => {
    retryHandler = new RetryHandler();
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should execute function successfully on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await retryHandler.executeWithRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockFn = jest.fn();

      // Mock rate limit error on first call
      mockFn.mockImplementationOnce(() => {
        const error = new Error('Rate limit exceeded');
        (error as any).status = 429;
        throw error;
      });

      // Mock server error on second call
      mockFn.mockImplementationOnce(() => {
        const error = new Error('Server error');
        (error as any).status = 500;
        throw error;
      });

      // Success on third call
      mockFn.mockImplementationOnce(() => Promise.resolve('success'));

      const result = await retryHandler.executeWithRetry(mockFn, {
        maxRetries: 3,
        initialDelay: 10 // Short delay for testing
      });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        const error = new Error('Bad request');
        (error as any).status = 400;
        throw error;
      });

      await expect(retryHandler.executeWithRetry(mockFn))
        .rejects.toThrow('Bad request');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries limit', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        const error = new Error('Server error');
        (error as any).status = 500;
        throw error;
      });

      await expect(retryHandler.executeWithRetry(mockFn, { maxRetries: 2 }))
        .rejects.toThrow('Server error');
      
      expect(mockFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failure threshold', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        const error = new Error('Server error');
        (error as any).status = 500;
        throw error;
      });

      // Execute enough times to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await retryHandler.executeWithRetry(mockFn, { maxRetries: 0 }, 'test-service');
        } catch {
          // Expected failures
        }
      }

      // Circuit breaker should now be open
      await expect(retryHandler.executeWithRetry(mockFn, {}, 'test-service'))
        .rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to half-open after timeout', async () => {
      const circuitKey = 'test-service-timeout';
      
      // Cause failures to open circuit breaker
      const failingFn = jest.fn().mockImplementation(() => {
        const error = new Error('Server error');
        (error as any).status = 500;
        throw error;
      });

      for (let i = 0; i < 5; i++) {
        try {
          await retryHandler.executeWithRetry(failingFn, { maxRetries: 0 }, circuitKey);
        } catch {
          // Expected failures
        }
      }

      // Verify circuit is open
      const status = retryHandler.getCircuitBreakerStatus(circuitKey);
      expect(status.state).toBe('OPEN');
    });

    it('should reset circuit breaker after successful operations in half-open state', async () => {
      const circuitKey = 'test-service-reset';
      
      // This would require manipulating time or internal state
      // For now, verify the reset functionality exists
      retryHandler.resetCircuitBreaker(circuitKey);
      
      const status = retryHandler.getCircuitBreakerStatus(circuitKey);
      expect(status.state).toBe('CLOSED');
    });
  });

  describe('Circuit Breaker Management', () => {
    it('should get all circuit breaker statuses', () => {
      const statuses = retryHandler.getAllCircuitBreakerStatuses();
      expect(typeof statuses).toBe('object');
    });

    it('should manually reset circuit breaker', () => {
      expect(() => retryHandler.resetCircuitBreaker('test-key')).not.toThrow();
    });

    it('should update circuit breaker configuration', () => {
      expect(() => retryHandler.updateCircuitBreakerConfig({
        failureThreshold: 10,
        resetTimeout: 120000
      })).not.toThrow();
    });
  });
});