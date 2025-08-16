import { Pool } from 'pg';
import { BiblicalAnalysis } from '../shared/types/xml-types';

export interface StaticPageData {
  urlPath: string;
  analysisId: string;
  templateVersion: string;
  metaTitle: string;
  metaDescription: string;
  structuredData: any;
  openGraphData: any;
}

export interface StaticPageOptions {
  generateFiles?: boolean; // Whether to write actual HTML files
  outputDir?: string; // Directory for static files
}

export class StaticPageGeneratorService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Generates a static HTML page from structured biblical analysis
   * This creates the "live forever" pages that Google can crawl
   */
  async generateStaticPage(
    analysis: BiblicalAnalysis,
    verseReference: string,
    templateVersion: string,
    options: StaticPageOptions = {},
    analysisId?: string
  ): Promise<StaticPageData> {
    
    // 1. Generate the beautiful HTML using our ShadCN components
    const renderedContent = this.renderAnalysisToHTML(analysis, verseReference);
    
    // 2. Create SEO metadata
    const seoData = this.generateSEOMetadata(analysis, verseReference);
    
    // 3. Build complete HTML page
    const fullHTML = this.buildFullHTMLPage(renderedContent, seoData, verseReference);
    
    // 4. Determine URL path
    const urlPath = this.generateUrlPath(verseReference);
    
    // 5. Store in database
    const staticPageData: StaticPageData = {
      urlPath,
      analysisId: analysisId || '', // Use provided analysisId or empty string for NULL
      templateVersion,
      metaTitle: seoData.title,
      metaDescription: seoData.description,
      structuredData: seoData.structuredData,
      openGraphData: seoData.openGraph
    };

    await this.saveStaticPage(staticPageData, fullHTML);
    
    // 6. Optionally write to file system for direct serving
    if (options.generateFiles) {
      await this.writeStaticFile(urlPath, fullHTML, options.outputDir);
    }

    return staticPageData;
  }

  /**
   * Renders the BiblicalAnalysis as beautiful HTML
   * This replaces the ugly hashtag markdown with proper styling
   */
  private renderAnalysisToHTML(analysis: BiblicalAnalysis, verseReference: string): string {
    return this.generateBeautifulHTML(analysis, verseReference);
  }

  /**
   * Generates beautiful HTML structure that matches our ShadCN styling
   * This is the template-driven rendering that makes content "live forever"
   */
  private generateBeautifulHTML(analysis: any, verseReference: string): string {
    console.log('🎨 Template Debug - Analysis structure keys:', Object.keys(analysis || {}));
    console.log('🎨 Template Debug - Summary content:', analysis?.summary);
    console.log('🎨 Template Debug - Interpretation content:', analysis?.interpretation);
    
    const html = `
      <div class="space-y-6 max-w-4xl mx-auto">
        <!-- Header -->
        <div class="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            Deeper Study: ${verseReference}
          </h1>
          <p class="text-blue-700 font-medium">
            ${analysis?.main?.what_is_this_passage_primarily_about || analysis?.primary?.what_is_this_passage_primarily_about || analysis?.summary?.what_is_this_passage_primarily_about || 'Biblical Analysis'}
          </p>
        </div>

        <!-- Passage Summary -->
        ${(analysis?.main || analysis?.primary) ? `
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            Passage Overview
          </h2>
          <div class="space-y-3">
            <p class="text-gray-700"><strong>Main Theme:</strong> ${(analysis.main || analysis.primary).what_is_this_passage_primarily_about}</p>
            <p class="text-gray-700"><strong>Core Message:</strong> ${(analysis.main || analysis.primary).core_message_in_simple_terms}</p>
            <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-800">
              ${(analysis.main || analysis.primary).difficulty_level || 'intermediate'}
            </span>
          </div>
        </div>
        ` : ''}

        <!-- Understanding This Passage -->
        ${(analysis?.explanation?.meaning || analysis?.confusion) ? `
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
            Understanding This Passage
          </h2>
          <div class="space-y-4">
            <div class="border-l-4 border-orange-400 pl-4">
              <h3 class="font-medium text-gray-900">Explanation</h3>
              <p class="text-gray-700 mt-1">${analysis?.explanation?.meaning?.clear_explanation || analysis?.confusion?.clear_explanation || 'Clear explanation of the passage'}</p>
            </div>
            <div class="border-l-4 border-red-400 pl-4">
              <h3 class="font-medium text-gray-900">Why This Is Challenging</h3>
              <p class="text-gray-700 mt-1">${analysis?.explanation?.meaning?.why_modern_readers_struggle_with_this || analysis?.confusion?.why_modern_readers_struggle_with_this || 'Modern readers may find this challenging'}</p>
            </div>
            <div class="border-l-4 border-green-400 pl-4">
              <h3 class="font-medium text-gray-900">Why This Matters</h3>
              <p class="text-gray-700 mt-1">${analysis?.explanation?.meaning?.why_understanding_this_matters || analysis?.confusion?.why_understanding_this_matters || 'Understanding this matters for spiritual growth'}</p>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Theological Insights -->
        ${(analysis?.theology?.theological_implications || analysis?.theological) ? `
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
            Theological Insights
          </h2>
          <div class="space-y-4">
            <div class="border-l-4 border-purple-400 pl-4">
              <h3 class="font-medium text-gray-900">Theological Principle</h3>
              <p class="text-gray-700 mt-1">${analysis?.theology?.theological_implications?.theological_principle || analysis?.theological?.theological_principle || 'Core theological principle'}</p>
              <p class="text-sm text-gray-600 mt-2"><strong>How This Applies Today:</strong> ${analysis?.theology?.theological_implications?.how_this_applies_today || analysis?.theological?.how_this_applies_today || 'Application for contemporary believers'}</p>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Cultural Context -->
        ${analysis?.context?.historical_cultural_background ? `
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-2 h-2 bg-amber-500 rounded-full mr-3"></span>
            Cultural Context
          </h2>
          <div class="space-y-3">
            <p class="text-gray-700"><strong>Original Audience:</strong> ${analysis.context.historical_cultural_background.who_was_this_written_to}</p>
            <p class="text-gray-700"><strong>Historical Situation:</strong> ${analysis.context.historical_cultural_background.what_was_happening_when_written}</p>
            <p class="text-gray-700"><strong>Cultural Practices:</strong> ${analysis.context.historical_cultural_background.relevant_customs_or_practices}</p>
          </div>
        </div>
        ` : ''}

        <!-- Practical Application -->
        ${analysis?.application?.personal_reflection ? `
        <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
            Practical Application
          </h2>
          <div class="space-y-3">
            <p class="text-gray-700"><strong>Modern Relevance:</strong> ${analysis.application.personal_reflection.how_this_applies_to_contemporary_life}</p>
            <p class="text-gray-700"><strong>Action Points:</strong> ${analysis.application.personal_reflection.specific_ways_to_live_this_out}</p>
            <p class="text-gray-700"><strong>Reflection Questions:</strong> ${analysis.application.personal_reflection.questions_for_deeper_consideration}</p>
          </div>
        </div>
        ` : ''}

        <!-- Key Takeaway -->
        ${(analysis?.conclusion?.key_takeaway || analysis?.conclusion) ? `
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span class="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
            Key Takeaway
          </h2>
          <div class="space-y-3">
            <p class="text-gray-800 font-medium">${analysis?.conclusion?.key_takeaway?.most_important_thing_to_understand || analysis?.conclusion?.most_important_thing_to_understand || 'Most important insight from this passage'}</p>
            <p class="text-gray-700">${analysis?.conclusion?.key_takeaway?.something_that_will_stick_with_reader || analysis?.conclusion?.something_that_will_stick_with_reader || 'Something memorable for further reflection'}</p>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    return html;
  }

  /**
   * Generates SEO metadata for search engines
   * This is what makes the pages rank well in Google
   */
  private generateSEOMetadata(analysis: BiblicalAnalysis, verseReference: string) {
    const title = `${verseReference} Biblical Analysis - Deeper Bible Study`;
    const description = analysis.summary?.key_takeaway || 
                       analysis.passage_overview?.key_message || 
                       `Comprehensive biblical analysis of ${verseReference} with theological insights, cultural context, and practical applications.`;

    // JSON-LD structured data for search engines
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
      "author": {
        "@type": "Organization",
        "name": "Deeper Bible"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Deeper Bible"
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "url": `https://deeperbible.com${this.generateUrlPath(verseReference)}`
      },
      "about": {
        "@type": "Thing",
        "name": verseReference,
        "description": "Biblical passage analysis"
      }
    };

    // Open Graph data for social sharing
    const openGraph = {
      title,
      description,
      type: "article",
      url: `https://deeperbible.com${this.generateUrlPath(verseReference)}`,
      site_name: "Deeper Bible"
    };

    return {
      title,
      description,
      structuredData,
      openGraph
    };
  }

  /**
   * Builds the complete HTML page with SEO metadata
   */
  private buildFullHTMLPage(content: string, seoData: any, verseReference: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoData.title}</title>
  <meta name="description" content="${seoData.description}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${seoData.openGraph.title}">
  <meta property="og:description" content="${seoData.openGraph.description}">
  <meta property="og:type" content="${seoData.openGraph.type}">
  <meta property="og:url" content="${seoData.openGraph.url}">
  <meta property="og:site_name" content="${seoData.openGraph.site_name}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${seoData.title}">
  <meta name="twitter:description" content="${seoData.description}">
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(seoData.structuredData, null, 2)}
  </script>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <style>
    /* Custom styles for beautiful rendering */
    .prose { max-width: none; }
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <header class="bg-white shadow-sm border-b">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <div class="flex items-center">
          <h1 class="text-2xl font-bold text-blue-600">Deeper Bible</h1>
        </div>
        <nav class="flex space-x-6">
          <a href="/" class="text-gray-600 hover:text-blue-600">Home</a>
          <a href="/browse" class="text-gray-600 hover:text-blue-600">Browse Books</a>
        </nav>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    ${content}
  </main>

  <footer class="bg-gray-800 text-white mt-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <p class="text-center text-gray-400">© 2024 Deeper Bible. NIV Translation.</p>
    </div>
  </footer>
