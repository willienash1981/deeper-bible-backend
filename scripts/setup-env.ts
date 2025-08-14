#!/usr/bin/env ts-node

/**
 * Environment Setup Script
 * 
 * This script sets up the required environment variables for the security scripts
 */

import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔧 Setting up environment for security scripts...');

  // Read secrets from files
  const secretsDir = path.join(process.cwd(), '.secrets');
  
  if (!fs.existsSync(secretsDir)) {
    console.error('❌ Secrets directory not found. Please run the setup command first.');
    process.exit(1);
  }

  // Set environment variables from secret files
  const secrets = {
    DB_PASSWORD: fs.readFileSync(path.join(secretsDir, 'db_password.txt'), 'utf8').trim(),
    TEST_DB_PASSWORD: fs.readFileSync(path.join(secretsDir, 'test_db_password.txt'), 'utf8').trim(),
    REDIS_PASSWORD: fs.readFileSync(path.join(secretsDir, 'redis_password.txt'), 'utf8').trim(),
    JWT_SECRET: fs.readFileSync(path.join(secretsDir, 'jwt_secret.txt'), 'utf8').trim(),
    ENCRYPTION_KEY: fs.readFileSync(path.join(secretsDir, 'encryption_key.txt'), 'utf8').trim(),
  };

  // Set environment variables
  Object.entries(secrets).forEach(([key, value]) => {
    process.env[key] = value;
  });

  // Create basic environment configuration
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = `postgresql://postgres:${secrets.DB_PASSWORD}@localhost:5434/deeper_bible?schema=public`;
  process.env.TEST_DATABASE_URL = `postgresql://postgres:${secrets.TEST_DB_PASSWORD}@localhost:5435/deeper_bible_test?schema=public`;
  process.env.REDIS_URL = `redis://:${secrets.REDIS_PASSWORD}@localhost:6379`;

  console.log('✅ Environment variables set successfully');
  
  return secrets;
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Environment setup failed:', error);
    process.exit(1);
  });
}

export { main as setupEnvironment };