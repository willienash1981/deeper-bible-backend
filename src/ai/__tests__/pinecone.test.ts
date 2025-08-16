import { PineconeService } from '../services/pinecone.service';

jest.mock('@pinecone-database/pinecone');
jest.mock('../../utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));
jest.mock('../utils/retry-handler');

describe('PineconeService', () => {
  let pineconeService: PineconeService;
  let mockPinecone: any;
  let mockIndex: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Pinecone index
    mockIndex = {
      upsert: jest.fn().mockResolvedValue({}),
      query: jest.fn().mockResolvedValue({ matches: [] }),
      deleteMany: jest.fn().mockResolvedValue({}),
      describeIndexStats: jest.fn().mockResolvedValue({ totalRecordCount: 1000 })
    };

    // Mock Pinecone client
    mockPinecone = {
      index: jest.fn().mockReturnValue(mockIndex)
    };

    const { Pinecone } = require('@pinecone-database/pinecone');
    Pinecone.mockImplementation(() => mockPinecone);

    // Mock retry handler
    const { RetryHandler } = require('../utils/retry-handler');
    RetryHandler.mockImplementation(() => ({
      executeWithRetry: jest.fn().mockImplementation(async (fn) => fn()),
      getAllCircuitBreakerStatuses: jest.fn().mockReturnValue({})
    }));

    // Set required environment variables
    process.env.PINECONE_API_KEY = 'test-api-key';
    process.env.PINECONE_ENVIRONMENT = 'test-env';
    process.env.PINECONE_INDEX_NAME = 'test-index';

    pineconeService = new PineconeService();
  });

  describe('constructor', () => {
    it('should initialize successfully with valid config', () => {
      expect(() => new PineconeService()).not.toThrow();
    });

    it('should throw error without API key', () => {
      delete process.env.PINECONE_API_KEY;
      
      expect(() => new PineconeService()).toThrow('PINECONE_API_KEY environment variable is required');
    });

    it('should use custom config when provided', () => {
      const config = {
        apiKey: 'custom-key',
        environment: 'custom-env',
        indexName: 'custom-index'
      };

      expect(() => new PineconeService(config)).not.toThrow();
    });
  });

  describe('upsertVectors', () => {
    const validVectors = [
      {
        id: 'test-1',
        values: [0.1, 0.2, 0.3],
        metadata: { text: 'test text' }
      },
      {
        id: 'test-2',
        values: [0.4, 0.5, 0.6],
        metadata: { text: 'another test' }
      }
    ];

    it('should upsert vectors successfully', async () => {
      await pineconeService.upsertVectors(validVectors);

      expect(mockPinecone.index).toHaveBeenCalledWith('test-index');
      expect(mockIndex.upsert).toHaveBeenCalledWith(validVectors);
    });

    it('should validate vector data', async () => {
      const invalidVectors = [
        { id: '', values: [0.1, 0.2] }, // Empty ID
        { id: 'test', values: [] }, // Empty values
        { id: 'test2', values: ['invalid', 'data'] } // Non-numeric values
      ];

      await expect(pineconeService.upsertVectors(invalidVectors as any))
        .rejects.toThrow();
    });

    it('should throw error for empty vectors array', async () => {
      await expect(pineconeService.upsertVectors([]))
        .rejects.toThrow('Vectors array cannot be empty');
    });

    it('should handle Pinecone API errors', async () => {
      mockIndex.upsert.mockRejectedValue(new Error('Pinecone API error'));

      await expect(pineconeService.upsertVectors(validVectors))
        .rejects.toThrow('Failed to upsert vectors');
    });
  });

  describe('queryVectors', () => {
    const queryVector = [0.1, 0.2, 0.3, 0.4];

    it('should query vectors successfully', async () => {
      const mockMatches = [
        { id: 'match-1', score: 0.95, metadata: { text: 'match 1' } },
        { id: 'match-2', score: 0.87, metadata: { text: 'match 2' } }
      ];

      mockIndex.query.mockResolvedValue({ matches: mockMatches });

      const results = await pineconeService.queryVectors(queryVector, 5);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('match-1');
      expect(results[0].score).toBe(0.95);
      expect(mockIndex.query).toHaveBeenCalledWith({
        vector: queryVector,
        topK: 5,
        filter: undefined,
        includeMetadata: true
      });
    });

    it('should validate query parameters', async () => {
      await expect(pineconeService.queryVectors([], 5))
        .rejects.toThrow('Query vector cannot be empty');

      await expect(pineconeService.queryVectors(queryVector, 0))
        .rejects.toThrow('topK must be between 1 and 100');

      await expect(pineconeService.queryVectors(queryVector, 150))
        .rejects.toThrow('topK must be between 1 and 100');
    });

    it('should handle query with filter', async () => {
      const filter = { category: 'theological' };
      
      await pineconeService.queryVectors(queryVector, 10, filter, true);

      expect(mockIndex.query).toHaveBeenCalledWith({
        vector: queryVector,
        topK: 10,
        filter,
        includeMetadata: true
      });
    });

    it('should handle empty query results', async () => {
      mockIndex.query.mockResolvedValue({ matches: [] });

      const results = await pineconeService.queryVectors(queryVector);

      expect(results).toEqual([]);
    });
  });

  describe('deleteVectors', () => {
    it('should delete vectors successfully', async () => {
      const ids = ['id-1', 'id-2', 'id-3'];

      await pineconeService.deleteVectors(ids);

      expect(mockIndex.deleteMany).toHaveBeenCalledWith(ids);
    });

    it('should validate delete parameters', async () => {
      await expect(pineconeService.deleteVectors([]))
        .rejects.toThrow('IDs array cannot be empty');
    });

    it('should handle delete errors', async () => {
      mockIndex.deleteMany.mockRejectedValue(new Error('Delete failed'));

      await expect(pineconeService.deleteVectors(['id-1']))
        .rejects.toThrow('Failed to delete vectors');
    });
  });

  describe('getIndexStats', () => {
    it('should retrieve index statistics', async () => {
      const mockStats = {
        totalRecordCount: 1000,
        dimension: 1536,
        indexFullness: 0.1
      };

      mockIndex.describeIndexStats.mockResolvedValue(mockStats);

      const stats = await pineconeService.getIndexStats();

      expect(stats).toEqual(mockStats);
      expect(mockIndex.describeIndexStats).toHaveBeenCalled();
    });

    it('should handle stats retrieval errors', async () => {
      mockIndex.describeIndexStats.mockRejectedValue(new Error('Stats failed'));

      await expect(pineconeService.getIndexStats())
        .rejects.toThrow('Failed to get index stats');
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      const isHealthy = await pineconeService.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockIndex.describeIndexStats).toHaveBeenCalled();
    });

    it('should return false when service is unhealthy', async () => {
      mockIndex.describeIndexStats.mockRejectedValue(new Error('Service down'));

      const isHealthy = await pineconeService.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('close', () => {
    it('should close gracefully', async () => {
      await pineconeService.close();
      // No specific expectations since Pinecone doesn't require cleanup
      // Just ensure it doesn't throw
    });
  });
});