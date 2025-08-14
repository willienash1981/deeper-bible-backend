/**
 * Tests for Bible Data Provider Base Class and Interfaces
 * @module tests/services/bible/BibleDataProvider.test
 */

import { jest } from '@jest/globals';
import { 
  BaseBibleDataProvider 
} from '../../../src/services/bible/BibleDataProvider.base';
import { 
  IBibleDataProvider,
  ICacheableBibleProvider,
  IOfflineBibleProvider,
  BibleProviderType 
} from '../../../src/services/bible/BibleDataProvider.interface';
import {
  BibleTranslation,
  BibleBook,
  BibleChapter,
  BibleVerse,
  BiblePassage,
  BibleSearchParams,
  BibleSearchResult,
  BibleApiResponse,
  BibleProviderConfig,
  ParallelBible
} from '../../../src/types/bible.types';

/**
 * Concrete implementation of BaseBibleDataProvider for testing
 */
class TestBibleProvider extends BaseBibleDataProvider {
  constructor(config?: BibleProviderConfig) {
    super(config);
    this.name = 'TestBibleProvider';
    this.version = '1.0.0-test';
  }

  async initialize(config?: BibleProviderConfig): Promise<void> {
    if (config) {
      this.config = this.mergeConfig(config);
    }
    this.initialized = true;
  }

  async getTranslations(): Promise<BibleApiResponse<BibleTranslation[]>> {
    this.checkInitialized();
    const mockTranslations: BibleTranslation[] = [
      {
        id: 'KJV',
        name: 'King James Version',
        abbreviation: 'KJV',
        language: 'English',
        languageCode: 'en',
        textDirection: 'ltr',
        availableFormats: ['text'],
        year: 1611
      }
    ];
    return this.createSuccessResponse(mockTranslations);
  }

  async getTranslation(translationId: string): Promise<BibleApiResponse<BibleTranslation>> {
    this.checkInitialized();
    this.validateTranslationId(translationId);
    const mockTranslation: BibleTranslation = {
      id: translationId,
      name: 'Test Translation',
      abbreviation: translationId,
      language: 'English',
      languageCode: 'en',
      textDirection: 'ltr',
      availableFormats: ['text']
    };
    return this.createSuccessResponse(mockTranslation);
  }

  async getBooks(translationId: string): Promise<BibleApiResponse<BibleBook[]>> {
    this.checkInitialized();
    this.validateTranslationId(translationId);
    const mockBooks: BibleBook[] = [
      {
        id: 'GEN',
        bookId: 'GEN',
        name: 'Genesis',
        nameLong: 'The First Book of Moses',
        abbreviation: 'Gen',
        testament: 'OT',
        genre: 'Law',
        chapters: 50,
        versesCount: 1533
      }
    ];
    return this.createSuccessResponse(mockBooks);
  }

  async getBook(translationId: string, bookId: string): Promise<BibleApiResponse<BibleBook>> {
    this.checkInitialized();
    this.validateTranslationId(translationId);
    this.validateBookId(bookId);
    const mockBook: BibleBook = {
      id: bookId,
      bookId: bookId,
      name: 'Test Book',
      nameLong: 'Test Book Long Name',
      abbreviation: bookId,
      testament: 'NT',
      genre: 'Gospel',
      chapters: 10,
      versesCount: 100
    };
    return this.createSuccessResponse(mockBook);
  }

  async getChapters(translationId: string, bookId: string): Promise<BibleApiResponse<BibleChapter[]>> {
    this.checkInitialized();
    this.validateTranslationId(translationId);
    this.validateBookId(bookId);
    const mockChapters: BibleChapter[] = [
      {
        id: `${bookId}.1`,
        bookId: bookId,
        chapterNumber: 1,
        reference: `${bookId} 1`,
        verses: [],
        verseCount: 10
      }
    ];
    return this.createSuccessResponse(mockChapters);
  }

  async getChapter(
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): Promise<BibleApiResponse<BibleChapter>> {
    this.checkInitialized();
    this.validateTranslationId(translationId);
    this.validateBookId(bookId);
    this.validateChapterNumber(chapterNumber);
    
    const mockChapter: BibleChapter = {
      id: `${bookId}.${chapterNumber}`,
      bookId: bookId,
      chapterNumber: chapterNumber,
      reference: `${bookId} ${chapterNumber}`,
      verses: [
        {
          id: `${bookId}.${chapterNumber}.1`,
          bookId: bookId,
          chapterId: `${bookId}.${chapterNumber}`,
          verseNumber: 1,
          reference: `${bookId} ${chapterNumber}:1`,
          content: 'Test verse content',
          cleanContent: 'Test verse content'
        }
      ],
      verseCount: 1
    };
    return this.createSuccessResponse(mockChapter);
  }

