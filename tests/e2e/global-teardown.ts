import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import Redis from 'ioredis';

const execAsync = promisify(exec);

async function globalTeardown() {
  console.log('🧹 Cleaning up E2E test environment...');

  try {
    // Clean database
    const prisma = new PrismaClient();
    await prisma.$connect();
    
    // Clean all test data
    await prisma.$executeRaw`TRUNCATE TABLE 
      analysis_feedback,
      analysis,
      user_sessions,
      user_preferences,
      users,
      symbols,
      cross_references
    CASCADE`;
    
    await prisma.$disconnect();
    
    // Clear Redis cache
    const redis = new Redis({
      host: 'localhost',
      port: 6379
    });
    await redis.flushall();
    redis.disconnect();
    
    // Optionally stop Docker containers
    if (process.env.STOP_CONTAINERS === 'true') {
      console.log('🛑 Stopping Docker containers...');
      await execAsync('docker-compose down');
    }
    
    console.log('✅ E2E test environment cleaned up');
  } catch (error) {
    console.error('❌ Failed to clean up E2E test environment:', error);
    // Don't throw to avoid test failures due to cleanup issues
  }
}

export default globalTeardown;