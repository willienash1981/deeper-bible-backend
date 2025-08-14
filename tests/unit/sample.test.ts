import { MockFactory } from '../utils/mock-factory';
import { TestHelpers } from '../utils/test-helpers';

describe('Sample Working Test Suite', () => {
  describe('MockFactory', () => {
    it('should create a user mock', () => {
      const user = MockFactory.createUser();
      
      expect(user).toBeDefined();
      expect(user.email).toContain('@');
      expect(user.id).toBeDefined();
    });

    it('should create an analysis mock', () => {
      const analysis = MockFactory.createAnalysis();
      
      expect(analysis).toBeDefined();
      expect(analysis.book).toBeDefined();
      expect(analysis.content).toBeDefined();
    });

    it('should create a symbol mock', () => {
      const symbol = MockFactory.createSymbol();
      
      expect(symbol).toBeDefined();
      expect(symbol.name).toBeDefined();
      expect(symbol.category).toBeDefined();
    });
  });

  describe('TestHelpers', () => {
    it('should create mock request', () => {
      const req = TestHelpers.createMockRequest({ 
        body: { test: 'data' },
        user: { id: '123' }
      });
      
      expect(req.body).toEqual({ test: 'data' });
      expect(req.user).toEqual({ id: '123' });
    });

    it('should create mock response', () => {
      const res = TestHelpers.createMockResponse();
      
      expect(res.status).toBeInstanceOf(Function);
      expect(res.json).toBeInstanceOf(Function);
      expect(res.send).toBeInstanceOf(Function);
    });

    it('should measure execution time', async () => {
      const result = await TestHelpers.measureExecutionTime(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'test-result';
      });

      expect(result.result).toBe('test-result');
      expect(result.duration).toBeGreaterThan(90);
      expect(result.duration).toBeLessThan(200);
    });
  });

  describe('Custom Matchers', () => {
    it('should use toBeWithinRange matcher', () => {
      expect(50).toBeWithinRange(1, 100);
      expect(0).toBeWithinRange(-10, 10);
    });

    it('should use toHaveStatus matcher', () => {
      const mockResponse = { status: 200 };
      expect(mockResponse).toHaveStatus(200);
    });

    it('should use toContainObject matcher', () => {
      const array = [
        { id: 1, name: 'test1' },
        { id: 2, name: 'test2' },
        { id: 3, name: 'test3' }
      ];
      
      expect(array).toContainObject({ id: 2, name: 'test2' });
    });
  });

  describe('Framework Validation', () => {
    it('should demonstrate parallel test execution capability', async () => {
      const promises = Array(10).fill(null).map(async (_, index) => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
        return index;
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should handle async operations properly', async () => {
      const asyncOperation = async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve('async-result'), 50);
        });
      };

      const result = await asyncOperation();
      expect(result).toBe('async-result');
    });

    it('should properly handle errors', () => {
      expect(() => {
        throw new Error('Test error');
      }).toThrow('Test error');

      expect(async () => {
        throw new Error('Async test error');
      }).rejects.toThrow('Async test error');
    });
  });
});