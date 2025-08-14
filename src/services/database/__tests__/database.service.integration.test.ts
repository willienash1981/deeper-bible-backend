/**
 * Integration tests for DatabaseService
 * These tests run against a real database instance
 * Run with: npm run test:integration
 */

import { DatabaseService } from '../database.service';
import { Testament, ReportType } from '@prisma/client';

// Only run integration tests if we have a test database
const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL || process.env.NODE_ENV === 'test');

describe('DatabaseService Integration Tests', () => {
  let databaseService: DatabaseService;

  beforeAll(async () => {
    if (!hasTestDatabase) {
      console.log('Skipping integration tests - no test database configured');
      return;
    }
    
    // Use test database URL if available
    if (process.env.TEST_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    }
    
    databaseService = new DatabaseService();
    await databaseService.connect();
  });

  afterAll(async () => {
    if (hasTestDatabase && databaseService) {
      await databaseService.disconnect();
    }
  });

  // Skip all tests if no test database
  const testIf = (condition: boolean) => condition ? test : test.skip;

  describe('Basic Database Operations', () => {
    testIf(hasTestDatabase)('should connect to database and get basic stats', async () => {
      const stats = await databaseService.getDatabaseStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.books).toBe('number');
      expect(typeof stats.verses).toBe('number');
      expect(typeof stats.reports).toBe('number');
      expect(typeof stats.users).toBe('number');
      
      // Should have all 66 Bible books if seeded
      if (stats.books > 0) {
        expect(stats.books).toBe(66);
      }
    });

    testIf(hasTestDatabase)('should get books from database', async () => {
      const books = await databaseService.getBooks();
      
      expect(books).toBeDefined();
      expect(Array.isArray(books)).toBe(true);
      
      if (books.length > 0) {
        expect(books[0]).toHaveProperty('name');
        expect(books[0]).toHaveProperty('testament');
        expect(books[0]).toHaveProperty('chapterCount');
        expect(books[0]).toHaveProperty('bookOrder');
      }
    });

    testIf(hasTestDatabase)('should filter books by testament', async () => {
      const oldTestamentBooks = await databaseService.getBooks(Testament.OLD);
      const newTestamentBooks = await databaseService.getBooks(Testament.NEW);
      
      if (oldTestamentBooks.length > 0) {
        expect(oldTestamentBooks.every(book => book.testament === Testament.OLD)).toBe(true);
      }
      
      if (newTestamentBooks.length > 0) {
        expect(newTestamentBooks.every(book => book.testament === Testament.NEW)).toBe(true);
      }
    });

    testIf(hasTestDatabase)('should create and retrieve users', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        name: 'Integration Test User',
      };

      const user = await databaseService.createUser(userData);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.id).toBeDefined();
      
      // Retrieve by email
      const retrievedUser = await databaseService.getUserByEmail(userData.email);
      expect(retrievedUser).toBeDefined();
      expect(retrievedUser!.id).toBe(user.id);
    });
  });

  describe('Advanced Database Operations', () => {
    let testUserId: string;
    let genesisBookId: string;

    beforeAll(async () => {
      if (!hasTestDatabase) return;
      
      // Create test user
      const user = await databaseService.createUser({
        email: `integration-test-${Date.now()}@example.com`,
        name: 'Integration Test User',
      });
      testUserId = user.id;

      // Get Genesis book
      const books = await databaseService.getBooks();
      const genesis = books.find(b => b.name === 'Genesis');
      if (genesis) {
        genesisBookId = genesis.id;
      }
    });

    testIf(hasTestDatabase)('should handle cache operations', async () => {
      const cacheKey = `test-cache-${Date.now()}`;
      const cacheValue = { message: 'Hello Integration Test', timestamp: new Date() };
      const ttl = 3600; // 1 hour

      // Set cache
      await databaseService.setCacheEntry(cacheKey, cacheValue, ttl);

      // Get cache
      const cachedValue = await databaseService.getCacheEntry(cacheKey);
      expect(cachedValue).toEqual(cacheValue);

      // Test non-existent cache
      const nonExistent = await databaseService.getCacheEntry('non-existent-key');
      expect(nonExistent).toBeNull();
    });

    testIf(hasTestDatabase)('should handle symbol patterns', async () => {
      const patterns = await databaseService.getSymbolPatterns();
      
      if (patterns.length > 0) {
        expect(patterns[0]).toHaveProperty('symbol');
        expect(patterns[0]).toHaveProperty('category');
        expect(patterns[0]).toHaveProperty('meaning');
        expect(patterns[0]).toHaveProperty('occurrences');
      }

      // Test filtering by category
      const numberPatterns = await databaseService.getSymbolPatterns('number');
      if (numberPatterns.length > 0) {
        expect(numberPatterns.every(p => p.category === 'number')).toBe(true);
      }
    });

    testIf(hasTestDatabase)('should handle transactions', async () => {
      if (!testUserId) {
        console.log('Skipping transaction test - no test user');
        return;
      }

      const result = await databaseService.executeTransaction(async (tx) => {
        const history = await tx.history.create({
          data: {
            userId: testUserId,
            action: 'integration-test',
            bookName: 'Genesis',
            chapter: 1,
            metadata: { test: true, timestamp: new Date() },
          },
        });

        return { history };
      });

      expect(result.history).toBeDefined();
      expect(result.history.userId).toBe(testUserId);
      expect(result.history.action).toBe('integration-test');
    });

    testIf(hasTestDatabase)('should clean up expired cache', async () => {
      // Create expired cache entry
      const expiredKey = `expired-${Date.now()}`;
      await databaseService.setCacheEntry(expiredKey, { data: 'expired' }, -1); // Already expired

      // Clear expired cache
      const result = await databaseService.clearExpiredCache();
      expect(result).toBeDefined();
      expect(typeof result.count).toBe('number');

      // Verify expired entry is gone
      const expiredValue = await databaseService.getCacheEntry(expiredKey);
      expect(expiredValue).toBeNull();
    });
  });

  describe('Error Handling', () => {
    testIf(hasTestDatabase)('should handle database errors gracefully', async () => {
      // Try to create user with duplicate email
      const userData = {
        email: 'duplicate@example.com',
        name: 'First User',
      };

      await databaseService.createUser(userData);

      // This should fail due to unique constraint
      await expect(
        databaseService.createUser(userData)
      ).rejects.toThrow();
    });

    testIf(hasTestDatabase)('should handle non-existent records', async () => {
      const nonExistentUser = await databaseService.getUserById('non-existent-id');
      expect(nonExistentUser).toBeNull();

      const nonExistentBook = await databaseService.getBookByName('NonExistentBook');
      expect(nonExistentBook).toBeNull();
    });
  });
});