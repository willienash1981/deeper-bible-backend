import { SymbolRecognizerService } from './symbol-recognizer.service';
import { SymbolExtractor } from '../utils/symbol-extractor';
import { BiblicalSymbol } from '../../shared/types/symbol.types';

export class SymbolHighlighterService {
  private symbolRecognizer: SymbolRecognizerService;
  private symbolExtractor: SymbolExtractor;

  constructor() {
    this.symbolRecognizer = new SymbolRecognizerService();
    this.symbolExtractor = new SymbolExtractor();
  }

  /**
   * Processes a given text to identify and prepare biblical symbols for highlighting.
   * @param text The text content (e.g., a verse, an analysis paragraph).
   * @returns A Promise resolving to an array of objects, each containing a recognized symbol
   *          and its start/end positions within the text.
   */
  async getSymbolsForHighlighting(text: string): Promise<Array<{
    symbol: BiblicalSymbol;
    term: string;
    start: number;
    end: number;
  }>> {
    console.log(`Preparing symbols for highlighting in text: "${text.substring(0, 50)}..."`);

    // 1. Recognize symbols in the text
    const recognizedSymbols = await this.symbolRecognizer.recognizeSymbols(text);

    // 2. Extract their positions
    const symbolPositions = this.symbolExtractor.extractSymbolPositions(text, recognizedSymbols);

    return symbolPositions;
  }
}