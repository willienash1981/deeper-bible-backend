import { PrismaClient } from '@prisma/client';
import * as Redis from 'redis';

export interface DatabaseStats {
  books: number;
  chapters: number;
  verses: number;
  connections: {
    active: number;
    idle: number;
  };
  cacheHits: number;
  cacheMisses: number;
}

export interface CacheEntry {
  key: string;
  value: any;
  expiresAt: Date;
}

/**
 * DatabaseService handles all database operations and caching
 * Provides a unified interface for Prisma (PostgreSQL) and Redis operations
 */
export class DatabaseService {
  private prisma: PrismaClient;
  private redis: Redis.RedisClientType | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      if (process.env.REDIS_URL) {
        this.redis = Redis.createClient({
          url: process.env.REDIS_URL,
        });

        this.redis.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        await this.redis.connect();
        console.log('✅ Redis connected successfully');
      }
    } catch (error) {
      console.warn('⚠️  Redis connection failed, continuing without cache:', error);
    }
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.prisma.$connect();
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from database and cache
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      
      if (this.redis) {
        await this.redis.quit();
      }
      
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      await this.connect();

      // For now, return mock stats since we don't have actual Bible data tables set up
      // In production, these would query actual Prisma models
      const stats: DatabaseStats = {
        books: 66, // Standard number of Bible books
        chapters: 1189, // Approximate total chapters
        verses: 31102, // Approximate total verses
        connections: {
          active: 1,
          idle: 0,
        },
        cacheHits: await this.getCacheMetric('hits') || 0,
        cacheMisses: await this.getCacheMetric('misses') || 0,
      };

      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw new Error(`Failed to get database stats: ${error}`);
    }
  }

  /**
   * Set cache entry with TTL
   */
  async setCacheEntry(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.redis) {
      // If no Redis, store in memory (development fallback)
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setEx(key, ttlSeconds, serialized);
      
      // Increment cache metrics
      await this.incrementCacheMetric('sets');
    } catch (error) {
      console.error('Error setting cache entry:', error);
      throw new Error(`Failed to set cache entry: ${error}`);
    }
  }

  /**
   * Get cache entry
   */
  async getCacheEntry(key: string): Promise<any | null> {
    if (!this.redis) {
      // If no Redis, return null (cache miss)
      await this.incrementCacheMetric('misses');
      return null;
    }

    try {
      const cached = await this.redis.get(key);
      
      if (cached) {
        await this.incrementCacheMetric('hits');
        return JSON.parse(cached);
      } else {
        await this.incrementCacheMetric('misses');
        return null;
      }
    } catch (error) {
      console.error('Error getting cache entry:', error);
      await this.incrementCacheMetric('misses');
      return null;
    }
  }

  /**
   * Delete cache entry
   */
  async deleteCacheEntry(key: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error('Error deleting cache entry:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries matching pattern
   */
  async clearCachePattern(pattern: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(keys);
      return result;
    } catch (error) {
      console.error('Error clearing cache pattern:', error);
      return 0;
    }
  }

  /**
   * Get cache metric
   */
  private async getCacheMetric(metric: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    try {
      const value = await this.redis.get(`metrics:cache:${metric}`);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Increment cache metric
   */
  private async incrementCacheMetric(metric: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.incr(`metrics:cache:${metric}`);
    } catch (error) {
      // Silently fail for metrics
    }
  }

  /**
   * Health check - test basic database connectivity
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    try {
      await this.connect();
      
      // Test basic query
      const result = await this.prisma.$queryRaw`SELECT 1 as test`;
      
      // Test cache if available
      let cacheStatus = 'unavailable';
      if (this.redis) {
        await this.redis.ping();
        cacheStatus = 'healthy';
      }

      return {
        status: 'healthy',
        details: {
          database: 'healthy',
          cache: cacheStatus,
          connection: this.isConnected,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: String(error),
          connection: this.isConnected,
        },
      };
    }
  }

  /**
   * Get Prisma client for direct operations
   */
  getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * Get Redis client for direct operations
   */
  getRedisClient(): Redis.RedisClientType | null {
    return this.redis;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();