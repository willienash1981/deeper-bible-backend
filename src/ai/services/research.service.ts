import { openai } from './openai-client';
import { EmbeddingsService } from './embeddings.service';
import { createLogger } from '../../utils/logger';
import { LLM_SETTINGS } from '../config/llm-settings';

const logger = createLogger('ResearchService');

export interface ResearchQuery {
  question: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  includeReferences?: boolean;
  searchDepth?: 'shallow' | 'medium' | 'deep';
}

export interface ResearchResult {
  answer: string;
  confidence: number;
  sources: string[];
  followUpQuestions: string[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  reasoning?: string;
}

export interface CrossReferenceResult {
  passage: string;
  relevanceScore: number;
  explanation: string;
  themes: string[];
}

/**
 * Advanced research service for biblical analysis and cross-referencing
 */
export class ResearchService {
  private embeddingsService: EmbeddingsService;

  constructor() {
    this.embeddingsService = new EmbeddingsService();
  }

  /**
   * Perform comprehensive biblical research analysis
   */
  async performResearch(query: ResearchQuery): Promise<ResearchResult> {
    try {
      const {
        question,
        context = '',
        maxTokens = 4000,
        temperature = 0.1,
        includeReferences = true,
        searchDepth = 'medium'
      } = query;

      logger.info('Starting research analysis', {
        questionLength: question.length,
        hasContext: !!context,
        searchDepth,
        includeReferences
      });

      // Build system prompt based on search depth
      const systemPrompt = this.buildSystemPrompt(searchDepth, includeReferences);
      
      // Construct research prompt
      const researchPrompt = this.buildResearchPrompt(question, context, searchDepth);

      // Generate research response
      const response = await openai.generateResearchAnalysis(researchPrompt, {
        model: LLM_SETTINGS.OPENAI_MODEL,
        temperature,
        maxTokens,
        systemPrompt
      });

      // Parse response for structured information
      const parsedResult = this.parseResearchResponse(response.content);

      const result: ResearchResult = {
        answer: parsedResult.answer,
        confidence: parsedResult.confidence,
        sources: parsedResult.sources,
        followUpQuestions: parsedResult.followUpQuestions,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens || 0,
          totalTokens: response.usage.total_tokens
        },
        model: response.model,
        reasoning: response.reasoning
      };

      logger.info('Research analysis completed', {
        confidence: result.confidence,
        sourcesCount: result.sources.length,
        followUpCount: result.followUpQuestions.length,
        totalTokens: result.usage.totalTokens
      });

      return result;
    } catch (error) {
      logger.error('Research analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        question: query.question.substring(0, 100)
      });
      throw error;
    }
  }

  /**
   * Find cross-references for a given biblical passage
   */
  async findCrossReferences(
    passage: string,
    referenceText: string,
    maxReferences: number = 10
  ): Promise<CrossReferenceResult[]> {
    try {
      logger.info('Finding cross-references', {
        passage,
        referenceTextLength: referenceText.length,
        maxReferences
      });

      const prompt = `
Analyze the following biblical passage and find meaningful cross-references:

PASSAGE: ${passage}
TEXT: ${referenceText}

Please identify up to ${maxReferences} cross-references that relate to this passage through:
1. Similar themes or theological concepts
2. Parallel narratives or events
3. Prophetic fulfillments
4. Word studies or key terms
5. Typological connections

For each cross-reference, provide:
- The specific passage reference
- Relevance score (0-100)
- Brief explanation of the connection
- Key themes that link them

Format your response as JSON with the following structure:
{
  "crossReferences": [
    {
      "passage": "Book Chapter:Verse",
      "relevanceScore": 85,
      "explanation": "Brief explanation of connection",
      "themes": ["theme1", "theme2"]
    }
  ]
}
      `;

      const response = await openai.createChatCompletion({
        model: LLM_SETTINGS.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a biblical scholar expert in cross-referencing and thematic analysis. Provide accurate, well-researched cross-references with clear explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content returned from cross-reference analysis');
      }

      try {
        const parsed = JSON.parse(content);
        const crossReferences: CrossReferenceResult[] = parsed.crossReferences || [];

        logger.info('Cross-references found', {
          count: crossReferences.length,
          passage
        });

        return crossReferences;
      } catch (parseError) {
        logger.error('Failed to parse cross-reference response', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          content: content.substring(0, 200)
        });
        return [];
      }
    } catch (error) {
      logger.error('Cross-reference analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        passage
      });
      throw error;
    }
  }

  /**
   * Perform semantic search using embeddings
   */
  async semanticSearch(
    query: string,
    documents: string[],
    topK: number = 5
  ): Promise<Array<{ document: string; similarity: number; index: number }>> {
    try {
      logger.info('Performing semantic search', {
        queryLength: query.length,
        documentsCount: documents.length,
        topK
      });

      // Generate embedding for the query
      const queryEmbedding = await this.embeddingsService.generateEmbedding(query);

      // Generate embeddings for all documents
      const documentEmbeddings = await this.embeddingsService.generateBatchEmbeddings(documents);

      // Calculate similarities
      const similarities = documentEmbeddings.map((docEmbedding, index) => ({
        document: documents[index],
        similarity: this.cosineSimilarity(queryEmbedding, docEmbedding),
        index
      }));

      // Sort by similarity and return top K
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      logger.info('Semantic search completed', {
        resultsCount: results.length,
        topSimilarity: results[0]?.similarity || 0
      });

      return results;
    } catch (error) {
      logger.error('Semantic search failed', {
        error: error instanceof Error ? error.message : String(error),
        queryLength: query.length
      });
      throw error;
    }
  }

  /**
   * Build system prompt based on search depth
   */
  private buildSystemPrompt(searchDepth: string, includeReferences: boolean): string {
    let basePrompt = 'You are an expert biblical researcher and theologian with comprehensive knowledge of Scripture, church history, and theological traditions.';

    switch (searchDepth) {
      case 'shallow':
        basePrompt += ' Provide concise, accurate answers with essential information only.';
        break;
      case 'medium':
        basePrompt += ' Provide thorough analysis with relevant context, explanations, and connections to related biblical themes.';
        break;
      case 'deep':
        basePrompt += ' Provide comprehensive, scholarly analysis with detailed explanations, historical context, theological implications, and extensive cross-references.';
        break;
    }

    if (includeReferences) {
      basePrompt += ' Always include specific biblical references and cite relevant sources when possible.';
    }

    basePrompt += ' Maintain academic rigor while being accessible to both scholars and general readers.';

    return basePrompt;
  }

  /**
   * Build research prompt based on query and context
   */
  private buildResearchPrompt(question: string, context: string, searchDepth: string): string {
    let prompt = '';

    if (context) {
      prompt += `CONTEXT: ${context}\n\n`;
    }

    prompt += `RESEARCH QUESTION: ${question}\n\n`;

    switch (searchDepth) {
      case 'shallow':
        prompt += 'Please provide a clear, concise answer with key points and essential biblical references.';
        break;
      case 'medium':
        prompt += 'Please provide a comprehensive answer that includes:\n';
        prompt += '- Main theological points and explanations\n';
        prompt += '- Relevant biblical passages and cross-references\n';
        prompt += '- Historical or cultural context where relevant\n';
        prompt += '- 2-3 follow-up questions for deeper study';
        break;
      case 'deep':
        prompt += 'Please provide an extensive scholarly analysis that includes:\n';
        prompt += '- Detailed theological examination and multiple perspectives\n';
        prompt += '- Comprehensive biblical cross-references and textual analysis\n';
        prompt += '- Historical, cultural, and linguistic context\n';
        prompt += '- Connections to broader theological themes\n';
        prompt += '- Implications for contemporary understanding\n';
        prompt += '- 5+ follow-up questions for extended research';
        break;
    }

    prompt += '\n\nAlso provide a confidence level (0-100) for your analysis based on the strength of biblical and scholarly evidence.';

    return prompt;
  }

  /**
   * Parse research response to extract structured information
   */
  private parseResearchResponse(content: string): {
    answer: string;
    confidence: number;
    sources: string[];
    followUpQuestions: string[];
  } {
    // Extract confidence score
    const confidenceMatch = content.match(/confidence[:\s]*(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 75;

    // Extract biblical references (basic pattern matching)
    const referencePattern = /\b(?:[1-3]\s*)?[A-Za-z]+\s+\d+(?::\d+(?:-\d+)?)?(?:\s*[,;]\s*\d+(?::\d+(?:-\d+)?)?)*\b/g;
    const references = content.match(referencePattern) || [];
    const uniqueReferences = [...new Set(references)];

    // Extract follow-up questions
    const questionPattern = /(?:follow[- ]?up|further|additional)[\s\w]*questions?[:\s]*((?:[^\n]*\?[^\n]*\n?)+)/i;
    const questionsMatch = content.match(questionPattern);
    const followUpQuestions: string[] = [];
    
    if (questionsMatch) {
      const questionsText = questionsMatch[1];
      const questions = questionsText.split(/\n|(?:\d+\.)/);
      followUpQuestions.push(...questions
        .filter(q => q.trim().includes('?'))
        .map(q => q.trim())
        .filter(q => q.length > 10)
      );
    }

    return {
      answer: content,
      confidence,
      sources: uniqueReferences,
      followUpQuestions
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}