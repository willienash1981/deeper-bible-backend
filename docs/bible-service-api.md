# Bible Data Service API Documentation

## Overview

The Bible Data Service provides a comprehensive, scalable, and extensible solution for accessing Bible content. Built with TypeScript and following the adapter pattern, it supports multiple data sources with transparent caching, error handling, and retry mechanisms.

## Architecture

### Core Components

1. **Interfaces** (`src/types/bible.types.ts`)
   - Comprehensive type definitions for all Bible data structures
   - 20+ interfaces covering books, chapters, verses, translations, and metadata

2. **Base Provider** (`src/services/bible/BibleDataProvider.base.ts`)
   - Abstract base class with common functionality
   - Error handling, validation, retry logic, and utilities

3. **Provider Interface** (`src/services/bible/BibleDataProvider.interface.ts`)
   - Contract definition for all Bible data providers
   - Extended interfaces for caching and offline support

4. **Factory Pattern** (`src/services/bible/BibleProviderFactory.ts`)
   - Singleton factory for creating and managing providers
   - Support for custom providers and composite patterns

5. **Cache System** (`src/services/bible/cache/`)
   - LRU cache with TTL support
   - Automatic cleanup and statistics tracking
   - Cache warming for performance optimization

6. **Providers** (`src/services/bible/providers/`)
   - MockBibleProvider: Full-featured mock for development
   - CachedBibleProvider: Transparent caching wrapper
   - ScriptureApiBibleProvider: (Future) API.Bible integration

## Quick Start

### Basic Usage

```typescript
import { bibleProviderFactory, BibleProviderType } from './services/bible';

// Create a cached mock provider
const bibleService = bibleProviderFactory.createCached(BibleProviderType.MOCK, {
  cacheEnabled: true,
  maxCacheSize: 1000
});

// Initialize the provider
await bibleService.initialize();

// Get all translations
const translations = await bibleService.getTranslations();

// Get a specific verse
const verse = await bibleService.getVerse('NIV', 'JHN', 3, 16);
console.log(verse.data.content); // "For God so loved the world..."

// Search for verses
const results = await bibleService.search({
  query: 'love',
  translationId: 'NIV',
  limit: 10
});
```

### Advanced Usage with Custom Configuration

```typescript
import { CachedBibleProvider, MockBibleProvider } from './services/bible';

// Create base provider
const mockProvider = new MockBibleProvider({
  simulateDelay: true,
  minDelay: 50,
  maxDelay: 200
});

// Wrap with caching
const cachedProvider = new CachedBibleProvider(mockProvider, {
  maxSize: 2000,
  enableWarming: true,
  cacheTTL: {
    books: 7 * 24 * 60 * 60 * 1000,    // 7 days
    chapters: 24 * 60 * 60 * 1000,      // 1 day
    verses: 24 * 60 * 60 * 1000,        // 1 day
    search: 60 * 60 * 1000               // 1 hour
  }
});

await cachedProvider.initialize();

// Pre-warm cache with popular passages
await cachedProvider.warmCache();

// Get cache statistics
const stats = await cachedProvider.getCacheStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);
```

## API Reference

### IBibleDataProvider Interface

#### Core Methods

##### `getTranslations(): Promise<BibleApiResponse<BibleTranslation[]>>`
Retrieves all available Bible translations.

**Returns:** Array of translation objects with metadata

**Example:**
```typescript
const response = await provider.getTranslations();
response.data.forEach(translation => {
  console.log(`${translation.name} (${translation.abbreviation})`);
});
```

##### `getBooks(translationId: string): Promise<BibleApiResponse<BibleBook[]>>`
Gets all books for a specific translation.

**Parameters:**
- `translationId` - Translation identifier (e.g., 'NIV', 'ESV')

**Returns:** Array of book objects with metadata

##### `getChapter(translationId: string, bookId: string, chapterNumber: number): Promise<BibleApiResponse<BibleChapter>>`
Retrieves a complete chapter with all verses.

**Parameters:**
- `translationId` - Translation identifier
- `bookId` - Book identifier (e.g., 'GEN', 'JHN')
- `chapterNumber` - Chapter number (1-based)

**Returns:** Chapter object with all verses

##### `getVerse(translationId: string, bookId: string, chapterNumber: number, verseNumber: number): Promise<BibleApiResponse<BibleVerse>>`
Gets a specific verse.

