#!/usr/bin/env ts-node

/**
 * Security Configuration Validation Script
 * 
 * This script validates the security configuration of the Deeper Bible backend
 * and provides recommendations for improvements.
 * 
 * Usage:
 *   npm run security:check
 *   ts-node scripts/security-check.ts
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseSecurityService } from '../src/services/security/database-security.service';
import { SecretsManagerService } from '../src/services/security/secrets-manager.service';
import { EnvironmentConfig } from '../src/config/environment.config';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔍 Starting Security Configuration Check...\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: [] as string[],
    recommendations: [] as string[],
  };

  try {
    // Initialize services
    const envConfig = EnvironmentConfig.getInstance();
    await envConfig.initialize();
    
    const secretsManager = new SecretsManagerService();
    const prisma = new PrismaClient();
    const databaseSecurity = new DatabaseSecurityService(prisma, secretsManager);

    // 1. Check secrets management
    console.log('1️⃣  Checking Secrets Management...');
    await checkSecretsManagement(results);

    // 2. Check file permissions
    console.log('2️⃣  Checking File Permissions...');
    await checkFilePermissions(results);

    // 3. Check Docker configuration
    console.log('3️⃣  Checking Docker Configuration...');
    await checkDockerConfiguration(results);

    // 4. Check database security
    console.log('4️⃣  Checking Database Security...');
    await checkDatabaseSecurity(databaseSecurity, results);

    // 5. Check environment configuration
    console.log('5️⃣  Checking Environment Configuration...');
    await checkEnvironmentConfiguration(results);

    // 6. Check gitignore security
    console.log('6️⃣  Checking Git Security...');
    await checkGitSecurity(results);

    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Security check failed:', error);
    results.failed++;
    results.issues.push(`Security check execution failed: ${error}`);
  }

  // Generate report
  generateSecurityReport(results);
}

async function checkSecretsManagement(results: any): Promise<void> {
  const secretsDir = path.join(process.cwd(), '.secrets');
  
  if (!fs.existsSync(secretsDir)) {
    results.failed++;
    results.issues.push('Secrets directory (.secrets/) does not exist');
    return;
  }

  const requiredSecrets = [
    'db_password.txt',
    'test_db_password.txt', 
    'redis_password.txt',
    'jwt_secret.txt',
    'encryption_key.txt'
  ];

  for (const secret of requiredSecrets) {
    const secretPath = path.join(secretsDir, secret);
    if (!fs.existsSync(secretPath)) {
      results.failed++;
      results.issues.push(`Missing secret file: ${secret}`);
    } else {
      // Check file permissions (should be 600)
      const stats = fs.statSync(secretPath);
      const mode = stats.mode & parseInt('777', 8);
      if (mode !== parseInt('600', 8)) {
        results.warnings++;
        results.recommendations.push(`Fix permissions for ${secret}: chmod 600 .secrets/${secret}`);
      } else {
        results.passed++;
      }
    }
  }

  console.log('   ✅ Secrets management check completed');
}

async function checkFilePermissions(results: any): Promise<void> {
  const criticalFiles = [
    '.env.secure',
    '.secrets',
    'docker-compose.yml',
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      
      if (file === '.secrets') {
        // Directory should be 700
        const mode = stats.mode & parseInt('777', 8);
        if (mode !== parseInt('700', 8)) {
          results.warnings++;
          results.recommendations.push(`Fix .secrets directory permissions: chmod 700 .secrets`);
        } else {
          results.passed++;
        }
      } else if (file === '.env.secure') {
        // File should be 600
        const mode = stats.mode & parseInt('777', 8);
        if (mode !== parseInt('600', 8)) {
          results.warnings++;
          results.recommendations.push(`Fix .env.secure permissions: chmod 600 .env.secure`);
        } else {
          results.passed++;
        }
      }
    }
  }

  console.log('   ✅ File permissions check completed');
}

async function checkDockerConfiguration(results: any): Promise<void> {
  const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
  
  if (!fs.existsSync(dockerComposePath)) {
    results.failed++;
    results.issues.push('docker-compose.yml not found');
    return;
  }

  const dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf8');

  // Check for hardcoded passwords
  if (dockerComposeContent.includes('POSTGRES_PASSWORD:') && 
      !dockerComposeContent.includes('POSTGRES_PASSWORD_FILE:')) {
    results.failed++;
    results.issues.push('Hardcoded passwords found in docker-compose.yml');
  } else {
    results.passed++;
  }

  // Check for secrets configuration
  if (!dockerComposeContent.includes('secrets:')) {
    results.failed++;
    results.issues.push('Docker secrets not configured');
  } else {
    results.passed++;
  }

  // Check for health checks
  if (!dockerComposeContent.includes('healthcheck:')) {
    results.warnings++;
    results.recommendations.push('Add health checks to Docker services');
  } else {
    results.passed++;
  }

  console.log('   ✅ Docker configuration check completed');
}

async function checkDatabaseSecurity(databaseSecurity: DatabaseSecurityService, results: any): Promise<void> {
  try {
    const validation = await databaseSecurity.validateSecurityConfiguration();
    
    if (validation.isSecure) {
      results.passed++;
      console.log('   ✅ Database security configuration is secure');
    } else {
      results.failed += validation.issues.length;
      results.issues.push(...validation.issues);
    }

    results.recommendations.push(...validation.recommendations);

    // Check for suspicious activity
    const suspiciousActivity = await databaseSecurity.detectSuspiciousActivity();
    if (suspiciousActivity.suspiciousIPs.length > 0 || 
        suspiciousActivity.rapidLoginAttempts.length > 0 ||
        suspiciousActivity.unusualQueryPatterns.length > 0) {
      results.warnings++;
      results.recommendations.push('Investigate suspicious activity detected in audit logs');
    }

  } catch (error) {
    results.failed++;
    results.issues.push(`Database security check failed: ${error}`);
  }

  console.log('   ✅ Database security check completed');
}

async function checkEnvironmentConfiguration(results: any): Promise<void> {
  const envSecurePath = path.join(process.cwd(), '.env.secure');
  
  if (!fs.existsSync(envSecurePath)) {
    results.failed++;
    results.issues.push('.env.secure file not found - run npm run secrets:init');
    return;
  }

  const envContent = fs.readFileSync(envSecurePath, 'utf8');

  // Check for placeholder values
  if (envContent.includes('CHANGE_ME') || envContent.includes('your-')) {
    results.warnings++;
    results.recommendations.push('Update placeholder values in .env.secure');
  }

  // Check for SSL configuration
  if (!envContent.includes('sslmode=require')) {
    results.warnings++;
    results.recommendations.push('Enable SSL for database connections');
  }

  results.passed++;
  console.log('   ✅ Environment configuration check completed');
}

async function checkGitSecurity(results: any): Promise<void> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  
  if (!fs.existsSync(gitignorePath)) {
    results.warnings++;
    results.recommendations.push('Create .gitignore file');
    return;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

  const requiredEntries = [
    '.env.secure',
    '.secrets/',
    '*.key',
    '*.pem',
  ];

  for (const entry of requiredEntries) {
    if (!gitignoreContent.includes(entry)) {
      results.warnings++;
      results.recommendations.push(`Add '${entry}' to .gitignore`);
    } else {
      results.passed++;
    }
  }

  console.log('   ✅ Git security check completed');
}

function generateSecurityReport(results: any): void {
  console.log('\n' + '='.repeat(60));
  console.log('🔒 SECURITY CONFIGURATION REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Passed:    ${results.passed}`);
  console.log(`   ⚠️  Warnings:  ${results.warnings}`);
  console.log(`   ❌ Failed:    ${results.failed}`);

  if (results.issues.length > 0) {
    console.log(`\n❌ Critical Issues (Must Fix):`);
    results.issues.forEach((issue: string, index: number) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  if (results.recommendations.length > 0) {
    console.log(`\n⚠️  Recommendations:`);
    results.recommendations.forEach((rec: string, index: number) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }

  // Overall security score
  const totalChecks = results.passed + results.warnings + results.failed;
  const securityScore = totalChecks > 0 ? Math.round((results.passed / totalChecks) * 100) : 0;
  
  console.log(`\n🏆 Security Score: ${securityScore}%`);
  
  if (securityScore >= 90) {
    console.log('   🟢 Excellent security configuration');
  } else if (securityScore >= 75) {
    console.log('   🟡 Good security configuration with room for improvement');
  } else if (securityScore >= 50) {
    console.log('   🟠 Moderate security - address warnings before production');
  } else {
    console.log('   🔴 Poor security - critical issues must be resolved');
  }

  console.log('\n📋 Next Steps:');
  console.log('   1. Address all critical issues');
  console.log('   2. Implement recommended improvements');
  console.log('   3. Run security check again to verify fixes');
  console.log('   4. Set up regular security monitoring');

  console.log('\n' + '='.repeat(60));

  // Exit with error code if there are critical issues
  if (results.failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Security check script failed:', error);
    process.exit(1);
  });
}

export { main as runSecurityCheck };