import { StructuredLLMService } from './structured-llm.service';
import { PromptManagerService } from './prompt-manager.service';
import { BiblicalAnalysis } from '../../shared/types/xml-types';
import { DENOMINATIONAL_TRADITIONS, DenominationalTradition } from '../config/denominations';
import { BiasDetector } from '../utils/bias-detector';

export class PerspectiveSynthesizerService {
  private structuredLLMService: StructuredLLMService;
  private promptManagerService: PromptManagerService;
  private biasDetector: BiasDetector;

  constructor() {
    this.structuredLLMService = new StructuredLLMService();
    this.promptManagerService = new PromptManagerService();
    this.biasDetector = new BiasDetector();
  }

  /**
   * Generates and synthesizes multi-denominational perspectives for a given passage.
   * This method would typically be called by the main analysis service.
   * @param verseRange The biblical verse range.
   * @param verseText The text of the verse.
   * @param currentAnalysis The initial BiblicalAnalysis object (can be used to refine perspectives).
   * @returns A Promise resolving to an updated BiblicalAnalysis object with denominational perspectives.
   */
  async synthesizePerspectives(
    verseRange: string,
    verseText: string,
    currentAnalysis: BiblicalAnalysis
  ): Promise<BiblicalAnalysis> {
    console.log(`Synthesizing multi-denominational perspectives for ${verseRange}.`);

    const perspectives: Array<{ tradition: string; interpretation: string; emphasis: string; }> = [];

    // Iterate through defined traditions and generate a perspective for each
    for (const tradition of DENOMINATIONAL_TRADITIONS) {
      // Build a specific prompt for each tradition
      const promptTemplate = this.promptManagerService.getPromptTemplate('full_discovery'); // Re-using main prompt for now
      const traditionPrompt = this.promptManagerService.buildPrompt(promptTemplate.template, {
        verse_range: verseRange,
        verse_text: verseText,
        // Add specific instructions for the LLM to adopt this tradition's lens
        // This would be more sophisticated with dedicated denominational prompts
        // For example: "Interpret this passage from a ${tradition.name} perspective, emphasizing ${tradition.key_theological_emphases.join(', ')}."
      });

      try {
        const llmResponse = await this.structuredLLMService.generateStructuredAnalysis(traditionPrompt, promptTemplate.version);
        const generatedPerspective = llmResponse.parsedAnalysis.denominational_perspectives?.perspective?.[0];

        if (generatedPerspective) {
          perspectives.push({
            tradition: tradition.name,
            interpretation: generatedPerspective.interpretation,
            emphasis: generatedPerspective.emphasis,
          });
        }
      } catch (error) {
        console.error(`Error generating perspective for ${tradition.name}:`, error);
        // Continue even if one perspective fails
      }
    }

    // Add synthesized perspectives to the current analysis
    currentAnalysis.denominational_perspectives = { perspective: perspectives };

    // Optional: Detect and correct bias after synthesis
    const { score, biasReport } = await this.biasDetector.detectBias(currentAnalysis);
    if (score > 0.5) { // Example threshold
      console.warn(`Bias detected after synthesis: ${biasReport}. Attempting to correct.`);
      // currentAnalysis = await this.biasDetector.correctBias(currentAnalysis); // Uncomment to enable correction
    }

    return currentAnalysis;
  }
}