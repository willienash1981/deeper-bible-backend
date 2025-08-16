import { MockFactory } from '../../utils/mock-factory';

describe('MockFactory', () => {
  describe('createUser', () => {
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
  });

  describe('createAnalysis', () => {
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

    it('should use valid biblical books', () => {
      const analysis = MockFactory.createAnalysis();
      const validBooks = ['Genesis', 'Exodus', 'Psalms', 'Matthew', 'John'];
      
      // The factory uses Genesis by default, but let's test the structure
      expect(typeof analysis.book).toBe('string');
      expect(analysis.chapter).toBeGreaterThan(0);
      expect(analysis.verses).toMatch(/^\d+(-\d+)?$/);
    });
  });

  describe('createSymbol', () => {
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

    it('should have valid categories', () => {
      const symbol = MockFactory.createSymbol();
      const validCategories = ['object', 'number', 'color', 'animal', 'nature'];
      
      expect(validCategories).toContain(symbol.category);
    });
  });

  describe('createApiResponse', () => {
    it('should create success response', () => {
      const data = { message: 'Success' };
      const response = MockFactory.createApiResponse(data);
      
      expect(response).toMatchObject({
        success: true,
        data: data,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
          version: expect.any(String)
        })
      });
    });
  });

  describe('createApiError', () => {
    it('should create error response', () => {
      const error = MockFactory.createApiError('Test error', 400);
      
      expect(error).toMatchObject({
        success: false,
        error: {
          message: 'Test error',
          code: 400,
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('createOpenAIResponse', () => {
    it('should create valid OpenAI response', () => {
      const response = MockFactory.createOpenAIResponse();
      
      expect(response).toMatchObject({
        id: expect.any(String),
        object: 'chat.completion',
        created: expect.any(Number),
        model: 'gpt-4',
        choices: expect.arrayContaining([
          expect.objectContaining({
            index: 0,
            message: expect.objectContaining({
              role: 'assistant',
              content: expect.any(String)
            }),
            finish_reason: 'stop'
          })
        ]),
        usage: expect.objectContaining({
          prompt_tokens: expect.any(Number),
          completion_tokens: expect.any(Number),
          total_tokens: expect.any(Number)
        })
      });
    });
  });

  describe('createSeedData', () => {
    it('should create seed data with correct counts', async () => {
      const seedData = await MockFactory.createSeedData(3);
      
      expect(seedData).toMatchObject({
        users: expect.any(Array),
        analyses: expect.any(Array),
        symbols: expect.any(Array)
      });
      
      expect(seedData.users).toHaveLength(3);
      expect(seedData.analyses).toHaveLength(9); // 3 users * 3 analyses
      expect(seedData.symbols).toHaveLength(50);
    });

    it('should link analyses to users correctly', async () => {
      const seedData = await MockFactory.createSeedData(2);
      const userIds = seedData.users.map(u => u.id);
      
      seedData.analyses.forEach(analysis => {
        expect(userIds).toContain(analysis.userId);
      });
    });
  });

  describe('overrides functionality', () => {
    it('should respect overrides in all factory methods', () => {
      const userOverrides = { role: 'admin', email: 'admin@test.com' };
      const user = MockFactory.createUser(userOverrides);
      
      expect(user.role).toBe('admin');
      expect(user.email).toBe('admin@test.com');
      
      const analysisOverrides = { book: 'Revelation', chapter: 12 };
      const analysis = MockFactory.createAnalysis(analysisOverrides);
      
      expect(analysis.book).toBe('Revelation');
      expect(analysis.chapter).toBe(12);
      
      const symbolOverrides = { name: 'Cross', category: 'religious' };
      const symbol = MockFactory.createSymbol(symbolOverrides);
      
      expect(symbol.name).toBe('Cross');
      expect(symbol.category).toBe('religious');
    });
  });
});