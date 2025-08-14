import { DatabaseService } from '../database.service';
import { Testament, ReportType, ReportStatus } from '@prisma/client';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeAll(async () => {
    databaseService = new DatabaseService();
    await databaseService.connect();
  });

  afterAll(async () => {
    await databaseService.disconnect();
  });

  describe('Book Operations', () => {
    test('should get all books', async () => {
      const books = await databaseService.getBooks();
      
      expect(books).toBeDefined();
      expect(books.length).toBe(66); // Total number of Bible books
      expect(books[0].bookOrder).toBe(1);
      expect(books[books.length - 1].bookOrder).toBe(66);
    });

    test('should get books by testament', async () => {
      const oldTestamentBooks = await databaseService.getBooks(Testament.OLD);
      const newTestamentBooks = await databaseService.getBooks(Testament.NEW);
      
      expect(oldTestamentBooks.length).toBe(39);
      expect(newTestamentBooks.length).toBe(27);
      expect(oldTestamentBooks.every(book => book.testament === Testament.OLD)).toBe(true);
      expect(newTestamentBooks.every(book => book.testament === Testament.NEW)).toBe(true);
    });

    test('should get book by name', async () => {
      const genesis = await databaseService.getBookByName('Genesis');
      
      expect(genesis).toBeDefined();
      expect(genesis!.name).toBe('Genesis');
      expect(genesis!.bookNumber).toBe(1);
      expect(genesis!.testament).toBe(Testament.OLD);
    });

    test('should get book by number', async () => {
      const matthew = await databaseService.getBookByNumber(40);
      
      expect(matthew).toBeDefined();
      expect(matthew!.name).toBe('Matthew');
      expect(matthew!.testament).toBe(Testament.NEW);
    });

    test('should return null for non-existent book', async () => {
      const nonExistentBook = await databaseService.getBookByName('NonExistent');
      
      expect(nonExistentBook).toBeNull();
    });
  });

  describe('Verse Operations', () => {
    let genesisBookId: string;

    beforeAll(async () => {
      const genesis = await databaseService.getBookByName('Genesis');
      genesisBookId = genesis!.id;
    });

    test('should get chapter verses', async () => {
      const chapter1Verses = await databaseService.getChapter(genesisBookId, 1);
      
      expect(chapter1Verses).toBeDefined();
      expect(chapter1Verses.length).toBeGreaterThan(0);
      expect(chapter1Verses[0].chapter).toBe(1);
      expect(chapter1Verses[0].verseNumber).toBe(1);
    });

    test('should get verse range', async () => {
      const verseRange = await databaseService.getVerseRange(genesisBookId, 1, 1, 3);
      
      expect(verseRange).toBeDefined();
      expect(verseRange.length).toBe(3);
      expect(verseRange[0].verseNumber).toBe(1);
      expect(verseRange[2].verseNumber).toBe(3);
    });

    test('should get specific verse', async () => {
      const verse = await databaseService.getVerse(genesisBookId, 1, 1);
      
      expect(verse).toBeDefined();
      expect(verse!.chapter).toBe(1);
      expect(verse!.verseNumber).toBe(1);
      expect(verse!.text).toContain('In the beginning');
    });

    test('should search verses by keywords', async () => {
      const verses = await databaseService.searchVersesByKeywords(['God', 'created']);
      
      expect(verses).toBeDefined();
      expect(verses.length).toBeGreaterThan(0);
      expect(verses.some(v => v.keywords.includes('God'))).toBe(true);
    });
  });

  describe('User Operations', () => {
    test('should create user', async () => {
      const userData = {
        email: 'testuser@example.com',
        name: 'Test User',
      };

      const user = await databaseService.createUser(userData);
      
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.createdAt).toBeDefined();
    });

    test('should get user by email', async () => {
      const user = await databaseService.getUserByEmail('test@deeperbible.com');
      
      expect(user).toBeDefined();
      expect(user!.email).toBe('test@deeperbible.com');
    });

    test('should get user with relations', async () => {
      const user = await databaseService.getUserByEmail('test@deeperbible.com');
      const userWithRelations = await databaseService.getUserById(user!.id);
      
      expect(userWithRelations).toBeDefined();
      expect(userWithRelations!.reports).toBeDefined();
      expect(userWithRelations!.favorites).toBeDefined();
      expect(userWithRelations!.history).toBeDefined();
    });
  });

  describe('Report Operations', () => {
    let testUserId: string;
    let genesisBookId: string;

    beforeAll(async () => {
      const user = await databaseService.getUserByEmail('test@deeperbible.com');
      testUserId = user!.id;
      
      const genesis = await databaseService.getBookByName('Genesis');
      genesisBookId = genesis!.id;
    });

    test('should create report', async () => {
      const reportData = {
        bookId: genesisBookId,
        chapter: 1,
        verseStart: 1,
        verseEnd: 1,
        reportType: ReportType.DEEPER_ANALYSIS,
        userId: testUserId,
        model: 'gpt-4',
        promptVersion: 'v1.0',
      };

      const report = await databaseService.createReport(reportData);
      
      expect(report).toBeDefined();
      expect(report.status).toBe(ReportStatus.PENDING);
      expect(report.bookId).toBe(genesisBookId);
      expect(report.chapter).toBe(1);
      expect(report.reportType).toBe(ReportType.DEEPER_ANALYSIS);
    });

    test('should update report status', async () => {
      const reportData = {
        bookId: genesisBookId,
        chapter: 1,
        verseStart: 2,
        verseEnd: 2,
        reportType: ReportType.HISTORICAL_CONTEXT,
        userId: testUserId,
      };

      const report = await databaseService.createReport(reportData);
      const updatedReport = await databaseService.updateReportStatus(report.id, ReportStatus.COMPLETED);
      
      expect(updatedReport.status).toBe(ReportStatus.COMPLETED);
      expect(updatedReport.completedAt).toBeDefined();
    });

    test('should get cached report', async () => {
      // First, check if there's already a completed report
      const cachedReport = await databaseService.getCachedReport(
        genesisBookId,
        1,
        1,
        3,
        ReportType.DEEPER_ANALYSIS
      );
      
      if (cachedReport) {
        expect(cachedReport.status).toBe(ReportStatus.COMPLETED);
      }
    });

    test('should get recent reports', async () => {
      const recentReports = await databaseService.getRecentReports(5, testUserId);
      
      expect(recentReports).toBeDefined();
      expect(Array.isArray(recentReports)).toBe(true);
      expect(recentReports.every(r => r.userId === testUserId)).toBe(true);
    });

    test('should get report statistics', async () => {
      const stats = await databaseService.getReportStats(testUserId);
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalReports).toBe('number');
      expect(typeof stats.completedReports).toBe('number');
      expect(typeof stats.failedReports).toBe('number');
      expect(typeof stats.totalCost).toBe('number');
      expect(typeof stats.totalTokens).toBe('number');
    });
  });

  describe('Favorite Operations', () => {
    let testUserId: string;
    let johnBookId: string;

    beforeAll(async () => {
      const user = await databaseService.getUserByEmail('test@deeperbible.com');
      testUserId = user!.id;
      
      const john = await databaseService.getBookByName('John');
      johnBookId = john!.id;
    });

    test('should create favorite', async () => {
      const favoriteData = {
        userId: testUserId,
        bookId: johnBookId,
        chapter: 3,
        verse: 16,
        notes: 'God so loved the world',
      };

      const favorite = await databaseService.createFavorite(favoriteData);
      
      expect(favorite).toBeDefined();
      expect(favorite.userId).toBe(testUserId);
      expect(favorite.bookId).toBe(johnBookId);
      expect(favorite.chapter).toBe(3);
      expect(favorite.verse).toBe(16);
    });

    test('should get user favorites', async () => {
      const favorites = await databaseService.getFavorites(testUserId);
      
      expect(favorites).toBeDefined();
      expect(Array.isArray(favorites)).toBe(true);
      expect(favorites.every(f => f.userId === testUserId)).toBe(true);
    });
  });

  describe('History Operations', () => {
    let testUserId: string;

    beforeAll(async () => {
      const user = await databaseService.getUserByEmail('test@deeperbible.com');
      testUserId = user!.id;
    });

    test('should create history entry', async () => {
      const historyData = {
        userId: testUserId,
        action: 'viewed',
        bookName: 'Matthew',
        chapter: 1,
        verse: 1,
        metadata: { timestamp: new Date().toISOString() },
      };

      const history = await databaseService.createHistory(historyData);
      
      expect(history).toBeDefined();
      expect(history.userId).toBe(testUserId);
      expect(history.action).toBe('viewed');
      expect(history.bookName).toBe('Matthew');
    });

    test('should get user history', async () => {
      const history = await databaseService.getUserHistory(testUserId, 10);
      
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.every(h => h.userId === testUserId)).toBe(true);
    });
  });

  describe('Symbol Pattern Operations', () => {
    test('should get all symbol patterns', async () => {
      const patterns = await databaseService.getSymbolPatterns();
      
      expect(patterns).toBeDefined();
      expect(patterns.length).toBeGreaterThan(0);
    });

    test('should get symbol patterns by category', async () => {
      const numberPatterns = await databaseService.getSymbolPatterns('number');
      
      expect(numberPatterns).toBeDefined();
      expect(numberPatterns.every(p => p.category === 'number')).toBe(true);
    });

    test('should get specific symbol pattern', async () => {
      const sevenPattern = await databaseService.getSymbolPattern('seven');
      
      expect(sevenPattern).toBeDefined();
      expect(sevenPattern!.symbol).toBe('seven');
      expect(sevenPattern!.category).toBe('number');
    });
  });

  describe('Cross Reference Operations', () => {
    test('should get cross references for a verse', async () => {
      const crossRefs = await databaseService.getCrossReferences('Genesis', 1, 1);
      
      expect(crossRefs).toBeDefined();
      expect(Array.isArray(crossRefs)).toBe(true);
    });
  });

  describe('Cache Operations', () => {
    const testKey = 'test-cache-key';
    const testValue = { message: 'Hello World', timestamp: new Date() };
    const ttl = 3600; // 1 hour

    test('should set and get cache entry', async () => {
      await databaseService.setCacheEntry(testKey, testValue, ttl);
      const cachedValue = await databaseService.getCacheEntry(testKey);
      
      expect(cachedValue).toEqual(testValue);
    });

    test('should return null for non-existent cache entry', async () => {
      const nonExistent = await databaseService.getCacheEntry('non-existent-key');
      
      expect(nonExistent).toBeNull();
    });

    test('should handle expired cache entries', async () => {
      const shortTtl = 1; // 1 second
      const shortLivedKey = 'short-lived-key';
      
      await databaseService.setCacheEntry(shortLivedKey, testValue, shortTtl);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const expiredValue = await databaseService.getCacheEntry(shortLivedKey);
      expect(expiredValue).toBeNull();
    });

    test('should clear expired cache entries', async () => {
      const result = await databaseService.clearExpiredCache();
      
      expect(result).toBeDefined();
      expect(typeof result.count).toBe('number');
    });
  });

  describe('Statistics Operations', () => {
    test('should get database statistics', async () => {
      const stats = await databaseService.getDatabaseStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.books).toBe('number');
      expect(typeof stats.verses).toBe('number');
      expect(typeof stats.reports).toBe('number');
      expect(typeof stats.users).toBe('number');
      expect(typeof stats.favorites).toBe('number');
      expect(typeof stats.symbols).toBe('number');
      expect(typeof stats.crossReferences).toBe('number');
      
      expect(stats.books).toBe(66); // Should have all 66 Bible books
    });
  });

  describe('Transaction Operations', () => {
    test('should execute transaction successfully', async () => {
      const result = await databaseService.executeTransaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: 'transaction-test@example.com',
            name: 'Transaction Test User',
          },
        });
        
        const history = await tx.history.create({
          data: {
            userId: user.id,
            action: 'created',
            bookName: 'Genesis',
            metadata: { test: true },
          },
        });
        
        return { user, history };
      });
      
      expect(result.user).toBeDefined();
      expect(result.history).toBeDefined();
      expect(result.history.userId).toBe(result.user.id);
    });

    test('should rollback transaction on error', async () => {
      try {
        await databaseService.executeTransaction(async (tx) => {
          await tx.user.create({
            data: {
              email: 'rollback-test@example.com',
              name: 'Rollback Test User',
            },
          });
          
          // Force an error
          throw new Error('Transaction should rollback');
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
      
      // Verify user was not created
      const user = await databaseService.getUserByEmail('rollback-test@example.com');
      expect(user).toBeNull();
    });
  });
});