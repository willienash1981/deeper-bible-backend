export interface BiblicalAnalysis {
  passage: string;
  passage_overview: {
    main_theme: string;
    key_message: string;
    difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  };
  confusing_elements?: {
    element: Array<{
      term: string;
      type: 'cultural' | 'theological' | 'linguistic' | 'historical';
      explanation: string;
      why_confusing: string;
      significance: string;
    }>;
  };
  cultural_context?: {
    original_audience: string;
    historical_situation: string;
    cultural_practices: string;
  };
  theological_insights?: {
    insight: Array<{
      category: string;
      truth: string;
      application: string;
    }>;
  };
  symbols_and_metaphors?: {
    symbol: Array<{
      term: string;
      meaning: string;
      biblical_pattern: string;
      deeper_significance: string;
    }>;
  };
  connections?: {
    connection: Array<{
      verse: string;
      relationship: 'parallel' | 'contrast' | 'fulfillment' | 'background';
      explanation: string;
      insight: string;
    }>;
  };
  denominational_perspectives?: { 
    perspective: Array<{
      tradition: string;
      interpretation: string;
      emphasis: string;
    }>;
  };
  practical_application?: {
    modern_relevance: string;
    action_points: string;
    reflection_questions: string;
  };
  summary?: { 
    key_takeaway: string;
    memorable_insight: string;
  };
}