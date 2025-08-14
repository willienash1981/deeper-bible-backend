import { HistoricalContextService } from '../../ai/services/historical-context.service';

export class ContextService {
  private historicalContextService: HistoricalContextService;

  constructor() {
    this.historicalContextService = new HistoricalContextService();
  }

  /**
   * Retrieves historical and cultural context for a given biblical passage.
   * @param verseRange The biblical verse range.
   * @param verseText The text of the verse.
   * @returns A Promise resolving to the historical and cultural analysis.
   */
  async getContextForVerse(verseRange: string, verseText: string): Promise<any> {
    try {
      const context = await this.historicalContextService.getHistoricalCulturalContext(verseRange, verseText);
      return context;
    } catch (error) {
      console.error('Error retrieving context for verse:', error);
      throw new Error('Failed to retrieve historical and cultural context.');
    }
  }
}