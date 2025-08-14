import NodeEnvironment from 'jest-environment-node';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

class E2ETestEnvironment extends NodeEnvironment {
  private prisma: PrismaClient | null = null;
  private redis: Redis | null = null;

  constructor(config: any, context: any) {
    super(config, context);
  }

  async setup() {
    await super.setup();

    // Initialize database connection
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/deeper_bible_test'
        }
      }
    });

    // Initialize Redis connection
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 1 // Use database 1 for tests
    });

    // Make connections available to tests
    this.global.prisma = this.prisma;
    this.global.redis = this.redis;

    // Set environment variables
    this.global.process.env.NODE_ENV = 'test';
    this.global.process.env.JWT_SECRET = 'test-jwt-secret';
    this.global.process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/deeper_bible_test';
    this.global.process.env.REDIS_URL = 'redis://localhost:6379/1';
  }

  async teardown() {
    // Clean up connections
    if (this.prisma) {
      await this.prisma.$disconnect();
    }

    if (this.redis) {
      this.redis.disconnect();
    }

    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

export default E2ETestEnvironment;