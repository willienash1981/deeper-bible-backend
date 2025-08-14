export interface LLMAnalysisResponse {
  rawXml: string;
  parsedAnalysis: any; // This will be BiblicalAnalysis from xml-types
  tokensUsed: number;
  cost: number;
  model: string;
  promptVersion: string;
}

export interface LLMError {
  code: string;
  message: string;
  details?: any;
}
