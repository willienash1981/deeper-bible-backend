import { Pinecone } from '@pinecone-database/pinecone';
import { createLogger } from '../../utils/logger';
import { RetryHandler } from '../utils/retry-handler';
import { Logger } from 'winston';

interface VectorData {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

interface QueryResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
}

export class PineconeService {
  private pinecone: Pinecone;
  private indexName: string;
  private logger: Logger;
  private retryHandler: RetryHandler;

  constructor(config?: PineconeConfig) {
    this.logger = createLogger('PineconeService');
    this.retryHandler = new RetryHandler();
    
    const apiKey = config?.apiKey || process.env.PINECONE_API_KEY;
    const environment = config?.environment || process.env.PINECONE_ENVIRONMENT;
    this.indexName = config?.indexName || process.env.PINECONE_INDEX_NAME || 'deeper-bible-embeddings';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    try {
      this.pinecone = new Pinecone({
        apiKey
      });
      
      this.logger.info('PineconeService initialized successfully', {
        environment,
        indexName: this.indexName
      });
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone client', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Upserts vectors to Pinecone index with retry logic.
   */
  async upsertVectors(vectors: VectorData[]): Promise<void> {
    if (!vectors || vectors.length === 0) {
      throw new Error('Vectors array cannot be empty');
    }

    // Validate vector data
    this.validateVectors(vectors);

    try {
      const index = this.pinecone.index(this.indexName);
      
      await this.retryHandler.executeWithRetry(
        async () => {
          await index.upsert(vectors);
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 8000
        },
        'pinecone-upsert'
      );

      this.logger.info('Vectors upserted successfully', {
        vectorCount: vectors.length,
        indexName: this.indexName
      });
    } catch (error) {
      this.logger.error('Failed to upsert vectors to Pinecone', {
        error: error instanceof Error ? error.message : String(error),
        vectorCount: vectors.length,
        indexName: this.indexName
      });
      throw new Error(`Failed to upsert vectors: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Queries vectors from Pinecone index with retry logic.
   */
  async queryVectors(
    vector: number[], 
    topK: number = 10, 
    filter?: Record<string, any>,
    includeMetadata: boolean = true
  ): Promise<QueryResult[]> {
    if (!vector || vector.length === 0) {
      throw new Error('Query vector cannot be empty');
    }

    if (topK <= 0 || topK > 100) {
      throw new Error('topK must be between 1 and 100');
    }

    try {
      const index = this.pinecone.index(this.indexName);
      
      const queryResponse = await this.retryHandler.executeWithRetry(
        async () => {
          return await index.query({
            vector,
            topK,
            filter,
            includeMetadata
          });
        },
        {
          maxRetries: 3,
          initialDelay: 500,
          maxDelay: 4000
        },
        'pinecone-query'
      );

      const results: QueryResult[] = queryResponse.matches?.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata
      })) || [];

      this.logger.info('Vector query completed successfully', {
        resultCount: results.length,
        topK,
        indexName: this.indexName,
        hasFilter: !!filter
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to query vectors from Pinecone', {
        error: error instanceof Error ? error.message : String(error),
        topK,
        vectorLength: vector.length,
        indexName: this.indexName
      });
      throw new Error(`Failed to query vectors: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deletes vectors from the index.
   */
  async deleteVectors(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      throw new Error('IDs array cannot be empty');
    }

    try {
      const index = this.pinecone.index(this.indexName);
      
      await this.retryHandler.executeWithRetry(
        async () => {
          await index.deleteMany(ids);
        },
        {
          maxRetries: 2,
          initialDelay: 1000
        },
        'pinecone-delete'
      );

      this.logger.info('Vectors deleted successfully', {
        deletedCount: ids.length,
        indexName: this.indexName
      });
    } catch (error) {
      this.logger.error('Failed to delete vectors from Pinecone', {
        error: error instanceof Error ? error.message : String(error),
        idCount: ids.length,
        indexName: this.indexName
      });
      throw new Error(`Failed to delete vectors: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets index statistics.
   */
  async getIndexStats(): Promise<any> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      const stats = await this.retryHandler.executeWithRetry(
        async () => {
          return await index.describeIndexStats();
        },
        {
          maxRetries: 2,
          initialDelay: 500
        },
        'pinecone-stats'
      );

      this.logger.debug('Index stats retrieved', {
        indexName: this.indexName,
        totalRecordCount: stats.totalRecordCount
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to get index stats', {
        error: error instanceof Error ? error.message : String(error),
        indexName: this.indexName
      });
      throw new Error(`Failed to get index stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validates vector data before operations.
   */
  private validateVectors(vectors: VectorData[]): void {
    for (const vector of vectors) {
      if (!vector.id || typeof vector.id !== 'string') {
        throw new Error('Vector ID must be a non-empty string');
      }
      
      if (!vector.values || !Array.isArray(vector.values) || vector.values.length === 0) {
        throw new Error('Vector values must be a non-empty array of numbers');
      }
      
      if (!vector.values.every(val => typeof val === 'number' && !isNaN(val))) {
        throw new Error('All vector values must be valid numbers');
      }
    }
  }

  /**
   * Health check for Pinecone connection.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getIndexStats();
      return true;
    } catch (error) {
      this.logger.error('Pinecone health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Cleanup method for graceful shutdown.
   */
  async close(): Promise<void> {
    this.logger.info('PineconeService shutting down gracefully');
    // Pinecone client doesn't require explicit cleanup
  }
}