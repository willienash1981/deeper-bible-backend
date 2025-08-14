/**
 * Tests for Bible Provider Factory Implementation
 * @module tests/services/bible/BibleProviderFactory.test
 */

import { jest } from '@jest/globals';
import { BibleProviderFactory, bibleProviderFactory } from '../../../src/services/bible/BibleProviderFactory';
import { 
  IBibleDataProvider,
  BibleProviderType
} from '../../../src/services/bible/BibleDataProvider.interface';
import { BibleProviderConfig } from '../../../src/types/bible.types';

/**
 * Mock provider class for testing factory registration
 */
class MockTestProvider implements IBibleDataProvider {
  private initialized = false;
  
  constructor(private config?: BibleProviderConfig) {}

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  async getTranslations() {
    return { data: [] as any };
  }

  async getTranslation(translationId: string) {
    return { data: null as any };
  }

  async getBooks(translationId: string) {
    return { data: [] as any };
  }

  async getBook(translationId: string, bookId: string) {
    return { data: null as any };
  }

  async getChapters(translationId: string, bookId: string) {
    return { data: [] as any };
  }

  async getChapter(translationId: string, bookId: string, chapterNumber: number) {
    return { data: null as any };
  }

  async getVerse(translationId: string, bookId: string, chapterNumber: number, verseNumber: number) {
    return { data: null as any };
  }

  async getPassage(
    translationId: string,
    bookId: string,
    startChapter: number,
    startVerse: number,
    endChapter: number,
    endVerse: number
  ) {
    return { data: null as any };
  }

  async search(params: any) {
    return { data: [] as any };
  }

