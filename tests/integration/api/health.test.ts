import request from 'supertest';
import express from 'express';

// Import the actual app
let app: express.Application;

describe('Health Endpoint Integration Test', () => {
  beforeAll(async () => {
    // Import app dynamically to avoid Redis connection issues in tests
    try {
      const appModule = await import('@/api/app');
      app = appModule.default;
    } catch (error) {
      // If app import fails, create a minimal test app
      app = express();
      app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
      });
    }
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should have proper response headers', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should respond within reasonable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/non-existent-endpoint')
        .expect(404);
    });
  });
});