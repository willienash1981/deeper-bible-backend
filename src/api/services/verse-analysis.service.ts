import { Pool } from 'pg';
import { AnalysisCache } from '../cache/analysis-cache'; // Updated import
import { StructuredLLMService } from '../../ai/services/structured-llm.service'; // Updated import
import { PromptManagerService } from '../../ai/services/prompt-manager.service'; // Updated import
import { PromptType } from '../../ai/utils/prompt-versioning'; // Updated import
import { AnalyzeRequest, AnalysisResult } from '../../shared/types/analysis.types'; // Updated import
import { BiblicalAnalysis } from '../../shared/types/xml-types'; // Updated import
import { BollsBibleService } from './bolls-bible.service';

export class VerseAnalysisService {
  private pool: Pool;
  private analysisCache: AnalysisCache;
  private structuredLLMService: StructuredLLMService;
  private promptManagerService: PromptManagerService;
  private bollsBibleService: BollsBibleService;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.analysisCache = new AnalysisCache();
    this.structuredLLMService = new StructuredLLMService();
    this.promptManagerService = new PromptManagerService();
    this.bollsBibleService = new BollsBibleService();
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
   * Fetches actual verse text from database or external API.
   * @param verseRange The verse range to fetch (e.g., "john 3:16", "psalms 23:1-3", "revelation 2:17").
   * @param translation The desired translation.
   * @returns The text of the verse(s).
   */
  private async getVerseText(verseRange: string, translation: string): Promise<string> {
    try {
      // Parse verse range (e.g., "john 3:16", "psalms 23:1-3")
      const parsed = this.parseVerseRange(verseRange);
      if (!parsed) {
        throw new Error(`Could not parse verse range: ${verseRange}`);
      }

      const { book, chapter, startVerse, endVerse } = parsed;

      // First try to get from database
      const dbVerses = await this.getVersesFromDB(book, chapter, startVerse, endVerse, translation);
      if (dbVerses.length > 0) {
        return dbVerses.map(v => `${v.verse}. ${v.text}`).join(' ');
      }

      // Fallback to Bolls Bible API (NIV only)
      if (translation === 'NIV' || translation === 'KJV') { // Treat KJV requests as NIV for now
        const bookInfo = this.bollsBibleService.getBookInfo(book.toLowerCase());
        if (bookInfo) {
          if (startVerse === endVerse) {
            // Single verse
            const verse = await this.bollsBibleService.getVerse(bookInfo.number, chapter, startVerse);
            return verse ? `${verse.verse}. ${verse.text}` : `Verse ${verseRange} not found.`;
          } else {
            // Multiple verses
            const chapterVerses = await this.bollsBibleService.getChapterVerses(bookInfo.number, chapter);
            const requestedVerses = chapterVerses.filter(v => v.verse >= startVerse && v.verse <= endVerse);
            return requestedVerses.map(v => `${v.verse}. ${v.text}`).join(' ');
          }
        }
      }

      // Last resort fallback
      return `Text for ${verseRange} (${translation}) is not currently available. Please try a different translation or contact support.`;
    } catch (error) {
      console.error(`Error fetching verse text for ${verseRange}:`, error);
      return `Error retrieving ${verseRange}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Parses a verse range string into its components.
   * @param verseRange The verse range string (e.g., "john 3:16", "psalms 23:1-3")
   * @returns Parsed components or null if invalid
   */
  private parseVerseRange(verseRange: string): { book: string; chapter: number; startVerse: number; endVerse: number } | null {
    try {
      // Normalize the input: remove extra spaces, convert to lowercase
      const normalized = verseRange.trim().toLowerCase();
      
      // Match patterns like "john 3:16" or "psalms 23:1-3" or "1 john 2:15-17"
      const match = normalized.match(/^((?:\d\s+)?[a-z]+)\s+(\d+):(\d+)(?:-(\d+))?$/);
      
      if (!match) {
        return null;
      }

      const book = match[1].replace(/\s+/g, ''); // Remove spaces from book names
      const chapter = parseInt(match[2], 10);
      const startVerse = parseInt(match[3], 10);
      const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

      return { book, chapter, startVerse, endVerse };
    } catch (error) {
      console.error(`Error parsing verse range ${verseRange}:`, error);
      return null;
    }
  }

  /**
   * Fetches verses from the database.
   * @param book The book name
   * @param chapter The chapter number
   * @param startVerse The starting verse number
   * @param endVerse The ending verse number
   * @param translation The translation
   * @returns Array of verse records
   */
  private async getVersesFromDB(book: string, chapter: number, startVerse: number, endVerse: number, translation: string): Promise<Array<{verse: number, text: string}>> {
    try {
      const result = await this.pool.query(
        `SELECT verse, text FROM bible_verses 
         WHERE LOWER(book) = LOWER($1) AND chapter = $2 AND verse >= $3 AND verse <= $4 AND UPPER(translation) = UPPER($5)
         ORDER BY verse`,
        [book, chapter, startVerse, endVerse, translation]
      );
      return result.rows;
    } catch (error) {
      console.error(`Error querying database for ${book} ${chapter}:${startVerse}-${endVerse}:`, error);
      return [];
    }
  }
}