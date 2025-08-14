import express from 'express';
import request from 'supertest';
import { ZodError } from 'zod';
import {
  errorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  asyncHandler,
} from '../../src/api/middleware/errorHandler';

describe('Error Handler Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Silence console errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Custom Error Classes', () => {
    it('should handle ValidationError', async () => {
      app.get('/test', (req, res, next) => {
        next(new ValidationError('Invalid input', { field: 'email' }));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Invalid input');
      expect(response.body.error.details).toEqual({ field: 'email' });
    });

    it('should handle AuthenticationError', async () => {
      app.get('/test', (req, res, next) => {
        next(new AuthenticationError());
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should handle AuthorizationError', async () => {
      app.get('/test', (req, res, next) => {
        next(new AuthorizationError('Admin access required'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('AUTHORIZATION_ERROR');
      expect(response.body.error.message).toBe('Admin access required');
    });

    it('should handle NotFoundError', async () => {
      app.get('/test', (req, res, next) => {
        next(new NotFoundError('User'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('User not found');
    });

    it('should handle ConflictError', async () => {
      app.get('/test', (req, res, next) => {
        next(new ConflictError('Email already exists'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT_ERROR');
    });
  });

  describe('Third-party Error Handling', () => {
    it('should handle Zod validation errors', async () => {
      app.get('/test', (req, res, next) => {
        const error = new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'number',
            path: ['email'],
            message: 'Expected string, received number',
          },
        ]);
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(400);
      expect(response.body.error.details.errors).toContainEqual(
        expect.objectContaining({
          field: 'email',
          message: 'Expected string, received number',
        })
      );
    });

    it('should handle JWT errors', async () => {
      const { JsonWebTokenError } = require('jsonwebtoken');
      app.get('/test', (req, res, next) => {
        const error = new JsonWebTokenError('jwt malformed');
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid token');
    });

    it('should handle MongoDB duplicate key errors', async () => {
      app.get('/test', (req, res, next) => {
        const error: any = new Error('Duplicate key error');
        error.name = 'MongoServerError';
        error.code = 11000;
        error.keyPattern = { email: 1 };
        next(error);
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('Duplicate value for field: email');
    });
  });

  describe('Async Handler', () => {
    it('should catch async errors', async () => {
      app.get('/test', asyncHandler(async (req: any, res: any) => {
        throw new ValidationError('Async error');
      }));
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Async error');
    });

    it('should handle rejected promises', async () => {
      app.get('/test', asyncHandler(async (req: any, res: any) => {
        await Promise.reject(new AuthenticationError('Token invalid'));
      }));
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Token invalid');
    });
  });

  describe('Error Response Format', () => {
    it('should include request metadata', async () => {
      app.get('/test-path', (req, res, next) => {
        (req as any).id = 'test-request-id';
        next(new AppError('Test error', 500));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test-path');
      
      expect(response.body.error.path).toBe('/test-path');
      expect(response.body.error.method).toBe('GET');
      expect(response.body.error.requestId).toBe('test-request-id');
      expect(response.body.error.timestamp).toBeDefined();
    });

    it('should exclude stack trace in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test', (req, res, next) => {
        next(new Error('Production error'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.body.error.stack).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development for non-operational errors', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app.get('/test', (req, res, next) => {
        next(new AppError('Non-operational error', 500, false));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.body.error.stack).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle unknown errors gracefully', async () => {
      app.get('/test', (req, res, next) => {
        next(new Error('Unknown error'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.status).toBe(500);
      expect(response.body.error.statusCode).toBe(500);
    });

    it('should mask error messages in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test', (req, res, next) => {
        next(new Error('Sensitive database connection error'));
      });
      app.use(errorHandler);

      const response = await request(app).get('/test');
      
      expect(response.body.error.message).toBe('An unexpected error occurred');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});