-- Performance Optimization Indexes
-- This migration adds indexes to improve query performance

-- Book indexes (already exist in schema)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_book_number" ON "Book" ("bookNumber");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_book_testament" ON "Book" ("testament");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_book_order" ON "Book" ("bookOrder");

-- Verse indexes (already exist in schema)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_verse_book_chapter" ON "Verse" ("bookId", "chapter");
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_verse_keywords" ON "Verse" USING GIN ("keywords");

-- Additional performance indexes for Reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_status_created" ON "Report" ("status", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_user_type_created" ON "Report" ("userId", "reportType", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_book_chapter_type" ON "Report" ("bookId", "chapter", "reportType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_completed_expires" ON "Report" ("completedAt", "expiresAt") WHERE "status" = 'COMPLETED';

-- History indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_history_user_created_desc" ON "History" ("userId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_history_action_created" ON "History" ("action", "createdAt");

-- Favorite indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_favorite_user_created_desc" ON "Favorite" ("userId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_favorite_book_created" ON "Favorite" ("bookId", "createdAt");

-- Cross Reference indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cross_ref_source_confidence" ON "CrossReference" ("sourceBook", "sourceChapter", "sourceVerse", "confidence" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cross_ref_target_confidence" ON "CrossReference" ("targetBook", "targetChapter", "targetVerse", "confidence" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cross_ref_relationship" ON "CrossReference" ("relationship", "confidence" DESC);

-- Symbol Pattern indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_symbol_category_occurrences" ON "SymbolPattern" ("category", "occurrences" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_symbol_occurrences_desc" ON "SymbolPattern" ("occurrences" DESC);

-- Cache Entry indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cache_expires_key" ON "CacheEntry" ("expiresAt", "key") WHERE "expiresAt" > NOW();
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_cache_created_ttl" ON "CacheEntry" ("createdAt", "ttl");

-- Full-text search index on verse text (PostgreSQL specific)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_verse_text_fulltext" ON "Verse" USING gin(to_tsvector('english', "text"));

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_cache_lookup" ON "Report" ("bookId", "chapter", "verseStart", "verseEnd", "reportType", "status");

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_active" ON "Report" ("createdAt" DESC) WHERE "status" IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_completed_recent" ON "Report" ("completedAt" DESC) WHERE "status" = 'COMPLETED' AND "completedAt" > CURRENT_TIMESTAMP - INTERVAL '30 days';

-- Statistics and analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_stats_user_date" ON "Report" ("userId", DATE("createdAt"), "cost", "tokens") WHERE "cost" IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_report_stats_model_date" ON "Report" ("model", DATE("createdAt")) WHERE "model" IS NOT NULL;

-- Performance monitoring
-- Track index usage stats
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Track table statistics
CREATE OR REPLACE VIEW table_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;