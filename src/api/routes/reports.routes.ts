import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { VerseAnalysisService } from '../services/verse-analysis.service';
import { StaticPageGeneratorService } from '../../services/static-page-generator.service';
import { Pool } from 'pg';

const router = Router();
const verseAnalysisService = new VerseAnalysisService();

// Initialize StaticPageGenerator with database connection
const getDatabasePool = (): Pool => {
  return new Pool({
    connectionString: process.env.DATABASE_URL
  });
};

const staticPageGenerator = new StaticPageGeneratorService(getDatabasePool());

// In-memory store for demo purposes (in production, use database)
const reports = new Map();

// AI analysis function using the sophisticated prompt system
const generateAIAnalysis = async (bookId: string, chapter: number, verses: string): Promise<{content: string, analysis?: any}> => {
  try {
    const verseRange = `${bookId} ${chapter}:${verses}`;
    
    // Use the actual VerseAnalysisService with the sophisticated prompt system
    const analysisResult = await verseAnalysisService.analyzeVerse({
      verse_range: verseRange,
      translation: 'KJV',
      analysis_type: 'full_discovery'
    });

    // Parse the JSON content if it's a string
    let analysis = analysisResult.parsed_analysis;
    if (!analysis && analysisResult.xml_content) {
      try {
        // Try to parse the JSON content manually
        analysis = JSON.parse(analysisResult.xml_content);
        console.log('✅ Successfully parsed JSON content:', Object.keys(analysis));
      } catch (parseError) {
        console.error('❌ Failed to parse JSON content:', parseError);
      }
    }

    // Generate "live forever" static page from the analysis
    if (analysis) {
      
      // Create the beautiful static page that will "live forever"
      try {
        await staticPageGenerator.generateStaticPage(
          analysis,
          verseRange,
          'v1.0.0', // Current template version
          { generateFiles: true } // Also generate static files
        );
        console.log(`✨ Generated "live forever" static page for ${verseRange}`);
      } catch (staticError) {
        console.error('Failed to generate static page:', staticError);
        // Continue with regular flow even if static generation fails
      }

    // Convert the structured XML analysis to markdown format for the report
      
      const markdownContent = `
# Deeper Biblical Analysis
## ${verseRange}

### Overview
**Main Theme**: ${analysis.passage_overview?.main_theme || analysis.summary?.what_is_this_passage_primarily_about || 'Biblical passage analysis'}
**Key Message**: ${analysis.passage_overview?.key_message || analysis.summary?.core_message_in_simple_terms || 'Understanding God\'s Word'}
**Difficulty Level**: ${analysis.passage_overview?.difficulty_level || analysis.summary?.difficulty_level || 'intermediate'}

### Cultural Context
**Original Audience**: ${analysis.cultural_context?.original_audience || 'Ancient biblical audience'}
**Historical Situation**: ${analysis.cultural_context?.historical_situation || 'Historical biblical context'}
**Cultural Practices**: ${analysis.cultural_context?.cultural_practices || 'Relevant ancient customs'}

### Confusing Elements Explained
${analysis.confusing_elements?.element?.map(element => `
**${element.term}** (${element.type}):
- ${element.explanation}
- Why it's confusing: ${element.why_confusing}
- Significance: ${element.significance}
`).join('\n') || 'No particularly confusing elements identified.'}

### Theological Insights
${analysis.theological_insights?.insight?.map(insight => `
**${insight.category}**: ${insight.truth}
- Application: ${insight.application}
`).join('\n') || 'Core theological principles apply.'}

### Symbols and Metaphors
${analysis.symbols_and_metaphors?.symbol?.map(symbol => `
**${symbol.term}**: ${symbol.meaning}
- Biblical Pattern: ${symbol.biblical_pattern}
- Deeper Significance: ${symbol.deeper_significance}
`).join('\n') || 'Literal interpretation primarily applies.'}

### Cross-References
${analysis.connections?.connection?.map(connection => `
**${connection.verse}** (${connection.relationship}):
- ${connection.explanation}
- Insight: ${connection.insight}
`).join('\n') || 'Related passages illuminate this text.'}

### Practical Application
**Modern Relevance**: ${analysis.practical_application?.modern_relevance || 'This passage speaks to contemporary life.'}

**Action Points**: ${analysis.practical_application?.action_points || 'Consider how to live out these truths.'}

**Reflection Questions**: ${analysis.practical_application?.reflection_questions || 'How does this passage challenge your faith?'}

### Summary
**Key Takeaway**: ${analysis.summary?.key_takeaway || 'God\'s Word provides guidance for life.'}
**Memorable Insight**: ${analysis.summary?.memorable_insight || 'This passage reveals God\'s character and our response.'}

---
*This analysis was generated using AI-powered biblical study tools with sophisticated theological prompts. Continue to study with prayer and in community with other believers.*
      `.trim();

      return {
        content: markdownContent,
        analysis: analysis
      };
    }
    
    // Fallback if parsing fails
    return {
      content: analysisResult.xml_content || 'Analysis generated but formatting unavailable.',
      analysis: null
    };
    
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    throw new Error('Failed to generate biblical analysis');
  }
};

