import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationStatus {
  name: string;
  appliedAt: Date | null;
  status: 'pending' | 'applied' | 'failed';
}

export class MigrationRunner {
  private migrationsPath: string;
  
  constructor() {
    this.migrationsPath = path.join(process.cwd(), 'prisma', 'migrations');
  }

  /**
   * Run pending migrations
   */
  async runMigrations(isDevelopment: boolean = false): Promise<void> {
    try {
      console.log('🔄 Running database migrations...');
      
      const command = isDevelopment 
        ? 'npx prisma migrate dev'
        : 'npx prisma migrate deploy';
      
      execSync(command, {
        stdio: 'inherit',
        env: process.env,
      });
      
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (WARNING: Destructive operation)
   */
  async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }

    try {
      console.log('⚠️  Resetting database...');
      
      execSync('npx prisma migrate reset --force', {
        stdio: 'inherit',
        env: process.env,
      });
      
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  /**
   * Create a new migration
   */
  async createMigration(name: string): Promise<void> {
    try {
      console.log(`📝 Creating migration: ${name}`);
      
      execSync(`npx prisma migrate dev --name ${name} --create-only`, {
        stdio: 'inherit',
        env: process.env,
      });
      
      console.log(`✅ Migration '${name}' created`);
    } catch (error) {
      console.error('❌ Failed to create migration:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    const migrations: MigrationStatus[] = [];
    
    try {
      // Get list of migration directories
      const migrationDirs = fs.readdirSync(this.migrationsPath)
        .filter(dir => fs.statSync(path.join(this.migrationsPath, dir)).isDirectory())
        .filter(dir => !dir.startsWith('_'));

      // Check each migration status
      for (const dir of migrationDirs) {
        const migrationPath = path.join(this.migrationsPath, dir);
        const migrationSql = path.join(migrationPath, 'migration.sql');
        
        if (fs.existsSync(migrationSql)) {
          // Parse timestamp from directory name
          const timestamp = dir.split('_')[0];
          const name = dir.split('_').slice(1).join('_');
          
          migrations.push({
            name: name || dir,
            appliedAt: new Date(parseInt(timestamp)),
            status: 'applied', // Simplified - would need to check against database
          });
        }
      }

      return migrations.sort((a, b) => {
        if (!a.appliedAt || !b.appliedAt) return 0;
        return a.appliedAt.getTime() - b.appliedAt.getTime();
      });
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return migrations;
    }
  }

  /**
   * Rollback last migration (if supported)
   */
  async rollbackMigration(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Migration rollback is not allowed in production');
    }

    // Note: Prisma doesn't support rollback natively
    // This would require custom implementation
    throw new Error('Migration rollback is not yet implemented. Use reset for development.');
  }

  /**
   * Validate schema
   */
  async validateSchema(): Promise<boolean> {
    try {
      console.log('🔍 Validating database schema...');
      
      execSync('npx prisma validate', {
        stdio: 'pipe',
        env: process.env,
      });
      
      console.log('✅ Schema validation passed');
      return true;
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
      return false;
    }
  }

  /**
   * Generate Prisma client
   */
  async generateClient(): Promise<void> {
    try {
      console.log('🔧 Generating Prisma client...');
      
      execSync('npx prisma generate', {
        stdio: 'inherit',
        env: process.env,
      });
      
      console.log('✅ Prisma client generated');
    } catch (error) {
      console.error('❌ Failed to generate Prisma client:', error);
      throw error;
    }
  }

  /**
   * Backup database schema
   */
  async backupSchema(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'database', 'backups', `schema-${timestamp}.sql`);
    
    try {
      console.log('💾 Backing up database schema...');
      
      // Ensure backup directory exists
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Export schema using pg_dump (PostgreSQL specific)
      const dbUrl = new URL(process.env.DATABASE_URL!);
      const command = `pg_dump --schema-only --no-owner --no-privileges -h ${dbUrl.hostname} -p ${dbUrl.port} -U ${dbUrl.username} -d ${dbUrl.pathname.slice(1)} > ${backupPath}`;
      
      execSync(command, {
        env: {
          ...process.env,
          PGPASSWORD: dbUrl.password,
        },
      });
      
      console.log(`✅ Schema backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Schema backup failed:', error);
      throw error;
    }
  }

  /**
   * Check if migrations are pending
   */
  async hasPendingMigrations(): Promise<boolean> {
    try {
      const output = execSync('npx prisma migrate status', {
        encoding: 'utf-8',
        env: process.env,
      });
      
      return output.includes('migrations to be applied');
    } catch (error) {
      // Command exits with non-zero if migrations are pending
      return true;
    }
  }
}