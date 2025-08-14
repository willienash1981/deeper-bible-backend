import { BiblicalAnalysis } from '../../shared/types/xml-types';

export interface LLMAnalysisResponse {
  rawXml: string;
  parsedAnalysis: BiblicalAnalysis;
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
