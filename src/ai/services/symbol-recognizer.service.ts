import { BiblicalSymbol } from '../../shared/types/symbol.types';
import { Pool, PoolClient } from 'pg';
import { Logger } from 'winston';
import { createLogger } from '../../utils/logger';
import { validateInput } from '../../utils/validation';

export class SymbolRecognizerService {
  private pool: Pool;
  private logger: Logger;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    this.logger = createLogger('SymbolRecognizerService');
  }

  /**
   * Recognizes biblical symbols within a given text.
   * This is a basic implementation. A more advanced version would use NLP,
   * embeddings, or LLM calls to identify symbols contextually.
   * @param text The text to analyze for symbols.
   * @returns A Promise resolving to an array of recognized BiblicalSymbol objects.
   */
  async recognizeSymbols(text: string): Promise<BiblicalSymbol[]> {
    // Input validation
    if (!validateInput.isString(text) || text.trim().length === 0) {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    const sanitizedText = validateInput.sanitizeText(text);
    this.logger.info('Recognizing symbols in text', { 
      textLength: sanitizedText.length,
      preview: sanitizedText.substring(0, 50) 
    });

    const recognized: BiblicalSymbol[] = [];

    // Mock response for testing
    if (process.env.NODE_ENV === 'test') {
      const mockSymbols: BiblicalSymbol[] = [
        {
          term: 'Lamb',
          meaning: 'Represents Jesus Christ and His sacrifice',
          biblical_pattern: 'Sacrificial offering, innocence, purity',
          deeper_significance: 'The ultimate sacrifice for humanity\'s sins',
          categories: ['animal', 'sacrifice'],
          related_verses: ['John 1:29', 'Rev 5:6', 'Isaiah 53:7']
        },
        {
          term: 'God',
          meaning: 'The supreme being, creator of all',
          biblical_pattern: 'Creator, Father, Judge, Redeemer',
          deeper_significance: 'The source of all existence and salvation',
          categories: ['deity', 'creator'],
          related_verses: ['Gen 1:1', 'John 3:16', 'Psalm 23:1']
        }
      ];
      
      const lowerCaseText = sanitizedText.toLowerCase();
      return mockSymbols.filter(symbol => 
        lowerCaseText.includes(symbol.term.toLowerCase())
      );
    }

    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      
      // Secure parameterized query to prevent SQL injection
      const query = `
        SELECT s.* FROM biblical_symbols s 
        WHERE LOWER(s.term) = ANY(
          SELECT LOWER(unnest(string_to_array($1, ' ')))
        )
        OR s.term ILIKE ANY(
          SELECT '%' || unnest(string_to_array($2, ' ')) || '%'
        )
        ORDER BY LENGTH(s.term) DESC
        LIMIT 50
      `;
      
      const result = await client.query<BiblicalSymbol>(query, [sanitizedText, sanitizedText]);
      const allSymbols = result.rows;

      // Additional keyword matching with validation
      const lowerCaseText = sanitizedText.toLowerCase();
      for (const symbol of allSymbols) {
        if (lowerCaseText.includes(symbol.term.toLowerCase())) {
          recognized.push(symbol);
        }
      }

      this.logger.info('Symbol recognition completed', { 
        symbolsFound: recognized.length,
        textLength: sanitizedText.length 
      });

      return recognized;
    } catch (error) {
      this.logger.error('Error recognizing symbols', { 
        error: error instanceof Error ? error.message : String(error),
        textLength: sanitizedText.length 
      });
      throw new Error('Failed to recognize symbols in text');
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}