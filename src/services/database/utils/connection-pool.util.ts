import { PrismaClient } from '@prisma/client';

export interface PoolConfig {
  connectionLimit?: number;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  maxUses?: number;
}

export class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private prismaClient: PrismaClient;
  private config: PoolConfig;
  private connectionCount: number = 0;
  private maxConnections: number;

  private constructor(config?: PoolConfig) {
    this.config = {
      connectionLimit: config?.connectionLimit || 10,
      connectionTimeoutMillis: config?.connectionTimeoutMillis || 5000,
      idleTimeoutMillis: config?.idleTimeoutMillis || 10000,
      maxUses: config?.maxUses || 7500,
    };

    this.maxConnections = this.config.connectionLimit!;
    
    // Initialize Prisma with connection pool settings
    this.prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: this.buildConnectionUrl(),
        },
      },
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error'] 
        : ['error'],
    });

    // Setup event listeners
    this.setupEventListeners();
  }

  public static getInstance(config?: PoolConfig): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager(config);
    }
    return ConnectionPoolManager.instance;
  }

  private buildConnectionUrl(): string {
    const baseUrl = process.env.DATABASE_URL || '';
    const url = new URL(baseUrl);
    
    // Add connection pool parameters
    url.searchParams.set('connection_limit', String(this.config.connectionLimit));
    url.searchParams.set('pool_timeout', String(this.config.connectionTimeoutMillis! / 1000));
    
    return url.toString();
  }

  private setupEventListeners(): void {
    // Monitor connection events (if supported by Prisma in future versions)
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.prismaClient.$connect();
      this.connectionCount++;
      console.log(`Database connected. Active connections: ${this.connectionCount}`);
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prismaClient.$disconnect();
      this.connectionCount = Math.max(0, this.connectionCount - 1);
      console.log(`Database disconnected. Active connections: ${this.connectionCount}`);
    } catch (error) {
      console.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  public getClient(): PrismaClient {
    return this.prismaClient;
  }

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Database operation failed (attempt ${i + 1}/${maxRetries}):`, error);
        
        if (i < maxRetries - 1) {
          await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async healthCheck(): Promise<{
    connected: boolean;
    activeConnections: number;
    maxConnections: number;
    latency: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Execute a simple query to test connection
      await this.prismaClient.$queryRaw`SELECT 1`;
      
      return {
        connected: true,
        activeConnections: this.connectionCount,
        maxConnections: this.maxConnections,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        connected: false,
        activeConnections: this.connectionCount,
        maxConnections: this.maxConnections,
        latency: Date.now() - startTime,
      };
    }
  }

  public async getPoolStats(): Promise<{
    totalConnections: number;
    idleConnections: number;
    waitingRequests: number;
  }> {
    // Note: Prisma doesn't expose detailed pool stats directly
    // This is a simplified version
    return {
      totalConnections: this.connectionCount,
      idleConnections: Math.max(0, this.maxConnections - this.connectionCount),
      waitingRequests: 0, // Would need custom implementation
    };
  }

  public async optimizePool(): Promise<void> {
    // Run database optimization commands
    try {
      await this.prismaClient.$executeRaw`VACUUM ANALYZE`;
      console.log('Database optimization completed');
    } catch (error) {
      console.error('Database optimization failed:', error);
    }
  }
}