import { corsOptions } from '../../src/api/middleware/cors';

describe('CORS Configuration', () => {
  const mockCallback = jest.fn();

  beforeEach(() => {
    mockCallback.mockClear();
    process.env.NODE_ENV = 'test';
  });

  describe('Origin Validation', () => {
    it('should allow requests with no origin', () => {
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin(undefined, mockCallback);
      }
      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it('should allow whitelisted origins', () => {
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://deeperbible.com',
      ];

      allowedOrigins.forEach(origin => {
        mockCallback.mockClear();
        if (typeof corsOptions.origin === 'function') {
          corsOptions.origin(origin, mockCallback);
        }
        expect(mockCallback).toHaveBeenCalledWith(null, true);
      });
    });

    it('should reject non-whitelisted origins in production', () => {
      process.env.NODE_ENV = 'production';
      if (typeof corsOptions.origin === 'function') {
        corsOptions.origin('http://malicious-site.com', mockCallback);
      }
      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should allow subdomain matching in production', () => {
      process.env.NODE_ENV = 'production';
      const validSubdomains = [
        'https://api.deeperbible.com',
        'https://app.deeperbible.com',
        'https://staging.deeperbible.com',
      ];

      validSubdomains.forEach(origin => {
        mockCallback.mockClear();
        if (typeof corsOptions.origin === 'function') {
          corsOptions.origin(origin, mockCallback);
        }
        expect(mockCallback).toHaveBeenCalledWith(null, true);
      });
    });

    it('should allow localhost with any port in development', () => {
      process.env.NODE_ENV = 'development';
      const localhostOrigins = [
        'http://localhost:8080',
        'http://localhost:4200',
        'http://127.0.0.1:3000',
      ];

      localhostOrigins.forEach(origin => {
        mockCallback.mockClear();
        if (typeof corsOptions.origin === 'function') {
          corsOptions.origin(origin, mockCallback);
        }
        expect(mockCallback).toHaveBeenCalledWith(null, true);
      });
    });
  });

  describe('CORS Options', () => {
    it('should have credentials enabled', () => {
      expect(corsOptions.credentials).toBe(true);
    });

    it('should have correct max age', () => {
      expect(corsOptions.maxAge).toBe(86400);
    });

    it('should allow correct HTTP methods', () => {
      expect(corsOptions.methods).toEqual([
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'PATCH',
        'OPTIONS',
      ]);
    });

    it('should have correct allowed headers', () => {
      expect(corsOptions.allowedHeaders).toContain('Content-Type');
      expect(corsOptions.allowedHeaders).toContain('Authorization');
      expect(corsOptions.allowedHeaders).toContain('X-Request-ID');
    });

    it('should expose correct headers', () => {
      expect(corsOptions.exposedHeaders).toContain('X-Request-ID');
      expect(corsOptions.exposedHeaders).toContain('X-RateLimit-Limit');
    });

    it('should have correct options success status', () => {
      expect(corsOptions.optionsSuccessStatus).toBe(204);
    });
  });
});