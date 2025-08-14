import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface SecretConfig {
  provider: 'env' | 'file' | 'aws-secrets' | 'hashicorp-vault';
  region?: string;
  vaultUrl?: string;
  encryptionKey?: string;
}

export interface Secret {
  key: string;
  value: string;
  encrypted: boolean;
  lastRotated?: Date;
  expiresAt?: Date;
}

export class SecretsManagerService {
  private config: SecretConfig;
  private encryptionKey: string;
  private secretsCache: Map<string, Secret> = new Map();

  constructor(config: SecretConfig) {
    this.config = config;
    this.encryptionKey = config.encryptionKey || this.generateEncryptionKey();
  }

  /**
   * Get a secret value by key
   */
  async getSecret(key: string): Promise<string | null> {
    try {
      // Check cache first
      if (this.secretsCache.has(key)) {
        const cached = this.secretsCache.get(key)!;
        if (!cached.expiresAt || cached.expiresAt > new Date()) {
          return cached.value;
        }
        this.secretsCache.delete(key);
      }

      let secret: Secret | null = null;

      switch (this.config.provider) {
        case 'env':
          secret = await this.getFromEnvironment(key);
          break;
        case 'file':
          secret = await this.getFromFile(key);
          break;
        case 'aws-secrets':
          secret = await this.getFromAWS(key);
          break;
        case 'hashicorp-vault':
          secret = await this.getFromVault(key);
          break;
        default:
          throw new Error(`Unsupported secrets provider: ${this.config.provider}`);
      }

      if (secret) {
        // Cache the secret
        this.secretsCache.set(key, secret);
        return secret.value;
      }

      return null;
    } catch (error) {
      console.error(`Failed to retrieve secret '${key}':`, error);
      return null;
    }
  }

  /**
   * Set a secret value
   */
  async setSecret(key: string, value: string, encrypt: boolean = true): Promise<void> {
    const secret: Secret = {
      key,
      value: encrypt ? this.encrypt(value) : value,
      encrypted: encrypt,
      lastRotated: new Date(),
    };

    switch (this.config.provider) {
      case 'env':
        throw new Error('Cannot set environment variables at runtime');
      case 'file':
        await this.setToFile(secret);
        break;
      case 'aws-secrets':
        await this.setToAWS(secret);
        break;
      case 'hashicorp-vault':
        await this.setToVault(secret);
        break;
      default:
        throw new Error(`Unsupported secrets provider: ${this.config.provider}`);
    }

    // Update cache
    this.secretsCache.set(key, { ...secret, value });
  }

  /**
   * Generate secure database passwords
   */
  generateDatabasePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Rotate database credentials
   */
  async rotateDatabaseCredentials(): Promise<{
    oldPassword: string;
    newPassword: string;
  }> {
    const currentPassword = await this.getSecret('DB_PASSWORD');
    const newPassword = this.generateDatabasePassword();
    
    // Store new password
    await this.setSecret('DB_PASSWORD_NEW', newPassword);
    await this.setSecret('DB_PASSWORD_OLD', currentPassword || '');
    
    console.log('🔄 Database password rotation initiated');
    console.log('⚠️  Update your database connection and restart services');
    
    return {
      oldPassword: currentPassword || '',
      newPassword,
    };
  }

  /**
   * Validate secrets configuration
   */
  async validateConfiguration(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required secrets
    const requiredSecrets = [
      'DB_PASSWORD',
      'JWT_SECRET',
      'REDIS_PASSWORD',
    ];

    for (const secret of requiredSecrets) {
      const value = await this.getSecret(secret);
      if (!value) {
        errors.push(`Missing required secret: ${secret}`);
      } else if (value.length < 16) {
        warnings.push(`Secret '${secret}' should be at least 16 characters long`);
      }
    }

    // Check encryption key
    if (!this.encryptionKey || this.encryptionKey.length < 32) {
      errors.push('Encryption key must be at least 32 characters long');
    }

    // Check provider configuration
    if (this.config.provider === 'aws-secrets' && !this.config.region) {
      errors.push('AWS region is required for AWS Secrets Manager');
    }

    if (this.config.provider === 'hashicorp-vault' && !this.config.vaultUrl) {
      errors.push('Vault URL is required for HashiCorp Vault');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Private methods for different providers

  private async getFromEnvironment(key: string): Promise<Secret | null> {
    const value = process.env[key];
    if (!value) return null;

    return {
      key,
      value,
      encrypted: false,
    };
  }

  private async getFromFile(key: string): Promise<Secret | null> {
    const secretsFile = path.join(process.cwd(), '.secrets', 'secrets.json');
    
    if (!fs.existsSync(secretsFile)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
      const secretData = data[key];
      
      if (!secretData) return null;

      return {
        key,
        value: secretData.encrypted ? this.decrypt(secretData.value) : secretData.value,
        encrypted: secretData.encrypted,
        lastRotated: secretData.lastRotated ? new Date(secretData.lastRotated) : undefined,
        expiresAt: secretData.expiresAt ? new Date(secretData.expiresAt) : undefined,
      };
    } catch (error) {
      console.error('Failed to read secrets file:', error);
      return null;
    }
  }

  private async setToFile(secret: Secret): Promise<void> {
    const secretsDir = path.join(process.cwd(), '.secrets');
    const secretsFile = path.join(secretsDir, 'secrets.json');
    
    // Ensure directory exists
    if (!fs.existsSync(secretsDir)) {
      fs.mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
    }

    // Read existing secrets
    let secrets: any = {};
    if (fs.existsSync(secretsFile)) {
      secrets = JSON.parse(fs.readFileSync(secretsFile, 'utf8'));
    }

    // Update secret
    secrets[secret.key] = {
      value: secret.value,
      encrypted: secret.encrypted,
      lastRotated: secret.lastRotated?.toISOString(),
      expiresAt: secret.expiresAt?.toISOString(),
    };

    // Write back with secure permissions
    fs.writeFileSync(secretsFile, JSON.stringify(secrets, null, 2), { mode: 0o600 });
  }

  private async getFromAWS(key: string): Promise<Secret | null> {
    // AWS Secrets Manager implementation would go here
    // This is a placeholder for future implementation
    throw new Error('AWS Secrets Manager not yet implemented');
  }

  private async setToAWS(secret: Secret): Promise<void> {
    // AWS Secrets Manager implementation would go here
    throw new Error('AWS Secrets Manager not yet implemented');
  }

  private async getFromVault(key: string): Promise<Secret | null> {
    // HashiCorp Vault implementation would go here
    throw new Error('HashiCorp Vault not yet implemented');
  }

  private async setToVault(secret: Secret): Promise<void> {
    // HashiCorp Vault implementation would go here
    throw new Error('HashiCorp Vault not yet implemented');
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-gcm';
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}