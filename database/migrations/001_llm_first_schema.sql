-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255),
  oauth_provider VARCHAR(50),
  oauth_id VARCHAR(255),
  subscription_tier VARCHAR(20) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bible verses (lightweight reference)
CREATE TABLE bible_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book VARCHAR(50) NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  translation VARCHAR(10) NOT NULL DEFAULT 'KJV',
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- LLM-generated analysis cache
CREATE TABLE passage_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verse_range VARCHAR(200) NOT NULL, -- "Revelation 2:17" or "Matthew 5:3-8"
  normalized_range VARCHAR(200) NOT NULL, -- "revelation_2_17" or "matthew_5_3-8"
  prompt_version VARCHAR(50) NOT NULL, -- "discovery_v1.3.2"
  analysis_type VARCHAR(50) DEFAULT 'full_discovery',
  xml_content TEXT NOT NULL,
  content_summary TEXT,
  complexity_level VARCHAR(20), -- beginner|intermediate|advanced
  view_count INTEGER DEFAULT 0,
  user_rating FLOAT DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW()
);

-- User bookmarks and collections
CREATE TABLE user_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES passage_analyses(id) ON DELETE CASCADE,
  personal_notes TEXT,
  tags TEXT[],
  bookmark_group VARCHAR(100),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prompt template versioning
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name VARCHAR(50) UNIQUE NOT NULL,
  prompt_type VARCHAR(50) NOT NULL,
  prompt_template TEXT NOT NULL,
  xml_schema TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User usage tracking for freemium limits
CREATE TABLE user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month_year VARCHAR(7) NOT NULL, -- "2025-01"
  analyses_used INTEGER DEFAULT 0,
  analyses_limit INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- Indexes for performance
CREATE INDEX idx_passage_cache_lookup ON passage_analyses(normalized_range, prompt_version);
CREATE INDEX idx_passage_search ON passage_analyses USING gin(to_tsvector('english', content_summary));
CREATE INDEX idx_user_bookmarks_lookup ON user_bookmarks(user_id, created_at DESC);
CREATE INDEX idx_bible_verses_lookup ON bible_verses(book, chapter, verse, translation);
CREATE INDEX idx_user_usage_lookup ON user_usage(user_id, month_year);