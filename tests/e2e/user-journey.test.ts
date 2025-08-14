import { ApiClient } from '@test-utils/api-client';
import { TestHelpers } from '@test-utils/test-helpers';
import { MockFactory } from '@test-utils/mock-factory';
import { Application } from 'express';
import { PrismaClient } from '@prisma/client';

describe('E2E User Journey Tests', () => {
  let app: Application;
  let apiClient: ApiClient;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Initialize application
    const { createApp } = await import('@/api/app');
    app = createApp();
    
    // Initialize database
    prisma = new PrismaClient();
    await prisma.$connect();
    await TestHelpers.cleanDatabase(prisma);
    
    // Initialize API client
    apiClient = new ApiClient(app);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Complete User Journey: Registration to Analysis', () => {
    let userId: string;
    let accessToken: string;
    let refreshToken: string;

    it('Step 1: User Registration', async () => {
      // Arrange
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Act
      const response = await apiClient.register(userData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      
      userId = response.body.data.user.id;
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
      
      // Verify user in database
      const dbUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(dbUser).toBeTruthy();
      expect(dbUser?.username).toBe(userData.username);
    });

    it('Step 2: User Login', async () => {
      // Act
      const response = await apiClient.login('newuser@example.com', 'SecurePass123!');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeTruthy();
      
      // Update tokens
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('Step 3: Get User Profile', async () => {
      // Arrange
      await apiClient.authenticate(userId, 'user', 'newuser@example.com');

      // Act
      const response = await apiClient.getProfile();

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.username).toBe('newuser');
    });

    it('Step 4: Update User Preferences', async () => {
      // Act
      const response = await apiClient.updateProfile({
        preferences: {
          translation: 'NIV',
          theme: 'dark',
          fontSize: 'large'
        }
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.preferences.translation).toBe('NIV');
    });

    it('Step 5: Create First Analysis', async () => {
      // Act
      const response = await apiClient.analyzeVerse('John', 3, '16', {
        type: 'theological'
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.body.data.book).toBe('John');
      expect(response.body.data.chapter).toBe(3);
      expect(response.body.data.verses).toBe('16');
      expect(response.body.data.userId).toBe(userId);
    });

    it('Step 6: Search for Symbols', async () => {
      // Act
      const response = await apiClient.searchSymbols('cross');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('Step 7: Get Analysis History', async () => {
      // Act
      const response = await apiClient.getAnalysisHistory();

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].book).toBe('John');
    });

    it('Step 8: Create Multiple Analyses', async () => {
      // Arrange
      const verses = [
        { book: 'Genesis', chapter: 1, verses: '1' },
        { book: 'Psalms', chapter: 23, verses: '1-6' },
        { book: 'Matthew', chapter: 5, verses: '3-12' }
      ];

      // Act
      const results = await apiClient.batchAnalyze(verses);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('Step 9: Token Refresh', async () => {
      // Act
      const response = await apiClient.refreshToken(refreshToken);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data.accessToken).not.toBe(accessToken);
    });

    it('Step 10: Logout', async () => {
      // Act
      const response = await apiClient.post('/api/auth/logout');

      // Assert
      expect(response.status).toBe(200);
      
      // Verify token is invalidated
      const profileResponse = await apiClient.getProfile();
      expect(profileResponse.status).toBe(401);
    });
  });

  describe('Advanced Analysis Journey', () => {
    let apiClient: ApiClient;
    let userId: string;

    beforeAll(async () => {
      // Create and authenticate user
      apiClient = new ApiClient(app);
      
      const registerResponse = await apiClient.register({
        email: 'analyst@example.com',
        username: 'analyst',
        password: 'AnalystPass123!',
        firstName: 'Bible',
        lastName: 'Analyst'
      });
      
      userId = registerResponse.body.data.user.id;
      await apiClient.authenticate(userId, 'user', 'analyst@example.com');
    });

    it('Should perform comparative analysis', async () => {
      // Create analyses for related verses
      const verses = [
        { book: 'Matthew', chapter: 5, verses: '44' }, // Love your enemies
        { book: 'Luke', chapter: 6, verses: '27' }, // Parallel passage
        { book: 'Romans', chapter: 12, verses: '20' } // Related teaching
      ];

      const analyses = await apiClient.batchAnalyze(verses);
      
      // Compare results
      const themes = new Set();
      analyses.forEach(analysis => {
        if (analysis.data.content.themes) {
          analysis.data.content.themes.forEach((theme: string) => themes.add(theme));
        }
      });

      expect(themes.has('Love')).toBe(true);
      expect(analyses).toHaveLength(3);
    });

    it('Should track analysis patterns', async () => {
      // Get user's analysis history
      const historyResponse = await apiClient.getAnalysisHistory();
      
      // Analyze patterns
      const books = historyResponse.body.data.map((a: any) => a.book);
      const bookFrequency = books.reduce((acc: any, book: string) => {
        acc[book] = (acc[book] || 0) + 1;
        return acc;
      }, {});

      expect(Object.keys(bookFrequency).length).toBeGreaterThan(0);
    });

    it('Should handle symbol relationships', async () => {
      // Search for a symbol
      const searchResponse = await apiClient.searchSymbols('light');
      
      if (searchResponse.body.data.length > 0) {
        const symbolId = searchResponse.body.data[0].id;
        
        // Get symbol relationships
        const relationshipsResponse = await apiClient.getSymbolRelationships(symbolId);
        
        expect(relationshipsResponse.status).toBe(200);
        expect(relationshipsResponse.body.data).toBeDefined();
      }
    });
  });

  describe('Error Handling Journey', () => {
    let apiClient: ApiClient;

    beforeAll(() => {
      apiClient = new ApiClient(app);
    });

    it('Should handle invalid credentials gracefully', async () => {
      const response = await apiClient.login('invalid@example.com', 'wrongpass');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('Should handle expired tokens', async () => {
      // Create expired token
      const expiredToken = await TestHelpers.generateAuthToken({
        userId: 'test-user',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      apiClient.setHeaders({ Authorization: `Bearer ${expiredToken}` });
      
      const response = await apiClient.getProfile();
      
      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('expired');
    });

    it('Should handle network errors', async () => {
      // Simulate network error by using invalid endpoint
      const response = await apiClient.get('/api/invalid-endpoint');
      
      expect(response.status).toBe(404);
    });

    it('Should validate input data', async () => {
      await apiClient.authenticate('test-user', 'user', 'test@example.com');
      
      // Invalid book name
      const response1 = await apiClient.analyzeVerse('InvalidBook', 1, '1');
      expect(response1.status).toBe(400);
      
      // Invalid chapter
      const response2 = await apiClient.analyzeVerse('Genesis', 999, '1');
      expect(response2.status).toBe(400);
      
      // Invalid verse format
      const response3 = await apiClient.analyzeVerse('Genesis', 1, 'invalid-format');
      expect(response3.status).toBe(400);
    });
  });

  describe('Performance Under Load', () => {
    let apiClient: ApiClient;

    beforeAll(async () => {
      apiClient = new ApiClient(app);
      
      // Create test user
      const registerResponse = await apiClient.register({
        email: 'loadtest@example.com',
        username: 'loadtest',
        password: 'LoadTest123!',
        firstName: 'Load',
        lastName: 'Test'
      });
      
      const userId = registerResponse.body.data.user.id;
      await apiClient.authenticate(userId, 'user', 'loadtest@example.com');
    });

    it('Should handle burst traffic', async () => {
      const burstSize = 20;
      const requests = Array(burstSize).fill(null).map((_, i) => 
        apiClient.analyzeVerse('Psalms', i + 1, '1', { type: 'theological' })
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      const successful = responses.filter(r => r.status < 400).length;
      const rateLimited = responses.filter(r => r.status === 429).length;

      console.log(`Burst test: ${successful} successful, ${rateLimited} rate limited`);
      
      expect(successful + rateLimited).toBe(burstSize);
      expect(duration).toBeLessThan(30000); // Complete within 30 seconds
    });

    it('Should maintain performance over sustained load', async () => {
      const duration = 10000; // 10 seconds
      const startTime = Date.now();
      let requestCount = 0;
      let successCount = 0;
      const responseTimes: number[] = [];

      while (Date.now() - startTime < duration) {
        const reqStart = Date.now();
        const response = await apiClient.get('/api/analysis/history');
        const reqDuration = Date.now() - reqStart;
        
        requestCount++;
        if (response.status < 400) {
          successCount++;
          responseTimes.push(reqDuration);
        }
        
        await TestHelpers.delay(100); // 10 requests per second
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const successRate = successCount / requestCount;

      console.log(`Sustained load: ${requestCount} requests, ${successRate * 100}% success, ${avgResponseTime}ms avg`);
      
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(500); // Average response < 500ms
    });
  });
});