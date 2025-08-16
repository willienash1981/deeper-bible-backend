import { bibleAPI, ReportResponse } from './bible-service';

export class ReportService {
  private static pollingInterval = 2000; // 2 seconds
  private static maxPollingTime = 60000; // 1 minute

  static async generateAndWaitForReport(
    bookId: string, 
    chapter: number, 
    verses: string,
    onProgress?: (status: string) => void
  ): Promise<ReportResponse> {
    // First check if a completed report already exists
    onProgress?.('checking cache');
    const existingCheck = await bibleAPI.checkExistingReport(bookId, chapter, verses);
    
    if (existingCheck.exists && existingCheck.report) {
      onProgress?.('found cached report');
      return existingCheck.report;
    }

    // No existing report found, generate a new one
    onProgress?.('generating new report');
    const initialResponse = await bibleAPI.generateReport(bookId, chapter, verses);
    
    if (initialResponse.status === 'completed') {
      return initialResponse;
    }

    // Poll for completion
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const poll = async () => {
        try {
          if (Date.now() - startTime > this.maxPollingTime) {
            reject(new Error('Report generation timeout'));
            return;
          }

          const response = await bibleAPI.getReportStatus(initialResponse.id);
          
          if (onProgress) {
            onProgress(response.status);
          }

          if (response.status === 'completed') {
            resolve(response);
          } else if (response.status === 'failed') {
            reject(new Error(response.error || 'Report generation failed'));
          } else {
            // Continue polling
            setTimeout(poll, this.pollingInterval);
          }
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  static formatVerseReference(bookName: string, chapter: number, verses: string): string {
    return `${bookName} ${chapter}:${verses}`;
  }
}