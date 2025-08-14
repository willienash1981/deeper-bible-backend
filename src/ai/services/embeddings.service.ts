import openai from './openai-client';

export class EmbeddingsService {
  /**
   * Generates a vector embedding for a given text.
   * @param text The text to embed.
   * @param model The embedding model to use (e.g., "text-embedding-ada-002").
   * @returns A Promise resolving to the embedding vector (array of numbers).
   * @throws Error if embedding generation fails.
   */
  async generateEmbedding(text: string, model: string = 'text-embedding-ada-002'): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate text embedding.');
    }
  }
}