import { StructuredLLMService } from './structured-llm.service';
import { PromptManagerService } from './prompt-manager.service';
import { HISTORICAL_ANALYSIS_PROMPT } from '../prompts/historical-analysis';

// Define a type for the parsed historical analysis XML
interface HistoricalCulturalAnalysis {
  passage: string;
  historical_situation: {
    period: string;
    key_events: string;
    political_landscape: string;
  };
  cultural_context: {
    customs_and_norms: string;
    daily_life: string;
    religious_practices: string;
  };
  original_audience: {
    demographics: string;
    understanding_gaps: string;
  };
  geographical_context: {
    locations: string;
    significance: string;
  };
}

export class HistoricalContextService {
  private structuredLLMService: StructuredLLMService;
  private promptManagerService: PromptManagerService;

  constructor() {
    this.structuredLLMService = new StructuredLLMService();
    this.promptManagerService = new PromptManagerService();
  }

  /**
   * Generates historical and cultural context for a biblical passage using the LLM.
   * @param verseRange The biblical verse range.
   * @param verseText The text of the verse.
   * @returns A Promise resolving to the parsed historical and cultural analysis.
   */
  async getHistoricalCulturalContext(verseRange: string, verseText: string): Promise<HistoricalCulturalAnalysis> {
    console.log(`Generating historical and cultural context for ${verseRange}.`);

    const promptTemplate = {
      version: 'v1.0.0', // Define a version for this prompt
      template: HISTORICAL_ANALYSIS_PROMPT,
      description: 'Prompt for historical and cultural analysis.',
      xmlSchemaPath: 'src/shared/schemas/historical-cultural-analysis.xsd', // Assuming a separate schema for this
    };

    const llmPrompt = this.promptManagerService.buildPrompt(promptTemplate.template, {
      verse_range: verseRange,
      verse_text: verseText,
    });

    try {
      const llmResponse = await this.structuredLLMService.generateStructuredAnalysis(llmPrompt, promptTemplate.version);
      // Assuming the XMLResponseParser can handle this new structure
      return llmResponse.parsedAnalysis as HistoricalCulturalAnalysis;
    } catch (error) {
      console.error('Error generating historical and cultural context:', error);
      throw new Error('Failed to generate historical and cultural context.');
    }
  }
}