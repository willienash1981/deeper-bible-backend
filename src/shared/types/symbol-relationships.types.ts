export interface SymbolRelationship {
  source_symbol_term: string;
  target_symbol_term: string;
  type: 'association' | 'contrast' | 'progression' | 'fulfillment' | 'thematic';
  description: string;
  biblical_references: string[];
  strength?: number; // e.g., 0-1, how strong the relationship is
}

export interface SymbolGraphNode {
  id: string; // Symbol term
  label: string; // Display name
  category: string; // Primary category
}

export interface SymbolGraphEdge {
  source: string; // Source symbol term
  target: string; // Target symbol term
  type: string; // Relationship type
  label: string; // Description of relationship
  weight?: number; // Strength of connection
}
