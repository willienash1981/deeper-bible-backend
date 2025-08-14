import { SymbolRelationshipsService } from '../../ai/services/symbol-relationships.service';
import { SymbolGraphNode, SymbolGraphEdge } from '../../shared/types/symbol-relationships.types';
import { BiblicalSymbol } from '../../shared/types/symbol.types';
import { Pool } from 'pg'; // Assuming PostgreSQL

export class SymbolGraphService {
  private symbolRelationshipsService: SymbolRelationshipsService;
  private pool: Pool;

  constructor() {
    this.symbolRelationshipsService = new SymbolRelationshipsService();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  /**
   * Generates graph data (nodes and edges) for visualizing biblical symbol relationships.
   * @param centralSymbolTerm Optional: A central symbol to focus the graph around.
   * @param depth Optional: How many layers of relationships to include.
   * @returns A Promise resolving to an object containing nodes and edges for a graph visualization.
   */
  async getSymbolGraphData(centralSymbolTerm?: string, depth: number = 1): Promise<{ nodes: SymbolGraphNode[]; edges: SymbolGraphEdge[] }> {
    console.log(`Generating symbol graph data for central symbol: ${centralSymbolTerm || 'all'} (depth: ${depth}).`);

    const nodes: { [key: string]: SymbolGraphNode } = {};
    const edges: SymbolGraphEdge[] = [];

    let symbolsToProcess: BiblicalSymbol[] = [];

    if (centralSymbolTerm) {
      // Fetch the central symbol and its direct relationships
      const result = await this.pool.query<BiblicalSymbol>('SELECT * FROM biblical_symbols WHERE LOWER(term) = LOWER($1)', [centralSymbolTerm]);
      if (result.rows.length > 0) {
        symbolsToProcess.push(result.rows[0]);
      } else {
        console.warn(`Central symbol "${centralSymbolTerm}" not found.`);
        return { nodes: [], edges: [] };
      }
    } else {
      // Fetch all symbols if no central symbol is specified
      const result = await this.pool.query<BiblicalSymbol>('SELECT * FROM biblical_symbols');
      symbolsToProcess = result.rows;
    }

    const processedSymbols = new Set<string>();
    let currentDepth = 0;

    while (symbolsToProcess.length > 0 && currentDepth <= depth) {
      const nextSymbolsToProcess: BiblicalSymbol[] = [];

      for (const symbol of symbolsToProcess) {
        if (processedSymbols.has(symbol.term)) {
          continue;
        }
        processedSymbols.add(symbol.term);

        // Add node for the current symbol
        nodes[symbol.term] = {
          id: symbol.term,
          label: symbol.term,
          category: symbol.categories[0] || 'general', // Use first category as primary
        };

        // Get relationships for the current symbol
        const relationships = await this.symbolRelationshipsService.getRelationshipsForSymbol(symbol.term);

        for (const rel of relationships) {
          // Add edge
          edges.push({
            source: rel.source_symbol_term,
            target: rel.target_symbol_term,
            type: rel.type,
            label: rel.description,
            weight: rel.strength,
          });

          // Add target symbol to be processed in the next depth level
          if (!processedSymbols.has(rel.target_symbol_term)) {
            const targetSymbol = (await this.pool.query<BiblicalSymbol>('SELECT * FROM biblical_symbols WHERE LOWER(term) = LOWER($1)', [rel.target_symbol_term])).rows[0];
            if (targetSymbol) {
              nextSymbolsToProcess.push(targetSymbol);
            }
          }
        }
      }
      symbolsToProcess = nextSymbolsToProcess;
      currentDepth++;
    }

    return { nodes: Object.values(nodes), edges };
  }
}