**Parameters:**
- `translationId` - Translation identifier
- `bookId` - Book identifier
- `chapterNumber` - Chapter number
- `verseNumber` - Verse number (1-based)

**Returns:** Single verse object

##### `getPassage(translationId: string, bookId: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number): Promise<BibleApiResponse<BiblePassage>>`
Retrieves a passage spanning multiple verses or chapters.

**Parameters:**
- All standard identifiers plus start/end positions

**Returns:** Passage object with verse collection

##### `search(params: BibleSearchParams): Promise<BibleApiResponse<BibleSearchResult[]>>`
Searches for verses matching query criteria.

**Parameters:**
```typescript
interface BibleSearchParams {
  query: string;                    // Search terms
  translationId?: string;           // Specific translation
  books?: string[];                 // Limit to specific books
  testament?: 'OT' | 'NT' | 'both'; // Testament filter
  searchType?: 'exact' | 'fuzzy' | 'phrase';
  limit?: number;                   // Result limit
  offset?: number;                  // Pagination offset
}
```

**Returns:** Array of search results with scoring and highlights

##### `getParallelVerses(reference: string, translationIds: string[]): Promise<BibleApiResponse<ParallelBible>>`
Gets the same verses across multiple translations.

**Parameters:**
- `reference` - Bible reference (e.g., "John 3:16", "Romans 8:28-30")
- `translationIds` - Array of translation identifiers

**Returns:** Parallel verse data for comparison

### Cache Management (ICacheableBibleProvider)

##### `clearCache(key?: string): Promise<void>`
Clears cache entries.

**Parameters:**
- `key` - Optional specific key to clear (clears all if not provided)

##### `getCacheStats(): Promise<CacheStats>`
Returns cache performance statistics.

**Returns:**
```typescript
{
  size: number;      // Number of cached entries
  hits: number;      // Cache hits count
  misses: number;    // Cache misses count
  hitRate: number;   // Hit rate percentage
}
```

##### `warmCache(): Promise<void>`
Pre-loads cache with popular Bible passages for improved performance.

## Data Types

### Core Types

#### BibleTranslation
```typescript
interface BibleTranslation {
  id: string;
  name: string;
  abbreviation: string;
  description?: string;
  language: string;
  languageCode: string;
  textDirection: 'ltr' | 'rtl';
  availableFormats: ('text' | 'audio' | 'video')[];
  copyright?: string;
  publisher?: string;
  year?: number;
}
```

#### BibleBook
```typescript
interface BibleBook {
  id: string;
  bookId: string;
  name: string;
  nameLong: string;
  abbreviation: string;
  testament: 'OT' | 'NT';
  genre: BookGenre;
  chapters: number;
  versesCount?: number;
  introduction?: string;
}
```

#### BibleVerse
```typescript
interface BibleVerse {
  id: string;
  bookId: string;
  chapterId: string;
  verseNumber: number;
  reference: string;
  content: string;
  cleanContent?: string;
  words?: Word[];
  crossReferences?: CrossReference[];
  footnotes?: Footnote[];
  highlights?: HighlightTag[];
}
```

### Response Wrapper

All API methods return responses wrapped in:
```typescript
interface BibleApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      total: number;
      limit: number;
      offset: number;
    };
    requestId?: string;
    cached?: boolean;
    responseTime?: number;
  };
  error?: BibleApiError;
}
```

## Provider Configuration

### Base Configuration
```typescript
interface BibleProviderConfig {
  apiKey?: string;           // API key for external services
  baseUrl?: string;          // API base URL
  timeout?: number;          // Request timeout (ms)
  retryAttempts?: number;    // Number of retry attempts
  retryDelay?: number;       // Base retry delay (ms)
  cacheEnabled?: boolean;    // Enable caching
  cacheTTL?: {              // TTL settings
    books?: number;
    chapters?: number;
    verses?: number;
    search?: number;
  };
}
```

### Mock Provider Configuration
```typescript
interface MockProviderConfig extends BibleProviderConfig {
  simulateDelay?: boolean;   // Simulate network delay
  minDelay?: number;         // Minimum delay (ms)
  maxDelay?: number;         // Maximum delay (ms)
  errorRate?: number;        // Simulated error rate (0-1)
}
```

### Cache Configuration
```typescript
interface CacheConfig {
  maxSize?: number;          // Maximum cache entries
  defaultTTL?: number;       // Default TTL (ms)
  enableWarming?: boolean;   // Auto-warm cache
  cleanupInterval?: number;  // Cleanup interval (ms)
}
```