// GET /api/reports/check - Check if a report already exists for the verse range
router.get('/check', async (req: Request, res: Response) => {
  try {
    const { bookId, chapter, verses } = req.query;
    
    if (!bookId || !chapter || !verses) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: bookId, chapter, verses'
      });
    }

    // First check in-memory reports cache
    const existing = Array.from(reports.values()).find(
      r => r.bookId === bookId && r.chapter === parseInt(chapter as string) && r.verses === verses && r.status === 'completed'
    );
    
    if (existing) {
      return res.json({
        exists: true,
        report: existing
      });
    }

    // Check if analysis exists in VerseAnalysisService (database cache)
    try {
      const verseRange = `${bookId} ${chapter}:${verses}`;
      const analysisResult = await verseAnalysisService.analyzeVerse({
        verse_range: verseRange,
        translation: 'KJV',
        analysis_type: 'full_discovery'
      });

      // If we got a cached result, convert it to report format
      if (analysisResult.cached && analysisResult.xml_content) {
        const reportId = uuidv4();
        const convertedReport = {
          id: reportId,
          bookId: bookId as string,
          chapter: parseInt(chapter as string),
          verses: verses as string,
          status: 'completed' as const,
          content: await convertAnalysisToMarkdown(analysisResult),
          analysis: analysisResult.parsed_analysis,
          createdAt: analysisResult.generated_at?.toISOString() || new Date().toISOString(),
          completedAt: analysisResult.last_accessed?.toISOString() || new Date().toISOString()
        };

        // Store in reports cache for future quick access
        reports.set(reportId, convertedReport);

        return res.json({
          exists: true,
          report: convertedReport
        });
      }
    } catch (error) {
      console.log('No existing analysis found in database cache');
    }

    res.json({
      exists: false,
      report: null
    });
  } catch (error) {
    console.error('Check report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check report'
    });
  }
});

// Helper function to convert analysis result to markdown
async function convertAnalysisToMarkdown(analysisResult: any): Promise<string> {
  if (analysisResult.parsed_analysis) {
    const analysis = analysisResult.parsed_analysis;
    const verseRange = analysisResult.verse_range;
    
    return `
# Deeper Biblical Analysis
## ${verseRange}

### Overview
**Main Theme**: ${analysis.passage_overview?.main_theme || analysis.summary?.what_is_this_passage_primarily_about || 'Biblical passage analysis'}
**Key Message**: ${analysis.passage_overview?.key_message || analysis.summary?.core_message_in_simple_terms || 'Understanding God\'s Word'}
**Difficulty Level**: ${analysis.passage_overview?.difficulty_level || analysis.summary?.difficulty_level || 'intermediate'}

### Cultural Context
**Original Audience**: ${analysis.cultural_context?.original_audience || 'Ancient biblical audience'}
**Historical Situation**: ${analysis.cultural_context?.historical_situation || 'Historical biblical context'}
**Cultural Practices**: ${analysis.cultural_context?.cultural_practices || 'Relevant ancient customs'}

### Confusing Elements Explained
${analysis.confusing_elements?.element?.map((element: any) => `
**${element.term}** (${element.type}):
- ${element.explanation}
- Why it's confusing: ${element.why_confusing}
- Significance: ${element.significance}
`).join('\n') || 'No particularly confusing elements identified.'}

### Theological Insights
${analysis.theological_insights?.insight?.map((insight: any) => `
**${insight.category}**: ${insight.truth}
- Application: ${insight.application}
`).join('\n') || 'Core theological principles apply.'}

### Symbols and Metaphors
${analysis.symbols_and_metaphors?.symbol?.map((symbol: any) => `
**${symbol.term}**: ${symbol.meaning}
- Biblical Pattern: ${symbol.biblical_pattern}
- Deeper Significance: ${symbol.deeper_significance}
`).join('\n') || 'Literal interpretation primarily applies.'}

### Cross-References
${analysis.connections?.connection?.map((connection: any) => `
**${connection.verse}** (${connection.relationship}):
- ${connection.explanation}
- Insight: ${connection.insight}
`).join('\n') || 'Related passages illuminate this text.'}

### Practical Application
**Modern Relevance**: ${analysis.practical_application?.modern_relevance || 'This passage speaks to contemporary life.'}

**Action Points**: ${analysis.practical_application?.action_points || 'Consider how to live out these truths.'}

**Reflection Questions**: ${analysis.practical_application?.reflection_questions || 'How does this passage challenge your faith?'}

### Summary
**Key Takeaway**: ${analysis.summary?.key_takeaway || 'God\'s Word provides guidance for life.'}
**Memorable Insight**: ${analysis.summary?.memorable_insight || 'This passage reveals God\'s character and our response.'}

---
*This analysis was generated using AI-powered biblical study tools with sophisticated theological prompts. Continue to study with prayer and in community with other believers.*
    `.trim();
  }
  
  return analysisResult.xml_content || 'Analysis generated but formatting unavailable.';
}

