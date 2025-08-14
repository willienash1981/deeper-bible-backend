import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as gzip from 'zlib';

export interface BackupOptions {
  includeData?: boolean;
  compress?: boolean;
  customName?: string;
  excludeTables?: string[];
}

export interface RestoreOptions {
  cleanFirst?: boolean;
  dataOnly?: boolean;
  schemaOnly?: boolean;
}

export interface BackupInfo {
  filename: string;
  path: string;
  size: number;
  createdAt: Date;
  compressed: boolean;
  includesData: boolean;
}

export class BackupRestoreUtil {
  private backupDir: string;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'database', 'backups');
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private getDatabaseConfig() {
    const dbUrl = new URL(process.env.DATABASE_URL!);
    return {
      host: dbUrl.hostname,
      port: dbUrl.port || '5432',
      username: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
    };
  }

  /**
   * Create a database backup
   */
  async createBackup(options: BackupOptions = {}): Promise<BackupInfo> {
    const {
      includeData = true,
      compress = true,
      customName,
      excludeTables = [],
    } = options;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const suffix = includeData ? 'full' : 'schema-only';
    const filename = customName || `backup-${suffix}-${timestamp}.sql`;
    const backupPath = path.join(this.backupDir, filename);
    
    try {
      console.log(`📦 Creating database backup: ${filename}`);
      
      const dbConfig = this.getDatabaseConfig();
      const pgDumpOptions = [
        '--verbose',
        '--no-owner',
        '--no-privileges',
        '--format=plain',
        `-h ${dbConfig.host}`,
        `-p ${dbConfig.port}`,
        `-U ${dbConfig.username}`,
        `-d ${dbConfig.database}`,
      ];

      // Add schema-only option if needed
      if (!includeData) {
        pgDumpOptions.push('--schema-only');
      }

      // Exclude tables if specified
      excludeTables.forEach(table => {
        pgDumpOptions.push(`--exclude-table=${table}`);
      });

      const command = `pg_dump ${pgDumpOptions.join(' ')} > ${backupPath}`;
      
      execSync(command, {
        env: {
          ...process.env,
          PGPASSWORD: dbConfig.password,
        },
      });

      // Compress if requested
      if (compress) {
        await this.compressFile(backupPath);
      }

      const finalPath = compress ? `${backupPath}.gz` : backupPath;
      const stats = fs.statSync(finalPath);

      const backupInfo: BackupInfo = {
        filename: path.basename(finalPath),
        path: finalPath,
        size: stats.size,
        createdAt: new Date(),
        compressed: compress,
        includesData: includeData,
      };

      console.log(`✅ Backup created successfully: ${backupInfo.filename} (${this.formatFileSize(backupInfo.size)})`);
      
      // Clean up uncompressed file if compressed
      if (compress && fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      return backupInfo;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupPath: string, options: RestoreOptions = {}): Promise<void> {
    const {
      cleanFirst = false,
      dataOnly = false,
      schemaOnly = false,
    } = options;

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    try {
      console.log(`🔄 Restoring database from backup: ${path.basename(backupPath)}`);

      // Decompress if needed
      let sqlFile = backupPath;
      if (backupPath.endsWith('.gz')) {
        sqlFile = await this.decompressFile(backupPath);
      }

      const dbConfig = this.getDatabaseConfig();

      // Clean database first if requested
      if (cleanFirst) {
        console.log('🧹 Cleaning database...');
        await this.cleanDatabase();
      }

      const psqlOptions = [
        '--verbose',
        `-h ${dbConfig.host}`,
        `-p ${dbConfig.port}`,
        `-U ${dbConfig.username}`,
        `-d ${dbConfig.database}`,
      ];

      if (dataOnly) {
        psqlOptions.push('--data-only');
      }
      
      if (schemaOnly) {
        psqlOptions.push('--schema-only');
      }

      const command = `psql ${psqlOptions.join(' ')} < ${sqlFile}`;
      
      execSync(command, {
        stdio: 'inherit',
        env: {
          ...process.env,
          PGPASSWORD: dbConfig.password,
        },
      });

      // Clean up decompressed file if it was temporary
      if (sqlFile !== backupPath && fs.existsSync(sqlFile)) {
        fs.unlinkSync(sqlFile);
      }

      console.log('✅ Database restored successfully');
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = [];

    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
        .sort();

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        backups.push({
          filename: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          compressed: file.endsWith('.gz'),
          includesData: !file.includes('schema-only'),
        });
      }

      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
      return backups;
    }
  }

  /**
   * Delete old backups
   */
  async cleanupOldBackups(keepCount: number = 10): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length <= keepCount) {
        console.log(`No cleanup needed. ${backups.length} backups found, keeping ${keepCount}.`);
        return;
      }

      const toDelete = backups.slice(keepCount);
      
      console.log(`🗑️  Cleaning up ${toDelete.length} old backups...`);
      
      for (const backup of toDelete) {
        fs.unlinkSync(backup.path);
        console.log(`Deleted: ${backup.filename}`);
      }

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic backups
   */
  startScheduledBackups(intervalHours: number = 24): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`📅 Starting scheduled backups every ${intervalHours} hours`);
    
    // Create initial backup
    this.createBackup({ 
      customName: `scheduled-${Date.now()}`,
      compress: true 
    }).catch(console.error);

    // Schedule recurring backups
    setInterval(() => {
      this.createBackup({ 
        customName: `scheduled-${Date.now()}`,
        compress: true 
      })
      .then(() => this.cleanupOldBackups())
      .catch(console.error);
    }, intervalMs);
  }

  private async compressFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(`${filePath}.gz`);
      const gzipStream = gzip.createGzip();

      input.pipe(gzipStream).pipe(output);

      output.on('finish', resolve);
      output.on('error', reject);
    });
  }

  private async decompressFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = filePath.replace('.gz', '');
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(outputPath);
      const gunzipStream = gzip.createGunzip();

      input.pipe(gunzipStream).pipe(output);

      output.on('finish', () => resolve(outputPath));
      output.on('error', reject);
    });
  }

  private async cleanDatabase(): Promise<void> {
    const dbConfig = this.getDatabaseConfig();
    
    // Drop and recreate database (be very careful with this!)
    const commands = [
      `dropdb -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} --if-exists ${dbConfig.database}`,
      `createdb -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} ${dbConfig.database}`,
    ];

    for (const command of commands) {
      execSync(command, {
        env: {
          ...process.env,
          PGPASSWORD: dbConfig.password,
        },
      });
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}