</body>
</html>
    `;
  }

  /**
   * Generates URL path from verse reference
   */
  private generateUrlPath(verseReference: string): string {
    // Convert "Revelation 15:1-4" to "/deeper/revelation/15/1-4"
    const normalized = verseReference.toLowerCase()
      .replace(/\s+/g, '')
      .replace(':', '/')
      .replace(/(\d+)-(\d+)/, '$1-$2');
    
    const parts = normalized.match(/([a-z]+)(\d+)\/(.+)/);
    if (parts) {
      const [, book, chapter, verses] = parts;
      return `/deeper/${book}/${chapter}/${verses}`;
    }
    
    return `/deeper/${normalized}`;
  }

  /**
   * Saves static page data to database
   */
  private async saveStaticPage(pageData: StaticPageData, html: string): Promise<void> {
    const query = `
      INSERT INTO static_pages (url_path, analysis_id, template_version, generated_html, meta_title, meta_description, structured_data, open_graph_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (url_path) 
      DO UPDATE SET 
        template_version = EXCLUDED.template_version,
        generated_html = EXCLUDED.generated_html,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        structured_data = EXCLUDED.structured_data,
        open_graph_data = EXCLUDED.open_graph_data,
        last_generated = NOW()
    `;

    await this.pool.query(query, [
      pageData.urlPath,
      pageData.analysisId || null, // Use NULL if empty string
      pageData.templateVersion,
      html,
      pageData.metaTitle,
      pageData.metaDescription,
      JSON.stringify(pageData.structuredData),
      JSON.stringify(pageData.openGraphData)
    ]);
  }

  /**
   * Writes static HTML file to filesystem for direct serving
   */
  private async writeStaticFile(urlPath: string, html: string, outputDir = './static'): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const filePath = path.join(outputDir, urlPath, 'index.html');
    const dir = path.dirname(filePath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, html, 'utf8');
  }

  /**
   * Retrieves static page by URL path
   */
  async getStaticPage(urlPath: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT generated_html FROM static_pages WHERE url_path = $1 AND is_published = true',
      [urlPath]
    );

    return result.rows[0]?.generated_html || null;
  }

  /**
   * Marks pages for regeneration when template version changes
   */
  async scheduleRegenerationForTemplate(oldVersion: string, newVersion: string): Promise<void> {
    await this.pool.query(`
      INSERT INTO page_regeneration_queue (static_page_id, old_template_version, new_template_version)
      SELECT id, template_version, $2
      FROM static_pages 
      WHERE template_version = $1 AND is_published = true
    `, [oldVersion, newVersion]);
  }
}