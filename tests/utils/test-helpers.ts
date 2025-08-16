import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export class TestHelpers {
  // Request/Response helpers
  static createMockRequest(overrides = {}) {
    return {
      body: {},
      query: {},
      params: {},
      headers: {},
      user: null,
      get: jest.fn((header: string) => ''),
      ...overrides
    };
  }

  static createMockResponse(): Response {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      locals: {}
    };
    return res;
  }

  static createMockNext() {
    return jest.fn();
  }

  // Authentication helpers
  static async generateAuthToken(payload: any) {
    return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
  }

  static async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  static async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  // Database helpers
  static async cleanDatabase(prisma: PrismaClient) {
    const tables = [
      'Favorite',
      'History', 
      'Report',
      'User',
      'Verse',
      'Book',
      'SymbolPattern',
      'CrossReference',
      'CacheEntry'
    ];
    
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (error) {
        // Table might not exist in test DB, continue
        console.warn(`Could not truncate table ${table}:`, error);
      }
    }
  }

  static async seedDatabase(prisma: PrismaClient, data: any) {
    // Seed books first (required for other relations)
    if (data.books) {
      for (const book of data.books) {
        await prisma.book.create({ data: book });
      }
    }

    // Seed users
    if (data.users) {
      for (const user of data.users) {
        await prisma.user.create({ data: user });
      }
    }

    // Seed symbol patterns
    if (data.symbolPatterns) {
      for (const symbol of data.symbolPatterns) {
        await prisma.symbolPattern.create({ data: symbol });
      }
    }

    // Seed reports (analyses)
    if (data.reports) {
      for (const report of data.reports) {
        await prisma.report.create({ data: report });
      }
    }
  }

  // Assertion helpers
  static expectApiSuccess(response: any, expectedData?: any) {
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  static expectApiError(response: any, expectedError?: { message?: string; code?: number }) {
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    if (expectedError?.message) {
      expect(response.body.error.message).toContain(expectedError.message);
    }
    if (expectedError?.code) {
      expect(response.status).toBe(expectedError.code);
    }
  }

  // Wait helpers
  static async waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timeout waiting for condition');
  }

  static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock service helpers
  static createMockService(methods: string[]) {
    const mock: any = {};
    methods.forEach(method => {
      mock[method] = jest.fn();
    });
    return mock;
  }

  // Error simulation
  static simulateNetworkError() {
    return new Error('Network error');
  }

  static simulateDatabaseError() {
    return new Error('Database connection failed');
  }

  static simulateValidationError(field: string) {
    return new Error(`Validation failed for field: ${field}`);
  }

  // Performance helpers
  static async measureExecutionTime(fn: () => Promise<any>) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  }

  // Cache helpers
  static createMockCache() {
    const cache = new Map();
    return {
      get: jest.fn((key: string) => cache.get(key)),
      set: jest.fn((key: string, value: any, ttl?: number) => {
        cache.set(key, value);
        if (ttl) {
          setTimeout(() => cache.delete(key), ttl * 1000);
        }
      }),
      delete: jest.fn((key: string) => cache.delete(key)),
      clear: jest.fn(() => cache.clear()),
      has: jest.fn((key: string) => cache.has(key))
    };
  }

  // Snapshot testing helpers
  static sanitizeSnapshot(data: any) {
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove dynamic fields
    const dynamicFields = ['id', 'createdAt', 'updatedAt', 'timestamp'];
    
    function removeDynamicFields(obj: any) {
      if (!obj || typeof obj !== 'object') return;
      
      for (const field of dynamicFields) {
        if (field in obj) {
          obj[field] = `[${field}]`;
        }
      }
      
      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          value.forEach(removeDynamicFields);
        } else if (typeof value === 'object') {
          removeDynamicFields(value);
        }
      }
    }
    
    removeDynamicFields(sanitized);
    return sanitized;
  }
}