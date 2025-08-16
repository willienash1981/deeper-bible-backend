import { openai } from './openai-client';
import { LLM_SETTINGS } from '../config/llm-settings';
import { XMLResponseParser } from '../utils/xml-response-parser';
import { BiblicalAnalysis } from '../../shared/types/xml-types';
import { CostTracker } from '../utils/cost-tracker';
import { LLMAnalysisResponse } from '../types/ai-response.types';
import { RetryHandler } from '../utils/retry-handler';
import { ContentModerationService } from '../utils/content-moderation';
import { createLogger } from '../../utils/logger';
import { validateInput } from '../../utils/validation';
import { Logger } from 'winston';

export class StructuredLLMService {
  private xmlResponseParser: XMLResponseParser;
  private costTracker: CostTracker;
  private retryHandler: RetryHandler;
  private moderationService: ContentModerationService;
  private logger: Logger;

  constructor() {
    this.xmlResponseParser = new XMLResponseParser();
    this.costTracker = new CostTracker();
    this.retryHandler = new RetryHandler();
    this.moderationService = new ContentModerationService();
    this.logger = createLogger('StructuredLLMService');
  }

  /**
   * Generates an XML-structured biblical analysis using the OpenAI LLM.
   * @param prompt The prompt to send to the LLM.
   * @param promptVersion The version of the prompt used.
   * @returns A Promise resolving to the LLMAnalysisResponse object.
   * @throws Error if LLM generation fails or response is not valid XML.
   */
  async generateStructuredAnalysis(prompt: string, promptVersion: string): Promise<LLMAnalysisResponse> {
    // Input validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Invalid prompt: must be a non-empty string');
    }

    const sanitizedPrompt = validateInput.sanitizeText(prompt);
    
    // Check content moderation
    const moderationResult = await this.moderationService.moderateContent(sanitizedPrompt);
    if (moderationResult.flagged) {
      this.logger.warn('Content flagged by moderation', {
        categories: moderationResult.categories,
        explanation: moderationResult.explanation,
        promptVersion
      });
      throw new Error(`Content moderation failed: ${moderationResult.explanation}`);
    }

    // Additional biblical appropriateness check
    const isBiblicallyAppropriate = await this.moderationService.checkBiblicalAppropriateness(sanitizedPrompt);
    if (!isBiblicallyAppropriate) {
      throw new Error('Content is not appropriate for biblical analysis');
    }
    
    try {
      // Mock response for testing
      if (process.env.NODE_ENV === 'test') {
        const mockXml = `<analysis>
          <passage_overview>This is a test analysis for the passage.</passage_overview>
          <key_themes>
            <theme>Love</theme>
            <theme>Salvation</theme>
          </key_themes>
          <symbols>
            <symbol term="Lamb">The Lamb represents Jesus Christ</symbol>
          </symbols>
        </analysis>`;
        
        const mockAnalysis: BiblicalAnalysis = {
          passage: 'Test passage',
          passage_overview: {
            main_theme: 'Love and Salvation',
            key_message: 'This is a test analysis for the passage.',
            difficulty_level: 'beginner'
          },
          symbols_and_metaphors: {
            symbol: [{ 
              term: 'Lamb', 
              meaning: 'The Lamb represents Jesus Christ',
              biblical_pattern: 'Sacrificial offering',
              deeper_significance: 'Ultimate sacrifice'
            }]
          }
        };
        
        return {
          rawXml: mockXml,
          parsedAnalysis: mockAnalysis,
          tokensUsed: 100,
          cost: 0.001,
          model: 'test-model',
          promptVersion: promptVersion
        };
      }

      // Execute with retry logic and circuit breaker
      const response = await this.retryHandler.executeWithRetry(
        async () => {
          return await openai.createChatCompletion({
            model: LLM_SETTINGS.OPENAI_MODEL,
            messages: [
              {
                role: 'system',
                content: 'You are a biblical scholar and theological expert. Respond with structured biblical analysis in JSON format.'
              },
              {
                role: 'user',
                content: sanitizedPrompt
              }
            ],
            temperature: LLM_SETTINGS.OPENAI_TEMPERATURE,
            max_tokens: LLM_SETTINGS.OPENAI_MAX_TOKENS,
            response_format: { type: "json_object" }
          });
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 8000,
          backoffMultiplier: 2
        },
        'openai-structured-analysis'
      );

      const xmlContent = response.choices[0]?.message?.content;
      const usage = response.usage;

      if (!xmlContent) {
        throw new Error('LLM returned empty response');
      }

      // Parse and validate the JSON content with retry
      const parsedAnalysis = await this.retryHandler.executeWithRetry(
        async () => {
          return JSON.parse(xmlContent);
        },
        {
          maxRetries: 2,
          initialDelay: 500
        },
        'json-parsing'
      );

      // Calculate and log cost
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;
      const totalTokens = usage?.total_tokens || 0;
      const cost = this.costTracker.calculateCost(LLM_SETTINGS.OPENAI_MODEL, inputTokens, outputTokens);
      
      // Log cost with proper metadata
      this.costTracker.logCost(
        LLM_SETTINGS.OPENAI_MODEL, 
        inputTokens, 
        outputTokens, 
        cost, 
        undefined, // userId would come from request context
        response.id // Use OpenAI response ID for tracing
      );

      const result: LLMAnalysisResponse = {
        rawXml: xmlContent, // Keep this for compatibility - it's actually JSON now
        parsedAnalysis,
        tokensUsed: totalTokens,
        cost,
        model: LLM_SETTINGS.OPENAI_MODEL,
        promptVersion,
      };

      this.logger.info('Structured analysis generated successfully', {
        promptVersion,
        tokensUsed: totalTokens,
        cost,
        model: LLM_SETTINGS.OPENAI_MODEL,
        responseId: response.id
      });

      return result;

    } catch (error: any) {
      this.logger.error('Error generating structured LLM analysis', {
        error: error instanceof Error ? error.message : String(error),
        promptVersion,
        model: LLM_SETTINGS.OPENAI_MODEL,
        promptLength: sanitizedPrompt.length
      });

      if (error.message?.includes('Failed to parse LLM XML response')) {
        throw new Error(`Failed to generate valid XML analysis: ${error.message}`);
      }
      
      if (error.message?.includes('Circuit breaker is OPEN')) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }
      
      throw new Error(`LLM analysis generation failed: ${error.message}`);
    }
  }
}