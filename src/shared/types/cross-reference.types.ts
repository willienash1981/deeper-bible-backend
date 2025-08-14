export interface CrossReference {
  verse: string; // e.g., "Matthew 5:3"
  relationship: 'parallel' | 'contrast' | 'fulfillment' | 'background' | 'thematic';
  explanation: string;
  insight?: string;
  score?: number; // Quality/relevance score
}

export interface ThematicLink {
  theme: string;
  related_verses: string[];
  summary: string;
}
