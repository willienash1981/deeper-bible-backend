export class FrequencyAnalyzer {
  /**
   * Calculates the frequency of each word in a given text.
   * @param text The input text.
   * @returns A Map where keys are words and values are their frequencies.
   */
  static analyzeWordFrequency(text: string): Map<string, number> {
    const wordFrequencies = new Map<string, number>();
    // Simple tokenization: split by non-alphanumeric characters and convert to lowercase
    const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 0);

    for (const word of words) {
      wordFrequencies.set(word, (wordFrequencies.get(word) || 0) + 1);
    }
    return wordFrequencies;
  }

  /**
   * Calculates the frequency of specific terms in a given text.
   * @param text The input text.
   * @param terms An array of terms to count.
   * @returns A Map where keys are terms and values are their frequencies.
   */
  static analyzeTermFrequency(text: string, terms: string[]): Map<string, number> {
    const termFrequencies = new Map<string, number>();
    const lowerCaseText = text.toLowerCase();

    for (const term of terms) {
      const lowerCaseTerm = term.toLowerCase();
      const count = (lowerCaseText.match(new RegExp(`\\b${lowerCaseTerm}\\b`, 'g')) || []).length;
      termFrequencies.set(term, count);
    }
    return termFrequencies;
  }
}