  async getVerse(
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<BibleApiResponse<BibleVerse>> {
    this.checkInitialized();
    this.validateTranslationId(translationId);
    this.validateBookId(bookId);
    this.validateChapterNumber(chapterNumber);
    this.validateVerseNumber(verseNumber);
    
    const mockVerse: BibleVerse = {
      id: `${bookId}.${chapterNumber}.${verseNumber}`,
      bookId: bookId,
      chapterId: `${bookId}.${chapterNumber}`,
      verseNumber: verseNumber,
      reference: `${bookId} ${chapterNumber}:${verseNumber}`,
      content: 'Test verse content',
      cleanContent: 'Test verse content'
    };
    return this.createSuccessResponse(mockVerse);
  }

  async getPassage(
    translationId: string,
    bookId: string,
    startChapter: number,
    startVerse: number,
    endChapter: number,
    endVerse: number
  ): Promise<BibleApiResponse<BiblePassage>> {
    this.checkInitialized();
    this.validateTranslationId(translationId);
    this.validateBookId(bookId);
    this.validateChapterNumber(startChapter);
    this.validateChapterNumber(endChapter);
    this.validateVerseNumber(startVerse);
    this.validateVerseNumber(endVerse);
    
    const mockPassage: BiblePassage = {
      translationId,
      bookId,
      startChapter,
      startVerse,
      endChapter,
      endVerse,
      reference: `${bookId} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`,
      verses: [
        {
          id: `${bookId}.${startChapter}.${startVerse}`,
          bookId: bookId,
          chapterId: `${bookId}.${startChapter}`,
          verseNumber: startVerse,
          reference: `${bookId} ${startChapter}:${startVerse}`,
          content: 'Test passage content',
          cleanContent: 'Test passage content'
        }
      ]
    };
    return this.createSuccessResponse(mockPassage);
  }

  async search(params: BibleSearchParams): Promise<BibleApiResponse<BibleSearchResult[]>> {
    this.checkInitialized();
    const mockResults: BibleSearchResult[] = [
      {
        verse: {
          id: 'GEN.1.1',
          bookId: 'GEN',
          chapterId: 'GEN.1',
          verseNumber: 1,
          reference: 'Genesis 1:1',
          content: 'In the beginning God created the heaven and the earth.',
          cleanContent: 'In the beginning God created the heaven and the earth.'
        },
        score: 1.0,
        highlights: ['God created']
      }
    ];
    return this.createSuccessResponse(mockResults);
  }

  async getParallelVerses(
    reference: string,
    translationIds: string[]
  ): Promise<BibleApiResponse<ParallelBible>> {
    this.checkInitialized();
    const mockParallel: ParallelBible = {
      reference,
      translations: translationIds.map(id => ({
        translation: {
          id: id,
          name: `Test ${id}`,
          abbreviation: id,
          language: 'English',
          languageCode: 'en',
          textDirection: 'ltr',
          availableFormats: ['text']
        },
        verses: [
          {
            id: 'GEN.1.1',
            bookId: 'GEN',
            chapterId: 'GEN.1',
            verseNumber: 1,
            reference: 'Genesis 1:1',
            content: `Test verse in ${id}`,
            cleanContent: `Test verse in ${id}`
          }
        ]
      }))
    };
    return this.createSuccessResponse(mockParallel);
  }
}

describe('BaseBibleDataProvider', () => {
  let provider: TestBibleProvider;

  beforeEach(() => {
    provider = new TestBibleProvider();
  });

  afterEach(async () => {
    await provider.destroy();
  });

  describe('constructor', () => {
    test('should initialize with default configuration', () => {
      const newProvider = new TestBibleProvider();
      expect(newProvider.getName()).toBe('TestBibleProvider');
      expect(newProvider.getVersion()).toBe('1.0.0-test');
    });

    test('should merge custom configuration with defaults', () => {
      const customConfig: BibleProviderConfig = {
        timeout: 5000,
        retryAttempts: 5,
        retryDelay: 2000
      };
      const newProvider = new TestBibleProvider(customConfig);
      expect(newProvider['config'].timeout).toBe(5000);
      expect(newProvider['config'].retryAttempts).toBe(5);
      expect(newProvider['config'].retryDelay).toBe(2000);
    });

    test('should use default values for unspecified config options', () => {
      const customConfig: BibleProviderConfig = {
        timeout: 5000
      };
      const newProvider = new TestBibleProvider(customConfig);
      expect(newProvider['config'].timeout).toBe(5000);
      expect(newProvider['config'].retryAttempts).toBe(3); // default
      expect(newProvider['config'].cacheEnabled).toBe(true); // default
    });
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      await provider.initialize();
      expect(provider['initialized']).toBe(true);
    });

    test('should throw error when accessing methods before initialization', async () => {
      await expect(provider.getTranslations()).rejects.toThrow('TestBibleProvider is not initialized');
    });
  });

