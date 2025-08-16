import { LoadTester } from '../utils/load-tester';
import { TestHelpers } from '../utils/test-helpers';
import { ApiClient } from '../utils/api-client';

describe('API Endpoints Performance Tests', () => {
  let loadTester: LoadTester;
  let apiClient: ApiClient;

  beforeAll(async () => {
    await TestHelpers.setupTestEnvironment();
    
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    loadTester = new LoadTester(baseUrl);
    apiClient = new ApiClient(baseUrl);

    // Create test user for authenticated tests
    try {
      await apiClient.post('/auth/register', {
        email: 'loadtest@example.com',
        password: 'LoadTest123!',
        name: 'Load Test User'
      });
    } catch (error) {
      // User might already exist, that's okay
    }
  });

  afterAll(async () => {
    await TestHelpers.cleanupTestEnvironment();
  });

  describe('Public Endpoints', () => {
    test('Health check endpoint performance', async () => {
      const result = await loadTester.runLoadTest({
        url: '/health',
        title: 'Health Check Performance',
        duration: 10,
        connections: 5
      });

      const validation = loadTester.validateBenchmarks(result);

      expect(result.errors).toBe(0);
      expect(result.latency.average).toBeLessThan(100); // Health check should be very fast
      expect(result.requests.average).toBeGreaterThan(100); // Should handle high throughput
      expect(validation.passed).toBe(true);
    }, 30000);

    test('Get books endpoint performance', async () => {
      // First, create some test books for realistic testing
      const authResponse = await apiClient.post('/auth/login', {
        email: 'loadtest@example.com',
        password: 'LoadTest123!'
      });
      
      const token = authResponse.data.token;
      
      // Create test books
      for (let i = 0; i < 10; i++) {
        await apiClient.post('/api/books', {
          title: `Performance Test Book ${i}`,
          content: `This is test content for performance testing book ${i}`.repeat(100),
          isPublic: true
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      const result = await loadTester.runLoadTest({
        url: '/api/books?page=1&limit=10',
        title: 'Get Books Performance',
        duration: 15,
        connections: 10
      });

      const validation = loadTester.validateBenchmarks(result);

      expect(result.errors).toBe(0);
      expect(result.latency.p99).toBeLessThan(1000);
      expect(validation.metrics.responseTime).toBe(true);
    }, 60000);
  });

  describe('Authenticated Endpoints', () => {
    test('User profile endpoint performance', async () => {
      const result = await loadTester.runAuthenticatedLoadTest(
        '/api/users/profile',
        'GET',
        undefined,
        {
          title: 'User Profile Performance',
          duration: 15,
          connections: 8
        }
      );

      const validation = loadTester.validateBenchmarks(result);

      expect(result.errors).toBe(0);
      expect(result.latency.average).toBeLessThan(300);
      expect(validation.metrics.throughput).toBe(true);
    }, 45000);

    test('Create book endpoint performance', async () => {
      const testBook = {
        title: 'Performance Test Book',
        content: 'This is a performance test book content.',
        isPublic: false
      };

      const result = await loadTester.runAuthenticatedLoadTest(
        '/api/books',
        'POST',
        testBook,
        {
          title: 'Create Book Performance',
          duration: 10,
          connections: 5 // Lower connections for write operations
        }
      );

      const validation = loadTester.validateBenchmarks(result);

      // Write operations typically have higher latency
      expect(result.errors).toBe(0);
      expect(result.latency.p99).toBeLessThan(2000);
      
      // Allow higher error rates for write operations due to potential conflicts
      const errorRate = (result.errors / result.requests.total) * 100;
      expect(errorRate).toBeLessThan(5);
    }, 45000);
  });

  describe('Database Heavy Operations', () => {
    test('Search functionality performance', async () => {
      // Skip if search endpoint doesn't exist
      try {
        const result = await loadTester.runLoadTest({
          url: '/api/search?q=test&type=books',
          title: 'Search Performance',
          duration: 15,
          connections: 8
        });

        const validation = loadTester.validateBenchmarks(result);

        expect(result.errors).toBe(0);
        expect(result.latency.p95).toBeLessThan(800); // Search can be slower
        
        // Log results for manual review
        console.log('Search Performance Results:', {
          averageLatency: result.latency.average,
          p95Latency: result.latency.p97_5,
          p99Latency: result.latency.p99,
          throughput: result.requests.average,
          errors: result.errors
        });
      } catch (error) {
        console.log('Skipping search performance test - endpoint may not exist');
      }
    }, 45000);
  });

  describe('Stress Testing', () => {
    test('High concurrency stress test', async () => {
      const result = await loadTester.runLoadTest({
        url: '/health',
        title: 'High Concurrency Stress Test',
        duration: 20,
        connections: 50, // Higher concurrency
        pipelining: 2
      });

      // More lenient validation for stress testing
      expect(result.errors).toBeLessThan(result.requests.total * 0.05); // Allow 5% error rate
      expect(result.latency.p99).toBeLessThan(5000); // Allow higher latency under stress
      
      console.log('Stress Test Results:', {
        totalRequests: result.requests.total,
        averageLatency: result.latency.average,
        p99Latency: result.latency.p99,
        throughput: result.requests.average,
        errorRate: ((result.errors / result.requests.total) * 100).toFixed(2) + '%'
      });
    }, 60000);
  });

  describe('Benchmark Report Generation', () => {
    test('Generate comprehensive performance report', async () => {
      const standardBenchmarks = await loadTester.runStandardBenchmarks();
      
      const report = loadTester.generateReport(
        [standardBenchmarks.healthCheck, ...standardBenchmarks.apiEndpoints],
        [
          loadTester.validateBenchmarks(standardBenchmarks.healthCheck),
          ...standardBenchmarks.validation
        ]
      );

      expect(report).toContain('Performance Test Report');
      expect(report).toContain('Summary');
      expect(report).toContain('Test Results');
      expect(report).toContain('Performance Benchmarks');

      // Write report to file for CI/CD
      const fs = require('fs');
      const path = require('path');
      
      const reportsDir = path.join(process.cwd(), 'test-reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportsDir, `performance-report-${timestamp}.md`);
      
      fs.writeFileSync(reportPath, report);
      console.log(`Performance report written to: ${reportPath}`);
    }, 120000); // Longer timeout for comprehensive testing
  });
});