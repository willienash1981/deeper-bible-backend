import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../services/cache/redis.service';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message: string; // Error message when limit exceeded
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export interface RateLimitInfo {
  totalHits: number;
  totalMisses: number;
  resetTime: Date;
  remainingPoints: number;
}

export class CacheRateLimiter {
  private cacheService: CacheService;
  private config: RateLimitConfig;

  constructor(cacheService: CacheService, config: RateLimitConfig) {
    this.cacheService = cacheService;
    this.config = {
      windowMs: 60000, // 1 minute default
      maxRequests: 100, // 100 requests per minute default
      message: 'Too many cache requests, please try again later.',
      keyGenerator: (req) => `rate_limit:${this.getClientIdentifier(req)}`,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...config,
    };
  }

  private getClientIdentifier(req: Request): string {
    // Priority: API key > User ID > IP address
    const apiKey = req.headers['x-api-key'] as string;
    const userId = req.headers['x-user-id'] as string;
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress;
    
    return apiKey || userId || ip || 'anonymous';
  }

  private async getRateLimitInfo(key: string): Promise<RateLimitInfo | null> {
    try {
      const data = await this.cacheService.get<RateLimitInfo>(key);
      return data;
    } catch (error) {
      console.error('Rate limiter get error:', error);
      return null;
    }
  }

  private async setRateLimitInfo(key: string, info: RateLimitInfo): Promise<void> {
    try {
      const ttlSeconds = Math.ceil(this.config.windowMs / 1000);
      await this.cacheService.set(key, info, { ttl: ttlSeconds });
    } catch (error) {
      console.error('Rate limiter set error:', error);
    }
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!this.config.keyGenerator) {
        return next();
      }

      const key = this.config.keyGenerator(req);
      const now = new Date();
      const windowStart = new Date(now.getTime() - this.config.windowMs);

      try {
        let rateLimitInfo = await this.getRateLimitInfo(key);

        if (!rateLimitInfo || rateLimitInfo.resetTime < windowStart) {
          // Initialize or reset window
          rateLimitInfo = {
            totalHits: 0,
            totalMisses: 0,
            resetTime: new Date(now.getTime() + this.config.windowMs),
            remainingPoints: this.config.maxRequests,
          };
        }

        // Check if limit exceeded
        const totalRequests = rateLimitInfo.totalHits + rateLimitInfo.totalMisses;
        if (totalRequests >= this.config.maxRequests) {
          res.status(429).json({
            error: this.config.message,
            retryAfter: Math.ceil((rateLimitInfo.resetTime.getTime() - now.getTime()) / 1000),
            limit: this.config.maxRequests,
            remaining: 0,
            resetTime: rateLimitInfo.resetTime.toISOString(),
          });
          return;
        }

        // Set response headers
        res.setHeader('X-RateLimit-Limit', this.config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', this.config.maxRequests - totalRequests - 1);
        res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime.getTime() / 1000));

        // Track the request
        const originalSend = res.send;
        const originalJson = res.json;

        const trackRequest = async (isSuccess: boolean): Promise<void> => {
          if (
            (isSuccess && this.config.skipSuccessfulRequests) ||
            (!isSuccess && this.config.skipFailedRequests)
          ) {
            return;
          }

          if (isSuccess) {
            rateLimitInfo!.totalHits++;
          } else {
            rateLimitInfo!.totalMisses++;
          }

          rateLimitInfo!.remainingPoints = Math.max(
            0,
            this.config.maxRequests - (rateLimitInfo!.totalHits + rateLimitInfo!.totalMisses)
          );

          await this.setRateLimitInfo(key, rateLimitInfo!);
        };

        res.send = function(data: any): Response {
          const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
          trackRequest(isSuccess).catch(console.error);
          return originalSend.call(this, data);
        };

        res.json = function(data: any): Response {
          const isSuccess = res.statusCode >= 200 && res.statusCode < 400;
          trackRequest(isSuccess).catch(console.error);
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Rate limiter middleware error:', error);
        // In case of error, allow the request to proceed
        next();
      }
    };
  }

  async getRemainingRequests(req: Request): Promise<number> {
    if (!this.config.keyGenerator) {
      return this.config.maxRequests;
    }

    const key = this.config.keyGenerator(req);
    const info = await this.getRateLimitInfo(key);

    if (!info) {
      return this.config.maxRequests;
    }

    const totalRequests = info.totalHits + info.totalMisses;
    return Math.max(0, this.config.maxRequests - totalRequests);
  }

  async resetLimit(req: Request): Promise<void> {
    if (!this.config.keyGenerator) {
      return;
    }

    const key = this.config.keyGenerator(req);
    await this.cacheService.delete(key);
  }
}

// Specialized rate limiters for different cache operations
export class CacheOperationRateLimiter extends CacheRateLimiter {
  constructor(cacheService: CacheService) {
    super(cacheService, {
      windowMs: 60000, // 1 minute
      maxRequests: 1000, // 1000 cache operations per minute
      message: 'Too many cache operations, please slow down.',
      keyGenerator: (req) => `cache_ops:${this.getClientIdentifier(req)}`,
    });
  }
}

export class CacheInvalidationRateLimiter extends CacheRateLimiter {
  constructor(cacheService: CacheService) {
    super(cacheService, {
      windowMs: 300000, // 5 minutes
      maxRequests: 10, // 10 invalidations per 5 minutes
      message: 'Too many cache invalidation requests.',
      keyGenerator: (req) => `cache_invalidate:${this.getClientIdentifier(req)}`,
    });
  }
}

export class CacheWarmingRateLimiter extends CacheRateLimiter {
  constructor(cacheService: CacheService) {
    super(cacheService, {
      windowMs: 600000, // 10 minutes
      maxRequests: 5, // 5 warming operations per 10 minutes
      message: 'Too many cache warming requests.',
      keyGenerator: (req) => `cache_warm:${this.getClientIdentifier(req)}`,
    });
  }
}