import { SecretsManagerService } from '../services/security/secrets-manager.service';
import * as crypto from 'crypto';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
  connectionTimeout: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  encryptionKey: string;
  rateLimitWindow: number;
  rateLimitMax: number;
  corsOrigins: string[];
}

export interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetries: number;
    retryDelayOnFailover: number;
  };
}

export class EnvironmentConfig {
  private secretsManager: SecretsManagerService;
  private static instance: EnvironmentConfig;

  private constructor() {
    this.secretsManager = new SecretsManagerService({
      provider: process.env.SECRETS_PROVIDER as any || 'file',
      region: process.env.AWS_REGION,
      vaultUrl: process.env.VAULT_URL,
      encryptionKey: process.env.ENCRYPTION_KEY,
    });
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  /**
   * Initialize and validate all configuration
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing environment configuration...');

    // Validate secrets configuration
    const validation = await this.secretsManager.validateConfiguration();
    if (!validation.valid) {
      console.error('❌ Secrets validation failed:', validation.errors);
      throw new Error('Invalid secrets configuration');
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Configuration warnings:', validation.warnings);
    }

    // Generate missing secrets
    await this.ensureRequiredSecrets();

    console.log('✅ Environment configuration initialized');
  }

  /**
   * Get database configuration
   */
  async getDatabaseConfig(): Promise<DatabaseConfig> {
    const password = await this.secretsManager.getSecret('DB_PASSWORD');
    if (!password) {
      throw new Error('Database password not found in secrets');
    }

    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434', 10),
      database: process.env.DB_NAME || 'deeper_bible',
      username: process.env.DB_USER || 'postgres',
      password,
      ssl: process.env.DB_SSL === 'true',
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
    };
  }

  /**
   * Get test database configuration
   */
  async getTestDatabaseConfig(): Promise<DatabaseConfig> {
    const password = await this.secretsManager.getSecret('TEST_DB_PASSWORD');
    if (!password) {
      throw new Error('Test database password not found in secrets');
    }

    return {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5435', 10),
      database: process.env.TEST_DB_NAME || 'deeper_bible_test',
      username: process.env.TEST_DB_USER || 'postgres',
      password,
      ssl: false,
      maxConnections: parseInt(process.env.TEST_DB_MAX_CONNECTIONS || '5', 10),
      connectionTimeout: parseInt(process.env.TEST_DB_CONNECTION_TIMEOUT || '3000', 10),
    };
  }

  /**
   * Get security configuration
   */
  async getSecurityConfig(): Promise<SecurityConfig> {
    const jwtSecret = await this.secretsManager.getSecret('JWT_SECRET');
    const encryptionKey = await this.secretsManager.getSecret('ENCRYPTION_KEY');

    if (!jwtSecret || !encryptionKey) {
      throw new Error('Security secrets not found');
    }

    return {
      jwtSecret,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      encryptionKey,
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    };
  }

  /**
   * Get cache configuration
   */
  async getCacheConfig(): Promise<CacheConfig> {
    const redisPassword = await this.secretsManager.getSecret('REDIS_PASSWORD');

    return {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: redisPassword || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
      },
    };
  }

  /**
   * Build secure database URL
   */
  async getDatabaseUrl(isTest: boolean = false): Promise<string> {
    const config = isTest ? await this.getTestDatabaseConfig() : await this.getDatabaseConfig();
    
    const urlParams = new URLSearchParams({
      schema: 'public',
      connection_limit: config.maxConnections.toString(),
      pool_timeout: (config.connectionTimeout / 1000).toString(),
    });

    if (config.ssl) {
      urlParams.set('sslmode', 'require');
    }

    return `postgresql://${config.username}:${encodeURIComponent(config.password)}@${config.host}:${config.port}/${config.database}?${urlParams.toString()}`;
  }

  /**
   * Get all environment variables for Docker
   */
  async getDockerEnvironment(): Promise<Record<string, string>> {
    const dbConfig = await this.getDatabaseConfig();
    const testDbConfig = await this.getTestDatabaseConfig();
    const securityConfig = await this.getSecurityConfig();
    const cacheConfig = await this.getCacheConfig();

    return {
      // Database
      DB_HOST: dbConfig.host,
      DB_PORT: dbConfig.port.toString(),
      DB_NAME: dbConfig.database,
      DB_USER: dbConfig.username,
      DB_PASSWORD: dbConfig.password,
      
      // Test Database
      TEST_DB_HOST: testDbConfig.host,
      TEST_DB_PORT: testDbConfig.port.toString(),
      TEST_DB_NAME: testDbConfig.database,
      TEST_DB_USER: testDbConfig.username,
      TEST_DB_PASSWORD: testDbConfig.password,
      
      // Cache
      REDIS_HOST: cacheConfig.redis.host,
      REDIS_PORT: cacheConfig.redis.port.toString(),
      REDIS_PASSWORD: cacheConfig.redis.password || '',
      
      // Security
      JWT_SECRET: securityConfig.jwtSecret,
      ENCRYPTION_KEY: securityConfig.encryptionKey,
      
      // URLs (built from components)
      DATABASE_URL: await this.getDatabaseUrl(false),
      TEST_DATABASE_URL: await this.getDatabaseUrl(true),
      REDIS_URL: cacheConfig.redis.password 
        ? `redis://:${cacheConfig.redis.password}@${cacheConfig.redis.host}:${cacheConfig.redis.port}`
        : `redis://${cacheConfig.redis.host}:${cacheConfig.redis.port}`,
    };
  }

  /**
   * Ensure all required secrets exist
   */
  private async ensureRequiredSecrets(): Promise<void> {
    const requiredSecrets = [
      { key: 'DB_PASSWORD', generator: () => this.secretsManager.generateDatabasePassword() },
      { key: 'TEST_DB_PASSWORD', generator: () => this.secretsManager.generateDatabasePassword() },
      { key: 'JWT_SECRET', generator: () => crypto.randomBytes(64).toString('hex') },
      { key: 'ENCRYPTION_KEY', generator: () => crypto.randomBytes(32).toString('hex') },
      { key: 'REDIS_PASSWORD', generator: () => this.secretsManager.generateDatabasePassword(24) },
    ];

    for (const secret of requiredSecrets) {
      const existing = await this.secretsManager.getSecret(secret.key);
      if (!existing) {
        console.log(`🔑 Generating missing secret: ${secret.key}`);
        const value = secret.generator();
        await this.secretsManager.setSecret(secret.key, value, true);
      }
    }
  }

  /**
   * Export secure environment file
   */
  async exportEnvironmentFile(filePath: string): Promise<void> {
    const env = await this.getDockerEnvironment();
    
    const envContent = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(filePath, envContent, { mode: 0o600 });
    console.log(`✅ Environment file exported to: ${filePath}`);
  }
}