  describe('validation methods', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('validateTranslationId should throw error for empty string', () => {
      expect(() => provider['validateTranslationId']('')).toThrow('Translation ID is required');
      expect(() => provider['validateTranslationId']('   ')).toThrow('Translation ID is required');
    });

    test('validateBookId should throw error for empty string', () => {
      expect(() => provider['validateBookId']('')).toThrow('Book ID is required');
      expect(() => provider['validateBookId']('   ')).toThrow('Book ID is required');
    });

    test('validateChapterNumber should validate chapter numbers', () => {
      expect(() => provider['validateChapterNumber'](0)).toThrow('Invalid chapter number');
      expect(() => provider['validateChapterNumber'](-1)).toThrow('Invalid chapter number');
      expect(() => provider['validateChapterNumber'](1.5)).toThrow('Invalid chapter number');
      expect(() => provider['validateChapterNumber'](1)).not.toThrow();
    });

    test('validateVerseNumber should validate verse numbers', () => {
      expect(() => provider['validateVerseNumber'](0)).toThrow('Invalid verse number');
      expect(() => provider['validateVerseNumber'](-1)).toThrow('Invalid verse number');
      expect(() => provider['validateVerseNumber'](1.5)).toThrow('Invalid verse number');
      expect(() => provider['validateVerseNumber'](1)).not.toThrow();
    });
  });

  describe('helper methods', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('buildCacheKey should create cache keys from parts', () => {
      const key = provider['buildCacheKey']('translation', 'KJV', 'book', 'GEN');
      expect(key).toBe('translation:KJV:book:GEN');
    });

    test('getCacheTTL should return correct TTL values', () => {
      expect(provider['getCacheTTL']('books')).toBe(604800000); // 7 days
      expect(provider['getCacheTTL']('chapters')).toBe(86400000); // 1 day
      expect(provider['getCacheTTL']('verses')).toBe(86400000); // 1 day
      expect(provider['getCacheTTL']('search')).toBe(3600000); // 1 hour
    });

    test('formatReference should format references correctly', () => {
      expect(provider['formatReference']('Genesis', 1)).toBe('Genesis 1');
      expect(provider['formatReference']('Genesis', 1, 1)).toBe('Genesis 1:1');
      expect(provider['formatReference']('Genesis', 1, 1, 3)).toBe('Genesis 1:1-3');
      expect(provider['formatReference']('Genesis', 1, 1, 1)).toBe('Genesis 1:1');
    });

    test('parseReference should parse references correctly', () => {
      expect(provider['parseReference']('Genesis 1')).toEqual({
        book: 'Genesis',
        chapter: 1,
        startVerse: undefined,
        endVerse: undefined
      });

      expect(provider['parseReference']('Genesis 1:1')).toEqual({
        book: 'Genesis',
        chapter: 1,
        startVerse: 1,
        endVerse: undefined
      });

      expect(provider['parseReference']('Genesis 1:1-3')).toEqual({
        book: 'Genesis',
        chapter: 1,
        startVerse: 1,
        endVerse: 3
      });

      expect(() => provider['parseReference']('Invalid')).toThrow('Invalid reference format');
    });
  });

  describe('response creation', () => {
    test('createSuccessResponse should create success responses', () => {
      const data = { test: 'data' };
      const meta = { requestId: '123' };
      const response = provider['createSuccessResponse'](data, meta);
      
      expect(response.data).toEqual(data);
      expect(response.meta).toEqual(meta);
      expect(response.error).toBeUndefined();
    });

    test('createErrorResponse should create error responses', () => {
      const error = new Error('Test error');
      const statusCode = 404;
      const response = provider['createErrorResponse'](error, statusCode);
      
      expect(response.data).toBeNull();
      expect(response.error).toEqual({
        code: 'Error',
        message: 'Test error',
        statusCode: 404
      });
    });
  });

  describe('retry logic', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('executeWithRetry should succeed on first attempt', async () => {
      const operation = jest.fn<() => Promise<string>>().mockResolvedValue('success');
      const result = await provider['executeWithRetry'](operation, 3);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('executeWithRetry should retry on failure and eventually succeed', async () => {
      const operation = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success');
      
      const result = await provider['executeWithRetry'](operation, 3);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('executeWithRetry should throw last error after exhausting retries', async () => {
      const error = new Error('Persistent failure');
      const operation = jest.fn<() => Promise<string>>().mockRejectedValue(error);
      
      await expect(provider['executeWithRetry'](operation, 3)).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('delay method should wait for specified time', async () => {
      const start = Date.now();
      await provider['delay'](100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(95); // Allow some variance
    });
  });

  describe('API methods', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('getTranslations should return translations', async () => {
      const response = await provider.getTranslations();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data[0]).toHaveProperty('id', 'KJV');
    });

    test('getTranslation should return single translation', async () => {
      const response = await provider.getTranslation('KJV');
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe('KJV');
    });

    test('getBooks should return books for translation', async () => {
      const response = await provider.getBooks('KJV');
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('getBook should return single book', async () => {
      const response = await provider.getBook('KJV', 'GEN');
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe('GEN');
    });

    test('getChapter should return chapter with verses', async () => {
      const response = await provider.getChapter('KJV', 'GEN', 1);
      expect(response.data).toBeDefined();
      expect(response.data.chapterNumber).toBe(1);
      expect(response.data.verses).toBeDefined();
    });

    test('getVerse should return single verse', async () => {
      const response = await provider.getVerse('KJV', 'GEN', 1, 1);
      expect(response.data).toBeDefined();
      expect(response.data.verseNumber).toBe(1);
    });

    test('getPassage should return passage', async () => {
      const response = await provider.getPassage('KJV', 'GEN', 1, 1, 1, 3);
      expect(response.data).toBeDefined();
      expect(response.data.verses).toBeDefined();
      expect(response.data.reference).toBe('GEN 1:1-1:3');
    });

    test('search should return search results', async () => {
      const params: BibleSearchParams = {
        query: 'God',
        translationId: 'KJV'
      };
      const response = await provider.search(params);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('getParallelVerses should return parallel verses', async () => {
      const response = await provider.getParallelVerses('Genesis 1:1', ['KJV', 'ESV']);
      expect(response.data).toBeDefined();
      expect(response.data.translations).toHaveLength(2);
    });
  });

  describe('availability and lifecycle', () => {
    test('isAvailable should return true when provider works', async () => {
      await provider.initialize();
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    test('getName should return provider name', () => {
      expect(provider.getName()).toBe('TestBibleProvider');
    });

    test('getVersion should return provider version', () => {
      expect(provider.getVersion()).toBe('1.0.0-test');
    });

    test('destroy should clean up resources', async () => {
      await provider.initialize();
      expect(provider['initialized']).toBe(true);
      
      await provider.destroy();
      expect(provider['initialized']).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should handle validation errors gracefully', async () => {
      await expect(provider.getTranslation('')).rejects.toThrow('Translation ID is required');
      await expect(provider.getBook('KJV', '')).rejects.toThrow('Book ID is required');
      await expect(provider.getChapter('KJV', 'GEN', 0)).rejects.toThrow('Invalid chapter number');
      await expect(provider.getVerse('KJV', 'GEN', 1, 0)).rejects.toThrow('Invalid verse number');
    });
  });
});

describe('Provider Interfaces', () => {
  describe('IBibleDataProvider interface', () => {
    test('should define all required methods', () => {
      const methods = [
        'initialize',
        'getTranslations',
        'getTranslation',
        'getBooks',
        'getBook',
        'getChapters',
        'getChapter',
        'getVerse',
        'getPassage',
        'search',
        'getParallelVerses',
        'isAvailable',
        'getName',
        'getVersion',
        'destroy'
      ];
      
      // This test ensures the interface contract is maintained
      methods.forEach(method => {
        expect(typeof (TestBibleProvider.prototype as any)[method]).toBe('function');
      });
    });
  });

  describe('BibleProviderType enum', () => {
    test('should contain all expected provider types', () => {
      expect(BibleProviderType.SCRIPTURE_API).toBe('scripture_api');
      expect(BibleProviderType.BIBLE_COM).toBe('bible_com');
      expect(BibleProviderType.BIBLE_BRAIN).toBe('bible_brain');
      expect(BibleProviderType.MOCK).toBe('mock');
      expect(BibleProviderType.CACHED).toBe('cached');
      expect(BibleProviderType.COMPOSITE).toBe('composite');
    });
  });
});

describe('Provider Configuration', () => {
  test('should handle various configuration options', () => {
    const configs: BibleProviderConfig[] = [
      {}, // empty config
      { timeout: 5000 },
      { retryAttempts: 1 },
      { cacheEnabled: false },
      {
        timeout: 15000,
        retryAttempts: 5,
        retryDelay: 2000,
        cacheEnabled: true,
        cacheTTL: {
          books: 86400000,
          chapters: 3600000,
          verses: 1800000,
          search: 600000
        }
      }
    ];

    configs.forEach(config => {
      expect(() => new TestBibleProvider(config)).not.toThrow();
    });
  });
});