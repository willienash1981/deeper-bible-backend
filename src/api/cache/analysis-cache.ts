import { redisClient } from '../config/redis';

export class AnalysisCache {
  private readonly cachePrefix = 'analysis:';
  private readonly defaultTTL = 3600 * 24 * 7; // 7 days

  generateCacheKey(verseRange: string, promptVersion: string, analysisType: string): string {
    const normalized = this.normalizeVerseRange(verseRange);
    return `${normalized}:${promptVersion}:${analysisType}`;
  }

  normalizeVerseRange(verseRange: string): string {
    // Simple normalization - remove extra spaces and standardize format
    return verseRange.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  async getAnalysis(key: string): Promise<string | null> {
    try {
      const data = await redisClient.get(`${this.cachePrefix}${key}`);
      return data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async setAnalysis(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await redisClient.setEx(
        `${this.cachePrefix}${key}`,
        ttl || this.defaultTTL,
        value
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async get(key: string): Promise<any> {
    try {
      const data = await redisClient.get(`${this.cachePrefix}${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setEx(
        `${this.cachePrefix}${key}`,
        ttl || this.defaultTTL,
        serialized
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redisClient.del(`${this.cachePrefix}${key}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async flush(): Promise<void> {
    try {
      const keys = await redisClient.keys(`${this.cachePrefix}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }
}