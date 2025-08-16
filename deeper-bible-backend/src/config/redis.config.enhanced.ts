import { RedisOptions } from 'ioredis';

export interface SecurityConfig {
  enableAuth: boolean;
  password?: string;
  enableTLS: boolean;
  maxConnections: number;
  idleTimeout: number;
}

export interface CacheSecurityConfig {
  enableKeyEncryption: boolean;
  keySanitization: boolean;
  maxKeyLength: number;
  maxValueSize: number;
  allowedKeyPatterns: RegExp[];
  rateLimiting: {
    enabled: boolean;
    maxOperationsPerSecond: number;
    burstLimit: number;
  };
}

export const securityConfig: SecurityConfig = {
  enableAuth: process.env.NODE_ENV === 'production',
  password: process.env.REDIS_PASSWORD,
  enableTLS: process.env.REDIS_TLS === 'true',
  maxConnections: parseInt(process.env.REDIS_MAX_CONNECTIONS || '10'),
  idleTimeout: parseInt(process.env.REDIS_IDLE_TIMEOUT || '60000'),
};

export const cacheSecurityConfig: CacheSecurityConfig = {
  enableKeyEncryption: process.env.CACHE_ENCRYPT_KEYS === 'true',
  keySanitization: true,
  maxKeyLength: 250, // Redis max key length is 512MB, but we limit for sanity
  maxValueSize: 10 * 1024 * 1024, // 10MB max value size
  allowedKeyPatterns: [
    /^cache:[a-zA-Z0-9:_-]+$/, // Standard cache keys
    /^bible:[a-zA-Z0-9:_-]+$/, // Bible cache keys
    /^ai:[a-zA-Z0-9:_-]+$/, // AI cache keys
    /^user:[a-zA-Z0-9:_-]+$/, // User cache keys
  ],
  rateLimiting: {
    enabled: process.env.NODE_ENV === 'production',
    maxOperationsPerSecond: parseInt(process.env.CACHE_RATE_LIMIT || '1000'),
    burstLimit: parseInt(process.env.CACHE_BURST_LIMIT || '100'),
  },
};

export const enhancedRedisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: securityConfig.enableAuth ? securityConfig.password : undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  
  // Security settings
  ...(securityConfig.enableTLS && {
    tls: {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
      servername: process.env.REDIS_TLS_SERVERNAME,
    },
  }),
  
  // Connection management
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  disconnectTimeout: 2000,
  commandTimeout: 5000,
  lazyConnect: false,
  keepAlive: 30000,
  noDelay: true,
  
  // Security: Limit connection pool
  family: 4,
  maxLoadingTimeout: 5000,
  ...(securityConfig.maxConnections && {
    maxRetriesPerRequest: securityConfig.maxConnections,
  }),
};

export const cacheConfig = {
  defaultTTL: 300, // 5 minutes in seconds
  bibleDataTTL: 604800, // 1 week in seconds
  aiResponseTTL: 86400, // 1 day in seconds
  userDataTTL: 300, // 5 minutes in seconds
  maxCacheSize: 536870912, // 512MB in bytes
  compressionThreshold: 1024, // Compress values larger than 1KB
  
  // Security limits
  maxKeyLength: cacheSecurityConfig.maxKeyLength,
  maxValueSize: cacheSecurityConfig.maxValueSize,
  
  // Rate limiting
  rateLimiting: cacheSecurityConfig.rateLimiting,
};

export function validateCacheKey(key: string): boolean {
  // Length check
  if (key.length > cacheSecurityConfig.maxKeyLength) {
    return false;
  }
  
  // Sanitization check
  if (cacheSecurityConfig.keySanitization) {
    // Check for dangerous characters
    if (/[<>\"'&\0\r\n]/.test(key)) {
      return false;
    }
  }
  
  // Pattern validation
  if (cacheSecurityConfig.allowedKeyPatterns.length > 0) {
    return cacheSecurityConfig.allowedKeyPatterns.some(pattern => pattern.test(key));
  }
  
  return true;
}

export function sanitizeCacheKey(key: string): string {
  if (!cacheSecurityConfig.keySanitization) {
    return key;
  }
  
  // Remove dangerous characters and normalize
  return key
    .replace(/[<>\"'&\0\r\n]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, cacheSecurityConfig.maxKeyLength);
}

export function validateValueSize(value: any): boolean {
  const serialized = JSON.stringify(value);
  return serialized.length <= cacheSecurityConfig.maxValueSize;
}