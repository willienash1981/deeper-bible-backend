import { BiblicalAnalysis } from './xml-types';

export interface AnalyzeRequest {
  verse_range: string;
  translation?: string;
  analysis_type?: 'full_discovery' | 'symbolic_analysis';
}

export interface AnalysisResult {
  id: string;
  verse_range: string;
  normalized_range: string;
  prompt_version: string;
  analysis_type: string;
  xml_content: string;
  parsed_analysis: BiblicalAnalysis;
  content_summary?: string;
  complexity_level?: 'beginner' | 'intermediate' | 'advanced';
  view_count: number;
  user_rating?: number;
  rating_count?: number;
  cached: boolean;
  generated_at: Date;
  last_accessed: Date;
}
