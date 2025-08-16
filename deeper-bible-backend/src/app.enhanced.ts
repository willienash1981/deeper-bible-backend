import express, { Express, Request, Response, NextFunction } from 'express';
import { CacheService } from './services/cache/redis.service';
import { CacheMiddleware } from './middleware/cache';
import { CacheMetricsService } from './services/cache/metrics';
import { BibleDataCacheStrategy } from './services/cache/strategies/bible-data.strategy';
import { AIResponseCacheStrategy } from './services/cache/strategies/ai-response.strategy';
import { RedisCircuitBreaker } from './services/circuit-breaker';
import { 
  CacheOperationRateLimiter, 
  CacheInvalidationRateLimiter, 
  CacheWarmingRateLimiter 
} from './middleware/rate-limiter';
import { StructuredLogger, correlationIdMiddleware, measurePerformance } from './services/logger';
import { enhancedRedisConfig, validateCacheKey, validateValueSize } from './config/redis.config.enhanced';

export class EnhancedApp {
  private app: Express;
  private cacheService: CacheService;
  private cacheMiddleware: CacheMiddleware;
  private metricsService: CacheMetricsService;
  private bibleStrategy: BibleDataCacheStrategy;
  private aiStrategy: AIResponseCacheStrategy;
  private circuitBreaker: RedisCircuitBreaker;
  private rateLimiters: {
    operations: CacheOperationRateLimiter;
    invalidation: CacheInvalidationRateLimiter;
    warming: CacheWarmingRateLimiter;
  };
  private logger: StructuredLogger;

  constructor() {
    this.logger = StructuredLogger.create({ component: 'enhanced-app' });
    this.app = express();
    
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupMetrics();
    this.setupErrorHandling();
  }

  private initializeServices(): void {
    this.logger.info('Initializing cache services with enhanced configuration');
    
    this.cacheService = new CacheService();
    this.circuitBreaker = new RedisCircuitBreaker();
    this.cacheMiddleware = new CacheMiddleware(this.cacheService);
    this.metricsService = new CacheMetricsService(this.cacheService);
    this.bibleStrategy = new BibleDataCacheStrategy(this.cacheService);
    this.aiStrategy = new AIResponseCacheStrategy(this.cacheService);
    
    this.rateLimiters = {
      operations: new CacheOperationRateLimiter(this.cacheService),
      invalidation: new CacheInvalidationRateLimiter(this.cacheService),
      warming: new CacheWarmingRateLimiter(this.cacheService),
    };

    // Circuit breaker event handling
    this.circuitBreaker.on('open', (stats) => {
      this.logger.circuitBreakerStateChange('redis', 'closed', 'open');
      this.logger.error('Redis circuit breaker opened', new Error('Circuit breaker protection activated'));
    });

    this.circuitBreaker.on('close', () => {
      this.logger.circuitBreakerStateChange('redis', 'open', 'closed');
      this.logger.info('Redis circuit breaker closed - service recovered');
    });
  }

