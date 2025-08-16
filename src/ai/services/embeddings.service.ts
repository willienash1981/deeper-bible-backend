import { openai } from './openai-client';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EmbeddingsService');

export class EmbeddingsService {
  /**
   * Generates a vector embedding for a given text.
   * @param text The text to embed.
   * @param model The embedding model to use (e.g., "text-embedding-3-large").
   * @returns A Promise resolving to the embedding vector (array of numbers).
   * @throws Error if embedding generation fails.
   */
  async generateEmbedding(text: string, model: string = 'text-embedding-3-large'): Promise<number[]> {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Invalid text input: must be a non-empty string');
      }

      const response = await openai.createEmbeddings({
        model: model,
        input: text.trim(),
        encoding_format: 'float'
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', {
        error: error instanceof Error ? error.message : String(error),
        model,
        textLength: text?.length || 0
      });
      throw new Error(`Failed to generate text embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates embeddings for multiple texts in batch.
   * @param texts Array of texts to embed.
   * @param model The embedding model to use.
   * @returns A Promise resolving to an array of embedding vectors.
   */
  async generateBatchEmbeddings(texts: string[], model: string = 'text-embedding-3-large'): Promise<number[][]> {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Invalid texts input: must be a non-empty array');
      }

      // Validate and clean texts
      const cleanTexts = texts.map(text => {
        if (!text || typeof text !== 'string') {
          throw new Error('All texts must be non-empty strings');
        }
        return text.trim();
      });

      const response = await openai.createEmbeddings({
        model: model,
        input: cleanTexts,
        encoding_format: 'float'
      });

      logger.info('Batch embeddings generated successfully', {
        count: response.data.length,
        model,
        usage: response.usage
      });
      
      return response.data.map(item => item.embedding);
    } catch (error) {
      logger.error('Error generating batch embeddings:', {
        error: error instanceof Error ? error.message : String(error),
        model,
        textsCount: texts?.length || 0
      });
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate similarity between two texts using embeddings.
   * @param text1 First text
   * @param text2 Second text
   * @param model The embedding model to use
   * @returns Cosine similarity score between 0 and 1
   */
  async calculateSimilarity(text1: string, text2: string, model: string = 'text-embedding-3-large'): Promise<number> {
    try {
      const [embedding1, embedding2] = await this.generateBatchEmbeddings([text1, text2], model);
      
      return this.cosineSimilarity(embedding1, embedding2);
    } catch (error) {
      logger.error('Error calculating similarity:', {
        error: error instanceof Error ? error.message : String(error),
        model
      });
      throw new Error(`Failed to calculate similarity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors.
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity score
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