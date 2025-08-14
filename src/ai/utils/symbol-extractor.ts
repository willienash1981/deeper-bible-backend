import { BiblicalSymbol } from '../../shared/types/symbol.types';

export class SymbolExtractor {
  /**
   * Extracts recognized symbols from a given text and provides their positions.
   * This is a basic implementation. A more advanced version would handle overlaps,
   * prioritize longer matches, and use more sophisticated NLP.
   * @param text The text to analyze.
   * @param recognizedSymbols An array of BiblicalSymbol objects already recognized in the text.
   * @returns An array of objects containing the symbol, its term, and its start/end positions in the text.
   */
  extractSymbolPositions(text: string, recognizedSymbols: BiblicalSymbol[]): Array<{
    symbol: BiblicalSymbol;
    term: string;
    start: number;
    end: number;
  }> {
    const extractedPositions: Array<{
      symbol: BiblicalSymbol;
      term: string;
      start: number;
      end: number;
    }> = [];
    const lowerCaseText = text.toLowerCase();

    for (const symbol of recognizedSymbols) {
      const termLowerCase = symbol.term.toLowerCase();
      let startIndex = -1;
      // Find all occurrences of the symbol term in the text
      while ((startIndex = lowerCaseText.indexOf(termLowerCase, startIndex + 1)) !== -1) {
        extractedPositions.push({
          symbol: symbol,
          term: symbol.term,
          start: startIndex,
          end: startIndex + symbol.term.length,
        });
      }
    }

    // Sort by start position for consistent highlighting
    extractedPositions.sort((a, b) => a.start - b.start);

    return extractedPositions;
  }
}