import { RelationshipMapper } from '../utils/relationship-mapper';
import { SymbolRecognizerService } from './symbol-recognizer.service';
import { BiblicalSymbol } from '../../shared/types/symbol.types';
import { SymbolRelationship } from '../../shared/types/symbol-relationships.types';

export class SymbolRelationshipsService {
  private relationshipMapper: RelationshipMapper;
  private symbolRecognizer: SymbolRecognizerService;

  constructor() {
    this.relationshipMapper = new RelationshipMapper();
    this.symbolRecognizer = new SymbolRecognizerService();
  }

  /**
   * Discovers and returns relationships for a given biblical symbol.
   * @param symbolTerm The term of the symbol to find relationships for.
   * @returns A Promise resolving to an array of SymbolRelationship objects.
   */
  async getRelationshipsForSymbol(symbolTerm: string): Promise<SymbolRelationship[]> {
    console.log(`Getting relationships for symbol: ${symbolTerm}.`);

    // In a real application, you'd fetch the specific symbol and all other symbols from the DB.
    // For now, we'll use a mock list of all symbols.
    const allSymbols: BiblicalSymbol[] = [
      { term: 'Lion', meaning: '...', biblical_pattern: '...', deeper_significance: '...', categories: ['animal', 'power'], related_verses: [] },
      { term: 'Lamb', meaning: '...', biblical_pattern: '...', deeper_significance: '...', categories: ['animal', 'sacrifice'], related_verses: [] },
      { term: 'Shepherd', meaning: '...', biblical_pattern: '...', deeper_significance: '...', categories: ['person', 'leadership'], related_verses: [] },
      { term: 'Water', meaning: '...', biblical_pattern: '...', deeper_significance: '...', categories: ['element', 'life'], related_verses: [] },
      // ... more symbols from your symbols.sql
    ];

    const primarySymbol = allSymbols.find(s => s.term.toLowerCase() === symbolTerm.toLowerCase());

    if (!primarySymbol) {
      console.warn(`Symbol "${symbolTerm}" not found for relationship mapping.`);
      return [];
    }

    const relationships = await this.relationshipMapper.mapRelationships(primarySymbol, allSymbols);
    return relationships;
  }
}