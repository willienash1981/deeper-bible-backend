import { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiClient } from '@test-utils/api-client';
import { MockFactory } from '@test-utils/mock-factory';
import { TestHelpers } from '@test-utils/test-helpers';
import { analysisFixtures } from '@fixtures/analysis.fixtures';

describe('Analysis API Integration Tests', () => {
  let app: Application;
  let apiClient: ApiClient;
  let prisma: PrismaClient;
  let testUser: any;

  beforeAll(async () => {
    // Import and initialize app
    const { createApp } = await import('@/api/app');
    app = createApp();
    
    // Initialize test client
    apiClient = new ApiClient(app);
    
    // Initialize database
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // Clean database
    await TestHelpers.cleanDatabase(prisma);
    
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        password: await TestHelpers.hashPassword('password123'),
        role: 'user'
      }
    });
    
    // Authenticate client
    await apiClient.authenticate(testUser.id, testUser.role, testUser.email);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear analysis data before each test
    await prisma.analysis.deleteMany({});
  });

  describe('POST /api/analysis/verse', () => {
    it('should create new analysis successfully', async () => {
      // Arrange
      const requestData = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      // Act
      const response = await apiClient.analyzeVerse(
        requestData.book,
        requestData.chapter,
        requestData.verses,
        { type: requestData.type }
      );

      // Assert
      expect(response.status).toBe(201);
      TestHelpers.expectApiSuccess(response);
      expect(response.body.data).toMatchObject({
        book: requestData.book,
        chapter: requestData.chapter,
        verses: requestData.verses,
        userId: testUser.id
      });
      
      // Verify database
      const analysis = await prisma.analysis.findFirst({
        where: { userId: testUser.id }
      });
      expect(analysis).toBeTruthy();
      expect(analysis?.book).toBe(requestData.book);
    });

    it('should return cached analysis when available', async () => {
      // Arrange
      const requestData = {
        book: 'Genesis',
        chapter: 1,
        verses: '1-3',
        type: 'theological'
      };

      // Create first analysis
      const firstResponse = await apiClient.analyzeVerse(
        requestData.book,
        requestData.chapter,
        requestData.verses,
        { type: requestData.type }
      );

      // Act - Request same analysis again
      const secondResponse = await apiClient.analyzeVerse(
        requestData.book,
        requestData.chapter,
        requestData.verses,
        { type: requestData.type }
      );

      // Assert
      expect(secondResponse.status).toBe(200); // 200 for cached, 201 for new
      expect(secondResponse.body.data.id).toBe(firstResponse.body.data.id);
      expect(secondResponse.body.data.cached).toBe(true);
    });

    it('should validate verse range', async () => {
      // Arrange
      const invalidRequests = [
        { book: 'Genesis', chapter: 1, verses: '100-200' }, // Invalid verse range
        { book: 'InvalidBook', chapter: 1, verses: '1-3' }, // Invalid book
        { book: 'Genesis', chapter: 100, verses: '1-3' }, // Invalid chapter
        { book: 'Genesis', chapter: 1, verses: 'invalid' } // Invalid verse format
      ];

      // Act & Assert
      for (const request of invalidRequests) {
        const response = await apiClient.analyzeVerse(
          request.book,
          request.chapter,
          request.verses
        );
        
        expect(response.status).toBe(400);
        TestHelpers.expectApiError(response, { code: 400 });
      }
    });

    it('should handle multiple analysis types', async () => {
      // Arrange
      const types = ['theological', 'historical', 'symbolic', 'comprehensive'];
      const requestBase = {
        book: 'Genesis',
        chapter: 1,
        verses: '1'
      };

      // Act
      const responses = await Promise.all(
        types.map(type => 
          apiClient.analyzeVerse(
            requestBase.book,
            requestBase.chapter,
            requestBase.verses,
            { type }
          )
        )
      );

      // Assert
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.data.analysisType).toBe(types[index]);
      });
    });

    it('should enforce rate limiting', async () => {
      // Arrange
      const requests = Array(20).fill({
        book: 'Genesis',
        chapter: 1,
        verses: '1'
      });

      // Act - Send many requests quickly
      const responses = await Promise.all(
        requests.map((req, i) => 
          apiClient.analyzeVerse(req.book, req.chapter, `${i+1}`)
        )
      );

      // Assert - Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/analysis/:id', () => {
    it('should retrieve analysis by ID', async () => {
      // Arrange
      const analysis = await prisma.analysis.create({
        data: {
          userId: testUser.id,
          book: 'Genesis',
          chapter: 1,
          verses: '1-3',
          analysisType: 'theological',
          content: analysisFixtures.theologicalAnalysis.content,
          metadata: { model: 'gpt-4', tokens: 1000 }
        }
      });

      // Act
      const response = await apiClient.getAnalysis(analysis.id);

      // Assert
      expect(response.status).toBe(200);
      TestHelpers.expectApiSuccess(response);
      expect(response.body.data.id).toBe(analysis.id);
      expect(response.body.data.book).toBe('Genesis');
    });

    it('should return 404 for non-existent analysis', async () => {
      // Act
      const response = await apiClient.getAnalysis('non-existent-id');

      // Assert
      expect(response.status).toBe(404);
      TestHelpers.expectApiError(response, { 
        message: 'not found',
        code: 404 
      });
    });

    it('should prevent unauthorized access', async () => {
      // Arrange
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          username: 'otheruser',
          password: await TestHelpers.hashPassword('password123'),
          role: 'user'
        }
      });

      const analysis = await prisma.analysis.create({
        data: {
          userId: otherUser.id, // Different user's analysis
          book: 'Genesis',
          chapter: 1,
          verses: '1-3',
          analysisType: 'theological',
          content: {},
          metadata: {}
        }
      });

      // Act
      const response = await apiClient.getAnalysis(analysis.id);

      // Assert
      expect(response.status).toBe(403);
      TestHelpers.expectApiError(response, { 
        message: 'Access denied',
        code: 403 
      });
    });
  });

  describe('GET /api/analysis/history', () => {
    it('should retrieve user analysis history', async () => {
      // Arrange - Create multiple analyses
      const analyses = await Promise.all(
        Array(5).fill(null).map((_, i) => 
          prisma.analysis.create({
            data: {
              userId: testUser.id,
              book: 'Genesis',
              chapter: i + 1,
              verses: '1',
              analysisType: 'theological',
              content: {},
              metadata: {}
            }
          })
        )
      );

      // Act
      const response = await apiClient.getAnalysisHistory();

      // Assert
      expect(response.status).toBe(200);
      TestHelpers.expectApiSuccess(response);
      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta.total).toBe(5);
    });

    it('should support pagination', async () => {
      // Arrange - Create 15 analyses
      await Promise.all(
        Array(15).fill(null).map((_, i) => 
          prisma.analysis.create({
            data: {
              userId: testUser.id,
              book: 'Genesis',
              chapter: (i % 50) + 1,
              verses: '1',
              analysisType: 'theological',
              content: {},
              metadata: {}
            }
          })
        )
      );

      // Act - Get first page
      const page1 = await apiClient.get('/api/analysis/history', { 
        limit: 5, 
        offset: 0 
      });
      
      // Get second page
      const page2 = await apiClient.get('/api/analysis/history', { 
        limit: 5, 
        offset: 5 
      });

      // Assert
      expect(page1.body.data).toHaveLength(5);
      expect(page2.body.data).toHaveLength(5);
      expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
    });

    it('should filter by date range', async () => {
      // Arrange
      const oldDate = new Date('2023-01-01');
      const recentDate = new Date();

      await prisma.analysis.create({
        data: {
          userId: testUser.id,
          book: 'Genesis',
          chapter: 1,
          verses: '1',
          analysisType: 'theological',
          content: {},
          metadata: {},
          createdAt: oldDate
        }
      });

      await prisma.analysis.create({
        data: {
          userId: testUser.id,
          book: 'Exodus',
          chapter: 1,
          verses: '1',
          analysisType: 'historical',
          content: {},
          metadata: {},
          createdAt: recentDate
        }
      });

      // Act
      const response = await apiClient.get('/api/analysis/history', {
        startDate: '2024-01-01',
        endDate: new Date().toISOString()
      });

      // Assert
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].book).toBe('Exodus');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Arrange
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(null).map((_, i) => ({
        book: 'Genesis',
        chapter: i + 1,
        verses: '1'
      }));

      // Act
      const start = Date.now();
      const responses = await Promise.all(
        requests.map(req => 
          apiClient.analyzeVerse(req.book, req.chapter, req.verses)
        )
      );
      const duration = Date.now() - start;

      // Assert
      const successfulResponses = responses.filter(r => r.status < 400);
      expect(successfulResponses.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should maintain response time under load', async () => {
      // Act
      const loadTestResult = await apiClient.loadTest(
        '/api/analysis/history',
        'GET',
        50
      );

      // Assert
      expect(loadTestResult.avgDuration).toBeLessThan(1000); // Avg < 1 second
      expect(loadTestResult.successRate).toBeGreaterThan(0.9); // 90% success rate
    });
  });
});