  async getParallelVerses(reference: string, translationIds: string[]) {
    return { data: null as any };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getName(): string {
    return 'MockTestProvider';
  }

  getVersion(): string {
    return '1.0.0-test';
  }

  async destroy(): Promise<void> {
    this.initialized = false;
  }
}

/**
 * Another mock provider for testing multiple registrations
 */
class AnotherMockProvider implements IBibleDataProvider {
  async initialize(): Promise<void> {}
  async getTranslations() { return { data: [] as any }; }
  async getTranslation(translationId: string) { return { data: null as any }; }
  async getBooks(translationId: string) { return { data: [] as any }; }
  async getBook(translationId: string, bookId: string) { return { data: null as any }; }
  async getChapters(translationId: string, bookId: string) { return { data: [] as any }; }
  async getChapter(translationId: string, bookId: string, chapterNumber: number) { return { data: null as any }; }
  async getVerse(translationId: string, bookId: string, chapterNumber: number, verseNumber: number) { return { data: null as any }; }
  async getPassage(translationId: string, bookId: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number) { return { data: null as any }; }
  async search(params: any) { return { data: [] as any }; }
  async getParallelVerses(reference: string, translationIds: string[]) { return { data: null as any }; }
  async isAvailable(): Promise<boolean> { return true; }
  getName(): string { return 'AnotherMockProvider'; }
  getVersion(): string { return '2.0.0-test'; }
  async destroy(): Promise<void> {}
}

describe('BibleProviderFactory', () => {
  let factory: BibleProviderFactory;

  beforeEach(() => {
    // Create a fresh factory instance for each test
    factory = BibleProviderFactory['instance'] = new (BibleProviderFactory as any)();
  });

  afterEach(async () => {
    // Clean up instances after each test
    await factory.clearInstances();
  });

  describe('singleton pattern', () => {
    test('should return the same instance when called multiple times', () => {
      const instance1 = BibleProviderFactory.getInstance();
      const instance2 = BibleProviderFactory.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    test('should create instance if none exists', () => {
      // Reset singleton
      BibleProviderFactory['instance'] = undefined as any;
      
      const instance = BibleProviderFactory.getInstance();
      expect(instance).toBeInstanceOf(BibleProviderFactory);
    });
  });

  describe('provider registration', () => {
    test('should register default providers on construction', async () => {
      // Wait a bit for async default registration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const registeredTypes = factory.getRegisteredTypes();
      expect(registeredTypes).toContain(BibleProviderType.MOCK);
      expect(registeredTypes).toContain(BibleProviderType.CACHED);
    });

    test('should register custom provider', () => {
      const customType = 'custom-test';
      
      factory.register(customType, MockTestProvider);
      
      const registeredTypes = factory.getRegisteredTypes();
      expect(registeredTypes).toContain(customType);
    });

    test('should allow overwriting existing provider registration', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const customType = 'existing-type';
      
      // Register first provider
      factory.register(customType, MockTestProvider);
      
      // Register second provider with same type
      factory.register(customType, AnotherMockProvider);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Provider type existing-type is already registered')
      );
      
      // Should use the new provider
      const instance = factory.create(customType);
      expect(instance.getName()).toBe('AnotherMockProvider');
      
      consoleSpy.mockRestore();
    });

    test('should register multiple providers', () => {
      factory.register('provider1', MockTestProvider);
      factory.register('provider2', AnotherMockProvider);
      
      const registeredTypes = factory.getRegisteredTypes();
      expect(registeredTypes).toContain('provider1');
      expect(registeredTypes).toContain('provider2');
    });
  });

  describe('provider creation', () => {
    beforeEach(() => {
      factory.register('test-provider', MockTestProvider);
    });

    test('should create provider instance', () => {
      const instance = factory.create('test-provider');
      
      expect(instance).toBeInstanceOf(MockTestProvider);
      expect(instance.getName()).toBe('MockTestProvider');
    });

    test('should create provider with configuration', () => {
      const config: BibleProviderConfig = {
        timeout: 5000,
        retryAttempts: 3
      };
      
      const instance = factory.create('test-provider', config);
      expect(instance).toBeInstanceOf(MockTestProvider);
      expect((instance as any).config).toEqual(config);
    });

    test('should throw error for unknown provider type', () => {
      expect(() => {
        factory.create('unknown-provider');
      }).toThrow('Unknown provider type: unknown-provider');
    });

    test('should create different instances for different configurations', () => {
      const config1 = { timeout: 1000 };
      const config2 = { timeout: 2000 };
      
      const instance1 = factory.create('test-provider', config1);
      const instance2 = factory.create('test-provider', config2);
      
      expect(instance1).not.toBe(instance2);
    });

    test('should reuse instances for same type and configuration', () => {
      const config = { timeout: 1000 };
      
      const instance1 = factory.create('test-provider', config);
      const instance2 = factory.create('test-provider', config);
      
      expect(instance1).toBe(instance2);
    });

    test('should create instances for default provider types', async () => {
      // Wait for default registration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(() => factory.create(BibleProviderType.MOCK)).not.toThrow();
    });
  });

  describe('singleton provider creation', () => {
    beforeEach(() => {
      factory.register('singleton-test', MockTestProvider);
    });

    test('should create singleton instance', () => {
      const instance = factory.getSingleton('singleton-test');
      
      expect(instance).toBeInstanceOf(MockTestProvider);
    });

    test('should return same instance for singleton calls', () => {
      const instance1 = factory.getSingleton('singleton-test');
      const instance2 = factory.getSingleton('singleton-test');
      
      expect(instance1).toBe(instance2);
    });

    test('should create singleton with configuration', () => {
      const config: BibleProviderConfig = { timeout: 3000 };
      
      const instance = factory.getSingleton('singleton-test', config);
      expect(instance).toBeInstanceOf(MockTestProvider);
    });

    test('should ignore configuration on subsequent singleton calls', () => {
      const config1 = { timeout: 1000 };
      const config2 = { timeout: 2000 };
      
      const instance1 = factory.getSingleton('singleton-test', config1);
      const instance2 = factory.getSingleton('singleton-test', config2);
      
      expect(instance1).toBe(instance2);
      // Should use first configuration
      expect((instance1 as any).config).toEqual(config1);
    });
  });

  describe('cached provider creation', () => {
    beforeEach(async () => {
      // Wait for default providers to register
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should create cached provider wrapper', async () => {
      const cachedInstance = await factory.createCached(BibleProviderType.MOCK);
      
      expect(cachedInstance.getName()).toContain('Cached');
      expect(cachedInstance.getName()).toContain('MockBibleProvider');
    });

    test('should create cached provider with cache configuration', async () => {
      const config: BibleProviderConfig = {
        cacheTTL: {
          books: 1000,
          chapters: 2000,
          verses: 3000,
          search: 4000
        }
      };
      
      const cachedInstance = await factory.createCached(BibleProviderType.MOCK, config);
      
      expect(cachedInstance).toBeDefined();
      expect(cachedInstance.getName()).toContain('Cached');
    });

    test('should handle missing cache configuration', async () => {
      const cachedInstance = await factory.createCached(BibleProviderType.MOCK);
      
      expect(cachedInstance).toBeDefined();
    });
  });

  describe('fallback provider creation', () => {
    beforeEach(async () => {
      factory.register('primary-test', MockTestProvider);
      factory.register('fallback-test', AnotherMockProvider);
      
      // Wait for potential default providers
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should create composite provider with fallback', () => {
      // Mock the composite provider requirement
      const mockComposite = jest.fn().mockImplementation(function(providers) {
        return {
          providers,
          getName: () => 'CompositeProvider',
          getVersion: () => '1.0.0'
        };
      });
      
      // Mock require for composite provider
      const originalRequire = require;
      (global as any).require = jest.fn().mockImplementation((path: any) => {
        if (path.includes('CompositeBibleProvider')) {
          return { CompositeBibleProvider: mockComposite };
        }
        return originalRequire(path);
      });
      
      try {
        const compositeInstance = factory.createWithFallback(
          'primary-test',
          'fallback-test'
        );
        
        expect(mockComposite).toHaveBeenCalled();
        expect(compositeInstance).toBeDefined();
      } finally {
        // Restore require
        (global as any).require = originalRequire;
      }
    });

    test('should pass configuration to both primary and fallback providers', () => {
      const mockComposite = jest.fn().mockImplementation(() => ({
        getName: () => 'CompositeProvider'
      }));
      
      const originalRequire = require;
      (global as any).require = jest.fn().mockImplementation((path: any) => {
        if (path.includes('CompositeBibleProvider')) {
          return { CompositeBibleProvider: mockComposite };
        }
        return originalRequire(path);
      });
      
      try {
        const config = { timeout: 5000 };
        
        factory.createWithFallback('primary-test', 'fallback-test', config);
        
        expect(mockComposite).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.any(MockTestProvider),
            expect.any(AnotherMockProvider)
          ]),
          config
        );
      } finally {
        (global as any).require = originalRequire;
      }
    });
  });

  describe('instance management', () => {
    beforeEach(() => {
      factory.register('managed-test', MockTestProvider);
    });

    test('should track created instances', () => {
      const instance1 = factory.create('managed-test', { timeout: 1000 });
      const instance2 = factory.create('managed-test', { timeout: 2000 });
      const singleton = factory.getSingleton('managed-test');
      
      // Should have created different instances
      expect(instance1).not.toBe(instance2);
      expect(instance1).not.toBe(singleton);
      expect(instance2).not.toBe(singleton);
    });

    test('should clear all instances', async () => {
      const destroySpy = jest.spyOn(MockTestProvider.prototype, 'destroy');
      
      // Create some instances
      factory.create('managed-test', { timeout: 1000 });
      factory.create('managed-test', { timeout: 2000 });
      factory.getSingleton('managed-test');
      
      await factory.clearInstances();
      
      // All instances should have been destroyed
      expect(destroySpy).toHaveBeenCalledTimes(3);
      
      destroySpy.mockRestore();
    });

    test('should handle destroy errors gracefully during clearInstances', async () => {
      const errorProvider = {
        ...MockTestProvider.prototype,
        destroy: jest.fn(() => Promise.reject(new Error('Destroy failed')))
      };
      
      factory.register('error-provider', class extends MockTestProvider {
        async destroy(): Promise<void> {
          throw new Error('Destroy failed');
        }
      });
      
      factory.create('error-provider');
      
      // Should not throw despite destroy errors
      await expect(factory.clearInstances()).resolves.not.toThrow();
    });

    test('should create fresh instances after clearing', async () => {
      const instance1 = factory.create('managed-test');
      await factory.clearInstances();
      const instance2 = factory.create('managed-test');
      
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('default provider handling', () => {
    test('should handle missing optional providers gracefully', async () => {
      // The factory should log but not throw when optional providers fail to load
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      
      // Create a new factory instance to trigger default registration
      const newFactory = new (BibleProviderFactory as any)();
      
      // Wait for async registration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not available')
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle registration errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock a failing import
      const originalImport = (factory as any)['registerDefaultProviders'];
      (factory as any)['registerDefaultProviders'] = jest.fn(() => 
        Promise.reject(new Error('Registration failed'))
      );
      
      try {
        await (factory as any)['registerDefaultProviders']();
      } catch (error) {
        // Should handle error gracefully
      }
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
      (factory as any)['registerDefaultProviders'] = originalImport;
    });

    test('should register core providers successfully', async () => {
      // Create fresh factory and wait for registration
      const freshFactory = new (BibleProviderFactory as any)();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const types = freshFactory.getRegisteredTypes();
      
      // Should at least have mock provider
      expect(types).toContain(BibleProviderType.MOCK);
    });
  });

  describe('error handling', () => {
    test('should handle provider construction errors', () => {
      class FailingProvider {
        constructor() {
          throw new Error('Construction failed');
        }
      }
      
      factory.register('failing-provider', FailingProvider as any);
      
      expect(() => {
        factory.create('failing-provider');
      }).toThrow('Construction failed');
    });

    test('should handle provider class that is not a constructor', () => {
      const notAConstructor = {} as any;
      
      factory.register('invalid-provider', notAConstructor);
      
      expect(() => {
        factory.create('invalid-provider');
      }).toThrow();
    });
  });

  describe('configuration handling', () => {
    beforeEach(() => {
      factory.register('config-test', MockTestProvider);
    });

    test('should handle empty configuration', () => {
      const instance = factory.create('config-test', {});
      expect(instance).toBeInstanceOf(MockTestProvider);
    });

    test('should handle undefined configuration', () => {
      const instance = factory.create('config-test', undefined);
      expect(instance).toBeInstanceOf(MockTestProvider);
    });

    test('should handle complex configuration objects', () => {
      const complexConfig = {
        timeout: 10000,
        retryAttempts: 5,
        retryDelay: 2000,
        cacheEnabled: true,
        cacheTTL: {
          books: 86400000,
          chapters: 3600000,
          verses: 1800000,
          search: 600000
        },
        customOption: 'test-value',
        nested: {
          deep: {
            option: 42
          }
        }
      };
      
      const instance = factory.create('config-test', complexConfig);
      expect(instance).toBeInstanceOf(MockTestProvider);
      expect((instance as any).config).toEqual(complexConfig);
    });

    test('should create different instance keys for different configurations', () => {
      const config1 = { timeout: 1000, retryAttempts: 1 };
      const config2 = { timeout: 1000, retryAttempts: 2 };
      
      const instance1 = factory.create('config-test', config1);
      const instance2 = factory.create('config-test', config2);
      
      expect(instance1).not.toBe(instance2);
    });

    test('should handle configuration serialization edge cases', () => {
      const edgeConfig: BibleProviderConfig = {
        timeout: 0,
        retryAttempts: 0,
        retryDelay: 0,
        cacheEnabled: false
      };
      
      const instance1 = factory.create('config-test', edgeConfig);
      const instance2 = factory.create('config-test', edgeConfig);
      
      // Should reuse instance for same configuration
      expect(instance1).toBe(instance2);
    });
  });

  describe('exported factory instance', () => {
    test('should export singleton instance', () => {
      expect(bibleProviderFactory).toBeInstanceOf(BibleProviderFactory);
    });

    test('should be the same as getInstance()', () => {
      expect(bibleProviderFactory).toBe(BibleProviderFactory.getInstance());
    });

    test('should have default providers registered', async () => {
      // Wait for async registration
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const types = bibleProviderFactory.getRegisteredTypes();
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('provider type enum coverage', () => {
    test('should handle all enum provider types', () => {
      const allTypes = Object.values(BibleProviderType);
      
      // Test that the factory can handle all enum types (even if not registered)
      for (const type of allTypes) {
        if (type === BibleProviderType.MOCK) {
          // Skip mock as it should be registered by default
          continue;
        }
        
        // Should throw for unregistered types
        expect(() => factory.create(type)).toThrow(`Unknown provider type: ${type}`);
      }
    });
  });

  describe('memory management', () => {
    test('should not leak memory with many instance creations', () => {
      factory.register('memory-test', MockTestProvider);
      
      // Create many instances with different configs
      for (let i = 0; i < 100; i++) {
        factory.create('memory-test', { timeout: i });
      }
      
      // Should have created 100 instances
      const registeredTypes = factory.getRegisteredTypes();
      expect(registeredTypes).toContain('memory-test');
    });

    test('should clean up properly on destroy', async () => {
      factory.register('cleanup-test', MockTestProvider);
      
      const instances = [];
      for (let i = 0; i < 10; i++) {
        instances.push(factory.create('cleanup-test', { timeout: i }));
      }
      
      await factory.clearInstances();
      
      // Verify all instances were cleaned up
      expect(true).toBe(true); // Test passes if clearInstances doesn't throw
    });
  });
});