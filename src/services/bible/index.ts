/**
 * Bible Data Service - Main Export Module
 * @module services/bible
 * 
 * This module provides a comprehensive Bible data service with support for
 * multiple data sources, caching, and extensible provider architecture.
 * 
 * @example Basic Usage
 * ```typescript
 * import { bibleProviderFactory, BibleProviderType } from './services/bible';
 * 
 * const provider = bibleProviderFactory.createCached(BibleProviderType.MOCK);
 * await provider.initialize();
 * 
 * const verse = await provider.getVerse('NIV', 'JHN', 3, 16);
 * console.log(verse.data.content);
 * ```
 * 
 * @example Advanced Usage with Custom Configuration
 * ```typescript
 * import { CachedBibleProvider, MockBibleProvider } from './services/bible';
 * 
 * const mockProvider = new MockBibleProvider({
 *   simulateDelay: true,
 *   minDelay: 50,
 *   maxDelay: 200
 * });
 * 
 * const cachedProvider = new CachedBibleProvider(mockProvider, {
 *   maxSize: 2000,
 *   enableWarming: true
 * });
 * 
 * await cachedProvider.initialize();
 * ```
 * 
 * @version 1.0.0
 * @since 2024-08-14
 */

// Core Types and Interfaces
export * from '../../types/bible.types';
export * from './BibleDataProvider.interface';

// Base Classes
export { BaseBibleDataProvider } from './BibleDataProvider.base';

// Factory Pattern
export { BibleProviderFactory, bibleProviderFactory } from './BibleProviderFactory';

// Cache System
export { CacheManager, type CacheStats } from './cache/CacheManager';
export * from './cache';

// Provider Implementations
export { MockBibleProvider } from './providers/MockBibleProvider';
export { CachedBibleProvider } from './providers/CachedBibleProvider';

// Mock Data (for development and testing)
export { 
  BIBLE_BOOKS_DATA, 
  getBookById, 
  getBooksByTestament, 
  getBooksByGenre,
  getTotalVerseCount,
  getTotalChapterCount 
} from './mock/bible-books-data';

export {
  SAMPLE_VERSES,
  getVerseByReference,
  getChapterByReference,
  hasSampleData
} from './mock/sample-verses-data';

/**
 * Provider type constants for easy reference
 */
export enum BibleProviderType {
  MOCK = 'mock',
  SCRIPTURE_API = 'scripture_api',
  BIBLE_COM = 'bible_com',
  BIBLE_BRAIN = 'bible_brain',
  CACHED = 'cached',
  COMPOSITE = 'composite'
}

/**
 * Common configuration defaults
 */
export const DEFAULT_CONFIG = {
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheEnabled: true,
  cacheTTL: {
    books: 7 * 24 * 60 * 60 * 1000,      // 7 days
    chapters: 24 * 60 * 60 * 1000,        // 1 day
    verses: 24 * 60 * 60 * 1000,          // 1 day
    search: 60 * 60 * 1000                // 1 hour
  }
} as const;

/**
 * Popular Bible verses for cache warming
 */
export const POPULAR_VERSES = [
  { reference: 'John 3:16', book: 'JHN', chapter: 3, verse: 16 },
  { reference: 'Psalm 23:1', book: 'PSA', chapter: 23, verse: 1 },
  { reference: 'Romans 8:28', book: 'ROM', chapter: 8, verse: 28 },
  { reference: 'Philippians 4:13', book: 'PHP', chapter: 4, verse: 13 },
  { reference: 'Jeremiah 29:11', book: 'JER', chapter: 29, verse: 11 },
  { reference: 'Proverbs 3:5', book: 'PRO', chapter: 3, verse: 5 },
  { reference: '1 Corinthians 13:4', book: '1CO', chapter: 13, verse: 4 },
  { reference: 'Matthew 28:19', book: 'MAT', chapter: 28, verse: 19 }
] as const;

/**
 * Bible book genres for categorization
 */
export const BOOK_GENRES = {
  LAW: 'Law',
  HISTORICAL: 'Historical',
  WISDOM: 'Wisdom',
  PROPHETIC: 'Prophetic',
  GOSPEL: 'Gospel',
  EPISTLE: 'Epistle',
  APOCALYPTIC: 'Apocalyptic'
} as const;

/**
 * Testament identifiers
 */
export const TESTAMENTS = {
  OLD: 'OT',
  NEW: 'NT'
} as const;

/**
 * Search type constants
 */
export const SEARCH_TYPES = {
  EXACT: 'exact',
  PHRASE: 'phrase',
  FUZZY: 'fuzzy'
} as const;

/**
 * Utility function to create a basic Bible service
 * 
 * @param providerType - The type of provider to create
 * @param config - Optional configuration
 * @returns Promise<IBibleDataProvider> - Configured Bible service
 * 
 * @example
 * ```typescript
 * const bibleService = await createBibleService('mock', {
 *   cacheEnabled: true,
 *   simulateDelay: false
 * });
 * 
 * const verse = await bibleService.getVerse('NIV', 'JHN', 3, 16);
 * ```
 */
export async function createBibleService(
  providerType: keyof typeof BibleProviderType = 'MOCK',
  config?: any
): Promise<any> {
  const { bibleProviderFactory: factory } = await import('./BibleProviderFactory');
  const provider = await factory.createCached(
    BibleProviderType[providerType], 
    { ...DEFAULT_CONFIG, ...config }
  );
  
  await provider.initialize();
  return provider;
}

/**
 * Utility function to validate Bible references
 * 
 * @param reference - Bible reference string (e.g., "John 3:16")
 * @returns Object with parsed components or null if invalid
 * 
 * @example
 * ```typescript
 * const parsed = parseReference("John 3:16");
 * if (parsed) {
 *   console.log(parsed.book); // "John"
 *   console.log(parsed.chapter); // 3
 *   console.log(parsed.verse); // 16
 * }
 * ```
 */
export function parseReference(reference: string): {
  book: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
} | null {
  const regex = /^([\w\s]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/;
  const match = reference.trim().match(regex);

  if (!match) return null;

  return {
    book: match[1].trim(),
    chapter: parseInt(match[2]),
    verse: match[3] ? parseInt(match[3]) : undefined,
    endVerse: match[4] ? parseInt(match[4]) : undefined
  };
}

/**
 * Utility function to format Bible references
 * 
 * @param book - Book name
 * @param chapter - Chapter number
 * @param verse - Verse number (optional)
 * @param endVerse - End verse for ranges (optional)
 * @returns Formatted reference string
 * 
 * @example
 * ```typescript
 * formatReference("John", 3, 16); // "John 3:16"
 * formatReference("John", 3, 16, 17); // "John 3:16-17"
 * formatReference("John", 3); // "John 3"
 * ```
 */
export function formatReference(
  book: string,
  chapter: number,
  verse?: number,
  endVerse?: number
): string {
  let reference = `${book} ${chapter}`;
  
  if (verse) {
    reference += `:${verse}`;
    if (endVerse && endVerse !== verse) {
      reference += `-${endVerse}`;
    }
  }
  
  return reference;
}

/**
 * Type guard for checking if a response has an error
 * 
 * @param response - API response to check
 * @returns Boolean indicating if response contains an error
 */
export function hasError<T>(response: any): response is { error: any } {
  return response && typeof response === 'object' && 'error' in response && response.error;
}

/**
 * Type guard for checking if a response is successful
 * 
 * @param response - API response to check
 * @returns Boolean indicating if response is successful
 */
export function isSuccessful<T>(response: any): response is { data: T } {
  return response && typeof response === 'object' && 'data' in response && !response.error;
}