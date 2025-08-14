/**
 * Tests for Cached Bible Provider Wrapper
 * @module tests/services/bible/CachedBibleProvider.test
 */

import { jest } from '@jest/globals';
import { CachedBibleProvider } from '../../../src/services/bible/providers/CachedBibleProvider';
import { MockBibleProvider } from '../../../src/services/bible/providers/MockBibleProvider';
import { IBibleDataProvider } from '../../../src/services/bible/BibleDataProvider.interface';
import {
  BibleTranslation,
  BibleBook,
  BibleChapter,
  BibleVerse,
  BiblePassage,
  BibleSearchParams,
  BibleSearchResult,
  BibleProviderConfig,
  ParallelBible,
  BibleApiResponse
} from '../../../src/types/bible.types';

/**
 * Mock provider for testing caching behavior
 */
class TestableProvider implements IBibleDataProvider {
  private initialized = false;
  private callCounts: { [key: string]: number } = {};

  constructor() {
    this.resetCallCounts();
  }

  resetCallCounts() {
    this.callCounts = {
      getTranslations: 0,
      getTranslation: 0,
      getBooks: 0,
      getBook: 0,
      getChapters: 0,
      getChapter: 0,
      getVerse: 0,
      getPassage: 0,
      search: 0,
      getParallelVerses: 0
    };
  }

  getCallCount(method: string): number {
    return this.callCounts[method] || 0;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async getTranslations(): Promise<BibleApiResponse<BibleTranslation[]>> {
    this.callCounts.getTranslations++;
    return {
      data: [
        {
          id: 'TEST',
          name: 'Test Translation',
          abbreviation: 'TEST',
          language: 'English',
          languageCode: 'en',
          textDirection: 'ltr',
          availableFormats: ['text']
        }
      ]
    };
  }

  async getTranslation(translationId: string): Promise<BibleApiResponse<BibleTranslation>> {
    this.callCounts.getTranslation++;
    return {
      data: {
        id: translationId,
        name: `Test ${translationId}`,
        abbreviation: translationId,
        language: 'English',
        languageCode: 'en',
        textDirection: 'ltr',
        availableFormats: ['text']
      }
    };
  }

  async getBooks(translationId: string): Promise<BibleApiResponse<BibleBook[]>> {
    this.callCounts.getBooks++;
    return {
      data: [
        {
          id: 'TEST',
          bookId: 'TEST',
          name: 'Test Book',
          nameLong: 'Test Book Long',
          abbreviation: 'Test',
          testament: 'NT',
          genre: 'Gospel',
          chapters: 5,
          versesCount: 50
        }
      ]
    };
  }

  async getBook(translationId: string, bookId: string): Promise<BibleApiResponse<BibleBook>> {
    this.callCounts.getBook++;
    return {
      data: {
        id: bookId,
        bookId: bookId,
        name: `Test Book ${bookId}`,
        nameLong: `Test Book ${bookId} Long`,
        abbreviation: bookId,
        testament: 'NT',
        genre: 'Gospel',
        chapters: 5,
        versesCount: 50
      }
    };
  }

  async getChapters(translationId: string, bookId: string): Promise<BibleApiResponse<BibleChapter[]>> {
    this.callCounts.getChapters++;
    return {
      data: [
        {
          id: `${bookId}.1`,
          bookId: bookId,
          chapterNumber: 1,
          reference: `${bookId} 1`,
          verses: [],
          verseCount: 10
        }
      ]
    };
  }

  async getChapter(
    translationId: string,
    bookId: string,
    chapterNumber: number
  ): Promise<BibleApiResponse<BibleChapter>> {
    this.callCounts.getChapter++;
    return {
      data: {
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
      }
    };
  }

  async getVerse(
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verseNumber: number
  ): Promise<BibleApiResponse<BibleVerse>> {
    this.callCounts.getVerse++;
    return {
      data: {
        id: `${bookId}.${chapterNumber}.${verseNumber}`,
        bookId: bookId,
        chapterId: `${bookId}.${chapterNumber}`,
        verseNumber: verseNumber,
        reference: `${bookId} ${chapterNumber}:${verseNumber}`,
        content: `Test verse ${verseNumber} content`,
        cleanContent: `Test verse ${verseNumber} content`
      }
    };
  }

  async getPassage(
    translationId: string,
    bookId: string,
    startChapter: number,
    startVerse: number,
    endChapter: number,
    endVerse: number
  ): Promise<BibleApiResponse<BiblePassage>> {
    this.callCounts.getPassage++;
    return {
      data: {
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
      }
    };
  }

  async search(params: BibleSearchParams): Promise<BibleApiResponse<BibleSearchResult[]>> {
    this.callCounts.search++;
    return {
      data: [
        {
          verse: {
            id: 'TEST.1.1',
            bookId: 'TEST',
            chapterId: 'TEST.1',
            verseNumber: 1,
            reference: 'Test 1:1',
            content: `Test content with ${params.query}`,
            cleanContent: `Test content with ${params.query}`
          },
          score: 1.0,
          highlights: [params.query]
        }
      ]
    };
  }

  async getParallelVerses(
    reference: string,
    translationIds: string[]
  ): Promise<BibleApiResponse<ParallelBible>> {
    this.callCounts.getParallelVerses++;
    return {
      data: {
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
              id: 'TEST.1.1',
              bookId: 'TEST',
              chapterId: 'TEST.1',
              verseNumber: 1,
              reference: 'Test 1:1',
              content: `Test verse in ${id}`,
              cleanContent: `Test verse in ${id}`
            }
          ]
        }))
      }
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getName(): string {
    return 'TestableProvider';
  }

  getVersion(): string {
    return '1.0.0-test';
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }
}

