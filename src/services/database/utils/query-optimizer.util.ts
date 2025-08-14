import { PrismaClient, Prisma } from '@prisma/client';

export interface QueryPerformanceStats {
  query: string;
  executionTime: number;
  rowsReturned: number;
  planningTime?: number;
  cost?: number;
}

export interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'gin' | 'hash' | 'partial';
  reasoning: string;
  estimatedImpact: 'high' | 'medium' | 'low';
}

export class QueryOptimizerUtil {
  private prisma: PrismaClient;
  private queryStats: Map<string, QueryPerformanceStats[]> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Analyze query performance using EXPLAIN ANALYZE
   */
  async analyzeQuery(sql: string, params: any[] = []): Promise<QueryPerformanceStats> {
    const startTime = performance.now();
    
    try {
      // Execute the query with EXPLAIN ANALYZE
      const explainResult = await this.prisma.$queryRaw`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${Prisma.raw(sql)}
      ` as any[];

      const plan = explainResult[0]['QUERY PLAN'][0];
      const endTime = performance.now();

      const stats: QueryPerformanceStats = {
        query: sql,
        executionTime: plan['Execution Time'] || (endTime - startTime),
        rowsReturned: plan['Plan']['Actual Rows'] || 0,
        planningTime: plan['Planning Time'],
        cost: plan['Plan']['Total Cost'],
      };

      // Store stats for analysis
      const queryHash = this.hashQuery(sql);
      if (!this.queryStats.has(queryHash)) {
        this.queryStats.set(queryHash, []);
      }
      this.queryStats.get(queryHash)!.push(stats);

      return stats;
    } catch (error) {
      console.error('Query analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get slow queries that exceed threshold
   */
  getSlowQueries(thresholdMs: number = 100): QueryPerformanceStats[] {
    const slowQueries: QueryPerformanceStats[] = [];
    
    for (const queries of this.queryStats.values()) {
      const avgTime = queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length;
      if (avgTime > thresholdMs) {
        slowQueries.push(queries[queries.length - 1]); // Latest execution
      }
    }
    
    return slowQueries.sort((a, b) => b.executionTime - a.executionTime);
  }

  /**
   * Generate index recommendations based on query patterns
   */
  generateIndexRecommendations(): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [
      // High-impact indexes for Bible queries
      {
        table: 'Verse',
        columns: ['bookId', 'chapter', 'verseNumber'],
        type: 'btree',
        reasoning: 'Optimizes verse lookup queries by book and chapter',
        estimatedImpact: 'high',
      },
      {
        table: 'Verse',
        columns: ['keywords'],
        type: 'gin',
        reasoning: 'Enables fast full-text search on verse keywords',
        estimatedImpact: 'high',
      },
      {
        table: 'Report',
        columns: ['status', 'createdAt'],
        type: 'btree',
        reasoning: 'Optimizes queries filtering by report status with time ordering',
        estimatedImpact: 'high',
      },
      {
        table: 'Report',
        columns: ['expiresAt'],
        type: 'partial',
        reasoning: 'Optimizes cache expiration cleanup queries',
        estimatedImpact: 'medium',
      },
      {
        table: 'History',
        columns: ['userId', 'createdAt'],
        type: 'btree',
        reasoning: 'Optimizes user history queries with time ordering',
        estimatedImpact: 'medium',
      },
      {
        table: 'CrossReference',
        columns: ['sourceBook', 'sourceChapter', 'sourceVerse'],
        type: 'btree',
        reasoning: 'Optimizes cross-reference lookups',
        estimatedImpact: 'medium',
      },
      {
        table: 'SymbolPattern',
        columns: ['category', 'occurrences'],
        type: 'btree',
        reasoning: 'Optimizes symbol pattern queries by category with occurrence ordering',
        estimatedImpact: 'low',
      },
    ];

    return recommendations;
  }

  /**
   * Check current database indexes
   */
  async getCurrentIndexes(): Promise<Array<{
    table: string;
    index: string;
    columns: string[];
    unique: boolean;
    type: string;
  }>> {
    const indexes = await this.prisma.$queryRaw`
      SELECT 
        t.relname as table_name,
        i.relname as index_name,
        array_agg(a.attname ORDER BY c.ordinality) as columns,
        ix.indisunique as is_unique,
        am.amname as index_type
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_am am ON i.relam = am.oid
      JOIN unnest(ix.indkey) WITH ORDINALITY c(attnum, ordinality) ON true
      JOIN pg_attribute a ON t.oid = a.attrelid AND a.attnum = c.attnum
      WHERE t.relkind = 'r'
        AND t.relname NOT LIKE 'pg_%'
        AND t.relname NOT LIKE '_prisma_%'
      GROUP BY t.relname, i.relname, ix.indisunique, am.amname
      ORDER BY t.relname, i.relname;
    ` as any[];

    return indexes.map((idx: any) => ({
      table: idx.table_name,
      index: idx.index_name,
      columns: idx.columns,
      unique: idx.is_unique,
      type: idx.index_type,
    }));
  }

  /**
   * Analyze index usage statistics
   */
  async getIndexUsageStats(): Promise<Array<{
    table: string;
    index: string;
    scans: number;
    tuplesRead: number;
    tuplesFetched: number;
    size: string;
  }>> {
    const stats = await this.prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC;
    ` as any[];

    return stats.map((stat: any) => ({
      table: stat.tablename,
      index: stat.indexname,
      scans: stat.scans,
      tuplesRead: stat.tuples_read,
      tuplesFetched: stat.tuples_fetched,
      size: stat.size,
    }));
  }

  /**
   * Find unused indexes
   */
  async findUnusedIndexes(): Promise<Array<{
    table: string;
    index: string;
    size: string;
  }>> {
    const unusedIndexes = await this.prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
        AND indexname NOT LIKE '%_key'   -- Exclude unique constraints
      ORDER BY pg_relation_size(indexrelid) DESC;
    ` as any[];

    return unusedIndexes.map((idx: any) => ({
      table: idx.tablename,
      index: idx.indexname,
      size: idx.size,
    }));
  }

  /**
   * Optimize table statistics
   */
  async updateTableStatistics(tables?: string[]): Promise<void> {
    if (tables && tables.length > 0) {
      for (const table of tables) {
        await this.prisma.$executeRaw`ANALYZE ${Prisma.raw(`"${table}"`)};`;
      }
    } else {
      await this.prisma.$executeRaw`ANALYZE;`;
    }
  }

  /**
   * Get table size statistics
   */
  async getTableSizes(): Promise<Array<{
    table: string;
    size: string;
    rows: number;
  }>> {
    const sizes = await this.prisma.$queryRaw`
      SELECT 
        t.tablename,
        pg_size_pretty(pg_total_relation_size(t.schemaname||'.'||t.tablename)) as size,
        s.n_live_tup as rows
      FROM pg_tables t
      JOIN pg_stat_user_tables s ON t.tablename = s.relname AND t.schemaname = s.schemaname
      WHERE t.schemaname = 'public'
      ORDER BY pg_total_relation_size(t.schemaname||'.'||t.tablename) DESC;
    ` as any[];

    return sizes.map((size: any) => ({
      table: size.tablename,
      size: size.size,
      rows: size.rows,
    }));
  }

  /**
   * Suggest query optimizations
   */
  suggestOptimizations(stats: QueryPerformanceStats): string[] {
    const suggestions: string[] = [];

    if (stats.executionTime > 1000) {
      suggestions.push('Query execution time is very high (>1s). Consider adding appropriate indexes.');
    }

    if (stats.cost && stats.cost > 10000) {
      suggestions.push('Query cost is high. Review WHERE clauses and consider partial indexes.');
    }

    if (stats.rowsReturned > 10000) {
      suggestions.push('Query returns many rows. Consider adding LIMIT or pagination.');
    }

    if (stats.planningTime && stats.planningTime > stats.executionTime * 0.1) {
      suggestions.push('Planning time is high relative to execution. Consider prepared statements.');
    }

    // SQL-specific suggestions
    const sql = stats.query.toLowerCase();
    
    if (sql.includes('like') && sql.includes('%')) {
      suggestions.push('LIKE queries with leading wildcards are slow. Consider full-text search indexes.');
    }

    if (sql.includes('order by') && !sql.includes('limit')) {
      suggestions.push('ORDER BY without LIMIT can be expensive. Consider adding pagination.');
    }

    if (sql.includes('distinct') && stats.rowsReturned > 1000) {
      suggestions.push('DISTINCT on large result sets is expensive. Consider using GROUP BY if appropriate.');
    }

    return suggestions;
  }

  /**
   * Run vacuum and analyze on database
   */
  async maintenanceVacuum(tables?: string[]): Promise<void> {
    if (tables && tables.length > 0) {
      for (const table of tables) {
        await this.prisma.$executeRaw`VACUUM ANALYZE ${Prisma.raw(`"${table}"`)};`;
      }
    } else {
      await this.prisma.$executeRaw`VACUUM ANALYZE;`;
    }
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    slowQueries: QueryPerformanceStats[];
    recommendations: IndexRecommendation[];
    summary: {
      totalQueries: number;
      avgExecutionTime: number;
      slowQueryCount: number;
    };
  } {
    const slowQueries = this.getSlowQueries(50); // 50ms threshold
    const recommendations = this.generateIndexRecommendations();
    
    let totalQueries = 0;
    let totalTime = 0;
    
    for (const queries of this.queryStats.values()) {
      totalQueries += queries.length;
      totalTime += queries.reduce((sum, q) => sum + q.executionTime, 0);
    }

    return {
      slowQueries,
      recommendations,
      summary: {
        totalQueries,
        avgExecutionTime: totalQueries > 0 ? totalTime / totalQueries : 0,
        slowQueryCount: slowQueries.length,
      },
    };
  }

  private hashQuery(sql: string): string {
    // Simple hash function for query identification
    return Buffer.from(sql.replace(/\s+/g, ' ').trim()).toString('base64');
  }
}