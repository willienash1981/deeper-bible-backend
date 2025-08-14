import { StructuredLLMService } from './structured-llm.service';
import { PromptManagerService } from './prompt-manager.service';
import { EmbeddingsService } from './embeddings.service';
import { PineconeService } from './pinecone.service';
import { ThemeDetector } from '../utils/theme-detector';
import { CrossReference } from '../../shared/types/cross-reference.types';

export class CrossReferenceService {
  private structuredLLMService: StructuredLLMService;
  private promptManagerService: PromptManagerService;
  private embeddingsService: EmbeddingsService;
  private pineconeService: PineconeService;
  private themeDetector: ThemeDetector;

  constructor() {
    this.structuredLLMService = new StructuredLLMService();
    this.promptManagerService = new PromptManagerService();
    this.embeddingsService = new EmbeddingsService();
    this.pineconeService = new PineconeService();
    this.themeDetector = new ThemeDetector();
  }

  /**
   * Generates cross-references for a given biblical passage using LLM and semantic search.
   * @param verseRange The biblical verse range.
   * @param verseText The text of the verse.
   * @returns A Promise resolving to an array of CrossReference objects.
   */
  async generateCrossReferences(verseRange: string, verseText: string): Promise<CrossReference[]> {
    console.log(`Generating cross-references for ${verseRange}.`);

    const crossReferences: CrossReference[] = [];

    // 1. LLM-based cross-reference generation (initial suggestions)
    // This would involve a specific prompt to the LLM asking for relevant cross-references
    // and their relationship to the current passage.
    try {
      const promptTemplate = this.promptManagerService.getPromptTemplate('full_discovery'); // Re-using main prompt for now
      const llmPrompt = this.promptManagerService.buildPrompt(promptTemplate.template, {
        verse_range: verseRange,
        verse_text: verseText,
        // Add specific instructions for cross-reference generation
        // e.g., "Identify key cross-references and explain their relationship."
      });
      const llmResponse = await this.structuredLLMService.generateStructuredAnalysis(llmPrompt, promptTemplate.version);
      // Extract cross-references from LLM's XML output
      if (llmResponse.parsedAnalysis.connections && llmResponse.parsedAnalysis.connections.connection) {
        llmResponse.parsedAnalysis.connections.connection.forEach((conn: { verse: string; relationship: 'parallel' | 'contrast' | 'fulfillment' | 'background'; explanation: string; insight?: string; }) => {
          crossReferences.push({
            verse: conn.verse,
            relationship: conn.relationship,
            explanation: conn.explanation,
            insight: conn.insight,
            score: 0.8, // Assume high score from LLM
          });
        });
      }
    } catch (error) {
      console.error('Error generating LLM cross-references:', error);
    }

    // 2. Semantic search for additional cross-references (using embeddings)
    try {
      const queryEmbedding = await this.embeddingsService.generateEmbedding(verseText);
      // Query Pinecone for verses semantically similar to the current verse
      const similarVerses = await this.pineconeService.queryVectors(queryEmbedding, 5); // Get top 5 similar

      for (const similarVerse of similarVerses) {
        // Avoid adding the same verse or already found by LLM
        if (similarVerse.id !== verseRange && !crossReferences.some(cr => cr.verse === similarVerse.id)) {
          crossReferences.push({
            verse: similarVerse.id, // Assuming ID is the verse reference
            relationship: 'thematic', // Semantic search often implies thematic
            explanation: `Semantically related to ${verseRange} with a similarity score of ${similarVerse.score.toFixed(2)}.`, 
            score: similarVerse.score,
          });
        }
      }
    } catch (error) {
      console.error('Error during semantic cross-reference search:', error);
    }

    // 3. Thematic linking (using ThemeDetector)
    try {
      // This would require fetching a larger set of Bible verses to detect themes
      // For now, using a placeholder
      const allBibleVerses: { verse: string; text: string }[] = [
        { verse: 'John 3:16', text: 'For God so loved the world...' },
        { verse: '1 Corinthians 13:4-7', text: 'Love is patient, love is kind...' },
        // ... more verses
      ];
      const thematicLinks = await this.themeDetector.detectThemes(verseText, allBibleVerses);
      thematicLinks.forEach(link => {
        link.related_verses.forEach(relatedVerse => {
          if (relatedVerse !== verseRange && !crossReferences.some(cr => cr.verse === relatedVerse)) {
            crossReferences.push({
              verse: relatedVerse,
              relationship: 'thematic',
              explanation: `Part of the theme "${link.theme}": ${link.summary}`,
              insight: link.summary,
              score: 0.75, // Assume a good score for thematic links
            });
          }
        });
      });
    } catch (error) {
      console.error('Error during thematic linking:', error);
    }

    return crossReferences;
  }
}