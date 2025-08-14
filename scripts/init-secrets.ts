#!/usr/bin/env ts-node

/**
 * Secrets Initialization Script
 * 
 * This script initializes the secrets management system and generates
 * secure credentials for the Deeper Bible backend.
 * 
 * Usage:
 *   npm run secrets:init
 *   ts-node scripts/init-secrets.ts
 */

import { EnvironmentConfig } from '../src/config/environment.config';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔐 Initializing Secrets Management System...');

  try {
    // Initialize environment configuration
    const envConfig = EnvironmentConfig.getInstance();
    await envConfig.initialize();

    // Create secure directories
    console.log('📁 Creating secure directories...');
    const secretsDir = path.join(process.cwd(), '.secrets');
    if (!fs.existsSync(secretsDir)) {
      fs.mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
    }

    // Export environment files
    console.log('📝 Generating secure environment files...');
    
    // Development environment
    await envConfig.exportEnvironmentFile('.env.secure');
    
    // Docker environment (without sensitive data exposure)
    await createDockerEnvFile();
    
    // Create gitignore entries
    await updateGitignore();
    
    // Create security documentation
    await createSecurityDocumentation();

    console.log('\n🎉 Secrets management initialization completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Review the generated .env.secure file');
    console.log('2. Update docker-compose.yml to use .env.secure');
    console.log('3. Restart Docker containers with: docker-compose down && docker-compose up -d');
    console.log('4. Verify database connectivity');
    
  } catch (error) {
    console.error('❌ Secrets initialization failed:', error);
    process.exit(1);
  }
}

async function createDockerEnvFile(): Promise<void> {
  const envConfig = EnvironmentConfig.getInstance();
  const dockerEnv = await envConfig.getDockerEnvironment();
  
  // Create .env.docker file with external references
  const dockerEnvContent = `# Docker Compose Environment Variables (Generated)
# This file references external secrets and should be safe to commit

# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=deeper_bible
DB_USER=postgres
DB_PASSWORD_FILE=/run/secrets/db_password

# Test Database Configuration  
TEST_DB_HOST=postgres-test
TEST_DB_PORT=5432
TEST_DB_NAME=deeper_bible_test
TEST_DB_USER=postgres
TEST_DB_PASSWORD_FILE=/run/secrets/test_db_password

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD_FILE=/run/secrets/redis_password

# Application Configuration
NODE_ENV=production
API_PORT=3001
LOG_LEVEL=info

# URLs (will be constructed from components)
DATABASE_URL=postgresql://\${DB_USER}:\${DB_PASSWORD}@\${DB_HOST}:\${DB_PORT}/\${DB_NAME}?schema=public
TEST_DATABASE_URL=postgresql://\${TEST_DB_USER}:\${TEST_DB_PASSWORD}@\${TEST_DB_HOST}:\${TEST_DB_PORT}/\${TEST_DB_NAME}?schema=public
REDIS_URL=redis://:\${REDIS_PASSWORD}@\${REDIS_HOST}:\${REDIS_PORT}

# Security (will be loaded from secrets)
JWT_SECRET_FILE=/run/secrets/jwt_secret
ENCRYPTION_KEY_FILE=/run/secrets/encryption_key
`;

  fs.writeFileSync('.env.docker', dockerEnvContent);
  console.log('✅ Docker environment file created: .env.docker');
}

async function updateGitignore(): Promise<void> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const securityEntries = `
# Security and Secrets
.env.secure
.env.local
.secrets/
secrets.json
*.key
*.pem
*.p12

# Database
database/backups/*.sql
database/backups/*.sql.gz
database/reports/

# Logs and monitoring
logs/
*.log
monitoring/

# Docker volumes and data
postgres_data/
redis_data/
pgadmin_data/
`;

  let gitignoreContent = '';
  if (fs.existsSync(gitignorePath)) {
    gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  }

  // Only add if not already present
  if (!gitignoreContent.includes('.secrets/')) {
    fs.appendFileSync(gitignorePath, securityEntries);
    console.log('✅ Updated .gitignore with security entries');
  }
}

async function createSecurityDocumentation(): Promise<void> {
  const securityDoc = `# Deeper Bible Backend - Security Configuration

## Secrets Management

This project uses a secure secrets management system to protect sensitive information like database passwords, JWT secrets, and API keys.

### Setup

1. **Initialize Secrets:**
   \`\`\`bash
   npm run secrets:init
   \`\`\`

2. **Configure Environment:**
   - Review generated \`.env.secure\` file
   - Update any placeholder values (API keys, etc.)
   - Never commit \`.env.secure\` to version control

3. **Start Services:**
   \`\`\`bash
   docker-compose --env-file .env.secure up -d
   \`\`\`

### Production Deployment

For production environments, use external secrets management:

#### AWS Secrets Manager
\`\`\`bash
export SECRETS_PROVIDER=aws-secrets
export AWS_REGION=us-east-1
npm run secrets:init
\`\`\`

#### HashiCorp Vault
\`\`\`bash
export SECRETS_PROVIDER=hashicorp-vault
export VAULT_URL=https://vault.company.com
npm run secrets:init
\`\`\`

### Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate credentials** regularly (monthly recommended)
3. **Use encrypted storage** for sensitive data
4. **Monitor access logs** for unauthorized access
5. **Implement backup encryption** for database backups

### Credential Rotation

Rotate database credentials:
\`\`\`bash
npm run secrets:rotate
\`\`\`

### Emergency Procedures

If credentials are compromised:

1. **Immediate Response:**
   \`\`\`bash
   npm run secrets:emergency-rotate
   \`\`\`

2. **Update all services** with new credentials
3. **Review access logs** for unauthorized activity
4. **Update monitoring alerts**

### Monitoring

The system includes monitoring for:
- Failed authentication attempts
- Connection pool exhaustion
- Query performance degradation
- Suspicious access patterns

### Compliance

This configuration supports:
- **GDPR**: Personal data encryption and deletion
- **SOC 2**: Access controls and audit logging
- **HIPAA**: Encryption at rest and in transit (if needed)

### Support

For security-related issues:
1. Check logs in \`logs/security.log\`
2. Validate configuration: \`npm run secrets:validate\`
3. Test connectivity: \`npm run db:healthcheck\`
`;

  const docsDir = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(docsDir, 'SECURITY.md'), securityDoc);
  console.log('✅ Security documentation created: docs/SECURITY.md');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

export { main as initializeSecrets };