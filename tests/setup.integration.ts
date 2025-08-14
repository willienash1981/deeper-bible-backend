import './setup';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Connect to test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  await prisma.$connect();
  
  // Connect to test Redis
  redis = new Redis(process.env.REDIS_URL!);
  
  // Clean database before tests
  await cleanDatabase();
});

afterAll(async () => {
  // Clean up connections
  await prisma.$disconnect();
  redis.disconnect();
});

beforeEach(async () => {
  // Start transaction for each test
  await prisma.$executeRaw`BEGIN`;
});

afterEach(async () => {
  // Rollback transaction after each test
  await prisma.$executeRaw`ROLLBACK`;
  
  // Clear Redis cache
  await redis.flushdb();
});

async function cleanDatabase() {
  // Clean all tables in correct order to respect foreign keys
  const tables = [
    'analysis_feedback',
    'analysis',
    'user_sessions',
    'user_preferences',
    'users',
    'symbols',
    'cross_references'
  ];
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`);
  }
}

export { prisma, redis };