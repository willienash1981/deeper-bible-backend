export interface BiblicalSymbol {
  term: string;
  meaning: string;
  biblical_pattern: string;
  deeper_significance: string;
  categories: string[]; // e.g., 'animal', 'color', 'object', 'action'
  related_verses: string[]; // Verses where this symbol appears prominently
}