  private setupMiddleware(): void {
    // Correlation ID middleware (first)
    this.app.use(correlationIdMiddleware());

    // Security headers
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    // Basic middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestLogger = (req as any).logger as StructuredLogger;
      requestLogger.info(`${req.method} ${req.path}`)
        .withMetadata({ 
          method: req.method, 
          path: req.path,
          userAgent: req.headers['user-agent'],
          ip: req.ip 
        });
      next();
    });

    // Rate limiting for cache operations
    this.app.use('/api/cache/*', this.rateLimiters.operations.middleware());
  }

  private setupRoutes(): void {
    // Enhanced health check with detailed information
    this.app.get('/health', async (req: Request, res: Response): Promise<void> => {
      const requestLogger = (req as any).logger as StructuredLogger;
      
      try {
        const [isHealthy, circuitBreakerStats] = await Promise.all([
          this.circuitBreaker.executeRedisOperation(() => this.cacheService.healthCheck()),
          Promise.resolve(this.circuitBreaker.getStats())
        ]);

        const stats = this.cacheService.getStats();
        const metricsReport = this.metricsService.generateReport();

        const healthInfo = {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          cache: {
            connected: isHealthy || false,
            stats,
            circuitBreaker: circuitBreakerStats,
          },
          metrics: metricsReport.summary,
          recommendations: metricsReport.recommendations,
        };

        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json(healthInfo);

        requestLogger.info('Health check completed')
          .withMetadata({ healthy: isHealthy, statusCode });

      } catch (error) {
        requestLogger.error('Health check failed', error as Error);
        res.status(503).json({
          status: 'unhealthy',
          error: 'Health check failed',
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Enhanced metrics endpoint
    this.app.get('/metrics', (req: Request, res: Response): void => {
      const requestLogger = (req as any).logger as StructuredLogger;
      
      try {
        const report = this.metricsService.generateReport();
        const detailedMetrics = {
          ...report,
          circuitBreaker: this.circuitBreaker.getStats(),
          rateLimiting: {
            operations: this.rateLimiters.operations.getRemainingRequests(req),
            invalidation: this.rateLimiters.invalidation.getRemainingRequests(req),
            warming: this.rateLimiters.warming.getRemainingRequests(req),
          },
        };

        res.json(detailedMetrics);
        requestLogger.info('Metrics retrieved successfully');
      } catch (error) {
        requestLogger.error('Failed to retrieve metrics', error as Error);
        res.status(500).json({ error: 'Failed to retrieve metrics' });
      }
    });

    // Enhanced cache invalidation with validation and rate limiting
    this.app.post('/api/cache/invalidate', 
      this.rateLimiters.invalidation.middleware(),
      async (req: Request, res: Response): Promise<void> => {
        const requestLogger = (req as any).logger as StructuredLogger
          .withOperation('cache_invalidate');

        try {
          const { pattern } = req.body;

          if (!pattern || typeof pattern !== 'string') {
            res.status(400).json({ error: 'Valid pattern is required' });
            return;
          }

          if (!validateCacheKey(pattern)) {
            res.status(400).json({ error: 'Invalid cache pattern' });
            return;
          }

          const deleted = await measurePerformance(
            requestLogger,
            'cache_invalidate',
            () => this.circuitBreaker.executeRedisOperation(
              () => this.cacheService.delete(pattern),
              'invalidate'
            )
          );

          res.json({ 
            deleted: deleted || 0, 
            pattern,
            timestamp: new Date().toISOString()
          });

          requestLogger.cacheDelete(pattern, deleted || 0);

        } catch (error) {
          requestLogger.cacheError('invalidate', error as Error);
          res.status(500).json({ error: 'Cache invalidation failed' });
        }
      }
    );

    // Enhanced cache warming with validation and rate limiting
    this.app.post('/api/cache/warm',
      this.rateLimiters.warming.middleware(),
      async (req: Request, res: Response): Promise<void> => {
        const requestLogger = (req as any).logger as StructuredLogger
          .withOperation('cache_warm');

        try {
          const { type, data } = req.body;

          if (!type || !data) {
            res.status(400).json({ error: 'Type and data are required' });
            return;
          }

          // Validate data size
          if (!validateValueSize(data)) {
            res.status(400).json({ error: 'Data size exceeds maximum allowed' });
            return;
          }

          let warmedCount = 0;

          switch (type) {
            case 'bible':
              await measurePerformance(
                requestLogger,
                'bible_cache_warm',
                () => this.bibleStrategy.warmBibleBook(
                  data.book,
                  data.translation,
                  data.chapters
                )
              );
              warmedCount = data.chapters?.length || 0;
              break;

            case 'ai':
              await measurePerformance(
                requestLogger,
                'ai_cache_warm',
                () => this.aiStrategy.warmFrequentPrompts(new Map(data.prompts))
              );
              warmedCount = data.prompts?.length || 0;
              break;

            default:
              res.status(400).json({ error: 'Invalid warm type' });
              return;
          }

          res.json({ 
            message: 'Cache warmed successfully', 
            type,
            warmedCount,
            timestamp: new Date().toISOString()
          });

          requestLogger.info('Cache warming completed')
            .withMetadata({ type, warmedCount });

        } catch (error) {
          requestLogger.cacheError('warm', error as Error);
          res.status(500).json({ error: 'Cache warming failed' });
        }
      }
    );

    // Enhanced Bible API with comprehensive caching
    this.app.get(
      '/api/bible/:translation/:book/:chapter',
      this.cacheMiddleware.cache({
        ttl: 604800, // 1 week
        keyGenerator: (req) => {
          const key = `bible:${req.params.translation}:${req.params.book}:${req.params.chapter}`;
          return validateCacheKey(key) ? key : `bible:sanitized:${Date.now()}`;
        },
        condition: (_req, res) => res.statusCode === 200,
      }),
      async (req: Request, res: Response): Promise<void> => {
        const requestLogger = (req as any).logger as StructuredLogger
          .withOperation('bible_chapter_fetch');

        try {
          // Simulate Bible data fetch (in real app, this would query a database)
          const chapterData = {
            translation: req.params.translation,
            book: req.params.book,
            chapter: parseInt(req.params.chapter),
            verses: [
              {
                verse: 1,
                text: `Sample verse from ${req.params.book} ${req.params.chapter}:1`,
              }
            ],
            cached: true,
            timestamp: new Date().toISOString(),
          };

          res.json(chapterData);

          requestLogger.info('Bible chapter served')
            .withMetadata({ 
              translation: req.params.translation,
              book: req.params.book,
              chapter: req.params.chapter
            });

        } catch (error) {
          requestLogger.error('Bible chapter fetch failed', error as Error);
          res.status(500).json({ error: 'Failed to fetch Bible chapter' });
        }
      }
    );

    // Circuit breaker status endpoint
    this.app.get('/api/circuit-breaker/status', (req: Request, res: Response): void => {
      const stats = this.circuitBreaker.getStats();
      res.json(stats);
    });

    // Circuit breaker control endpoints (for testing/admin)
    this.app.post('/api/circuit-breaker/reset', (req: Request, res: Response): void => {
      this.circuitBreaker.forceClose();
      res.json({ message: 'Circuit breaker reset to closed state' });
    });
  }

  private setupMetrics(): void {
    this.metricsService.startCollection(60000); // 1 minute intervals

    this.metricsService.on('alert', (alert) => {
      this.logger.warn(`Cache alert: ${alert.message}`)
        .withMetadata({ level: alert.level, alert });
    });

    this.metricsService.on('metrics', (metrics) => {
      this.logger.debug('Cache metrics collected')
        .withMetadata({ 
          hitRate: metrics.hitRate, 
          memoryMB: Math.round(metrics.memoryUsage / 1024 / 1024),
          keyCount: metrics.keyCount
        });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
      const requestLogger = (req as any).logger as StructuredLogger;
      
      requestLogger.error('Unhandled request error', error);

      res.status(500).json({
        error: 'Internal server error',
        correlationId: req.headers['x-correlation-id'],
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      const requestLogger = (req as any).logger as StructuredLogger;
      
      requestLogger.warn('Route not found')
        .withMetadata({ path: req.path, method: req.method });

      res.status(404).json({
        error: 'Route not found',
        path: req.path,
        timestamp: new Date().toISOString(),
      });
    });
  }

  public getExpressApp(): Express {
    return this.app;
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down enhanced cache service');
    
    try {
      this.metricsService.stopCollection();
      await this.cacheService.disconnect();
      this.logger.info('Shutdown completed successfully');
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
    }
  }

  // Health check for external monitoring
  public async isHealthy(): Promise<boolean> {
    try {
      return await this.circuitBreaker.executeRedisOperation(
        () => this.cacheService.healthCheck()
      ) || false;
    } catch {
      return false;
    }
  }
}

export default EnhancedApp;