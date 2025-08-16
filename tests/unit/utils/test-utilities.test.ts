import { MockFactory } from '../../utils/mock-factory';
import { TestHelpers } from '../../utils/test-helpers';

describe('Test Utilities Validation', () => {
  describe('MockFactory', () => {
    it('should create valid user mock', () => {
      const user = MockFactory.createUser();
      
      expect(user).toMatchObject({
        id: expect.any(String),
        email: expect.stringMatching(/^.+@.+\..+$/),
        username: expect.any(String),
        firstName: expect.any(String),
        lastName: expect.any(String),
        role: expect.any(String),
        isActive: expect.any(Boolean),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should create user with overrides', () => {
      const overrides = {
        email: 'test@example.com',
        role: 'admin'
      };
      
      const user = MockFactory.createUser(overrides);
      
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('admin');
      expect(user.id).toBeDefined();
    });

    it('should create valid analysis mock', () => {
      const analysis = MockFactory.createAnalysis();
      
      expect(analysis).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        book: expect.any(String),
        chapter: expect.any(Number),
        verses: expect.any(String),
        analysisType: expect.any(String),
        content: expect.objectContaining({
          summary: expect.any(String),
          themes: expect.any(Array),
          symbols: expect.any(Array),
          confidence: expect.any(Number)
        }),
        metadata: expect.objectContaining({
          model: expect.any(String),
          tokens: expect.any(Number),
          cost: expect.any(Number)
        }),
        createdAt: expect.any(Date)
      });
    });

    it('should create valid symbol mock', () => {
      const symbol = MockFactory.createSymbol();
      
      expect(symbol).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        category: expect.any(String),
        meanings: expect.arrayContaining([
          expect.objectContaining({
            context: expect.any(String),
            interpretation: expect.any(String),
            references: expect.any(Array)
          })
        ]),
        frequency: expect.any(Number),
        relatedSymbols: expect.any(Array)
      });
    });

    it('should create seed data', async () => {
      const seedData = await MockFactory.createSeedData(5);
      
      expect(seedData).toMatchObject({
        users: expect.arrayContaining([
          expect.objectContaining({
            email: expect.stringMatching(/^.+@.+\..+$/)
          })
        ]),
        analyses: expect.any(Array),
        symbols: expect.any(Array)
      });
      
      expect(seedData.users).toHaveLength(5);
      expect(seedData.analyses).toHaveLength(15); // 5 users * 3 analyses
      expect(seedData.symbols).toHaveLength(50);
    });
  });

  describe('TestHelpers', () => {
    it('should create mock request', () => {
      const mockReq = TestHelpers.createMockRequest({
        body: { test: 'data' },
        params: { id: '123' },
        query: { page: '1' },
        headers: { 'content-type': 'application/json' }
      });

      expect(mockReq.body).toEqual({ test: 'data' });
      expect(mockReq.params).toEqual({ id: '123' });
      expect(mockReq.query).toEqual({ page: '1' });
      expect(mockReq.get).toBeInstanceOf(Function);
    });

    it('should create mock response', () => {
      const mockRes = TestHelpers.createMockResponse();

      expect(mockRes.status).toBeInstanceOf(Function);
      expect(mockRes.json).toBeInstanceOf(Function);
      expect(mockRes.send).toBeInstanceOf(Function);
      expect(mockRes.setHeader).toBeInstanceOf(Function);
      
      // Test chaining
      mockRes.status(200).json({ success: true });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    });

    it('should create mock next function', () => {
      const mockNext = TestHelpers.createMockNext();
      
      expect(mockNext).toBeInstanceOf(Function);
      
      const error = new Error('Test error');
      mockNext(error);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should generate auth token', async () => {
      const payload = { userId: 'test-user', role: 'user' };
      const token = await TestHelpers.generateAuthToken(payload);
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should measure execution time', async () => {
      const testFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'test-result';
      };

      const result = await TestHelpers.measureExecutionTime(testFunction);
      
      expect(result.result).toBe('test-result');
      expect(result.duration).toBeGreaterThan(90);
      expect(result.duration).toBeLessThan(200);
    });

    it('should create mock service', () => {
      const methods = ['findById', 'create', 'update', 'delete'];
      const mockService = TestHelpers.createMockService(methods);
      
      methods.forEach(method => {
        expect(mockService[method]).toBeInstanceOf(Function);
        expect(jest.isMockFunction(mockService[method])).toBe(true);
      });
    });

    it('should simulate network error', () => {
      const error = TestHelpers.simulateNetworkError();
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error');
    });

    it('should create mock cache', () => {
      const cache = TestHelpers.createMockCache();
      
      expect(cache.get).toBeInstanceOf(Function);
      expect(cache.set).toBeInstanceOf(Function);
      expect(cache.delete).toBeInstanceOf(Function);
      expect(cache.clear).toBeInstanceOf(Function);
      expect(cache.has).toBeInstanceOf(Function);
      
      // Test cache functionality
      cache.set('key1', 'value1');
      expect(cache.set).toHaveBeenCalledWith('key1', 'value1');
      
      cache.get('key1');
      expect(cache.get).toHaveBeenCalledWith('key1');
    });

    it('should sanitize snapshot data', () => {
      const testData = {
        id: 'abc123',
        name: 'Test User',
        createdAt: new Date(),
        metadata: {
          id: 'def456',
          updatedAt: new Date(),
          timestamp: Date.now()
        }
      };

      const sanitized = TestHelpers.sanitizeSnapshot(testData);
      
      expect(sanitized.id).toBe('[id]');
      expect(sanitized.name).toBe('Test User'); // Should preserve non-dynamic fields
      expect(sanitized.createdAt).toBe('[createdAt]');
      expect(sanitized.metadata.id).toBe('[id]');
      expect(sanitized.metadata.updatedAt).toBe('[updatedAt]');
      expect(sanitized.metadata.timestamp).toBe('[timestamp]');
    });
  });

  describe('Integration between utilities', () => {
    it('should work together in realistic scenario', async () => {
      // Create test data
      const user = MockFactory.createUser({ role: 'admin' });
      const analysis = MockFactory.createAnalysis({ userId: user.id });
      
      // Create request/response mocks
      const mockReq = TestHelpers.createMockRequest({
        user: user,
        params: { analysisId: analysis.id }
      });
      const mockRes = TestHelpers.createMockResponse();
      const mockNext = TestHelpers.createMockNext();
      
      // Simulate controller action
      const controllerAction = async (req: any, res: any, next: any) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        if (req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden' });
        }
        
        return res.status(200).json({ analysis });
      };
      
      // Execute
      await controllerAction(mockReq, mockRes, mockNext);
      
      // Verify
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ analysis });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});