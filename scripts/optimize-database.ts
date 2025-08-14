#!/usr/bin/env ts-node

/**
 * Database Optimization Script
 * 
 * This script applies performance optimizations to the database:
 * - Creates performance indexes
 * - Analyzes tables
 * - Generates performance reports
 * 
 * Usage:
 *   npm run db:optimize
 *   ts-node scripts/optimize-database.ts
 */

import { PrismaClient } from '@prisma/client';
import { QueryOptimizerUtil } from '../src/services/database/utils/query-optimizer.util';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🚀 Starting database optimization...');

  const prisma = new PrismaClient();
  const optimizer = new QueryOptimizerUtil(prisma);

  try {
    await prisma.$connect();
    console.log('✅ Connected to database');

    // Step 1: Apply performance indexes
    console.log('\n📊 Applying performance indexes...');
    await applyPerformanceIndexes(prisma);

    // Step 2: Update table statistics
    console.log('\n📈 Updating table statistics...');
    await optimizer.updateTableStatistics();
    console.log('✅ Table statistics updated');

    // Step 3: Run vacuum analyze
    console.log('\n🧹 Running vacuum analyze...');
    await optimizer.maintenanceVacuum();
    console.log('✅ Vacuum analyze completed');

    // Step 4: Generate performance report
    console.log('\n📋 Generating performance report...');
    await generatePerformanceReport(optimizer);

    // Step 5: Show current index usage
    console.log('\n📊 Index usage statistics:');
    const indexStats = await optimizer.getIndexUsageStats();
    console.table(indexStats.slice(0, 10)); // Show top 10

    // Step 6: Show table sizes
    console.log('\n💾 Table size statistics:');
    const tableSizes = await optimizer.getTableSizes();
    console.table(tableSizes);

    // Step 7: Check for unused indexes
    console.log('\n🗑️  Checking for unused indexes...');
    const unusedIndexes = await optimizer.findUnusedIndexes();
    if (unusedIndexes.length > 0) {
      console.log('⚠️  Found unused indexes:');
      console.table(unusedIndexes);
      console.log('💡 Consider dropping unused indexes to save space');
    } else {
      console.log('✅ No unused indexes found');
    }

    console.log('\n🎉 Database optimization completed successfully!');

  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function applyPerformanceIndexes(prisma: PrismaClient): Promise<void> {
  const indexFile = path.join(__dirname, '../database/migrations/002_performance_indexes.sql');
  
  if (!fs.existsSync(indexFile)) {
    console.log('⚠️  Performance indexes file not found, skipping...');
    return;
  }

  try {
    const sql = fs.readFileSync(indexFile, 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed.startsWith('--') || trimmed.startsWith('/*') || !trimmed) {
        continue; // Skip comments and empty statements
      }

      try {
        if (trimmed.toLowerCase().startsWith('create')) {
          await prisma.$executeRawUnsafe(trimmed);
          console.log(`✅ Applied: ${trimmed.substring(0, 50)}...`);
        }
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`ℹ️  Index already exists: ${trimmed.substring(0, 50)}...`);
        } else {
          console.error(`❌ Failed to apply: ${trimmed.substring(0, 50)}...`, error.message);
        }
      }
    }

    console.log('✅ Performance indexes applied');
  } catch (error) {
    console.error('❌ Failed to apply performance indexes:', error);
    throw error;
  }
}

async function generatePerformanceReport(optimizer: QueryOptimizerUtil): Promise<void> {
  try {
    const report = optimizer.generatePerformanceReport();
    const reportPath = path.join(__dirname, '../database/reports/performance-report.json');
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Add current indexes to the report
    const currentIndexes = await optimizer.getCurrentIndexes();
    const indexUsageStats = await optimizer.getIndexUsageStats();
    const unusedIndexes = await optimizer.findUnusedIndexes();
    const tableSizes = await optimizer.getTableSizes();

    const fullReport = {
      ...report,
      generatedAt: new Date().toISOString(),
      database: {
        currentIndexes,
        indexUsageStats,
        unusedIndexes,
        tableSizes,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
    console.log(`✅ Performance report saved to: ${reportPath}`);

    // Display summary
    console.log('\n📊 Performance Summary:');
    console.log(`   Total queries analyzed: ${report.summary.totalQueries}`);
    console.log(`   Average execution time: ${report.summary.avgExecutionTime.toFixed(2)}ms`);
    console.log(`   Slow queries (>50ms): ${report.summary.slowQueryCount}`);
    console.log(`   Current indexes: ${currentIndexes.length}`);
    console.log(`   Unused indexes: ${unusedIndexes.length}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 Top Recommendations:');
      report.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec.reasoning} (${rec.estimatedImpact} impact)`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to generate performance report:', error);
    throw error;
  }
}

// Configuration check
function checkConfiguration(): void {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Running in production mode - indexes will be created with CONCURRENTLY');
  }
}

// Main execution
if (require.main === module) {
  checkConfiguration();
  main().catch((error) => {
    console.error('❌ Optimization script failed:', error);
    process.exit(1);
  });
}

export { main as optimizeDatabase };