// GET /api/reports/generate - Support both GET and POST for compatibility
router.get('/generate', async (req: Request, res: Response) => {
  try {
    const { bookId, chapter, verses } = req.query;
    
    if (!bookId || !chapter || !verses) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: bookId, chapter, verses'
      });
    }

    // Check if report already exists (cache)
    const existing = Array.from(reports.values()).find(
      r => r.bookId === bookId && r.chapter === parseInt(chapter as string) && r.verses === verses && r.status === 'completed'
    );
    
    if (existing) {
      return res.json(existing);
    }

    // Create new report
    const reportId = uuidv4();
    const report = {
      id: reportId,
      bookId: bookId as string,
      chapter: parseInt(chapter as string),
      verses: verses as string,
      status: 'processing' as const,
      createdAt: new Date().toISOString()
    };
    
    reports.set(reportId, report);

    // Generate analysis asynchronously
    generateAIAnalysis(bookId as string, parseInt(chapter as string), verses as string)
      .then(result => {
        reports.set(reportId, {
          ...report,
          status: 'completed' as const,
          content: result.content,
          analysis: result.analysis,
          completedAt: new Date().toISOString()
        });
      })
      .catch(error => {
        reports.set(reportId, {
          ...report,
          status: 'failed' as const,
          error: error.message
        });
      });

    res.status(201).json(report);
  } catch (error) {
    console.error('Generate report error (GET):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// POST /api/reports/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { bookId, chapter, verses } = req.body;
    
    if (!bookId || !chapter || !verses) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: bookId, chapter, verses'
      });
    }

    // Check if report already exists (cache)
    const cacheKey = `${bookId}-${chapter}-${verses}`;
    const existing = Array.from(reports.values()).find(
      r => r.bookId === bookId && r.chapter === chapter && r.verses === verses && r.status === 'completed'
    );
    
    if (existing) {
      return res.json(existing);
    }

    // Create new report
    const reportId = uuidv4();
    const report = {
      id: reportId,
      bookId,
      chapter,
      verses,
      status: 'processing',
      createdAt: new Date().toISOString()
    };
    
    reports.set(reportId, report);

    // Generate analysis asynchronously
    generateAIAnalysis(bookId, chapter, verses)
      .then(result => {
        reports.set(reportId, {
          ...report,
          status: 'completed',
          content: result.content,
          analysis: result.analysis,
          completedAt: new Date().toISOString()
        });
      })
      .catch(error => {
        reports.set(reportId, {
          ...report,
          status: 'failed',
          error: error.message
        });
      });

    res.status(201).json(report);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// GET /api/reports/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = reports.get(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve report'
    });
  }
});

// Route to serve static "live forever" pages
router.get('/static/:book/:chapter/:verses', async (req: Request, res: Response) => {
  try {
    const { book, chapter, verses } = req.params;
    const urlPath = `/deeper/${book}/${chapter}/${verses}`;
    
    // Try to get the static page
    const staticHTML = await staticPageGenerator.getStaticPage(urlPath);
    
    if (staticHTML) {
      // Serve the beautiful static HTML directly
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      return res.send(staticHTML);
    }
    
    // If no static page exists, redirect to generate one
    return res.redirect(`/api/reports/generate?bookId=${book}&chapter=${chapter}&verses=${verses}`);
    
  } catch (error) {
    console.error('Error serving static page:', error);
    return res.status(500).json({ 
      error: 'Failed to serve static page',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;