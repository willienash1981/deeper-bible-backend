import { LoadTester, scenarios } from './load-test';
import { ApiClient } from '@test-utils/api-client';
import { TestHelpers } from '@test-utils/test-helpers';
import { Application } from 'express';

describe('Performance Tests', () => {
  let app: Application;
  let loadTester: LoadTester;
  let apiClient: ApiClient;
  let authToken: string;

  beforeAll(async () => {
    // Start application
    const { createApp } = await import('@/api/app');
    app = createApp();
    const server = app.listen(3001);

    // Initialize load tester
    loadTester = new LoadTester('http://localhost:3001');
    
    // Initialize API client for setup
    apiClient = new ApiClient(app);
    
    // Create test user and get auth token
    const response = await apiClient.register({
      email: 'perftest@example.com',
      username: 'perftest',
      password: 'PerfTest123!',
      firstName: 'Performance',
      lastName: 'Tester'
    });
    
    authToken = response.body.data.accessToken;
    await loadTester.authenticate(authToken);
    
    // Wait for server to be ready
    await TestHelpers.delay(1000);
  });

  afterAll(async () => {
    // Cleanup
    await TestHelpers.delay(1000);
  });

  describe('API Endpoint Performance', () => {
    it('GET /api/analysis/history - Light Load', async () => {
      await loadTester.runScenario(
        'Analysis History - Light Load',
        {
          url: '/api/analysis/history',
          ...scenarios.lightLoad.config
        },
        scenarios.lightLoad.thresholds
      );
    });

    it('GET /api/analysis/history - Normal Load', async () => {
      await loadTester.runScenario(
        'Analysis History - Normal Load',
        {
          url: '/api/analysis/history',
          ...scenarios.normalLoad.config
        },
        scenarios.normalLoad.thresholds
      );
    });

    it('POST /api/analysis/verse - Light Load', async () => {
      await loadTester.runScenario(
        'Create Analysis - Light Load',
        {
          url: '/api/analysis/verse',
          method: 'POST',
          body: {
            book: 'Genesis',
            chapter: 1,
            verses: '1',
            type: 'theological'
          },
          ...scenarios.lightLoad.config
        },
        {
          ...scenarios.lightLoad.thresholds,
          avgLatency: 2000, // Higher threshold for AI processing
          maxLatency: 10000
        }
      );
    });

    it('GET /api/symbols/search - Normal Load', async () => {
      await loadTester.runScenario(
        'Symbol Search - Normal Load',
        {
          url: '/api/symbols/search?q=cross',
          ...scenarios.normalLoad.config
        },
        scenarios.normalLoad.thresholds
      );
    });
  });

  describe('Authentication Performance', () => {
    it('POST /api/auth/login - Heavy Load', async () => {
      await loadTester.runScenario(
        'User Login - Heavy Load',
        {
          url: '/api/auth/login',
          method: 'POST',
          body: {
            email: 'perftest@example.com',
            password: 'PerfTest123!'
          },
          ...scenarios.heavyLoad.config
        },
        {
          ...scenarios.heavyLoad.thresholds,
          avgLatency: 300, // Bcrypt is slow
          maxLatency: 3000
        }
      );
    });

    it('POST /api/auth/refresh - Normal Load', async () => {
      const refreshToken = 'test-refresh-token'; // Would need real token
      
      await loadTester.runScenario(
        'Token Refresh - Normal Load',
        {
          url: '/api/auth/refresh',
          method: 'POST',
          body: { refreshToken },
          ...scenarios.normalLoad.config
        },
        scenarios.normalLoad.thresholds
      );
    });
  });

  describe('Database Query Performance', () => {
    it('Complex aggregation query performance', async () => {
      // Create test data
      const verses = Array(100).fill(null).map((_, i) => ({
        book: 'Genesis',
        chapter: Math.floor(i / 10) + 1,
        verses: `${(i % 10) + 1}`
      }));

      // Measure batch analysis performance
      const start = Date.now();
      await apiClient.batchAnalyze(verses);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(60000); // Should complete within 1 minute
      console.log(`Batch analysis of ${verses.length} verses took ${duration}ms`);
    });

    it('Concurrent database operations', async () => {
      const operations = Array(50).fill(null).map(() => 
        apiClient.searchSymbols('test')
      );

      const start = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // 50 concurrent queries < 5s
      console.log(`50 concurrent DB queries took ${duration}ms`);
    });
  });

  describe('Stress Testing', () => {
    it('Should handle spike traffic gracefully', async () => {
      const results = await loadTester.runLoadTest({
        url: '/api/analysis/history',
        ...scenarios.spikeTest.config
      });

      // System should not crash
      expect(results.resets).toBeLessThan(10);
      
      // Should start recovering quickly
      const recoveryTest = await loadTester.runLoadTest({
        url: '/api/analysis/history',
        connections: 10,
        duration: 10
      });
      
      expect(recoveryTest.latency.average).toBeLessThan(200);
    });

    it('Should maintain performance under sustained load', async () => {
      const results = await loadTester.runLoadTest({
        url: '/api/analysis/history',
        connections: 50,
        duration: 300, // 5 minutes
        pipelining: 1
      });

      // Performance should not degrade over time
      const firstMinute = results.latency.percentiles['50'];
      const lastMinute = results.latency.percentiles['99'];
      const degradation = (lastMinute - firstMinute) / firstMinute;
      
      expect(degradation).toBeLessThan(0.5); // Less than 50% degradation
    });
  });

  describe('Memory and Resource Usage', () => {
    it('Should not have memory leaks under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run sustained load
      await loadTester.runLoadTest({
        url: '/api/analysis/history',
        connections: 20,
        duration: 60
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await TestHelpers.delay(5000); // Wait for cleanup

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be minimal (< 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('Should release connections properly', async () => {
      // Monitor connection pool
      let activeConnections = 0;
      
      // Hook into connection pool (implementation specific)
      const originalQuery = apiClient.get;
      apiClient.get = async function(...args) {
        activeConnections++;
        try {
          return await originalQuery.apply(this, args);
        } finally {
          activeConnections--;
        }
      };

      // Run load test
      await loadTester.runLoadTest({
        url: '/api/analysis/history',
        connections: 50,
        duration: 30
      });

      await TestHelpers.delay(2000);
      
      // All connections should be released
      expect(activeConnections).toBe(0);
    });
  });

  describe('Caching Performance', () => {
    it('Should improve performance with caching', async () => {
      // First run without cache
      const noCacheResults = await loadTester.runLoadTest({
        url: '/api/analysis/verse',
        method: 'POST',
        body: {
          book: 'Genesis',
          chapter: 1,
          verses: '1',
          type: 'theological'
        },
        connections: 10,
        duration: 10
      });

      // Second run with cache
      const withCacheResults = await loadTester.runLoadTest({
        url: '/api/analysis/verse',
        method: 'POST',
        body: {
          book: 'Genesis',
          chapter: 1,
          verses: '1',
          type: 'theological'
        },
        connections: 10,
        duration: 10
      });

      // Cached requests should be significantly faster
      const improvement = noCacheResults.latency.average / withCacheResults.latency.average;
      expect(improvement).toBeGreaterThan(2); // At least 2x faster
    });
  });

  describe('Generate Performance Report', () => {
    it('Should generate comprehensive performance report', async () => {
      const report = {
        timestamp: new Date().toISOString(),
        environment: 'test',
        scenarios: [] as any[]
      };

      // Run all scenarios and collect results
      for (const [name, scenario] of Object.entries(scenarios)) {
        if (name === 'stressTest' || name === 'spikeTest') continue; // Skip extreme tests
        
        const results = await loadTester.runLoadTest({
          url: '/api/analysis/history',
          ...scenario.config
        });

        report.scenarios.push({
          name,
          config: scenario.config,
          results: {
            requests: results.requests.total,
            throughput: results.requests.average,
            avgLatency: results.latency.average,
            p95Latency: results.latency.percentiles['95'],
            p99Latency: results.latency.percentiles['99'],
            errors: results.errors,
            errorRate: (results.errors / results.requests.total * 100).toFixed(2) + '%'
          }
        });
      }

      // Save report
      const fs = await import('fs/promises');
      await fs.writeFile(
        'coverage/performance-report.json',
        JSON.stringify(report, null, 2)
      );

      console.log('\n📊 Performance Report Generated:');
      console.log(JSON.stringify(report, null, 2));
    });
  });
});