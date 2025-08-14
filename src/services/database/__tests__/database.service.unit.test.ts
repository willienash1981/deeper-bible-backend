/**
 * Unit tests for DatabaseService using mocked Prisma client
 */

import { DatabaseService } from '../database.service';
import { Testament, ReportType, ReportStatus } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    book: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    verse: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    report: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    favorite: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    history: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    symbolPattern: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    crossReference: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    cacheEntry: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
    Testament,
    ReportType,
    ReportStatus,
  };
});

import { PrismaClient } from '@prisma/client';

describe('DatabaseService Unit Tests', () => {
  let databaseService: DatabaseService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    databaseService = new DatabaseService();
    mockPrisma = (databaseService as any).prisma;
  });

  describe('Connection Management', () => {
    test('should connect to database', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined);
      
      await databaseService.connect();
      
      expect(mockPrisma.$connect).toHaveBeenCalledTimes(1);
    });

    test('should disconnect from database', async () => {
      mockPrisma.$disconnect.mockResolvedValue(undefined);
      
      await databaseService.disconnect();
      
      expect(mockPrisma.$disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Book Operations', () => {
    test('should get all books', async () => {
      const mockBooks = [
        { id: '1', name: 'Genesis', testament: Testament.OLD, bookOrder: 1, chapterCount: 50 },
        { id: '2', name: 'Exodus', testament: Testament.OLD, bookOrder: 2, chapterCount: 40 },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks as any);

      const books = await databaseService.getBooks();

      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { bookOrder: 'asc' },
      });
      expect(books).toEqual(mockBooks);
    });

    test('should get books by testament', async () => {
      const mockBooks = [
        { id: '1', name: 'Genesis', testament: Testament.OLD, bookOrder: 1 },
      ];

      mockPrisma.book.findMany.mockResolvedValue(mockBooks as any);

      const books = await databaseService.getBooks(Testament.OLD);

      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        where: { testament: Testament.OLD },
        orderBy: { bookOrder: 'asc' },
      });
      expect(books).toEqual(mockBooks);
    });

    test('should get book by name', async () => {
      const mockBook = { id: '1', name: 'Genesis', testament: Testament.OLD };

      mockPrisma.book.findUnique.mockResolvedValue(mockBook as any);

      const book = await databaseService.getBookByName('Genesis');

      expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
        where: { name: 'Genesis' },
      });
      expect(book).toEqual(mockBook);
    });
  });

  describe('Verse Operations', () => {
    test('should get chapter verses', async () => {
      const mockVerses = [
        { id: '1', bookId: 'book1', chapter: 1, verseNumber: 1, text: 'In the beginning...' },
        { id: '2', bookId: 'book1', chapter: 1, verseNumber: 2, text: 'And the earth was...' },
      ];

      mockPrisma.verse.findMany.mockResolvedValue(mockVerses as any);

      const verses = await databaseService.getChapter('book1', 1);

      expect(mockPrisma.verse.findMany).toHaveBeenCalledWith({
        where: { bookId: 'book1', chapter: 1 },
        orderBy: { verseNumber: 'asc' },
      });
      expect(verses).toEqual(mockVerses);
    });

    test('should get verse range', async () => {
      const mockVerses = [
        { id: '1', bookId: 'book1', chapter: 1, verseNumber: 1, text: 'In the beginning...' },
        { id: '2', bookId: 'book1', chapter: 1, verseNumber: 2, text: 'And the earth was...' },
        { id: '3', bookId: 'book1', chapter: 1, verseNumber: 3, text: 'And God said...' },
      ];

      mockPrisma.verse.findMany.mockResolvedValue(mockVerses as any);

      const verses = await databaseService.getVerseRange('book1', 1, 1, 3);

      expect(mockPrisma.verse.findMany).toHaveBeenCalledWith({
        where: {
          bookId: 'book1',
          chapter: 1,
          verseNumber: { gte: 1, lte: 3 },
        },
        orderBy: { verseNumber: 'asc' },
      });
      expect(verses).toEqual(mockVerses);
    });
  });

  describe('User Operations', () => {
    test('should create user', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.create.mockResolvedValue(mockUser as any);

      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const user = await databaseService.createUser(userData);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: userData,
      });
      expect(user).toEqual(mockUser);
    });

    test('should get user by email', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const user = await databaseService.getUserByEmail('test@example.com');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(user).toEqual(mockUser);
    });
  });

  describe('Report Operations', () => {
    test('should create report', async () => {
      const mockReport = {
        id: 'report1',
        bookId: 'book1',
        chapter: 1,
        verseStart: 1,
        verseEnd: 1,
        reportType: ReportType.DEEPER_ANALYSIS,
        status: ReportStatus.PENDING,
        userId: 'user1',
        createdAt: new Date(),
      };

      mockPrisma.report.create.mockResolvedValue(mockReport as any);

      const reportData = {
        bookId: 'book1',
        chapter: 1,
        verseStart: 1,
        verseEnd: 1,
        reportType: ReportType.DEEPER_ANALYSIS,
        userId: 'user1',
      };

      const report = await databaseService.createReport(reportData);

      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: {
          ...reportData,
          status: ReportStatus.PENDING,
          model: undefined,
          promptVersion: undefined,
        },
        include: {
          book: true,
          user: true,
        },
      });
      expect(report).toEqual(mockReport);
    });

    test('should update report status', async () => {
      const mockUpdatedReport = {
        id: 'report1',
        status: ReportStatus.COMPLETED,
        completedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockPrisma.report.update.mockResolvedValue(mockUpdatedReport as any);

      const report = await databaseService.updateReportStatus('report1', ReportStatus.COMPLETED);

      expect(mockPrisma.report.update).toHaveBeenCalledWith({
        where: { id: 'report1' },
        data: {
          status: ReportStatus.COMPLETED,
          updatedAt: expect.any(Date),
          completedAt: expect.any(Date),
        },
      });
      expect(report).toEqual(mockUpdatedReport);
    });
  });

  describe('Cache Operations', () => {
    test('should set cache entry', async () => {
      mockPrisma.cacheEntry.upsert.mockResolvedValue({} as any);

      const key = 'test-key';
      const value = { test: 'data' };
      const ttl = 3600;

      await databaseService.setCacheEntry(key, value, ttl);

      expect(mockPrisma.cacheEntry.upsert).toHaveBeenCalledWith({
        where: { key },
        update: {
          value,
          ttl,
          expiresAt: expect.any(Date),
        },
        create: {
          key,
          value,
          ttl,
          expiresAt: expect.any(Date),
        },
      });
    });

    test('should get cache entry', async () => {
      const mockCacheEntry = {
        key: 'test-key',
        value: { test: 'data' },
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      mockPrisma.cacheEntry.findUnique.mockResolvedValue(mockCacheEntry as any);

      const value = await databaseService.getCacheEntry('test-key');

      expect(mockPrisma.cacheEntry.findUnique).toHaveBeenCalledWith({
        where: { key: 'test-key' },
      });
      expect(value).toEqual(mockCacheEntry.value);
    });

    test('should return null for expired cache entry', async () => {
      const mockCacheEntry = {
        key: 'test-key',
        value: { test: 'data' },
        expiresAt: new Date(Date.now() - 1000), // 1 second ago (expired)
      };

      mockPrisma.cacheEntry.findUnique.mockResolvedValue(mockCacheEntry as any);
      mockPrisma.cacheEntry.deleteMany.mockResolvedValue({ count: 1 } as any);

      const value = await databaseService.getCacheEntry('test-key');

      expect(mockPrisma.cacheEntry.findUnique).toHaveBeenCalledWith({
        where: { key: 'test-key' },
      });
      expect(mockPrisma.cacheEntry.deleteMany).toHaveBeenCalledWith({
        where: { key: 'test-key' },
      });
      expect(value).toBeNull();
    });
  });

  describe('Transaction Operations', () => {
    test('should execute transaction', async () => {
      const mockResult = { success: true };
      const mockCallback = jest.fn().mockResolvedValue(mockResult);

      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));

      const result = await databaseService.executeTransaction(mockCallback);

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(mockPrisma);
      expect(result).toEqual(mockResult);
    });
  });
});