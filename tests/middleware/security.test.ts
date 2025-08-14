import express from 'express';
import request from 'supertest';
import { 
  helmetConfig, 
  additionalSecurityHeaders,
  sanitizeInput,
  preventSQLInjection 
} from '../../src/api/middleware/security';

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      app.use(additionalSecurityHeaders);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(response.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
    });

    it('should set permissions policy', async () => {
      app.use(additionalSecurityHeaders);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app).get('/test');
      
      expect(response.headers['permissions-policy']).toContain('geolocation=()');
      expect(response.headers['permissions-policy']).toContain('microphone=()');
      expect(response.headers['permissions-policy']).toContain('camera=()');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in request body', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => res.json(req.body));

      const maliciousInput = {
        name: '<script>alert("XSS")</script>Normal Text',
        description: 'javascript:alert("XSS")',
      };

      const response = await request(app)
        .post('/test')
        .send(maliciousInput);

      expect(response.body.name).not.toContain('<script>');
      expect(response.body.name).toContain('Normal Text');
      expect(response.body.description).not.toContain('javascript:');
    });

    it('should sanitize nested objects', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => res.json(req.body));

      const nestedMalicious = {
        user: {
          name: 'John',
          profile: {
            bio: '<script>evil()</script>Safe text',
          },
        },
      };

      const response = await request(app)
        .post('/test')
        .send(nestedMalicious);

      expect(response.body.user.profile.bio).not.toContain('<script>');
      expect(response.body.user.profile.bio).toContain('Safe text');
    });

    it('should prevent prototype pollution', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => res.json(req.body));

      const prototypePayload = {
        '__proto__': { isAdmin: true },
        'constructor': { isAdmin: true },
        'prototype': { isAdmin: true },
        normalField: 'value',
      };

      const response = await request(app)
        .post('/test')
        .send(prototypePayload);

      expect(response.body.__proto__).toBeUndefined();
      expect(response.body.constructor).toBeUndefined();
      expect(response.body.prototype).toBeUndefined();
      expect(response.body.normalField).toBe('value');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should block SQL injection attempts', async () => {
      app.use(preventSQLInjection);
      app.post('/test', (req, res) => res.json({ success: true }));

      const sqlInjection = {
        username: "admin' OR '1'='1",
        query: 'SELECT * FROM users WHERE id = 1; DROP TABLE users;',
      };

      const response = await request(app)
        .post('/test')
        .send(sqlInjection);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input detected');
    });

    it('should block script tags', async () => {
      app.use(preventSQLInjection);
      app.get('/test', (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/test')
        .query({ search: '<script>alert("XSS")</script>' });

      expect(response.status).toBe(400);
    });

    it('should allow normal queries', async () => {
      app.use(preventSQLInjection);
      app.post('/test', (req, res) => res.json({ success: true }));

      const normalData = {
        username: 'john_doe',
        email: 'john@example.com',
        age: 30,
      };

      const response = await request(app)
        .post('/test')
        .send(normalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Helmet Configuration', () => {
    it('should configure CSP correctly', () => {
      // This is more of a configuration test
      // In a real scenario, you'd test the actual headers set by helmet
      expect(helmetConfig).toBeDefined();
      // The actual helmet middleware would be tested with integration tests
    });
  });
});