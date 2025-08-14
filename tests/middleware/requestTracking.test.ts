import express from 'express';
import request from 'supertest';
import {
  requestIdMiddleware,
  requestTimingMiddleware,
  requestLoggingMiddleware,
  userActivityMiddleware,
} from '../../src/api/middleware/requestTracking';

describe('Request Tracking Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Request ID Middleware', () => {
    it('should generate request ID for new requests', async () => {
      app.use(requestIdMiddleware);
      app.get('/test', (req, res) => {
        expect(req.id).toBeDefined();
        expect(req.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        res.json({ requestId: req.id });
      });

      const response = await request(app).get('/test');
      
      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.requestId).toBe(response.headers['x-request-id']);
    });

    it('should use existing request ID from headers', async () => {
      app.use(requestIdMiddleware);
      app.get('/test', (req, res) => {
        res.json({ requestId: req.id });
      });

      const existingId = 'existing-request-id-123';
      const response = await request(app)
        .get('/test')
        .set('X-Request-ID', existingId);
      
      expect(response.headers['x-request-id']).toBe(existingId);
      expect(response.body.requestId).toBe(existingId);
    });

    it('should use correlation ID if provided', async () => {
      app.use(requestIdMiddleware);
      app.get('/test', (req, res) => {
        res.json({ requestId: req.id });
      });

      const correlationId = 'correlation-id-456';
      const response = await request(app)
        .get('/test')
        .set('X-Correlation-ID', correlationId);
      
      expect(response.headers['x-request-id']).toBe(correlationId);
      expect(response.body.requestId).toBe(correlationId);
    });
  });

  describe('Request Timing Middleware', () => {
    it('should track request duration', async () => {
      app.use(requestTimingMiddleware);
      app.get('/test', async (req, res) => {
        expect(req.startTime).toBeDefined();
        expect(typeof req.startTime).toBe('number');
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 50));
        res.json({ success: true });
      });

      const response = await request(app).get('/test');
      
      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
      
      const duration = parseInt(response.headers['x-response-time']);
      expect(duration).toBeGreaterThanOrEqual(50);
    });

    it('should warn about slow requests', async () => {
      app.use(requestIdMiddleware);
      app.use(requestTimingMiddleware);
      app.get('/slow', async (req, res) => {
        // Simulate slow request
        req.startTime = Date.now() - 3500; // Simulate 3.5 seconds
        res.json({ success: true });
      });

      await request(app).get('/slow');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Slow request detected',
          path: '/slow',
          method: 'GET',
        })
      );
    });
  });

  describe('Request Logging Middleware', () => {
    it('should log incoming requests in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.use(requestIdMiddleware);
      app.use(requestTimingMiddleware);
      app.use(requestLoggingMiddleware);
      app.get('/test', (req, res) => res.json({ success: true }));

      await request(app)
        .get('/test')
        .query({ search: 'term' })
        .set('User-Agent', 'Test Agent');

      expect(console.log).toHaveBeenCalledWith(
        'Incoming request:',
        expect.objectContaining({
          method: 'GET',
          path: '/test',
          query: expect.objectContaining({ search: 'term' }),
          userAgent: 'Test Agent',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should log error responses', async () => {
      app.use(requestIdMiddleware);
      app.use(requestTimingMiddleware);
      app.use(requestLoggingMiddleware);
      app.get('/error', (req, res) => res.status(500).json({ error: 'Server error' }));

      await request(app).get('/error');

      expect(console.error).toHaveBeenCalledWith(
        'Server error response:',
        expect.objectContaining({
          method: 'GET',
          path: '/error',
          statusCode: 500,
        })
      );
    });

    it('should log client errors', async () => {
      app.use(requestIdMiddleware);
      app.use(requestTimingMiddleware);
      app.use(requestLoggingMiddleware);
      app.get('/not-found', (req, res) => res.status(404).json({ error: 'Not found' }));

      await request(app).get('/not-found');

      expect(console.warn).toHaveBeenCalledWith(
        'Client error response:',
        expect.objectContaining({
          method: 'GET',
          path: '/not-found',
          statusCode: 404,
        })
      );
    });
  });

  describe('User Activity Middleware', () => {
    it('should track authenticated user activity', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.use(requestIdMiddleware);
      app.use((req, res, next) => {
        req.user = {
          id: 'user-123',
          email: 'test@example.com',
          role: 'user',
        };
        next();
      });
      app.use(userActivityMiddleware);
      app.get('/protected', (req, res) => res.json({ success: true }));

      await request(app)
        .get('/protected')
        .set('User-Agent', 'Test Browser');

      expect(console.log).toHaveBeenCalledWith(
        'User activity:',
        expect.objectContaining({
          userId: 'user-123',
          action: 'GET /protected',
          userAgent: 'Test Browser',
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should skip tracking for unauthenticated requests', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.use(requestIdMiddleware);
      app.use(userActivityMiddleware);
      app.get('/public', (req, res) => res.json({ success: true }));

      await request(app).get('/public');

      expect(console.log).not.toHaveBeenCalledWith(
        'User activity:',
        expect.anything()
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Combined Tracking', () => {
    it('should work together seamlessly', async () => {
      app.use(requestIdMiddleware);
      app.use(requestTimingMiddleware);
      app.use(requestLoggingMiddleware);
      
      app.get('/combined', (req, res) => {
        res.json({
          requestId: req.id,
          startTime: req.startTime,
        });
      });

      const response = await request(app).get('/combined');
      
      expect(response.status).toBe(200);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.startTime).toBeDefined();
      expect(response.headers['x-request-id']).toBe(response.body.requestId);
      expect(response.headers['x-response-time']).toBeDefined();
    });
  });
});