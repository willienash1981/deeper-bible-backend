import redisClient from '../config/redis';

export class LLMCacheService {
  private readonly CACHE_PREFIX = 'llm_analysis:';

  async set(key: string, value: string, ttlSeconds: number = 2592000): Promise<void> { // Default 30 days
    await redisClient.setEx(`${this.CACHE_PREFIX}${key}`, ttlSeconds, value);
  }

  async get(key: string): Promise<string | null> {
    return redisClient.get(`${this.CACHE_PREFIX}${key}`);
  }

  async del(key: string): Promise<void> {
    await redisClient.del(`${this.CACHE_PREFIX}${key}`);
  }

  async exists(key: string): Promise<boolean> {
    const result = await redisClient.exists(`${this.CACHE_PREFIX}${key}`);
    return result === 1;
  }
}