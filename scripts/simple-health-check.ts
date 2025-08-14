#!/usr/bin/env ts-node

/**
 * Simple Health Check Script
 * 
 * This script performs basic health checks without complex dependencies
 */

import { setupEnvironment } from './setup-env';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🏥 Starting Simple Health Check...\n');

  try {
    // Setup environment
    await setupEnvironment();

    // Check Docker Compose
    console.log('1️⃣  Checking Docker Compose Configuration...');
    checkDockerCompose();

    // Check secrets
    console.log('2️⃣  Checking Secrets Management...');
    checkSecrets();

    // Check database files
    console.log('3️⃣  Checking Database Files...');
    checkDatabaseFiles();

    // Check security files
    console.log('4️⃣  Checking Security Implementation...');
    checkSecurityFiles();

    console.log('\n✅ Basic health check completed successfully!');
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

function checkDockerCompose(): void {
  const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
  
  if (!fs.existsSync(dockerComposePath)) {
    console.log('   ❌ docker-compose.yml not found');
    return;
  }

  const content = fs.readFileSync(dockerComposePath, 'utf8');
  
  if (content.includes('POSTGRES_PASSWORD_FILE:')) {
    console.log('   ✅ Docker secrets properly configured');
  } else {
    console.log('   ⚠️  Docker secrets not configured');
  }

  if (content.includes('healthcheck:')) {
    console.log('   ✅ Health checks configured');
  } else {
    console.log('   ⚠️  Health checks missing');
  }
}

function checkSecrets(): void {
  const secretsDir = path.join(process.cwd(), '.secrets');
  
  if (!fs.existsSync(secretsDir)) {
    console.log('   ❌ Secrets directory not found');
    return;
  }

  const requiredSecrets = [
    'db_password.txt',
    'test_db_password.txt', 
    'redis_password.txt',
    'jwt_secret.txt',
    'encryption_key.txt'
  ];

  let foundSecrets = 0;
  for (const secret of requiredSecrets) {
    const secretPath = path.join(secretsDir, secret);
    if (fs.existsSync(secretPath)) {
      foundSecrets++;
    }
  }

  console.log(`   ✅ Found ${foundSecrets}/${requiredSecrets.length} required secrets`);
  
  // Check permissions
  const stats = fs.statSync(secretsDir);
  const mode = stats.mode & parseInt('777', 8);
  if (mode === parseInt('700', 8)) {
    console.log('   ✅ Secrets directory permissions correct (700)');
  } else {
    console.log('   ⚠️  Secrets directory permissions incorrect');
  }
}

function checkDatabaseFiles(): void {
  const files = [
    'prisma/schema.prisma',
    'prisma/seed.ts',
    'src/services/database/database.service.ts',
    'database/init/01-security.sql'
  ];

  let foundFiles = 0;
  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      foundFiles++;
    }
  }

  console.log(`   ✅ Found ${foundFiles}/${files.length} database files`);
  
  // Check if Prisma schema exists and has basic models
  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    if (schemaContent.includes('model Book') && schemaContent.includes('model Verse')) {
      console.log('   ✅ Prisma schema contains required models');
    } else {
      console.log('   ⚠️  Prisma schema missing core models');
    }
  }
}

function checkSecurityFiles(): void {
  const securityFiles = [
    'src/services/security/secrets-manager.service.ts',
    'src/services/security/database-security.service.ts',
    'src/middleware/security.middleware.ts',
    'src/services/monitoring/connection-monitor.service.ts',
    'src/services/monitoring/health-check.service.ts'
  ];

  let foundFiles = 0;
  for (const file of securityFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      foundFiles++;
    }
  }

  console.log(`   ✅ Found ${foundFiles}/${securityFiles.length} security implementation files`);
  
  if (foundFiles === securityFiles.length) {
    console.log('   ✅ Complete security implementation present');
  } else {
    console.log('   ⚠️  Some security files missing');
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Simple health check failed:', error);
    process.exit(1);
  });
}

export { main as runSimpleHealthCheck };