describe('CachedBibleProvider', () => {
  let baseProvider: TestableProvider;
  let cachedProvider: CachedBibleProvider;

  beforeEach(() => {
    baseProvider = new TestableProvider();
    cachedProvider = new CachedBibleProvider(baseProvider);
  });

  afterEach(async () => {
    await cachedProvider.destroy();
    await baseProvider.destroy();
  });

  describe('constructor and initialization', () => {
    test('should create cached provider with default configuration', () => {
      expect(cachedProvider.getName()).toBe('Cached(TestableProvider)');
      expect(cachedProvider.getVersion()).toBe('1.0.0-cache+1.0.0-test');
    });

    test('should create cached provider with custom cache configuration', () => {
      const customConfig = {
        translationsTTL: 1000,
        booksTTL: 2000,
        chaptersTTL: 3000,
        versesTTL: 4000,
        searchTTL: 500,
        parallelTTL: 5000,
        maxSize: 100,
        enableWarming: false
      };
      
      const customCachedProvider = new CachedBibleProvider(baseProvider, customConfig);
      expect(customCachedProvider['config'].translationsTTL).toBe(1000);
      expect(customCachedProvider['config'].maxSize).toBe(100);
      
      customCachedProvider.destroy();
    });

    test('should initialize successfully', async () => {
      await cachedProvider.initialize();
      expect(cachedProvider['initialized']).toBe(true);
    });

    test('should initialize base provider', async () => {
      await cachedProvider.initialize();
      expect(baseProvider['initialized']).toBe(true);
    });

    test('should handle initialization errors', async () => {
      const errorProvider = {
        initialize: jest.fn(() => Promise.reject(new Error('Init failed'))),
        destroy: jest.fn(() => Promise.resolve())
      } as any;
      
      const errorCachedProvider = new CachedBibleProvider(errorProvider);
      
      await expect(errorCachedProvider.initialize()).rejects.toThrow('Failed to initialize cached provider');
      
      await errorCachedProvider.destroy();
    });
  });

  describe('caching behavior', () => {
    beforeEach(async () => {
      await cachedProvider.initialize();
    });

    test('should cache and reuse translations', async () => {
      // First call should hit the base provider
      const response1 = await cachedProvider.getTranslations();
      expect(baseProvider.getCallCount('getTranslations')).toBe(1);
      expect(response1.meta?.cached).toBe(false);
      
      // Second call should use cache
      const response2 = await cachedProvider.getTranslations();
      expect(baseProvider.getCallCount('getTranslations')).toBe(1); // Still 1
      expect(response2.meta?.cached).toBe(true);
      expect(response2.meta?.responseTime).toBe(0);
      
      // Data should be the same
      expect(response2.data).toEqual(response1.data);
    });

    test('should cache and reuse specific translation', async () => {
      const translationId = 'KJV';
      
      // First call
      const response1 = await cachedProvider.getTranslation(translationId);
      expect(baseProvider.getCallCount('getTranslation')).toBe(1);
      expect(response1.meta?.cached).toBe(false);
      
      // Second call should use cache
      const response2 = await cachedProvider.getTranslation(translationId);
      expect(baseProvider.getCallCount('getTranslation')).toBe(1);
      expect(response2.meta?.cached).toBe(true);
      
      expect(response2.data).toEqual(response1.data);
    });

    test('should cache books per translation', async () => {
      const translationId = 'KJV';
      
      // First call
      await cachedProvider.getBooks(translationId);
      expect(baseProvider.getCallCount('getBooks')).toBe(1);
      
      // Second call for same translation should use cache
      await cachedProvider.getBooks(translationId);
      expect(baseProvider.getCallCount('getBooks')).toBe(1);
      
      // Call for different translation should hit provider
      await cachedProvider.getBooks('ESV');
      expect(baseProvider.getCallCount('getBooks')).toBe(2);
    });

    test('should cache chapters per book and translation', async () => {
      // First call
      await cachedProvider.getChapters('KJV', 'GEN');
      expect(baseProvider.getCallCount('getChapters')).toBe(1);
      
      // Same parameters should use cache
      await cachedProvider.getChapters('KJV', 'GEN');
      expect(baseProvider.getCallCount('getChapters')).toBe(1);
      
      // Different book should hit provider
      await cachedProvider.getChapters('KJV', 'EXO');
      expect(baseProvider.getCallCount('getChapters')).toBe(2);
      
      // Different translation should hit provider
      await cachedProvider.getChapters('ESV', 'GEN');
      expect(baseProvider.getCallCount('getChapters')).toBe(3);
    });

    test('should cache individual verses', async () => {
      // First call
      await cachedProvider.getVerse('KJV', 'GEN', 1, 1);
      expect(baseProvider.getCallCount('getVerse')).toBe(1);
      
      // Same verse should use cache
      await cachedProvider.getVerse('KJV', 'GEN', 1, 1);
      expect(baseProvider.getCallCount('getVerse')).toBe(1);
      
      // Different verse should hit provider
      await cachedProvider.getVerse('KJV', 'GEN', 1, 2);
      expect(baseProvider.getCallCount('getVerse')).toBe(2);
    });

    test('should cache search results', async () => {
      const params: BibleSearchParams = {
        query: 'God',
        translationId: 'KJV'
      };
      
      // First search
      await cachedProvider.search(params);
      expect(baseProvider.getCallCount('search')).toBe(1);
      
      // Same search should use cache
      await cachedProvider.search(params);
      expect(baseProvider.getCallCount('search')).toBe(1);
      
      // Different query should hit provider
      await cachedProvider.search({ ...params, query: 'Jesus' });
      expect(baseProvider.getCallCount('search')).toBe(2);
    });

    test('should cache parallel verses', async () => {
      const reference = 'Genesis 1:1';
      const translations = ['KJV', 'ESV'];
      
      // First call
      await cachedProvider.getParallelVerses(reference, translations);
      expect(baseProvider.getCallCount('getParallelVerses')).toBe(1);
      
      // Same parameters should use cache
      await cachedProvider.getParallelVerses(reference, translations);
      expect(baseProvider.getCallCount('getParallelVerses')).toBe(1);
      
      // Different order should also use cache (translations are sorted)
      await cachedProvider.getParallelVerses(reference, ['ESV', 'KJV']);
      expect(baseProvider.getCallCount('getParallelVerses')).toBe(1);
      
      // Different reference should hit provider
      await cachedProvider.getParallelVerses('Genesis 1:2', translations);
      expect(baseProvider.getCallCount('getParallelVerses')).toBe(2);
    });

    test('should only cache successful responses', async () => {
      // Mock a provider that fails then succeeds
      const failingProvider = {
        ...baseProvider,
        getTranslation: jest.fn<any>()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValue({ data: { id: 'KJV', name: 'King James' } })
      } as any;
      
      const failingCachedProvider = new CachedBibleProvider(failingProvider);
      await failingCachedProvider.initialize();
      
      // First call should fail and not cache
      await expect(failingCachedProvider.getTranslation('KJV')).rejects.toThrow('Network error');
      
      // Second call should succeed and cache
      const response = await failingCachedProvider.getTranslation('KJV');
      expect(response.data).toBeDefined();
      expect(failingProvider.getTranslation).toHaveBeenCalledTimes(2);
      
      await failingCachedProvider.destroy();
    });
  });

  describe('cache key generation', () => {
    beforeEach(async () => {
      await cachedProvider.initialize();
    });

    test('should generate unique cache keys for different search parameters', async () => {
      const baseParams: BibleSearchParams = {
        query: 'God',
        translationId: 'KJV'
      };
      
      // Different variations should generate different cache entries
      await cachedProvider.search(baseParams);
      await cachedProvider.search({ ...baseParams, limit: 10 });
      await cachedProvider.search({ ...baseParams, offset: 5 });
      await cachedProvider.search({ ...baseParams, books: ['GEN'] });
      await cachedProvider.search({ ...baseParams, testament: 'OT' });
      await cachedProvider.search({ ...baseParams, searchType: 'fuzzy' });
      
      // Each should have hit the provider (no cache reuse)
      expect(baseProvider.getCallCount('search')).toBe(6);
    });

    test('should handle complex search parameters in cache keys', async () => {
      const complexParams: BibleSearchParams = {
        query: 'God created',
        translationId: 'ESV',
        books: ['GEN', 'EXO'],
        testament: 'OT',
        searchType: 'phrase',
        limit: 25,
        offset: 10
      };
      
      // First call
      await cachedProvider.search(complexParams);
      expect(baseProvider.getCallCount('search')).toBe(1);
      
      // Same complex parameters should use cache
      await cachedProvider.search(complexParams);
      expect(baseProvider.getCallCount('search')).toBe(1);
    });
  });

  describe('cache management operations', () => {
    beforeEach(async () => {
      await cachedProvider.initialize();
    });

    test('should clear specific cache entries', async () => {
      // Cache some data
      await cachedProvider.getTranslation('KJV');
      await cachedProvider.getTranslation('ESV');
      
      expect(baseProvider.getCallCount('getTranslation')).toBe(2);
      
      // Clear specific cache entry
      await cachedProvider.clearCache('translation:KJV');
      
      // KJV should hit provider again, ESV should use cache
      await cachedProvider.getTranslation('KJV');
      await cachedProvider.getTranslation('ESV');
      
      expect(baseProvider.getCallCount('getTranslation')).toBe(3);
    });

    test('should clear entire cache', async () => {
      // Cache some data
      await cachedProvider.getTranslations();
      await cachedProvider.getTranslation('KJV');
      await cachedProvider.getBooks('KJV');
      
      expect(baseProvider.getCallCount('getTranslations')).toBe(1);
      expect(baseProvider.getCallCount('getTranslation')).toBe(1);
      expect(baseProvider.getCallCount('getBooks')).toBe(1);
      
      // Clear entire cache
      await cachedProvider.clearCache();
      
      // All should hit provider again
      await cachedProvider.getTranslations();
      await cachedProvider.getTranslation('KJV');
      await cachedProvider.getBooks('KJV');
      
      expect(baseProvider.getCallCount('getTranslations')).toBe(2);
      expect(baseProvider.getCallCount('getTranslation')).toBe(2);
      expect(baseProvider.getCallCount('getBooks')).toBe(2);
    });

    test('should provide cache statistics', async () => {
      // Generate some cache hits and misses
      await cachedProvider.getTranslation('KJV'); // miss
      await cachedProvider.getTranslation('KJV'); // hit
      await cachedProvider.getTranslation('ESV'); // miss
      await cachedProvider.getTranslation('ESV'); // hit
      
      const stats = await cachedProvider.getCacheStats();
      
      expect(stats.size).toBe(2); // Two cached entries
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    test('should provide detailed cache statistics', async () => {
      await cachedProvider.getTranslation('KJV');
      
      const detailedStats = await cachedProvider.getDetailedCacheStats();
      
      expect(detailedStats).toHaveProperty('size');
      expect(detailedStats).toHaveProperty('hits');
      expect(detailedStats).toHaveProperty('misses');
      expect(detailedStats).toHaveProperty('hitRate');
      expect(detailedStats).toHaveProperty('memoryUsage');
      expect(detailedStats).toHaveProperty('evictions');
      expect(detailedStats).toHaveProperty('averageAge');
    });
  });

  describe('cache warming', () => {
    test('should warm cache automatically on initialization', async () => {
      const warmingProvider = new CachedBibleProvider(baseProvider, {
        enableWarming: true
      });
      
      // Initialize should trigger cache warming
      await warmingProvider.initialize();
      
      // Give time for warming to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Warming should have made some provider calls
      expect(baseProvider.getCallCount('getTranslation')).toBeGreaterThan(0);
      
      await warmingProvider.destroy();
    });

    test('should skip cache warming when disabled', async () => {
      const noWarmingProvider = new CachedBibleProvider(baseProvider, {
        enableWarming: false
      });
      
      await noWarmingProvider.initialize();
      
      // Give time for any potential warming
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // No warming calls should have been made
      expect(baseProvider.getCallCount('getTranslation')).toBe(0);
      
      await noWarmingProvider.destroy();
    });

    test('should handle cache warming errors gracefully', async () => {
      // Create provider that fails during warming
      const warningProvider = {
        ...baseProvider,
        initialize: jest.fn(() => Promise.resolve()),
        getTranslation: jest.fn(() => Promise.reject(new Error('Warming failed')))
      } as any;
      
      const warmingCachedProvider = new CachedBibleProvider(warningProvider, {
        enableWarming: true
      });
      
      // Should not throw despite warming failures
      await expect(warmingCachedProvider.initialize()).resolves.not.toThrow();
      
      await warmingCachedProvider.destroy();
    });

    test('should support manual cache warming', async () => {
      await cachedProvider.initialize();
      
      // Reset call counts
      baseProvider.resetCallCounts();
      
      // Manual warm cache
      await cachedProvider.warmCache();
      
      // Should have made warming calls
      expect(baseProvider.getCallCount('getTranslation')).toBeGreaterThan(0);
    });
  });

  describe('prefetch functionality', () => {
    beforeEach(async () => {
      await cachedProvider.initialize();
    });

    test('should prefetch verses', async () => {
      const prefetchRequests = [
        {
          type: 'verse' as const,
          params: {
            translationId: 'KJV',
            bookId: 'GEN',
            chapterNumber: 1,
            verseNumber: 1
          }
        },
        {
          type: 'verse' as const,
          params: {
            translationId: 'KJV',
            bookId: 'GEN',
            chapterNumber: 1,
            verseNumber: 2
          }
        }
      ];
      
      await cachedProvider.prefetch(prefetchRequests);
      
      expect(baseProvider.getCallCount('getVerse')).toBe(2);
      
      // Subsequent calls should use cache
      await cachedProvider.getVerse('KJV', 'GEN', 1, 1);
      await cachedProvider.getVerse('KJV', 'GEN', 1, 2);
      
      expect(baseProvider.getCallCount('getVerse')).toBe(2); // No additional calls
    });

    test('should prefetch chapters', async () => {
      const prefetchRequests = [
        {
          type: 'chapter' as const,
          params: {
            translationId: 'KJV',
            bookId: 'GEN',
            chapterNumber: 1
          }
        }
      ];
      
      await cachedProvider.prefetch(prefetchRequests);
      
      expect(baseProvider.getCallCount('getChapter')).toBe(1);
      
      // Subsequent call should use cache
      await cachedProvider.getChapter('KJV', 'GEN', 1);
      expect(baseProvider.getCallCount('getChapter')).toBe(1);
    });

    test('should handle prefetch errors gracefully', async () => {
      const errorProvider = {
        ...baseProvider,
        initialize: jest.fn(() => Promise.resolve()),
        getVerse: jest.fn(() => Promise.reject(new Error('Prefetch failed')))
      } as any;
      
      const errorCachedProvider = new CachedBibleProvider(errorProvider);
      await errorCachedProvider.initialize();
      
      const prefetchRequests = [
        {
          type: 'verse' as const,
          params: {
            translationId: 'KJV',
            bookId: 'GEN',
            chapterNumber: 1,
            verseNumber: 1
          }
        }
      ];
      
      // Should not throw despite prefetch errors
      await expect(errorCachedProvider.prefetch(prefetchRequests)).resolves.not.toThrow();
      
      await errorCachedProvider.destroy();
    });
  });

  describe('passthrough operations', () => {
    beforeEach(async () => {
      await cachedProvider.initialize();
    });

    test('should pass through isAvailable calls', async () => {
      const result = await cachedProvider.isAvailable();
      expect(result).toBe(true);
    });

    test('should pass through getName calls', () => {
      const name = cachedProvider.getName();
      expect(name).toBe('Cached(TestableProvider)');
    });

    test('should pass through getVersion calls', () => {
      const version = cachedProvider.getVersion();
      expect(version).toBe('1.0.0-cache+1.0.0-test');
    });
  });

  describe('lifecycle and cleanup', () => {
    test('should destroy base provider on destroy', async () => {
      await cachedProvider.initialize();
      const destroySpy = jest.spyOn(baseProvider, 'destroy');
      
      await cachedProvider.destroy();
      
      expect(destroySpy).toHaveBeenCalled();
      expect(cachedProvider['initialized']).toBe(false);
    });

    test('should clean up cache on destroy', async () => {
      await cachedProvider.initialize();
      
      // Add some cached data
      await cachedProvider.getTranslation('KJV');
      
      const stats = await cachedProvider.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      await cachedProvider.destroy();
      
      // Cache should be cleaned up
      const statsAfter = await cachedProvider.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await cachedProvider.initialize();
    });

    test('should handle base provider errors', async () => {
      const errorProvider = {
        ...baseProvider,
        initialize: jest.fn(() => Promise.resolve()),
        getTranslation: jest.fn(() => Promise.reject(new Error('Provider error')))
      } as any;
      
      const errorCachedProvider = new CachedBibleProvider(errorProvider);
      await errorCachedProvider.initialize();
      
      await expect(errorCachedProvider.getTranslation('KJV')).rejects.toThrow('Provider error');
      
      await errorCachedProvider.destroy();
    });

    test('should not cache error responses', async () => {
      const intermittentProvider = {
        ...baseProvider,
        initialize: jest.fn(() => Promise.resolve()),
        callCount: 0,
        getTranslation: jest.fn().mockImplementation(function(this: any) {
          this.callCount++;
          if (this.callCount === 1) {
            return Promise.reject(new Error('First call fails'));
          }
          return Promise.resolve({
            data: { id: 'KJV', name: 'King James Version' }
          });
        })
      } as any;
      
      const intermittentCachedProvider = new CachedBibleProvider(intermittentProvider);
      await intermittentCachedProvider.initialize();
      
      // First call should fail
      await expect(intermittentCachedProvider.getTranslation('KJV')).rejects.toThrow('First call fails');
      
      // Second call should succeed (proving error wasn't cached)
      const response = await intermittentCachedProvider.getTranslation('KJV');
      expect(response.data).toBeDefined();
      expect(intermittentProvider.callCount).toBe(2);
      
      await intermittentCachedProvider.destroy();
    });
  });

  describe('cache TTL behavior', () => {
    test('should use different TTL values for different content types', async () => {
      const shortTTLProvider = new CachedBibleProvider(baseProvider, {
        translationsTTL: 100,  // 100ms
        versesTTL: 200        // 200ms
      });
      
      await shortTTLProvider.initialize();
      
      // Cache translation and verse
      await shortTTLProvider.getTranslation('KJV');
      await shortTTLProvider.getVerse('KJV', 'GEN', 1, 1);
      
      expect(baseProvider.getCallCount('getTranslation')).toBe(1);
      expect(baseProvider.getCallCount('getVerse')).toBe(1);
      
      // Wait for translation TTL to expire but not verse TTL
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Translation should hit provider again, verse should use cache
      await shortTTLProvider.getTranslation('KJV');
      await shortTTLProvider.getVerse('KJV', 'GEN', 1, 1);
      
      expect(baseProvider.getCallCount('getTranslation')).toBe(2);
      expect(baseProvider.getCallCount('getVerse')).toBe(1); // Still cached
      
      await shortTTLProvider.destroy();
    });
  });

  describe('integration with MockBibleProvider', () => {
    let mockProvider: MockBibleProvider;
    let cachedMockProvider: CachedBibleProvider;

    beforeEach(async () => {
      mockProvider = new MockBibleProvider();
      cachedMockProvider = new CachedBibleProvider(mockProvider);
      await cachedMockProvider.initialize();
    });

    afterEach(async () => {
      await cachedMockProvider.destroy();
    });

    test('should work correctly with MockBibleProvider', async () => {
      // Test full flow with real mock provider
      const translations = await cachedMockProvider.getTranslations();
      expect(translations.data).toBeDefined();
      expect(Array.isArray(translations.data)).toBe(true);
      
      const books = await cachedMockProvider.getBooks('KJV');
      expect(books.data).toBeDefined();
      expect(Array.isArray(books.data)).toBe(true);
      
      const verse = await cachedMockProvider.getVerse('KJV', 'GEN', 1, 1);
      expect(verse.data).toBeDefined();
      expect(verse.data.content).toBeDefined();
    });

    test('should cache MockBibleProvider responses', async () => {
      // First calls
      const translation1 = await cachedMockProvider.getTranslation('KJV');
      const translation2 = await cachedMockProvider.getTranslation('KJV');
      
      // Second call should be cached
      expect(translation1.meta?.cached).toBe(false);
      expect(translation2.meta?.cached).toBe(true);
      expect(translation2.data).toEqual(translation1.data);
    });

    test('should handle MockBibleProvider search caching', async () => {
      const searchParams: BibleSearchParams = {
        query: 'God',
        translationId: 'KJV'
      };
      
      const results1 = await cachedMockProvider.search(searchParams);
      const results2 = await cachedMockProvider.search(searchParams);
      
      expect(results1.meta?.cached).toBe(false);
      expect(results2.meta?.cached).toBe(true);
      expect(results2.data).toEqual(results1.data);
    });
  });
});