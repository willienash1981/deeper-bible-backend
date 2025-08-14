export class Similarity {
  /**
   * Calculates the cosine similarity between two vectors.
   * Cosine similarity measures the cosine of the angle between two non-zero vectors.
   * It is often used to measure document similarity in text analysis.
   * @param vec1 The first vector.
   * @param vec2 The second vector.
   * @returns The cosine similarity score (between -1 and 1).
   * @throws Error if vectors have different dimensions or are empty.
   */
  static cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions.');
    }
    if (vec1.length === 0) {
      throw new Error('Vectors cannot be empty.');
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0; // Handle cases where one or both vectors are zero vectors
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Calculates the Euclidean distance between two vectors.
   * Euclidean distance is the "ordinary" straight-line distance between two points in Euclidean space.
   * @param vec1 The first vector.
   * @param vec2 The second vector.
   * @returns The Euclidean distance.
   * @throws Error if vectors have different dimensions.
   */
  static euclideanDistance(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimensions.');
    }

    let sumOfSquares = 0;
    for (let i = 0; i < vec1.length; i++) {
      sumOfSquares += (vec1[i] - vec2[i]) ** 2;
    }
    return Math.sqrt(sumOfSquares);
  }
}