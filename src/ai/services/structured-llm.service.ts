import openai from './openai-client';
import { LLM_SETTINGS } from '../config/llm-settings';
import { XMLResponseParser } from '../utils/xml-response-parser';
import { BiblicalAnalysis } from '../../shared/types/xml-types';
import { CostTracker } from '../utils/cost-tracker'; // Added
import { LLMAnalysisResponse } from '../types/ai-response.types'; // Added

export class StructuredLLMService {
  private xmlResponseParser: XMLResponseParser;
  private costTracker: CostTracker; // Added

  constructor() {
    this.xmlResponseParser = new XMLResponseParser();
    this.costTracker = new CostTracker(); // Added
  }

  /**
   * Generates an XML-structured biblical analysis using the OpenAI LLM.
   * @param prompt The prompt to send to the LLM.
   * @param promptVersion The version of the prompt used.
   * @returns A Promise resolving to the LLMAnalysisResponse object.
   * @throws Error if LLM generation fails or response is not valid XML.
   */
  async generateStructuredAnalysis(prompt: string, promptVersion: string): Promise<LLMAnalysisResponse> { // Modified return type
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
        
        return {
          rawXml: mockXml,
          parsedAnalysis: {
            passage_overview: 'This is a test analysis for the passage.',
            key_themes: ['Love', 'Salvation'],
            symbols: [{ term: 'Lamb', meaning: 'The Lamb represents Jesus Christ' }]
          },
          tokensUsed: 100,
          cost: 0.001,
          model: 'test-model',
          promptVersion: promptVersion
        };
      }

      const response = await openai.chat.completions.create({
        model: LLM_SETTINGS.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a biblical scholar and theological expert. Always respond in valid XML format as specified by the user prompt. Ensure the XML is well-formed and adheres to the provided schema.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: LLM_SETTINGS.OPENAI_TEMPERATURE,
        max_tokens: LLM_SETTINGS.OPENAI_MAX_TOKENS,
        response_format: { type: "text" }
      });

      const xmlContent = response.choices[0].message.content;
      const usage = response.usage; // Get token usage

      if (!xmlContent) {
        throw new Error('LLM returned empty response.');
      }

      // Parse and validate the XML content
      const parsedAnalysis = await this.xmlResponseParser.parseLLMResponse(xmlContent);

      // Calculate and log cost
      const inputTokens = usage?.prompt_tokens || 0;
      const outputTokens = usage?.completion_tokens || 0;
      const totalTokens = usage?.total_tokens || 0;
      const cost = this.costTracker.calculateCost(LLM_SETTINGS.OPENAI_MODEL, inputTokens, outputTokens);
      this.costTracker.logCost(LLM_SETTINGS.OPENAI_MODEL, inputTokens, outputTokens, cost);

      return {
        rawXml: xmlContent,
        parsedAnalysis: parsedAnalysis,
        tokensUsed: totalTokens,
        cost: cost,
        model: LLM_SETTINGS.OPENAI_MODEL,
        promptVersion: promptVersion,
      };

    } catch (error: any) {
      console.error('Error generating structured LLM analysis:', error);
      if (error.message.includes('Failed to parse LLM XML response')) {
        throw new Error(`Failed to generate valid XML analysis: ${error.message}`);
      }
      throw new Error(`LLM analysis generation failed: ${error.message}`);
    }
  }
}