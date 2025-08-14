#!/usr/bin/env ts-node

/**
 * Database Health Check Script
 * 
 * This script performs a comprehensive health check of the database
 * and monitoring systems.
 * 
 * Usage:
 *   npm run db:healthcheck
 *   ts-node scripts/healthcheck.ts
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/services/database/database.service';
import { ConnectionMonitorService } from '../src/services/monitoring/connection-monitor.service';
import { HealthCheckService } from '../src/services/monitoring/health-check.service';
import { EnvironmentConfig } from '../src/config/environment.config';

async function main() {
  console.log('🏥 Starting Database Health Check...\n');

  let prisma: PrismaClient | null = null;

  try {
    // Initialize environment configuration
    const envConfig = EnvironmentConfig.getInstance();
    await envConfig.initialize();

    // Initialize services
    prisma = new PrismaClient();
    const databaseService = DatabaseService.getInstance();
    const connectionMonitor = new ConnectionMonitorService(prisma);
    const healthCheck = new HealthCheckService(databaseService, connectionMonitor);

    // Perform comprehensive health check
    console.log('🔍 Performing comprehensive health check...');
    const healthStatus = await healthCheck.performHealthCheck();

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('🏥 HEALTH CHECK REPORT');
    console.log('='.repeat(60));

    console.log(`\n📊 Overall Status: ${getStatusEmoji(healthStatus.status)} ${healthStatus.status.toUpperCase()}`);
    console.log(`⏱️  Uptime: ${formatUptime(healthStatus.uptime)}`);
    console.log(`📅 Timestamp: ${healthStatus.timestamp.toISOString()}`);
    console.log(`🏷️  Version: ${healthStatus.version}`);

    console.log('\n📋 Service Health:');
    
    // Database health
    const db = healthStatus.services.database;
    console.log(`   🗄️  Database: ${getStatusEmoji(db.status)} ${db.status} (${db.responseTime}ms)`);
    if (db.message) console.log(`      Message: ${db.message}`);
    if (db.details) {
      console.log(`      Books: ${db.details.books || 'N/A'}`);
      console.log(`      Verses: ${db.details.verses || 'N/A'}`);
      console.log(`      Users: ${db.details.users || 'N/A'}`);
    }

    // Cache health
    const cache = healthStatus.services.cache;
    console.log(`   💾 Cache: ${getStatusEmoji(cache.status)} ${cache.status} (${cache.responseTime}ms)`);
    if (cache.message) console.log(`      Message: ${cache.message}`);

    // Connection health
    const conn = healthStatus.services.connections;
    console.log(`   🔗 Connections: ${getStatusEmoji(conn.status)} ${conn.status} (${conn.responseTime}ms)`);
    if (conn.message) console.log(`      Message: ${conn.message}`);
    if (conn.details) {
      console.log(`      Active: ${conn.details.activeConnections}/${conn.details.maxConnections}`);
      console.log(`      Avg Response: ${conn.details.avgResponseTime}ms`);
    }

    // Connection monitoring report
    console.log('\n📈 Connection Monitoring Report:');
    const monitoringReport = connectionMonitor.generateReport();
    
    console.log(`   📊 Summary:`);
    console.log(`      Active Connections: ${monitoringReport.summary.activeConnections}/${monitoringReport.summary.maxConnections}`);
    console.log(`      Idle Connections: ${monitoringReport.summary.idleConnections}`);
    console.log(`      Failed Connections: ${monitoringReport.summary.failedConnections}`);
    console.log(`      Avg Response Time: ${monitoringReport.summary.avgResponseTime.toFixed(0)}ms`);
    console.log(`      Uptime: ${formatUptime(monitoringReport.uptime)}`);

    // Active alerts
    if (monitoringReport.alerts.length > 0) {
      console.log('\n🚨 Active Alerts:');
      monitoringReport.alerts
        .filter(alert => !alert.resolved)
        .forEach((alert, index) => {
          console.log(`   ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
          console.log(`      Type: ${alert.type}`);
          console.log(`      Time: ${alert.timestamp.toISOString()}`);
        });
    } else {
      console.log('\n✅ No active alerts');
    }

    // Recommendations
    if (monitoringReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      monitoringReport.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Quick database tests
    console.log('\n🧪 Quick Database Tests:');
    await runQuickTests(databaseService);

    console.log('\n' + '='.repeat(60));
    
    // Exit with appropriate code
    if (healthStatus.status === 'unhealthy') {
      console.log('❌ Health check failed - system is unhealthy');
      process.exit(1);
    } else if (healthStatus.status === 'degraded') {
      console.log('⚠️  Health check completed with warnings - system is degraded');
      process.exit(2);
    } else {
      console.log('✅ Health check passed - system is healthy');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

async function runQuickTests(databaseService: DatabaseService): Promise<void> {
  const tests = [
    {
      name: 'Database Connection',
      test: async () => {
        await databaseService.connect();
        return true;
      }
    },
    {
      name: 'Books Table Query',
      test: async () => {
        const books = await databaseService.getAllBooks();
        return books.length === 66;
      }
    },
    {
      name: 'Cache Write/Read',
      test: async () => {
        const testKey = `healthcheck_${Date.now()}`;
        await databaseService.setCacheEntry(testKey, { test: true }, 30);
        const retrieved = await databaseService.getCacheEntry(testKey);
        return retrieved !== null;
      }
    },
    {
      name: 'Database Statistics',
      test: async () => {
        const stats = await databaseService.getDatabaseStats();
        return stats.books >= 66 && stats.verses > 0;
      }
    }
  ];

  for (const test of tests) {
    try {
      const startTime = Date.now();
      const result = await test.test();
      const duration = Date.now() - startTime;
      
      if (result) {
        console.log(`   ✅ ${test.name} (${duration}ms)`);
      } else {
        console.log(`   ❌ ${test.name} - Test failed (${duration}ms)`);
      }
    } catch (error) {
      console.log(`   ❌ ${test.name} - Error: ${error}`);
    }
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'healthy': return '🟢';
    case 'degraded': case 'warning': return '🟡';
    case 'unhealthy': case 'critical': return '🔴';
    case 'down': return '⚫';
    default: return '⚪';
  }
}

function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Health check script failed:', error);
    process.exit(1);
  });
}

export { main as runHealthCheck };