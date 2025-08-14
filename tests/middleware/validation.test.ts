import express from 'express';
import request from 'supertest';
import { createValidationMiddleware, validationSchemas } from '../../src/api/middleware/validation/schemas';

describe('Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Authentication Validation', () => {
    it('should validate registration data', async () => {
      const validator = createValidationMiddleware(validationSchemas.auth.register);
      app.post('/register', validator, (req, res) => res.json({ success: true }));

      const validData = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
      };

      const response = await request(app)
        .post('/register')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const validator = createValidationMiddleware(validationSchemas.auth.register);
      app.post('/register', validator, (req, res) => res.json({ success: true }));

      const invalidData = {
        email: 'invalid-email',
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'email',
        })
      );
    });

    it('should reject weak passwords', async () => {
      const validator = createValidationMiddleware(validationSchemas.auth.register);
      app.post('/register', validator, (req, res) => res.json({ success: true }));

      const weakPasswordData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: true,
      };

      const response = await request(app)
        .post('/register')
        .send(weakPasswordData);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'password',
        })
      );
    });

    it('should require terms acceptance', async () => {
      const validator = createValidationMiddleware(validationSchemas.auth.register);
      app.post('/register', validator, (req, res) => res.json({ success: true }));

      const noTermsData = {
        email: 'test@example.com',
        password: 'SecureP@ss123',
        firstName: 'John',
        lastName: 'Doe',
        acceptTerms: false,
      };

      const response = await request(app)
        .post('/register')
        .send(noTermsData);

      expect(response.status).toBe(400);
    });
  });

  describe('Bible Query Validation', () => {
    it('should validate verse query parameters', async () => {
      const validator = createValidationMiddleware(validationSchemas.bible.verseQuery);
      app.get('/verses', validator, (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/verses')
        .query({
          bookId: 'genesis',
          chapter: '1',
          verses: '1-5',
          translation: 'KJV',
        });

      expect(response.status).toBe(200);
    });

    it('should reject invalid book ID format', async () => {
      const validator = createValidationMiddleware(validationSchemas.bible.verseQuery);
      app.get('/verses', validator, (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/verses')
        .query({
          bookId: 'Invalid Book!',
          chapter: '1',
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'bookId',
        })
      );
    });

    it('should reject invalid verse range format', async () => {
      const validator = createValidationMiddleware(validationSchemas.bible.verseQuery);
      app.get('/verses', validator, (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/verses')
        .query({
          bookId: 'genesis',
          chapter: '1',
          verses: 'invalid-range',
        });

      expect(response.status).toBe(400);
    });

    it('should coerce chapter to number', async () => {
      const validator = createValidationMiddleware(validationSchemas.bible.verseQuery);
      app.get('/verses', validator, (req, res) => {
        expect(typeof req.query.chapter).toBe('number');
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/verses')
        .query({
          bookId: 'genesis',
          chapter: '10',
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Report Generation Validation', () => {
    it('should validate report generation request', async () => {
      const validator = createValidationMiddleware(validationSchemas.report.generateReport);
      app.post('/report', validator, (req, res) => res.json({ success: true }));

      const validReport = {
        bookId: 'matthew',
        chapter: 5,
        verses: '1-11',
        analysisTypes: ['theological', 'historical'],
        denomination: 'protestant',
        includeOriginalLanguages: true,
        depth: 'comprehensive',
      };

      const response = await request(app)
        .post('/report')
        .send(validReport);

      expect(response.status).toBe(200);
    });

    it('should require at least one analysis type', async () => {
      const validator = createValidationMiddleware(validationSchemas.report.generateReport);
      app.post('/report', validator, (req, res) => res.json({ success: true }));

      const noAnalysisTypes = {
        bookId: 'matthew',
        chapter: 5,
        verses: '1-11',
        analysisTypes: [],
      };

      const response = await request(app)
        .post('/report')
        .send(noAnalysisTypes);

      expect(response.status).toBe(400);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          field: 'analysisTypes',
        })
      );
    });

    it('should validate denomination enum', async () => {
      const validator = createValidationMiddleware(validationSchemas.report.generateReport);
      app.post('/report', validator, (req, res) => res.json({ success: true }));

      const invalidDenomination = {
        bookId: 'matthew',
        chapter: 5,
        verses: '1-11',
        analysisTypes: ['theological'],
        denomination: 'invalid-denomination',
      };

      const response = await request(app)
        .post('/report')
        .send(invalidDenomination);

      expect(response.status).toBe(400);
    });
  });

  describe('Pagination Validation', () => {
    it('should apply default pagination values', async () => {
      const validator = createValidationMiddleware(validationSchemas.bible.searchQuery);
      app.get('/search', validator, (req, res) => {
        res.json({
          page: req.query.page,
          limit: req.query.limit,
        });
      });

      const response = await request(app)
        .get('/search')
        .query({ query: 'love' });

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });

    it('should enforce max limit', async () => {
      const validator = createValidationMiddleware(validationSchemas.bible.searchQuery);
      app.get('/search', validator, (req, res) => res.json({ success: true }));

      const response = await request(app)
        .get('/search')
        .query({
          query: 'faith',
          limit: '200',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('UUID Validation', () => {
    it('should validate UUID format', async () => {
      const validator = createValidationMiddleware(validationSchemas.report.reportId);
      app.post('/report', validator, (req, res) => res.json({ success: true }));

      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const response = await request(app)
        .post('/report')
        .send({ reportId: validUUID });

      expect(response.status).toBe(200);
    });

    it('should reject invalid UUID', async () => {
      const validator = createValidationMiddleware(validationSchemas.report.reportId);
      app.post('/report', validator, (req, res) => res.json({ success: true }));

      const response = await request(app)
        .post('/report')
        .send({ reportId: 'not-a-uuid' });

      expect(response.status).toBe(400);
    });
  });
});