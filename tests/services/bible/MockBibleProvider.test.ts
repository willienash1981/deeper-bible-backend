/**
 * Tests for Mock Bible Provider Implementation
 * @module tests/services/bible/MockBibleProvider.test
 */

import { jest } from '@jest/globals';
import { MockBibleProvider } from '../../../src/services/bible/providers/MockBibleProvider';
import {
  BibleTranslation,
  BibleBook,
  BibleChapter,
  BibleVerse,
  BiblePassage,
  BibleSearchParams,
  BibleSearchResult,
  BibleProviderConfig,
  ParallelBible
} from '../../../src/types/bible.types';

describe('MockBibleProvider', () => {
  let provider: MockBibleProvider;

  beforeEach(() => {
    provider = new MockBibleProvider();
  });

  afterEach(async () => {
    await provider.destroy();
  });

  describe('constructor and initialization', () => {
    test('should initialize with default configuration', () => {
      expect(provider.getName()).toBe('MockBibleProvider');
      expect(provider.getVersion()).toBe('1.0.0');
    });

    test('should initialize with custom configuration', () => {
      const config: BibleProviderConfig & { simulateDelay?: boolean; defaultDelay?: number } = {
        simulateDelay: true,
        defaultDelay: 200,
        timeout: 5000,
        retryAttempts: 2
      };
      const customProvider = new MockBibleProvider(config);
      expect(customProvider['simulateDelay']).toBe(true);
      expect(customProvider['defaultDelay']).toBe(200);
    });

    test('should initialize provider successfully', async () => {
      await provider.initialize();
      expect(provider['initialized']).toBe(true);
    });

    test('should initialize with delay simulation', async () => {
      const delayProvider = new MockBibleProvider({ simulateDelay: true, defaultDelay: 50 });
      const start = Date.now();
      await delayProvider.initialize();
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(45); // Account for timing variance
      expect(delayProvider['initialized']).toBe(true);
      
      await delayProvider.destroy();
    });

    test('should update configuration during initialization', async () => {
      const newConfig: BibleProviderConfig = {
        timeout: 8000,
        retryAttempts: 4
      };
      await provider.initialize(newConfig);
      expect(provider['config'].timeout).toBe(8000);
      expect(provider['config'].retryAttempts).toBe(4);
    });
  });

  describe('getTranslations', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return all mock translations', async () => {
      const response = await provider.getTranslations();
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Check first translation structure
      const firstTranslation = response.data[0];
      expect(firstTranslation).toHaveProperty('id');
      expect(firstTranslation).toHaveProperty('name');
      expect(firstTranslation).toHaveProperty('abbreviation');
      expect(firstTranslation).toHaveProperty('language');
      expect(firstTranslation).toHaveProperty('languageCode');
      expect(firstTranslation).toHaveProperty('textDirection');
      expect(firstTranslation).toHaveProperty('availableFormats');
    });

    test('should include metadata in response', async () => {
      const response = await provider.getTranslations();
      
      expect(response.meta).toBeDefined();
      expect(response.meta).toHaveProperty('requestId');
      expect(response.meta).toHaveProperty('cached', false);
      expect(response.meta).toHaveProperty('responseTime');
    });

    test('should include expected translations', async () => {
      const response = await provider.getTranslations();
      const translationIds = response.data.map(t => t.id);
      
      expect(translationIds).toContain('KJV');
      expect(translationIds).toContain('ESV');
      expect(translationIds).toContain('NIV');
      expect(translationIds).toContain('NASB');
    });

    test('should fail when not initialized', async () => {
      const uninitializedProvider = new MockBibleProvider();
      await expect(uninitializedProvider.getTranslations()).rejects.toThrow('MockBibleProvider is not initialized');
    });
  });

  describe('getTranslation', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return specific translation by ID', async () => {
      const response = await provider.getTranslation('KJV');
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe('KJV');
      expect(response.data.name).toBe('King James Version');
      expect(response.data.abbreviation).toBe('KJV');
    });

    test('should return error for non-existent translation', async () => {
      const response = await provider.getTranslation('NONEXISTENT');
      
      expect(response.error).toBeDefined();
      expect(response.error?.statusCode).toBe(404);
      expect(response.error?.message).toContain('Translation not found: NONEXISTENT');
    });

    test('should validate translation ID parameter', async () => {
      await expect(provider.getTranslation('')).rejects.toThrow('Translation ID is required');
      await expect(provider.getTranslation('   ')).rejects.toThrow('Translation ID is required');
    });

    test('should handle all available translations', async () => {
      const translations = ['KJV', 'ESV', 'NIV', 'NASB'];
      
      for (const translationId of translations) {
        const response = await provider.getTranslation(translationId);
        expect(response.error).toBeUndefined();
        expect(response.data.id).toBe(translationId);
      }
    });
  });

  describe('getBooks', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return all Bible books', async () => {
      const response = await provider.getBooks('KJV');
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Check first book structure
      const firstBook = response.data[0];
      expect(firstBook).toHaveProperty('id');
      expect(firstBook).toHaveProperty('name');
      expect(firstBook).toHaveProperty('testament');
      expect(firstBook).toHaveProperty('genre');
      expect(firstBook).toHaveProperty('chapters');
    });

    test('should validate translation exists', async () => {
      const response = await provider.getBooks('NONEXISTENT');
      
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Translation not found: NONEXISTENT');
    });

    test('should include books from both testaments', async () => {
      const response = await provider.getBooks('KJV');
      
      const testaments = new Set(response.data.map(book => book.testament));
      expect(testaments.has('OT')).toBe(true);
      expect(testaments.has('NT')).toBe(true);
    });

    test('should include various genres', async () => {
      const response = await provider.getBooks('KJV');
      
      const genres = new Set(response.data.map(book => book.genre));
      expect(genres.size).toBeGreaterThan(1);
    });
  });

  describe('getBook', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return specific book by ID', async () => {
      // First get available books to find a valid ID
      const booksResponse = await provider.getBooks('KJV');
      const firstBook = booksResponse.data[0];
      
      const response = await provider.getBook('KJV', firstBook.id);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(firstBook.id);
    });

    test('should return error for non-existent book', async () => {
      const response = await provider.getBook('KJV', 'NONEXISTENT');
      
      expect(response.error).toBeDefined();
      expect(response.error?.statusCode).toBe(404);
      expect(response.error?.message).toContain('Book not found: NONEXISTENT');
    });

    test('should validate parameters', async () => {
      await expect(provider.getBook('', 'GEN')).rejects.toThrow('Translation ID is required');
      await expect(provider.getBook('KJV', '')).rejects.toThrow('Book ID is required');
    });
  });

  describe('getChapters', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return chapters for a book', async () => {
      // Get a valid book first
      const booksResponse = await provider.getBooks('KJV');
      const firstBook = booksResponse.data[0];
      
      const response = await provider.getChapters('KJV', firstBook.id);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBe(firstBook.chapters);
      
      // Check first chapter structure
      const firstChapter = response.data[0];
      expect(firstChapter).toHaveProperty('id');
      expect(firstChapter).toHaveProperty('bookId', firstBook.id);
      expect(firstChapter).toHaveProperty('chapterNumber', 1);
    });

    test('should return error for non-existent book', async () => {
      const response = await provider.getChapters('KJV', 'NONEXISTENT');
      
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Book not found: NONEXISTENT');
    });
  });

  describe('getChapter', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return chapter with verses', async () => {
      // Get a valid book first
      const booksResponse = await provider.getBooks('KJV');
      const firstBook = booksResponse.data[0];
      
      const response = await provider.getChapter('KJV', firstBook.id, 1);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.chapterNumber).toBe(1);
      expect(response.data.bookId).toBe(firstBook.id);
      expect(Array.isArray(response.data.verses)).toBe(true);
      expect(response.data.verses.length).toBeGreaterThan(0);
      
      // Check first verse structure
      const firstVerse = response.data.verses[0];
      expect(firstVerse).toHaveProperty('id');
      expect(firstVerse).toHaveProperty('verseNumber');
      expect(firstVerse).toHaveProperty('content');
      expect(firstVerse).toHaveProperty('reference');
    });

    test('should validate chapter number exists', async () => {
      const booksResponse = await provider.getBooks('KJV');
      const firstBook = booksResponse.data[0];
      
      const response = await provider.getChapter('KJV', firstBook.id, 9999);
      
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain(`Chapter 9999 does not exist`);
    });

    test('should validate parameters', async () => {
      await expect(provider.getChapter('KJV', 'GEN', 0)).rejects.toThrow('Invalid chapter number');
      await expect(provider.getChapter('KJV', 'GEN', -1)).rejects.toThrow('Invalid chapter number');
    });
  });

  describe('getVerse', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return single verse', async () => {
      // Use a book and chapter we know exists
      const response = await provider.getVerse('KJV', 'GEN', 1, 1);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.verseNumber).toBe(1);
      expect(response.data.bookId).toBe('GEN');
      expect(response.data.content).toBeDefined();
      expect(response.data.reference).toContain('1:1');
    });

    test('should return sample verse data when available', async () => {
      // The MockBibleProvider should have sample data for some verses
      const response = await provider.getVerse('KJV', 'GEN', 1, 1);
      
      expect(response.data).toBeDefined();
      expect(typeof response.data.content).toBe('string');
      expect(response.data.content.length).toBeGreaterThan(0);
    });

    test('should generate placeholder verse when sample data not available', async () => {
      // Use a book that exists but a verse that's unlikely to have sample data
      const response = await provider.getVerse('KJV', 'GEN', 50, 26);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.verseNumber).toBe(26);
      expect(response.data.content).toBeDefined();
    });

    test('should validate parameters', async () => {
      await expect(provider.getVerse('', 'GEN', 1, 1)).rejects.toThrow('Translation ID is required');
      await expect(provider.getVerse('KJV', '', 1, 1)).rejects.toThrow('Book ID is required');
      await expect(provider.getVerse('KJV', 'GEN', 0, 1)).rejects.toThrow('Invalid chapter number');
      await expect(provider.getVerse('KJV', 'GEN', 1, 0)).rejects.toThrow('Invalid verse number');
    });
  });

  describe('getPassage', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return passage within single chapter', async () => {
      const response = await provider.getPassage('KJV', 'GEN', 1, 1, 1, 3);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.translationId).toBe('KJV');
      expect(response.data.bookId).toBe('GEN');
      expect(response.data.startChapter).toBe(1);
      expect(response.data.startVerse).toBe(1);
      expect(response.data.endChapter).toBe(1);
      expect(response.data.endVerse).toBe(3);
      expect(Array.isArray(response.data.verses)).toBe(true);
      expect(response.data.verses.length).toBeGreaterThan(0);
    });

    test('should return passage across multiple chapters', async () => {
      const response = await provider.getPassage('KJV', 'GEN', 1, 30, 2, 5);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.verses.length).toBeGreaterThan(1);
    });

    test('should validate parameters', async () => {
      await expect(provider.getPassage('', 'GEN', 1, 1, 1, 3)).rejects.toThrow('Translation ID is required');
      await expect(provider.getPassage('KJV', '', 1, 1, 1, 3)).rejects.toThrow('Book ID is required');
      await expect(provider.getPassage('KJV', 'GEN', 0, 1, 1, 3)).rejects.toThrow('Invalid chapter number');
      await expect(provider.getPassage('KJV', 'GEN', 1, 0, 1, 3)).rejects.toThrow('Invalid verse number');
    });

    test('should include proper reference formatting', async () => {
      const response = await provider.getPassage('KJV', 'GEN', 1, 1, 1, 3);
      
      expect(response.data.reference).toMatch(/Genesis 1:1-3/);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return search results', async () => {
      const params: BibleSearchParams = {
        query: 'God',
        translationId: 'KJV'
      };
      const response = await provider.search(params);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });

    test('should validate search query', async () => {
      const params: BibleSearchParams = {
        query: '',
        translationId: 'KJV'
      };
      const response = await provider.search(params);
      
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Search query is required');
    });

    test('should handle exact search', async () => {
      const params: BibleSearchParams = {
        query: 'God created',
        translationId: 'KJV',
        searchType: 'exact'
      };
      const response = await provider.search(params);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
    });

    test('should handle phrase search', async () => {
      const params: BibleSearchParams = {
        query: 'in the beginning',
        translationId: 'KJV',
        searchType: 'phrase'
      };
      const response = await provider.search(params);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
    });

    test('should handle fuzzy search', async () => {
      const params: BibleSearchParams = {
        query: 'God created heaven earth',
        translationId: 'KJV',
        searchType: 'fuzzy'
      };
      const response = await provider.search(params);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
    });

    test('should apply book filters', async () => {
      const params: BibleSearchParams = {
        query: 'God',
        translationId: 'KJV',
        books: ['GEN']
      };
      const response = await provider.search(params);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
    });

    test('should apply testament filters', async () => {
      const params: BibleSearchParams = {
        query: 'God',
        translationId: 'KJV',
        testament: 'OT'
      };
      const response = await provider.search(params);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
    });

    test('should handle pagination', async () => {
      const params: BibleSearchParams = {
        query: 'the',
        translationId: 'KJV',
        limit: 5,
        offset: 0
      };
      const response = await provider.search(params);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.meta?.pagination).toBeDefined();
      expect(response.meta?.pagination?.limit).toBe(5);
      expect(response.meta?.pagination?.offset).toBe(0);
    });

    test('should sort results by relevance score', async () => {
      const params: BibleSearchParams = {
        query: 'God',
        translationId: 'KJV'
      };
      const response = await provider.search(params);
      
      if (response.data.length > 1) {
        for (let i = 1; i < response.data.length; i++) {
          expect(response.data[i].score).toBeLessThanOrEqual(response.data[i - 1].score);
        }
      }
    });
  });

  describe('getParallelVerses', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should return parallel verses for multiple translations', async () => {
      const response = await provider.getParallelVerses('Genesis 1:1', ['KJV', 'ESV']);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      expect(response.data.reference).toBe('Genesis 1:1');
      expect(response.data.translations).toHaveLength(2);
      
      const kjvTranslation = response.data.translations.find(t => t.translation.id === 'KJV');
      const esvTranslation = response.data.translations.find(t => t.translation.id === 'ESV');
      
      expect(kjvTranslation).toBeDefined();
      expect(esvTranslation).toBeDefined();
    });

    test('should validate translation IDs', async () => {
      const response = await provider.getParallelVerses('Genesis 1:1', []);
      
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('At least one translation ID is required');
    });

    test('should validate reference format', async () => {
      const response = await provider.getParallelVerses('Invalid Reference', ['KJV']);
      
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Invalid reference format');
    });

    test('should handle verse ranges', async () => {
      const response = await provider.getParallelVerses('Genesis 1:1-3', ['KJV', 'ESV']);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
      
      response.data.translations.forEach(translation => {
        expect(translation.verses.length).toBeGreaterThan(0);
      });
    });

    test('should handle book name variations', async () => {
      const response = await provider.getParallelVerses('Gen 1:1', ['KJV']);
      
      expect(response.error).toBeUndefined();
      expect(response.data).toBeDefined();
    });
  });

  describe('availability and lifecycle', () => {
    test('should always be available', async () => {
      await provider.initialize();
      const available = await provider.isAvailable();
      expect(available).toBe(true);
    });

    test('should return correct provider name', () => {
      expect(provider.getName()).toBe('MockBibleProvider');
    });

    test('should return correct provider version', () => {
      expect(provider.getVersion()).toBe('1.0.0');
    });

    test('should destroy resources cleanly', async () => {
      await provider.initialize();
      expect(provider['initialized']).toBe(true);
      
      await provider.destroy();
      expect(provider['initialized']).toBe(false);
    });
  });

  describe('delay simulation', () => {
    test('should simulate delays when configured', async () => {
      const delayProvider = new MockBibleProvider({ 
        simulateDelay: true, 
        defaultDelay: 50 
      });
      await delayProvider.initialize();
      
      const start = Date.now();
      await delayProvider.getTranslations();
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(45);
      
      await delayProvider.destroy();
    });

    test('should have longer delays for complex operations', async () => {
      const delayProvider = new MockBibleProvider({ 
        simulateDelay: true, 
        defaultDelay: 30 
      });
      await delayProvider.initialize();
      
      const start = Date.now();
      await delayProvider.getPassage('KJV', 'GEN', 1, 1, 1, 10);
      const end = Date.now();
      
      // Passages should take 2x default delay
      expect(end - start).toBeGreaterThanOrEqual(55);
      
      await delayProvider.destroy();
    });

    test('should have longest delays for search operations', async () => {
      const delayProvider = new MockBibleProvider({ 
        simulateDelay: true, 
        defaultDelay: 20 
      });
      await delayProvider.initialize();
      
      const start = Date.now();
      await delayProvider.search({ query: 'test', translationId: 'KJV' });
      const end = Date.now();
      
      // Search should take 3x default delay
      expect(end - start).toBeGreaterThanOrEqual(55);
      
      await delayProvider.destroy();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should handle various error conditions gracefully', async () => {
      // Test various error scenarios - MockBibleProvider returns error responses, not thrown errors
      const errorTests = [
        { fn: () => provider.getTranslation(''), expectedError: 'Translation ID is required' },
        { fn: () => provider.getBook('KJV', ''), expectedError: 'Book ID is required' },
        { fn: () => provider.getChapter('KJV', 'GEN', 0), expectedError: 'Invalid chapter number' },
        { fn: () => provider.getVerse('KJV', 'GEN', 1, 0), expectedError: 'Invalid verse number' }
      ];

      for (const errorTest of errorTests) {
        await expect(errorTest.fn()).rejects.toThrow(errorTest.expectedError);
      }

      // Test error response patterns
      const searchResponse = await provider.search({ query: '', translationId: 'KJV' });
      expect(searchResponse.error).toBeDefined();
      expect(searchResponse.error?.message).toContain('Search query is required');

      const parallelResponse = await provider.getParallelVerses('Invalid', ['KJV']);
      expect(parallelResponse.error).toBeDefined();
      expect(parallelResponse.error?.message).toContain('Invalid reference format');
    });

    test('should provide meaningful error messages', async () => {
      try {
        await provider.getTranslation('NONEXISTENT');
        fail('Expected error to be thrown');
      } catch (error) {
        // This tests the try-catch in getTranslation which creates an error response
        // The actual MockBibleProvider method should return an error response, not throw
      }
      
      const response = await provider.getTranslation('NONEXISTENT');
      expect(response.error?.message).toContain('Translation not found: NONEXISTENT');
    });
  });

  describe('content generation', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    test('should generate contextual placeholder content', async () => {
      // Test that content is generated for valid books
      const response = await provider.getVerse('KJV', 'GEN', 1, 1);
      expect(response.data.content).toBeDefined();
      expect(response.data.content.length).toBeGreaterThan(0);
    });

    test('should estimate verse counts reasonably', async () => {
      // Test that generated chapters have reasonable verse counts
      const response = await provider.getChapter('KJV', 'GEN', 1);
      expect(response.data.verses.length).toBeGreaterThan(0);
      expect(response.data.verses.length).toBeLessThan(200); // Reasonable upper bound
    });

    test('should generate unique request IDs', async () => {
      const response1 = await provider.getTranslations();
      const response2 = await provider.getTranslations();
      
      expect(response1.meta?.requestId).toBeDefined();
      expect(response2.meta?.requestId).toBeDefined();
      expect(response1.meta?.requestId).not.toBe(response2.meta?.requestId);
    });
  });
});