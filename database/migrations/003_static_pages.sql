-- Static Pages for "Live Forever" SEO Architecture
-- This table stores pre-generated HTML pages that live forever with permanent URLs

CREATE TABLE static_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_path VARCHAR(500) UNIQUE NOT NULL, -- "/deeper/revelation/15/1-4"
  analysis_id UUID REFERENCES passage_analyses(id) ON DELETE CASCADE,
  template_version VARCHAR(50) NOT NULL, -- "v1.0.0"
  generated_html TEXT NOT NULL, -- Full static HTML page
  meta_title VARCHAR(200), -- SEO title
  meta_description VARCHAR(400), -- SEO description
  structured_data JSONB, -- JSON-LD for search engines
  open_graph_data JSONB, -- Open Graph tags for social sharing
  last_generated TIMESTAMP DEFAULT NOW(),
  is_published BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Template versions table for managing template updates
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name VARCHAR(50) UNIQUE NOT NULL, -- "v1.0.0"
  template_type VARCHAR(50) NOT NULL, -- "full_discovery"
  is_active BOOLEAN DEFAULT FALSE, -- Only one active version per type
  release_date TIMESTAMP DEFAULT NOW(),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Page regeneration queue for template updates
CREATE TABLE page_regeneration_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  static_page_id UUID REFERENCES static_pages(id) ON DELETE CASCADE,
  old_template_version VARCHAR(50),
  new_template_version VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_static_pages_url_path ON static_pages(url_path);
CREATE INDEX idx_static_pages_analysis_id ON static_pages(analysis_id);
CREATE INDEX idx_static_pages_template_version ON static_pages(template_version);
CREATE INDEX idx_static_pages_published ON static_pages(is_published) WHERE is_published = true;
CREATE INDEX idx_template_versions_active ON template_versions(template_type, is_active) WHERE is_active = true;
CREATE INDEX idx_regeneration_queue_status ON page_regeneration_queue(status) WHERE status = 'pending';