## Error Handling

### Error Types

#### BibleApiError
```typescript
interface BibleApiError {
  code: string;        // Error code
  message: string;     // Human-readable message
  details?: any;       // Additional error details
  statusCode?: number; // HTTP status code
}
```

### Common Error Codes
- `INVALID_TRANSLATION` - Unknown translation ID
- `INVALID_BOOK` - Unknown book ID
- `INVALID_CHAPTER` - Chapter number out of range
- `INVALID_VERSE` - Verse number out of range
- `NETWORK_ERROR` - Network connectivity issues
- `TIMEOUT_ERROR` - Request timeout
- `CACHE_ERROR` - Cache operation failure
- `VALIDATION_ERROR` - Input validation failure

### Error Handling Best Practices

```typescript
try {
  const response = await provider.getVerse('NIV', 'JHN', 3, 16);
  if (response.error) {
    console.error('API Error:', response.error.message);
    return;
  }
  
  // Process successful response
  console.log(response.data.content);
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Performance Optimization

### Caching Strategy

1. **Hierarchical TTL**
   - Books/Translations: 7 days (rarely change)
   - Chapters/Verses: 1 day (stable content)
   - Search results: 1 hour (may vary)

2. **Cache Warming**
   - Popular passages pre-loaded on startup
   - Configurable warm-up list
   - Background cache refresh

3. **Memory Management**
   - LRU eviction policy
   - Automatic cleanup of expired entries
   - Memory usage monitoring

### Search Optimization

1. **Indexed Search**
   - Pre-indexed common terms
   - Fuzzy search with scoring
   - Result highlighting

2. **Search Types**
   - Exact: Precise word matching
   - Phrase: Multi-word phrase matching
   - Fuzzy: Flexible matching with typos

## Testing

### Test Coverage
- 90%+ code coverage across all components
- Unit tests for all public methods
- Integration tests for provider interactions
- Performance tests for cache operations

### Running Tests
```bash
npm test -- tests/services/bible/ --coverage
```

### Test Files
- `BibleDataProvider.test.ts` - Base provider tests
- `MockBibleProvider.test.ts` - Mock provider tests
- `CacheManager.test.ts` - Cache functionality tests
- `CachedBibleProvider.test.ts` - Cached provider tests
- `BibleProviderFactory.test.ts` - Factory pattern tests

## Extension Points

### Custom Providers

Implement `IBibleDataProvider` interface:

```typescript
class CustomBibleProvider extends BaseBibleDataProvider {
  async initialize(config?: BibleProviderConfig): Promise<void> {
    // Initialize custom provider
  }
  
  async getTranslations(): Promise<BibleApiResponse<BibleTranslation[]>> {
    // Implement custom logic
  }
  
  // ... implement other required methods
}

// Register with factory
bibleProviderFactory.register('custom', CustomBibleProvider);
```

### Custom Cache Implementations

Extend `CacheManager` for custom storage:

```typescript
class RedisCacheManager extends CacheManager {
  // Override methods to use Redis instead of memory
}
```

## Best Practices

### 1. Use Caching
Always use cached providers for production:
```typescript
const provider = bibleProviderFactory.createCached('scripture_api');
```

### 2. Error Handling
Always check for errors in responses:
```typescript
const response = await provider.getVerse('NIV', 'JHN', 3, 16);
if (response.error) {
  // Handle error appropriately
}
```

### 3. Resource Management
Clean up providers when done:
```typescript
await provider.destroy();
```

### 4. Performance Monitoring
Monitor cache statistics:
```typescript
const stats = await cachedProvider.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
```

## Future Enhancements

1. **Real API Providers**
   - Scripture.api.bible integration
   - Bible.com API integration
   - BibleBrain API integration

2. **Advanced Features**
   - Audio Bible support
   - Cross-reference mapping
   - Study notes integration
   - Offline synchronization

3. **Performance Improvements**
   - GraphQL query optimization
   - Response compression
   - Connection pooling
   - CDN integration

## Support

For questions, issues, or contributions:
- Review the test files for usage examples
- Check the type definitions for complete API reference
- Examine the mock provider for implementation patterns
- Refer to error codes for troubleshooting

## License

This Bible Data Service is part of the Deeper Bible project and follows the project's licensing terms.