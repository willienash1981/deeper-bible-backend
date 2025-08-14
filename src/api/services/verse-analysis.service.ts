import { Pool } from 'pg';
import { AnalysisCache } from '@api/cache/analysis-cache'; // Updated import
import { StructuredLLMService } from '@ai/services/structured-llm.service'; // Updated import
import { PromptManagerService } from '@ai/services/prompt-manager.service'; // Updated import
import { PromptType } from '@ai/utils/prompt-versioning'; // Updated import
import { AnalyzeRequest, AnalysisResult } from '@shared/types/analysis.types'; // Updated import
import { BiblicalAnalysis } from '@shared/types/xml-types'; // Updated import

export class VerseAnalysisService {
  private pool: Pool;
  private analysisCache: AnalysisCache;
  private structuredLLMService: StructuredLLMService;
  private promptManagerService: PromptManagerService;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.analysisCache = new AnalysisCache();
    this.structuredLLMService = new StructuredLLMService();
    this.promptManagerService = new PromptManagerService();
  }

  /**
   * Analyzes a biblical verse or passage, using cache or generating new analysis via LLM.
   * @param request The analysis request.
   * @returns The analysis result.
   */
  async analyzeVerse(request: AnalyzeRequest): Promise<AnalysisResult> {
    const { verse_range, translation = 'KJV', analysis_type = 'full_discovery' } = request;

    // Determine prompt version based on analysis type
    const promptTemplate = this.promptManagerService.getPromptTemplate(analysis_type as PromptType);
    const promptVersion = promptTemplate.version;

    // Generate cache key
    const cacheKey = this.analysisCache.generateCacheKey(verse_range, promptVersion, analysis_type);

    // 1. Check cache first
    const cachedXml = await this.analysisCache.getAnalysis(cacheKey);
    if (cachedXml) {
      // If found in cache, retrieve from DB to get full metadata and update access time
      const dbResult = await this.pool.query<AnalysisResult>(
        `SELECT * FROM passage_analyses WHERE normalized_range = $1 AND prompt_version = $2 AND analysis_type = $3`,
        [this.analysisCache['normalizeVerseRange'](verse_range), promptVersion, analysis_type]
      );
      if (dbResult.rows.length > 0) {
        const result = dbResult.rows[0];
        // Update last accessed time
        await this.pool.query(
          `UPDATE passage_analyses SET last_accessed = NOW(), view_count = view_count + 1 WHERE id = $1`,
          [result.id]
        );
        return { ...result, cached: true };
      }
    }

    // 2. If not in cache, generate using LLM
    console.log(`Generating new analysis for ${verse_range} (type: ${analysis_type}, version: ${promptVersion})`);

    // Fetch verse text (placeholder - would come from a Bible text service)
    const verseText = await this.getVerseText(verse_range, translation);

    // Build LLM prompt
    const llmPrompt = this.promptManagerService.buildPrompt(promptTemplate.template, {
      verse_range: verse_range,
      verse_text: verseText,
    });

    const llmResponse = await this.structuredLLMService.generateStructuredAnalysis(llmPrompt, promptVersion);
    const parsedAnalysis: BiblicalAnalysis = llmResponse.parsedAnalysis;

    // Extract summary and complexity from parsed analysis
    const contentSummary = parsedAnalysis.summary?.key_takeaway || '';
    const complexityLevel = parsedAnalysis.passage_overview?.difficulty_level || 'intermediate';

    // 3. Store in DB and cache
    const dbResult = await this.pool.query<AnalysisResult>(
      `INSERT INTO passage_analyses (verse_range, normalized_range, prompt_version, analysis_type, xml_content, content_summary, complexity_level, view_count, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW()) RETURNING *`,
      [verse_range, this.analysisCache['normalizeVerseRange'](verse_range), promptVersion, analysis_type, llmResponse.rawXml, contentSummary, complexityLevel]
    );
    const newAnalysis = dbResult.rows[0];

    await this.analysisCache.setAnalysis(cacheKey, llmResponse.rawXml);

    return { ...newAnalysis, parsed_analysis: parsedAnalysis, cached: false };
  }

  /**
   * Retrieves a cached analysis by its ID.
   * @param id The ID of the analysis.
   * @returns The analysis result or null if not found.
   */
  async getAnalysisById(id: string): Promise<AnalysisResult | null> {
    const dbResult = await this.pool.query<AnalysisResult>(
      `SELECT * FROM passage_analyses WHERE id = $1`,
      [id]
    );
    if (dbResult.rows.length > 0) {
      const result = dbResult.rows[0];
      // Update last accessed time
      await this.pool.query(
        `UPDATE passage_analyses SET last_accessed = NOW(), view_count = view_count + 1 WHERE id = $1`,
        [result.id]
      );
      // Parse XML content before returning
      const parsedAnalysis = await this.structuredLLMService['xmlResponseParser'].parseLLMResponse(result.xml_content);
      return { ...result, parsed_analysis: parsedAnalysis, cached: true };
    }
    return null;
  }

  /**
   * Placeholder for fetching actual verse text from a Bible text service.
   * @param verseRange The verse range to fetch.
   * @param translation The desired translation.
   * @returns The text of the verse.
   */
  private async getVerseText(verseRange: string, translation: string): Promise<string> {
    // In a real application, this would query the bible_verses table or an external API.
    console.warn(`Placeholder: Fetching verse text for ${verseRange} (${translation})`);
    return `This is the placeholder text for ${verseRange} in ${translation}.`;
  }
}