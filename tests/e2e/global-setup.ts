import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import Redis from 'ioredis';

const execAsync = promisify(exec);

async function globalSetup() {
  console.log('🚀 Starting E2E test environment setup...');

  try {
    // Start Docker containers if not running
    console.log('📦 Checking Docker containers...');
    await execAsync('docker-compose up -d postgres redis');
    
    // Wait for services to be ready
    await waitForPostgres();
    await waitForRedis();
    
    // Run database migrations
    console.log('🗄️ Running database migrations...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    await execAsync('npx prisma migrate deploy');
    
    // Seed test data
    console.log('🌱 Seeding test data...');
    await seedTestData(prisma);
    
    await prisma.$disconnect();
    
    console.log('✅ E2E test environment ready!');
  } catch (error) {
    console.error('❌ Failed to set up E2E test environment:', error);
    throw error;
  }
}

async function waitForPostgres(maxAttempts = 30) {
  console.log('⏳ Waiting for PostgreSQL...');
  const prisma = new PrismaClient();
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await prisma.$connect();
      await prisma.$disconnect();
      console.log('✅ PostgreSQL is ready');
      return;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error('PostgreSQL failed to start');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function waitForRedis(maxAttempts = 30) {
  console.log('⏳ Waiting for Redis...');
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    retryStrategy: () => null
  });
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await redis.ping();
      redis.disconnect();
      console.log('✅ Redis is ready');
      return;
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw new Error('Redis failed to start');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

async function seedTestData(prisma: PrismaClient) {
  // Seed symbols
  const symbols = [
    { name: 'Cross', category: 'object', frequency: 100 },
    { name: 'Light', category: 'nature', frequency: 200 },
    { name: 'Water', category: 'nature', frequency: 150 },
    { name: 'Bread', category: 'object', frequency: 80 },
    { name: 'Lion', category: 'animal', frequency: 50 }
  ];
  
  for (const symbol of symbols) {
    await prisma.symbol.upsert({
      where: { name: symbol.name },
      update: {},
      create: {
        ...symbol,
        meanings: [
          {
            context: 'General',
            interpretation: `Symbolic meaning of ${symbol.name}`,
            references: ['Genesis 1:1']
          }
        ]
      }
    });
  }
  
  // Create test admin user
  await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      username: 'admin',
      password: '$2b$10$K7L1OJ0TfPIoUx9YI4.YJOmFpLZCgXfLCOLhPREqQxPIOonWMC/Hy', // 'admin123'
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User'
    }
  });
  
  console.log('✅ Test data seeded successfully');
}

export default globalSetup;